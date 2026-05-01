import {Link, useLocation} from 'react-router-dom';
import {useAuth} from '../auth';

export default function Layout(props: {children: React.ReactNode}) {
  const auth = useAuth();
  const loc = useLocation();

  const active = (path: string) => (loc.pathname.startsWith(path) ? {fontWeight: 700} : undefined);

  return (
    <div>
      <div style={{borderBottom: '1px solid #e2e8f0', background: 'white'}}>
        <div className="container">
          <div className="row" style={{justifyContent: 'space-between'}}>
            <div className="row" style={{gap: 16}}>
              <Link to="/" style={{fontWeight: 800}}>
                SecureSandboxHub
              </Link>
              {auth.token ? (
                <>
                  <Link to="/sandboxes" style={active('/sandboxes')}>
                    Sandboxes
                  </Link>
                  <Link to="/monitoring" style={active('/monitoring')}>
                    Monitoring
                  </Link>
                  <Link to="/mcp" style={active('/mcp')}>
                    MCP Testing
                  </Link>
                  <Link to="/policies" style={active('/policies')}>
                    Policies
                  </Link>
                </>
              ) : null}
            </div>
            <div className="row">
              {auth.token ? (
                <button className="btn secondary" onClick={auth.logout}>
                  Logout
                </button>
              ) : (
                <>
                  <Link className="btn secondary" to="/login">
                    Login
                  </Link>
                  <Link className="btn" to="/register">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="container">{props.children}</div>
    </div>
  );
}
