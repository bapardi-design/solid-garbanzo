/**
 * The door. Deliberately says as little as possible about what is behind it.
 */
export default async function Gate({ searchParams }: { searchParams: Promise<{ next?: string; wrong?: string }> }) {
  const { next = '/', wrong } = await searchParams;
  return (
    <main className="gate">
      <form method="post" action="/api/gate" className="panel">
        <header><h3>Touchline</h3><span className="muted">an unfinished football manager</span></header>
        <div className="body stack">
          <p className="muted">This one is not public yet. If you were given a password, it goes here.</p>
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" autoFocus required />
          </div>
          {wrong ? <p className="notice">That is not it. Try again.</p> : null}
          <button className="btn primary" type="submit">Come in</button>
        </div>
      </form>
    </main>
  );
}
