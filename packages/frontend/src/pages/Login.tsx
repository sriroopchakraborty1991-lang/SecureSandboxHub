import React from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useAuth} from '../auth';
import {login} from '../services/api';
import AuthHeroArt from '../components/AuthHeroArt';
import GolemLogo from '../components/GolemLogo';

export default function LoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="auth-shell">
      <div className="auth-bg">
        <div className="auth-corner auth-cornerA" />
        <div className="auth-corner auth-cornerB" />
        <div className="auth-corner auth-cornerC" />
        <div className="auth-grain" />
        <AuthHeroArt />
      </div>

      <div className="auth-pillbar">
        <div className="auth-pillbarInner">
          <Link to="/" className="auth-pillbrand">
            <GolemLogo size={26} />
          </Link>
          <div className="auth-pillactions">
            <Link to="/register" className="auth-pillCta auth-pillCtaOutline">
              Create account
            </Link>
          </div>
        </div>
      </div>

      <div className="auth-main">
        <div className="auth-grid">
          <div className="auth-hero">
            <div className="auth-kicker">MCP Security Testing Workbench</div>
            <h1 className="auth-h1">
              Secure the MCP Toolchain.
              <br />
              Test. Detect drift. Export evidence.
            </h1>
            <p className="auth-sub">
              Inventory tools, run lightweight checks, and generate shareable findings—before risky agents ship.
            </p>

            <div className="auth-ctaRow">
              <a
                className="auth-cta auth-ctaPrimary"
                href="#golem_signin"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('golem_signin')?.scrollIntoView({behavior: 'smooth', block: 'start'});
                  setTimeout(() => document.getElementById('golem_email')?.focus(), 250);
                }}
              >
                Sign in
              </a>
              <Link className="auth-cta auth-ctaGhost" to="/register">
                Create account
              </Link>
            </div>

            <div className="auth-chips">
              <span className="auth-chip">Tool pinning (hash)</span>
              <span className="auth-chip">Drift alerts</span>
              <span className="auth-chip">Real-time monitoring</span>
              <span className="auth-chip">Deterministic risk score</span>
              <span className="auth-chip">SQLite local storage</span>
            </div>
          </div>

          <div className="auth-formWrap" id="golem_signin">
            <div className="auth-card">
              <div className="auth-cardTop">
                <div className="auth-cardTitle">Sign in</div>
                <div className="auth-cardHint">Use your account to run MCP scans and export reports.</div>
              </div>

              <div className="auth-field">
                <div className="auth-label">Email</div>
                <input
                  id="golem_email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <div className="auth-label">Password</div>
                <input
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                />
              </div>

              {error ? <div className="auth-error">{error}</div> : null}

              <button
                className="auth-submit"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const res = await login(email, password);
                    auth.setAuth({token: res.token, user: res.user});
                    nav('/sandboxes');
                  } catch (e: any) {
                    setError(String(e?.message ?? e));
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <div className="auth-under">
                <span className="muted">New here?</span>
                <Link to="/register" className="auth-link">
                  Create an account
                </Link>
              </div>

              <div className="auth-how">
                <div className="auth-howTitle">How it works</div>
                <div className="auth-steps">
                  <div className="auth-step">
                    <div className="auth-stepNum">1</div>
                    <div className="auth-stepTxt">Register an MCP server</div>
                  </div>
                  <div className="auth-step">
                    <div className="auth-stepNum">2</div>
                    <div className="auth-stepTxt">Import a tool manifest</div>
                  </div>
                  <div className="auth-step">
                    <div className="auth-stepNum">3</div>
                    <div className="auth-stepTxt">Run scans (static + drift)</div>
                  </div>
                  <div className="auth-step">
                    <div className="auth-stepNum">4</div>
                    <div className="auth-stepTxt">Download findings.json + printable report</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
