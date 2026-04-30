import React from 'react';
import {createPolicy, listPolicies, listPolicyTemplates, type Policy, type PolicyRules} from '../services/api';

const defaultRules: PolicyRules = {allowNetwork: false, memoryLimitMb: 256, cpuLimit: 0.5, readOnlyRootFs: true};

export default function PoliciesPage() {
  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [templates, setTemplates] = React.useState<Array<{name: string; rules: PolicyRules}>>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>('');
  const [name, setName] = React.useState('');
  const [rules, setRules] = React.useState<PolicyRules>(defaultRules);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [p, t] = await Promise.all([listPolicies(), listPolicyTemplates()]);
    setPolicies(p);
    setTemplates(t);
  }, []);

  React.useEffect(() => {
    refresh().catch((e) => setError(String((e as any)?.message ?? e)));
  }, [refresh]);

  return (
    <div className="stack">
      <div className="row" style={{justifyContent: 'space-between'}}>
        <div>
          <div style={{fontSize: 20, fontWeight: 800}}>Policies</div>
          <div className="muted">Define sandbox constraints. Default is safe: no network + read-only.</div>
        </div>
      </div>

      <div className="card">
        <div className="stack">
          <div style={{fontWeight: 700}}>Create policy</div>

          <div className="row">
            <input className="input" style={{flex: 1}} value={name} onChange={(e) => setName(e.target.value)} placeholder="Policy name" />

            <select
              className="input"
              style={{maxWidth: 260}}
              onChange={(e) => {
                const t = templates.find((x) => x.name === e.target.value);
                if (!t) return;
                setSelectedTemplate(t.name);
                setRules(t.rules);
                if (!name.trim()) setName(t.name);
              }}
              value={selectedTemplate}
            >
              <option value="" disabled>
                Use template…
              </option>
              {templates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="row">
            <label className="row" style={{gap: 8}}>
              <input type="checkbox" checked={rules.allowNetwork} onChange={(e) => setRules({...rules, allowNetwork: e.target.checked})} />
              Allow network
            </label>
            <label className="row" style={{gap: 8}}>
              <input type="checkbox" checked={rules.readOnlyRootFs} onChange={(e) => setRules({...rules, readOnlyRootFs: e.target.checked})} />
              Read-only root FS
            </label>
          </div>

          <div className="row">
            <div style={{flex: 1}}>
              <div className="muted" style={{fontSize: 13}}>
                Memory limit (MB)
              </div>
              <input
                className="input"
                type="number"
                value={rules.memoryLimitMb}
                onChange={(e) => setRules({...rules, memoryLimitMb: Number(e.target.value)})}
                min={64}
                max={8192}
              />
            </div>
            <div style={{flex: 1}}>
              <div className="muted" style={{fontSize: 13}}>
                CPU limit
              </div>
              <input className="input" type="number" value={rules.cpuLimit} onChange={(e) => setRules({...rules, cpuLimit: Number(e.target.value)})} min={0.1} max={8} step={0.1} />
            </div>
          </div>

          {error ? <div style={{color: '#b91c1c'}}>{error}</div> : null}

          <div className="row">
            <button
              className="btn"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await createPolicy({name: name || 'Untitled Policy', rules});
                  setName('');
                  setRules(defaultRules);
                  setSelectedTemplate('');
                  await refresh();
                } catch (e: any) {
                  setError(String(e?.message ?? e));
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="stack">
          <div style={{fontWeight: 700}}>Existing policies</div>
          {policies.length === 0 ? (
            <div className="muted">No policies yet.</div>
          ) : (
            <div className="stack">
              {policies.map((p) => (
                <div key={p.id} className="card" style={{padding: 12}}>
                  <div className="row" style={{justifyContent: 'space-between'}}>
                    <div>
                      <div style={{fontWeight: 800}}>{p.name}</div>
                      <div className="muted" style={{fontSize: 13}}>
                        {p.id}
                      </div>
                    </div>
                    <div className="row">
                      <span className="badge">{p.rules.allowNetwork ? 'network:on' : 'network:off'}</span>
                      <span className="badge">{p.rules.readOnlyRootFs ? 'ro:true' : 'ro:false'}</span>
                      <span className="badge">{p.rules.memoryLimitMb}MB</span>
                      <span className="badge">cpu:{p.rules.cpuLimit}</span>
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
