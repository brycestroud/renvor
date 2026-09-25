/**
 * Shared print-page chrome: white paper background regardless of app theme,
 * black text, no sidebar. Matches the "report preview looks like an actual
 * piece of paper" guidance even though this route is only ever rendered
 * offscreen by webContents.printToPDF - the same styles apply when someone
 * opens the exported PDF.
 */
export function PrintLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      style={{
        background: '#ffffff',
        color: '#171b20',
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        minHeight: '100vh',
        padding: '36px 40px',
        fontSize: 12,
        lineHeight: 1.5
      }}
    >
      {children}
    </div>
  )
}

export function PrintHeading({ children }: { children: React.ReactNode }): JSX.Element {
  return <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{children}</h1>
}

export function PrintSection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <section style={{ marginTop: 20 }}>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: '#59616b',
          borderBottom: '1px solid #d9dddf',
          paddingBottom: 4,
          marginBottom: 10
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

export function scoreColor(score: number | null): string {
  if (score == null) return '#838b94'
  if (score >= 4) return '#1f9d6c'
  if (score >= 3) return '#b8860f'
  return '#d43e45'
}
