/**
 * Pure helpers for the phone web server and the AI prompts - no Electron/DB
 * imports so they're unit-testable (see lan.test.ts).
 */
import { timingSafeEqual } from 'crypto'
import type { NetworkInterfaceInfo } from 'os'

export interface LanAddress {
  name: string
  address: string
  /** tailscale = reachable from anywhere on the user's tailnet; lan = same Wi-Fi only */
  kind: 'tailscale' | 'lan'
}

/**
 * Tailscale hands every device an address in the CGNAT block 100.64.0.0/10 -
 * but mobile carriers use the same block for their own NAT (a laptop's
 * cellular modem can hold one), so an address in the block only counts as
 * Tailscale on an interface actually named Tailscale.
 */
export function isTailscaleAddress(address: string): boolean {
  const m = /^100\.(\d{1,3})\./.exec(address)
  if (!m) return false
  const second = Number(m[1])
  return second >= 64 && second <= 127
}

const TAILSCALE_IFACE = /tailscale/i

const VIRTUAL_NAME =
  /vethernet|virtualbox|vmware|hyper-v|wsl|docker|vpn|zerotier|bluetooth|loopback|tap-|tun/i

function rank(name: string, address: string): number {
  let score = 3
  if (address.startsWith('192.168.')) score = 0
  else if (address.startsWith('10.')) score = 1
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) score = 2
  return VIRTUAL_NAME.test(name) ? score + 10 : score
}

/**
 * IPv4 addresses a phone could reach, best first: Tailscale (works from
 * anywhere) ahead of same-Wi-Fi addresses.
 */
export function rankLanAddresses(ifaces: NodeJS.Dict<NetworkInterfaceInfo[]>): LanAddress[] {
  const found: Array<LanAddress & { score: number }> = []
  const seen = new Set<string>()
  for (const [name, infos] of Object.entries(ifaces)) {
    for (const info of infos ?? []) {
      if (info.family !== 'IPv4' || info.internal) continue
      if (info.address.startsWith('169.254.') || seen.has(info.address)) continue
      seen.add(info.address)
      const inBlock = isTailscaleAddress(info.address)
      // A carrier-NAT address in 100.64/10 on a non-Tailscale adapter is unreachable from anywhere useful.
      if (inBlock && !TAILSCALE_IFACE.test(name)) continue
      const tailscale = inBlock
      found.push({
        name,
        address: info.address,
        kind: tailscale ? 'tailscale' : 'lan',
        score: tailscale ? -1 : rank(name, info.address)
      })
    }
  }
  found.sort((a, b) => a.score - b.score)
  return found.map(({ name, address, kind }) => ({ name, address, kind }))
}

/**
 * Only answer devices on a private/local network - if the router ever
 * port-forwarded this port to the internet, a public address is refused
 * before the link token is even checked.
 */
