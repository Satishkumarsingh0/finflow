import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/apiClient';
import { ChevronRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [forgotMode, setForgotMode] = useState(false);
  const [email, setEmail] = useState('admin@finflow.test');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (forgotMode) {
        const res = await authApi.forgotPassword(email);
        setSuccessMsg(res.message || 'Password reset link sent to your email.');
      } else {
        const authData = await authApi.login({ email, password });
        login(authData);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-header">
          <div className="brand-mark">F</div>
          <span>finflow</span>
        </div>

        <div className="brand-copy">
          <p className="eyebrow-light">COMPANY FINANCE PLATFORM</p>
          <h1>
            Every rupee,<br />
            clearly managed.
          </h1>
          <small>
            Real-time ledger entries, cash flow tracking, business party management,
            and role-based team permissions.
          </small>
        </div>
      </section>

      <section className="login-card-container">
        <div className="login-card">
          <div className="login-card-header">
            <p className="eyebrow">WELCOME BACK</p>
            <h2>{forgotMode ? 'Recover your password' : 'Sign in to Finflow'}</h2>
            <p className="muted">
              {forgotMode
                ? 'Enter your registered email address to receive reset instructions.'
                : 'Enter your credentials to access your financial workspace.'}
            </p>
          </div>

          {error && (
            <div className="form-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="form-alert success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Email address
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            {!forgotMode && (
              <label>
                Password
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </label>
            )}

            <div className="login-form-options">
              <button
                type="button"
                className="link-btn text-left"
                onClick={() => {
                  setForgotMode(!forgotMode);
                  setError('');
                  setSuccessMsg('');
                }}
              >
                {forgotMode ? (
                  <span className="flex-center">
                    <ArrowLeft size={14} /> Back to sign in
                  </span>
                ) : (
                  'Forgot password?'
                )}
              </button>
            </div>

            <button type="submit" className="primary full" disabled={loading}>
              <span>{loading ? 'Please wait…' : forgotMode ? 'Send reset link' : 'Sign in'}</span>
              {!loading && <ChevronRight size={17} />}
            </button>
          </form>

          {!forgotMode && (
            <div className="demo-credentials-box">
              <p className="demo-title">Default Admin Demo:</p>
              <div
                className="demo-pill"
                onClick={() => handleQuickDemo('admin@finflow.test', 'Admin@123')}
                title="Click to fill credentials"
              >
                <span>admin@finflow.test</span> / <span>Admin@123</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
