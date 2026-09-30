/**
 * LAN web server that lets a phone use the exact same app: it serves the
 * built renderer (out/renderer) and exposes one POST endpoint that runs the
 * same handlers Electron IPC uses (registerIpc.ts), so the phone sees and
 * edits the same database as the desktop window - no sync, no second copy.
 *
 * Security model (opt-in, off until the user turns it on in Settings):
 * - Everything lives under /app/<token>/ - a random 192-bit link token IS the
 *   credential, stored on this computer and regenerable ("Reset link").
 * - Only private-network clients are answered (lan.ts): same-Wi-Fi addresses
 *   and Tailscale's 100.64.0.0/10, never the public internet. With Tailscale
 *   the phone reaches this PC from anywhere over an encrypted WireGuard
 *   tunnel, and only devices on the owner's tailnet can connect at all.
 * - Plain HTTP on the local network: fine for a home/office Wi-Fi, and the
 *   only way to avoid a certificate-trust step on every phone. Anyone on the
 *   same network who gets the link can use it - documented in the UI.
 * - Desktop-only channels (file dialogs, backups, MCP, etc.) are refused by
 *   registerIpc.ts's isPhoneAllowedChannel before they reach a handler.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { randomBytes } from 'crypto'
import { networkInterfaces } from 'os'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { extname, join, resolve, sep } from 'path'
import { getStandaloneAppDataDir } from '@shared/paths'
import type { PhoneAccessInfo } from '@shared/ipc-contract'
import { getAllSettings, setManySettings } from '../ipc/settingsRepo'
import { logError, logInfo } from '../logger'
import { getAutostart, setAutostart } from './background'
import {
  buildPhoneAiPrompt,
  isAllowedClient,
  rankLanAddresses,
  tailscaleLocalAddresses,
  tokensEqual
} from './lan'

export function buildFirewallCommand(port: number): string {
  return `New-NetFirewallRule -DisplayName "Renvor phone (Tailscale)" -Direction Inbound -Protocol TCP -LocalPort ${port} -RemoteAddress 100.64.0.0/10 -Action Allow`
}

// Env override exists so automated tests can run beside a real Renvor that already holds 39213.
const PORT = Number(process.env.RENVOR_PHONE_PORT) || 39213
const MAX_BODY_BYTES = 5 * 1024 * 1024

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json'
}

type Invoker = (channel: string, payload: unknown) => Promise<unknown>

let rendererDir = ''
let invoker: Invoker | null = null
let server: Server | null = null
let status: { running: boolean; error: string | null } = { running: false, error: null }
let lastPhoneSeenAt: string | null = null
let cachedToken: string | null = null

export function initPhoneServer(opts: { rendererDir: string; invoke: Invoker }): void {
  rendererDir = opts.rendererDir
  invoker = opts.invoke
}

function tokenFilePath(): string {
  return join(getStandaloneAppDataDir(), 'phone-link-token.txt')
}

function getToken(): string {
  if (cachedToken) return cachedToken
  const file = tokenFilePath()
  if (existsSync(file)) {
    const existing = readFileSync(file, 'utf8').trim()
    if (/^[0-9a-f]{48}$/.test(existing)) {
      cachedToken = existing
      return existing
    }
  }
  return regenerateToken()
}

function regenerateToken(): string {
  cachedToken = randomBytes(24).toString('hex')
  writeFileSync(tokenFilePath(), cachedToken, 'utf8')
  return cachedToken
}

function markSeen(): void {
  lastPhoneSeenAt = new Date().toISOString()
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(JSON.stringify(body))
}

async function handleInvoke(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const parsed = JSON.parse(await readBody(req)) as { channel?: unknown; payload?: unknown }
    if (typeof parsed.channel !== 'string' || !invoker) {
      sendJson(res, 400, { ok: false, error: 'Bad request' })
      return
    }
    markSeen()
    const result = await invoker(parsed.channel, parsed.payload)
    sendJson(res, 200, { ok: true, result: result === undefined ? null : result })
  } catch (error) {
    sendJson(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

async function serveStatic(rest: string, res: ServerResponse): Promise<void> {
  const root = resolve(rendererDir)
  const requested = rest === '' ? 'index.html' : decodeURIComponent(rest)
  const full = resolve(root, requested)
  if (full !== root && !full.startsWith(root + sep)) {
    res.writeHead(403).end()
    return
  }
  try {
    const info = await stat(full)
    const filePath = info.isDirectory() ? join(full, 'index.html') : full
    const data = await readFile(filePath)
    const isIndex = filePath === join(root, 'index.html')
    if (isIndex) markSeen()
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': isIndex ? 'no-store' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    })
    res.end(data)
  } catch {
    res.writeHead(404).end()
  }
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (
    !isAllowedClient(
      req.socket.remoteAddress,
      req.socket.localAddress,
      tailscaleLocalAddresses(networkInterfaces())
    )
  ) {
    res.writeHead(403).end()
    return
  }
  const pathname = new URL(req.url ?? '/', 'http://renvor.local').pathname
  const parts = pathname.split('/')
  if (parts[1] !== 'app' || !parts[2] || !tokensEqual(parts[2], getToken())) {
    res.writeHead(404).end()
    return
  }
  if (parts.length === 3) {
    res.writeHead(302, { Location: `/app/${parts[2]}/` }).end()
    return
  }
  const rest = parts.slice(3).join('/')
  if (rest === 'api/invoke') {
    if (req.method !== 'POST') {
      res.writeHead(405).end()
      return
    }
    await handleInvoke(req, res)
    return
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end()
    return
  }
  await serveStatic(rest, res)
}

export function startPhoneServer(): Promise<void> {
  if (server) return Promise.resolve()
  return new Promise((resolveStart) => {
    const next = createServer((req, res) => {
      handleRequest(req, res).catch((error) => {
        logError('Phone server request failed', error)
        if (!res.headersSent) res.writeHead(500).end()
      })
    })
    next.once('error', (error: NodeJS.ErrnoException) => {
      const message =
        error.code === 'EADDRINUSE'
          ? `Port ${PORT} is already in use (another copy of Renvor may already be running).`
          : error.message
      logError('Phone server failed to start', error)
      status = { running: false, error: message }
      resolveStart()
    })
    next.listen(PORT, '0.0.0.0', () => {
      server = next
      status = { running: true, error: null }
      logInfo(`Phone server listening on port ${PORT}`)
      resolveStart()
    })
  })
}

export function stopPhoneServer(): void {
  server?.closeAllConnections?.()
  server?.close()
  server = null
  status = { running: false, error: null }
}

export async function startPhoneServerIfEnabled(): Promise<void> {
  if (getAllSettings().phoneAccessEnabled) await startPhoneServer()
}

export function getPhoneInfo(): PhoneAccessInfo {
  const enabled = getAllSettings().phoneAccessEnabled
  const token = enabled ? getToken() : null
  const addresses = token
    ? rankLanAddresses(networkInterfaces()).map((a) => ({
        name: a.name,
        address: a.address,
        kind: a.kind,
        url: `http://${a.address}:${PORT}/app/${token}/`
      }))
    : []
  return {
    enabled,
    running: status.running,
    error: status.error,
    port: PORT,
    addresses,
    tailscaleDetected: addresses.some((a) => a.kind === 'tailscale'),
    firewallCommand: buildFirewallCommand(PORT),
    autostart: getAutostart(),
    appFilesAvailable: existsSync(join(rendererDir, 'index.html')),
    lastPhoneSeenAt,
    aiPrompt: buildPhoneAiPrompt(PORT)
  }
}

export async function setPhoneAccess(enabled: boolean): Promise<PhoneAccessInfo> {
  setManySettings({ phoneAccessEnabled: enabled })
  if (enabled) await startPhoneServer()
  else stopPhoneServer()
  return getPhoneInfo()
}

export function setPhoneAutostart(enabled: boolean): PhoneAccessInfo {
  setAutostart(enabled)
  return getPhoneInfo()
}

export function resetPhoneLink(): PhoneAccessInfo {
  regenerateToken()
  lastPhoneSeenAt = null
  return getPhoneInfo()
}
