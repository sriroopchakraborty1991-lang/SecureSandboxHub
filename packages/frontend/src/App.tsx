import {Navigate, Route, Routes, useLocation} from 'react-router-dom';
import {AuthProvider, useAuth} from './auth';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import PoliciesPage from './pages/Policies';
import SandboxesPage from './pages/Sandboxes';
import SandboxDetailPage from './pages/SandboxDetail';
import MonitoringPage from './pages/Monitoring';

function RequireAuth(props: {children: React.ReactNode}) {
  const auth = useAuth();
  const loc = useLocation();
  if (!auth.token) return <Navigate to="/login" replace state={{from: loc.pathname}} />;
  return <>{props.children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/sandboxes" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/policies"
            element={
              <RequireAuth>
                <PoliciesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/sandboxes"
            element={
              <RequireAuth>
                <SandboxesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/monitoring"
            element={
              <RequireAuth>
                <MonitoringPage />
              </RequireAuth>
            }
          />
          <Route
            path="/sandboxes/:id"
            element={
              <RequireAuth>
                <SandboxDetailPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
