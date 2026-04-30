import React from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useAuth} from '../auth';
import {register} from '../services/api';

export default function RegisterPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="card" style={{maxWidth: 520, margin: '0 auto'}}>
      <div className="stack">
        <div>
          <div style={{fontSize: 20, fontWeight: 800}}>Register</div>
          <div className="muted">First user becomes admin. Keep it simple for local MVP.</div>
        </div>

        <div className="stack">
          <div>
            <div className="muted" style={{fontSize: 13}}>
              Email
            </div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <div className="muted" style={{fontSize: 13}}>
              Password
            </div>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>
        </div>

        {error ? <div style={{color: '#b91c1c'}}>{error}</div> : null}

        <div className="row" style={{justifyContent: 'space-between'}}>
          <button
            className="btn"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const res = await register(email, password);
                auth.setAuth({token: res.token, user: res.user});
                nav('/sandboxes');
              } catch (e: any) {
                setError(String(e?.message ?? e));
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>

          <Link to="/login" className="muted">
            Already have an account?
          </Link>
        </div>
      </div>
    </div>
  );
}

