/**
 * Self-signed TLS cert for the local MCP HTTPS server (httpServer.ts).
 * Claude Desktop's custom connector requires an https:// URL, even for
 * localhost - there's no real CA that will issue a cert for 127.0.0.1, so
 * this is a self-signed one covering "localhost" and "127.0.0.1", cached
 * to disk so it's generated once, not on every app launch.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { generate } from 'selfsigned'
import { getStandaloneAppDataDir } from '@shared/paths'

function certDir(): string {
  return join(getStandaloneAppDataDir(), 'mcp-cert')
}

export async function getOrCreateMcpCert(): Promise<{ key: string; cert: string }> {
  const dir = certDir()
  const keyPath = join(dir, 'key.pem')
  const certPath = join(dir, 'cert.pem')

  if (existsSync(keyPath) && existsSync(certPath)) {
    return { key: readFileSync(keyPath, 'utf-8'), cert: readFileSync(certPath, 'utf-8') }
  }

  const tenYearsFromNow = new Date()
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10)

  const pems = await generate([{ name: 'commonName', value: 'localhost' }], {
    notAfterDate: tenYearsFromNow,
    keySize: 2048
  })

  mkdirSync(dir, { recursive: true })
  writeFileSync(keyPath, pems.private, 'utf-8')
  writeFileSync(certPath, pems.cert, 'utf-8')

  return { key: pems.private, cert: pems.cert }
}