export function isPrivateClientAddress(remote: string | undefined): boolean {
  if (!remote) return false
  const addr = remote.startsWith('::ffff:') ? remote.slice(7) : remote
  if (addr === '::1' || addr === '127.0.0.1') return true
  if (/^10\./.test(addr) || /^192\.168\./.test(addr) || /^169\.254\./.test(addr)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return true
  const lower = addr.toLowerCase()
  return lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')
}

/** Local addresses of this computer's Tailscale adapter(s). */
export function tailscaleLocalAddresses(ifaces: NodeJS.Dict<NetworkInterfaceInfo[]>): string[] {
  return rankLanAddresses(ifaces)
    .filter((a) => a.kind === 'tailscale')
    .map((a) => a.address)
}

function stripV4Mapped(addr: string): string {
  return addr.startsWith('::ffff:') ? addr.slice(7) : addr
}

/**
 * Who may talk to the phone server. A Tailscale-range source is only accepted
 * when the connection actually arrived on this computer's Tailscale adapter
 * (not a carrier-NAT interface that happens to use the same block).
 */
export function isAllowedClient(
  remote: string | undefined,
  local: string | undefined,
  tailscaleLocals: string[]
): boolean {
  if (!remote) return false
  const r = stripV4Mapped(remote)
  if (isTailscaleAddress(r)) return !!local && tailscaleLocals.includes(stripV4Mapped(local))
  return isPrivateClientAddress(remote)
}

export function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function buildPhoneAiPrompt(port: number): string {
  return `I use a Windows desktop app called Renvor (jobsite walks, superintendent scoring, action items). It has a "Phone App" feature: when turned on, Renvor runs a small web server on this computer (port ${port}) and my phone opens a private link from Settings > Phone App, then I add it to my phone's home screen so it works like an app whenever this computer is on and Renvor is open. I want it to work from anywhere (not just my home Wi-Fi) using Tailscale, so the link uses this computer's Tailscale address (100.x.y.z).

Help me get it working, one step at a time, and ask me before running anything. Please:
1. Confirm Tailscale is installed and signed in on this computer AND on my phone, with the SAME account, and that it's switched on on the phone (VPN icon showing). Check with: tailscale status  (or the Tailscale tray icon).
2. Windows Firewall usually blocks Tailscale traffic to apps. Walk me through adding ONE narrow inbound rule for TCP port ${port} from the Tailscale range only (PowerShell as Administrator):
   New-NetFirewallRule -DisplayName "Renvor phone (Tailscale)" -Direction Inbound -Protocol TCP -LocalPort ${port} -RemoteAddress 100.64.0.0/10 -Action Allow
   Explain what it does first. Do NOT tell me to turn the firewall off.
3. Check the server is listening (netstat -ano | findstr :${port}) and that this computer's Tailscale address matches the one in the link (tailscale ip -4).
4. Walk me through "Add to Home Screen": iPhone must use Safari (Share > Add to Home Screen); Android uses Chrome (menu > Add to Home screen or Install app).
5. If it fails, help me tell apart: Tailscale off on the phone, computer asleep or Renvor closed, firewall rule missing, or wrong address. The same-Wi-Fi link (192.168.x.x) also works at home as a fallback.

Don't ask me to paste the private link anywhere - it works like a password for my data.`
}

export function buildCustomizePrompt(opts: { sourceFolder: string; dataFolder: string }): string {
  return `I installed a Windows desktop app called Renvor (jobsite walks, superintendent scoring, action items, leadership reports, an MCP connector for Claude, and a phone web app). I want to change how it works. You are my coding assistant - explain things in plain language, make small careful changes, and ask before anything risky.

WHERE THINGS ARE
- App source code (editable copy): ${opts.sourceFolder}
- My data (projects, walks, scores, settings) lives in: ${opts.dataFolder} - a SQLite file plus automatic backups. Changing the code never touches it, but ALWAYS tell me to make a manual backup first (app > Settings > Backup & Data) before any change that touches the database structure.

FIRST-TIME SETUP (do this for me, explaining each step)
1. Make sure Node.js 20+ and git are installed (install the LTS from nodejs.org if not).
2. In the source folder run: git init && git add -A && git commit -m "original" - so every change can be undone.
3. npm install  (its postinstall rebuilds the database module for Electron; if it errors with "Could not find Visual Studio", follow README.md > Troubleshooting instead of installing Visual Studio).
4. npm run dev  - opens the app with live reload so I can see changes as you make them.

HOW THE CODE IS ORGANIZED (Electron + React + TypeScript + SQLite)
- src/renderer - the screens (React + Tailwind). Pages in src/renderer/src/pages, settings panels in pages/settings, colors in src/renderer/src/theme/tokens.css.
- src/main - the backend inside the app: database (src/main/db, Drizzle ORM; never hand-edit the drizzle/ migration files - run npm run db:generate after changing db/schema.ts), message handlers (src/main/ipc/registerIpc.ts), PDF export, backups, phone web server (src/main/phone), MCP server (src/main/mcp + src/mcp/tools.ts).
- src/shared - types and rules shared by everything: ipc-contract.ts (every message the screens can send + its validation), scoring.ts (all scoring/red-flag math, with tests), apiBridge.ts (the screen-to-backend method list).
- To add a feature that reads/writes data: add the DB change (schema.ts + npm run db:generate), a validated message in ipc-contract.ts, a handler in registerIpc.ts, a method in apiBridge.ts plus the GsApi interface in src/renderer/src/lib/gsApi.ts, then the screen. The phone app and the Claude connector reuse the same handlers automatically.
- Checks to run after changes: npm run typecheck, npm test.

GIVING ME THE CHANGED APP
- npm run build:win creates a new installer in the release folder (Windows "Developer Mode" must be on: Settings > Privacy & security > For developers). I run that installer over my existing install - my data is kept.

Start by asking me what I want to change, then propose the smallest change that does it and show me what you'll edit before you edit.`
}
