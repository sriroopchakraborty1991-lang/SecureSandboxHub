import React from 'react';
import {Link} from 'react-router-dom';
import {createSandbox, listPolicies, listSandboxes, type Policy, type Sandbox} from '../services/api';

export default function SandboxesPage() {
  const [sandboxes, setSandboxes] = React.useState<Sandbox[]>([]);
  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [image, setImage] = React.useState('alpine:latest');
  const [command, setCommand] = React.useState('echo hello-from-sandbox');
  const [policyId, setPolicyId] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [s, p] = await Promise.all([listSandboxes(), listPolicies()]);
    setSandboxes(s);
    setPolicies(p);
    if (!policyId && p[0]) setPolicyId(p[0].id);
  }, [policyId]);

  React.useEffect(() => {
    refresh().catch((e) => setError(String((e as any)?.message ?? e)));
  }, [refresh]);

  return (
    <div className="stack">
      <div>
        <div style={{fontSize: 20, fontWeight: 800}}>Sandboxes</div>
        <div className="muted">Create a session, watch events live, then stop it.</div>
      </div>

      <div className="card">
        <div className="stack">
          <div style={{fontWeight: 700}}>Create sandbox</div>

          <div className="row">
            <div style={{flex: 1}}>
              <div className="muted" style={{fontSize: 13}}>
                Image
              </div>
              <input className="input" value={image} onChange={(e) => setImage(e.target.value)} />
            </div>
            <div style={{flex: 1}}>
              <div className="muted" style={{fontSize: 13}}>
                Policy
              </div>
              <select className="input" value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="muted" style={{fontSize: 13}}>
              Command (space-separated)
            </div>
            <input className="input" value={command} onChange={(e) => setCommand(e.target.value)} />
          </div>

          {policies.length === 0 ? <div style={{color: '#b91c1c'}}>Create a policy first.</div> : null}
          {error ? <div style={{color: '#b91c1c'}}>{error}</div> : null}

          <div className="row">
            <button
              className="btn"
              disabled={loading || policies.length === 0}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const parts = command.trim().split(/\s+/).filter(Boolean);
                  await createSandbox({image, policyId, command: parts.length ? parts : undefined});
                  await refresh();
                } catch (e: any) {
                  setError(String(e?.message ?? e));
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? 'Starting…' : 'Start sandbox'}
            </button>
            <button className="btn secondary" onClick={() => refresh()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="stack">
          <div style={{fontWeight: 700}}>Existing sessions</div>
          {sandboxes.length === 0 ? (
            <div className="muted">No sessions yet.</div>
          ) : (
            <div className="stack">
              {sandboxes.map((s) => (
                <div key={s.id} className="card" style={{padding: 12}}>
                  <div className="row" style={{justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <div className="stack" style={{gap: 4}}>
                      <Link to={`/sandboxes/${s.id}`} style={{fontWeight: 800}}>
                        {s.id}
                      </Link>
                      <div className="muted" style={{fontSize: 13}}>
                        image: <span className="mono">{s.image}</span>
                      </div>
                      <div className="muted" style={{fontSize: 13}}>
                        status: <span className="badge">{s.status}</span>
                      </div>
                    </div>
                    <div className="row">
                      <span className="badge">policy:{s.policyId.slice(0, 8)}…</span>
                      {s.command?.length ? <span className="badge">cmd:{s.command[0]}</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

