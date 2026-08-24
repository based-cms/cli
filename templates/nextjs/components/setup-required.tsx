export function SetupRequired({
  hasSlug,
  hasKey,
  keyInvalid,
}: {
  hasSlug: boolean
  hasKey: boolean
  keyInvalid: boolean
}) {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Almost there</h1>
      <p style={{ color: '#666' }}>
        This app is wired for Based CMS but isn&apos;t configured yet:
      </p>
      <ul style={{ color: '#666', lineHeight: 1.8 }}>
        <li>
          <code>BASED_CMS_SLUG</code>{' '}
          {hasSlug ? 'is set' : <strong>is missing</strong>}
        </li>
        <li>
          <code>BASED_CMS_KEY</code>{' '}
          {keyInvalid ? (
            <strong>is set but invalid — re-copy it from the dashboard</strong>
          ) : hasKey ? (
            'is set'
          ) : (
            <strong>is missing</strong>
          )}
        </li>
      </ul>
      <p style={{ color: '#666' }}>
        Get both from your CMS dashboard under{' '}
        <strong>Project Settings</strong>, then add them to{' '}
        <code>.env.local</code> in the project root:
      </p>
      <pre
        style={{
          background: '#f5f5f5',
          borderRadius: 8,
          padding: '1rem',
          fontSize: 14,
          overflowX: 'auto',
        }}
      >
        {'BASED_CMS_SLUG=my-project\nBASED_CMS_KEY=bcms_test-...'}
      </pre>
      <p style={{ color: '#666' }}>
        Restart the dev server afterwards and this page will be replaced by
        your app.
      </p>
    </main>
  )
}
