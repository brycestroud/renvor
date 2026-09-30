import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import { gsApi } from '../../lib/gsApi'
import type { PhoneAccessInfo } from '@shared/ipc-contract'

const btn =
  'rounded-control border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-60'

const strong = 'font-semibold text-text-primary'

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds} seconds ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  return `${Math.round(minutes / 60)} hours ago`
}

function Step({
  n,
  title,
  children
}: {
  n: number
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <div className="mt-1 text-xs text-text-secondary">{children}</div>
      </div>
    </div>
  )
}

function QrCode({ url }: { url: string }): JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { margin: 2, width: 220, errorCorrectionLevel: 'M' })
      .then((d) => !cancelled && setDataUrl(d))
      .catch(() => !cancelled && setDataUrl(null))
    return () => {
      cancelled = true
    }
  }, [url])
  if (!dataUrl) return <div className="h-[220px] w-[220px] rounded-control bg-surface-2" />
  // White tile on purpose: phone cameras need dark-on-light regardless of app theme.
  return (
    <img src={dataUrl} alt="QR code for the phone link" className="h-[220px] w-[220px] rounded-control" />
  )
}

function OpenLinkBox({ info, mode }: { info: PhoneAccessInfo; mode: 'tailscale' | 'lan' }): JSX.Element {
  const [index, setIndex] = useState(0)
  const options = info.addresses.filter((a) => a.kind === mode)
  const chosen = options[index] ?? options[0]

  if (!chosen) {
    return mode === 'tailscale' ? (
      <p className="mt-2 flex items-center gap-1.5 text-warning">
        <Loader2 size={13} className="animate-spin" /> Waiting for Tailscale on this computer - finish
        step 1 and this code appears on its own.
      </p>
    ) : (
      <p className="mt-2 flex items-center gap-1.5 text-warning">
        <AlertTriangle size={13} /> No Wi-Fi/network address found - connect this computer to Wi-Fi or
        a network first.
      </p>
    )
  }
  return (
    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
      <QrCode url={chosen.url} />
      <div className="min-w-0 flex-1">
        <p className="text-text-muted">Or type this into your phone&apos;s browser:</p>
        <code className="mt-1 block break-all rounded-control border border-border-subtle bg-canvas px-3 py-2 font-mono text-[11px] text-text-primary">
          {chosen.url}
        </code>
        <div className="mt-2">
          <CopyButton text={chosen.url} label="Copy link" />
        </div>
        {options.length > 1 && (
          <label className="mt-3 flex flex-col gap-1 text-text-muted">
            This computer has more than one address - if the link doesn&apos;t open, try another:
            <select
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
              className="rounded-control border border-border bg-surface-2 px-2 py-1.5 text-xs text-text-primary"
            >
              {options.map((a, i) => (
                <option key={a.address} value={i}>
                  {a.address} ({a.name})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  )
}

export function PhoneSetupPanel(): JSX.Element {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'tailscale' | 'lan'>('tailscale')
  const [platform, setPlatform] = useState<'iphone' | 'android'>('iphone')
  const [showHelp, setShowHelp] = useState(false)
  const { data: info } = useQuery({
    queryKey: ['phone-info'],
    queryFn: () => gsApi().getPhoneInfo(),
    // Poll so Tailscale detection and the "phone connected" check update by themselves.
    refetchInterval: (q) => (q.state.data?.enabled ? 3000 : false)
  })

  const setInfo = (next: PhoneAccessInfo): void => {
    queryClient.setQueryData(['phone-info'], next)
  }
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => gsApi().setPhoneEnabled(enabled),
    onSuccess: setInfo
  })
  const reset = useMutation({ mutationFn: () => gsApi().resetPhoneLink(), onSuccess: setInfo })
  const autostart = useMutation({
    mutationFn: (enabled: boolean) => gsApi().setPhoneAutostart(enabled),
    onSuccess: setInfo
  })

  if (!info) return <p className="text-sm text-text-muted">Loading…</p>

  const connected = info.lastPhoneSeenAt !== null
  const tailscaleAddress = info.addresses.find((a) => a.kind === 'tailscale')

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Phone App</h2>
        <p className="mt-1 text-xs text-text-muted">
          Use Renvor from your phone like a normal app, from anywhere - same projects, walks, and
          scores as this computer, live. It uses Tailscale (free, private) so it works on any Wi-Fi
          or cellular, as long as this computer is on. Set up once; after that it just works.
        </p>
      </div>

      {!info.enabled ? (
        <div className="rounded-control border border-border-subtle bg-surface-2 p-4">
          <p className="text-sm font-semibold text-text-primary">Turn it on</p>
          <p className="mt-1 text-xs text-text-secondary">
            This starts a private link on this computer. It stays off until you turn it on, and
            only your own devices (through Tailscale) or devices on your Wi-Fi that have your
            secret link can open it. Turning it on also keeps Renvor running in the system tray
            when you close the window, so your phone keeps working.
          </p>
          <button
            onClick={() => toggle.mutate(true)}
            disabled={toggle.isPending}
            className="mt-3 rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {toggle.isPending ? 'Turning on…' : 'Set up phone app'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-control border border-border-subtle bg-surface-2 p-4">
          {info.error && (
            <p className="flex items-center gap-1.5 text-xs text-danger">
              <AlertTriangle size={13} /> {info.error}
            </p>
          )}
          {!info.appFilesAvailable && (
            <p className="flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle size={13} /> The phone app files aren&apos;t built yet - run{' '}
              <code className="font-mono">npm run build</code> once, then reload the phone page.
            </p>
          )}

          <Step n={1} title="Install Tailscale on this computer and your phone">
            {info.tailscaleDetected ? (
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 size={14} /> Tailscale is running on this computer
                {tailscaleAddress ? ` (${tailscaleAddress.address})` : ''}.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-warning">
                <Loader2 size={14} className="animate-spin" /> Tailscale not detected on this
                computer yet - this turns green by itself once it&apos;s running.
              </span>
            )}
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>
                <span className={strong}>This computer:</span> install Tailscale from{' '}
                <span className={strong}>tailscale.com/download</span> and sign in (Google,
                Microsoft, Apple, or GitHub - any is fine).
              </li>
              <li>
                <span className={strong}>Your phone:</span> install the{' '}
                <span className={strong}>Tailscale</span> app (App Store / Google Play), sign in
                with the <span className={strong}>same account</span>, and switch it on.
              </li>
            </ol>
          </Step>

          <Step n={2} title="Allow it through Windows Firewall (one time)">
            Windows blocks Tailscale traffic to apps by default. This one rule opens just this
            app&apos;s port, and only to your Tailscale devices - nothing else.
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>
                Press the Windows key, type <span className={strong}>PowerShell</span>, right-click
                it, and choose <span className={strong}>Run as administrator</span>.
              </li>
              <li>Paste this, press Enter, and close the window:</li>
            </ol>
            <code className="mt-2 block break-all rounded-control border border-border-subtle bg-canvas px-3 py-2 font-mono text-[11px] text-text-primary">
              {info.firewallCommand}
            </code>
            <div className="mt-2">
              <CopyButton text={info.firewallCommand} label="Copy command" />
            </div>
          </Step>

          <Step n={3} title="Scan this code with your phone's camera">
            <div className="mb-2 flex gap-2">
              {(
                [
                  ['tailscale', 'Anywhere (Tailscale)'],
                  ['lan', 'Same Wi-Fi only']
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-control border px-3 py-1 text-xs transition-colors ${
                    mode === m
                      ? 'border-brand-border bg-brand-muted text-brand'
                      : 'border-border bg-surface-1 text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === 'tailscale'
              ? 'Make sure Tailscale is switched on in your phone, then open the camera, point it at the code, and tap the link. This link keeps working on any network.'
              : 'Only works while your phone is on the same Wi-Fi as this computer - use this if you skip Tailscale.'}
            <OpenLinkBox info={info} mode={mode} />
          </Step>

          <Step n={4} title="Add it to your Home Screen">
            <div className="mb-2 flex gap-2">
              {(['iphone', 'android'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`rounded-control border px-3 py-1 text-xs transition-colors ${
                    platform === p
                      ? 'border-brand-border bg-brand-muted text-brand'
                      : 'border-border bg-surface-1 text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {p === 'iphone' ? 'iPhone' : 'Android'}
                </button>
              ))}
            </div>
            {platform === 'iphone' ? (
              <ol className="list-inside list-decimal space-y-1">
                <li>
                  Make sure the link is open in <span className={strong}>Safari</span> (not Chrome or
                  the camera&apos;s preview).
                </li>
                <li>
                  Tap the <span className={strong}>Share</span> button (square with an arrow), scroll
                  down, tap <span className={strong}>Add to Home Screen</span>, then{' '}
                  <span className={strong}>Add</span>.
                </li>
                <li>Open Renvor from your Home Screen - it now opens full screen like an app.</li>
              </ol>
            ) : (
              <ol className="list-inside list-decimal space-y-1">
                <li>
                  Open the link in <span className={strong}>Chrome</span>.
                </li>
                <li>
                  Tap the <span className={strong}>⋮</span> menu, then{' '}
                  <span className={strong}>Add to Home screen</span> (or{' '}
                  <span className={strong}>Install app</span> if shown), then confirm.
                </li>
                <li>
                  Open Renvor from your Home Screen. Android may show it as a shortcut that opens
                  with a small browser bar - it works the same.
                </li>
              </ol>
            )}
          </Step>

          <Step n={5} title="Confirm it's working">
            {connected ? (
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 size={14} /> Phone connected - last seen{' '}
                {timeAgo(info.lastPhoneSeenAt as string)}. You&apos;re done. Keep Tailscale switched
                on in your phone and this computer on, and it works anywhere.
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Waiting for your phone to open the
                link… this turns green the moment it does.
              </span>
            )}
          </Step>

          <div className="rounded-control border border-border-subtle bg-canvas p-3 text-xs">
            <p className="text-sm font-semibold text-text-primary">Keep it always available</p>
            <p className="mt-1 text-text-secondary">
              Closing Renvor&apos;s window now hides it to the system tray (bottom-right of the
              taskbar) so your phone keeps working - right-click the tray icon and choose{' '}
              <span className={strong}>Quit Renvor</span> to fully stop it. Also set Windows not to
              sleep while plugged in (Settings &gt; System &gt; Power), or the phone can&apos;t reach
              the computer.
            </p>
            {info.autostart.supported ? (
              <label className="mt-2 flex items-center gap-2 text-text-primary">
                <input
                  type="checkbox"
                  checked={info.autostart.enabled}
                  disabled={autostart.isPending}
                  onChange={(e) => autostart.mutate(e.target.checked)}
                />
                Start Renvor automatically when I sign in to Windows (hidden in the tray)
              </label>
            ) : (
              <p className="mt-2 text-text-muted">
                &quot;Start with Windows&quot; is available in the installed app (not this development
                copy).
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
        >
          {showHelp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Not working? Fixes, security notes, and an AI helper prompt
        </button>
        {showHelp && (
          <div className="mt-2 flex flex-col gap-4 rounded-control border border-border-subtle bg-surface-2 p-4 text-xs text-text-secondary">
            <div>
              <p className="font-semibold text-text-primary">Phone can&apos;t open the link</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                <li>
                  <span className={strong}>Tailscale off on the phone</span> is the usual cause -
                  open the Tailscale app and switch it on (you should see its key/VPN icon).
                </li>
                <li>
                  Both devices must be signed into the <span className={strong}>same Tailscale
                  account</span>. In the Tailscale app, this computer should appear in the device
                  list as connected.
                </li>
                <li>
                  The firewall rule in step 2 was skipped or failed - run it again in an{' '}
                  <span className={strong}>administrator</span> PowerShell.
                </li>
                <li>
                  This computer is asleep, off, or Renvor was quit from the tray. Check the tray
                  icon is there.
                </li>
                <li>
                  Using <span className={strong}>Same Wi-Fi only</span>? Guest networks and VPNs can
                  block phones from reaching computers, and the address can change - re-scan.
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-text-primary">Security</p>
              <p className="mt-1">
                Over Tailscale the connection is encrypted and only devices signed into your
                Tailscale account can reach this computer at all; the link also carries a long
                random secret stored on this computer - treat it like a password. Don&apos;t share
                your Tailscale device with people you don&apos;t want in your data. Lost a phone or
                shared the link by mistake? Reset it below - every phone using the old link stops
                working and you scan the new code.
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => reset.mutate()} disabled={reset.isPending} className={btn}>
                  {reset.isPending ? 'Resetting…' : 'Reset link'}
                </button>
                <button onClick={() => toggle.mutate(false)} disabled={toggle.isPending} className={btn}>
                  Turn off phone app
                </button>
              </div>
            </div>

            <div>
              <p className="font-semibold text-text-primary">Ask an AI assistant for help</p>
              <p className="mt-1">
                Paste this into Claude, ChatGPT, or any AI coding tool and it will walk you through
                it step by step. It doesn&apos;t include your private link.
              </p>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-control border border-border-subtle bg-canvas p-3 font-mono text-[11px] text-text-primary">
                {info.aiPrompt}
              </pre>
              <div className="mt-2">
                <CopyButton text={info.aiPrompt} label="Copy prompt" />
              </div>
            </div>

            <div>
              <p className="font-semibold text-text-primary">What works on the phone</p>
              <p className="mt-1">
                Everything you do day to day: dashboard, job walks, action items, reports on screen,
                checklist and people. Things that need this computer itself - saving PDFs, backups,
                the Claude connector, phone setup - stay on the desktop app.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
