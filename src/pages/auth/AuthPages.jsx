// ── Auth Pages: Login, Register, Forgot Password, Reset ──────────
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signIn, signUp, forgotPassword, resetPassword, signInWithGoogle } from '../../lib/auth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { trackLogin, trackSignUp } from '../../lib/analytics';

// Shared Google button — used on both Login and Register, since Supabase
// treats OAuth as "sign in or create" in a single step; there's no
// separate Google-specific signup flow to build. `mode` is analytics-only
// (tells us which page the click came from) and never affects the actual
// auth behavior — Supabase itself decides sign-in-vs-create.
//
// Tracked at the moment the redirect to Google is initiated, not after
// a confirmed return session: Supabase's OAuth flow takes the browser
// to a full-page redirect immediately on success, so there's no
// synchronous "it worked" moment in this component to hook into, and
// the shared /auth/callback landing page (used by OAuth, email
// verification, and password reset alike) has no reliable way to tell
// those flows apart after the fact.
function GoogleSignInButton({ redirect, onError, mode = 'login' }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    if (mode === 'signup') trackSignUp('google'); else trackLogin('google');
    const { error } = await signInWithGoogle(redirect);
    // On success the browser navigates away to Google immediately, so we
    // only ever reach this line on failure (e.g. provider not configured).
    if (error) { onError?.(error.message || 'Could not start Google sign-in.'); setLoading(false); }
  }

  return (
    <button type="button" className="auth-google-btn" onClick={handleClick} disabled={loading}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.3 35.4 26.8 36 24 36c-5.2 0-9.6-3.1-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.3C39.9 36.9 44 31.1 44 24c0-1.2-.1-2.4-.4-3.5z"/>
      </svg>
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </button>
  );
}

function AuthDivider() {
  return (
    <div className="auth-divider">
      <span />
      <span className="auth-divider-text">or</span>
      <span />
    </div>
  );
}

// Shared wrapper
function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <img src="/logo-r-monogram.png" alt="RacquetIn" className="auth-logo" />
        </Link>
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </div>
      <style>{`
        .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--gr-6); padding:24px; }
        .auth-card { background:var(--wh); border-radius:var(--r); padding:48px; width:100%; max-width:420px; border:1px solid var(--gr-5); }
        .auth-brand { display:flex; justify-content:center; margin-bottom:32px; }
        .auth-logo  { width:48px; height:48px; object-fit:contain; margin-bottom:8px; }
        .auth-title { font-size:clamp(20px,3vw,26px); font-weight:700; letter-spacing:-.03em; text-align:center; margin-bottom:6px; }
        .auth-subtitle { font-size:13px; color:var(--gr-2); text-align:center; margin-bottom:28px; }
        .auth-form { display:flex; flex-direction:column; gap:14px; }
        .auth-label { font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--gr-1); display:block; margin-bottom:5px; }
        .auth-error { padding:10px 14px; background:#fff5f5; border:1px solid #fecaca; border-radius:var(--r-sm); font-size:13px; color:#dc2626; }
        .auth-success { padding:10px 14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:var(--r-sm); font-size:13px; color:#16a34a; }
        .auth-footer { text-align:center; margin-top:20px; font-size:13px; color:var(--gr-2); }
        .auth-footer a { color:var(--cr); font-weight:500; }
        .auth-google-btn {
          display:flex; align-items:center; justify-content:center; gap:10px;
          width:100%; padding:11px 16px; border:1.5px solid var(--gr-4); border-radius:var(--r-sm);
          font-size:14px; font-weight:600; color:var(--bk); background:var(--wh);
          transition:var(--trans);
        }
        .auth-google-btn:hover { border-color:var(--bk); background:var(--gr-6); }
        .auth-google-btn:disabled { opacity:.6; cursor:default; }
        .auth-divider { display:flex; align-items:center; gap:12px; margin:20px 0; }
        .auth-divider span:not(.auth-divider-text) { flex:1; height:1px; background:var(--gr-5); }
        .auth-divider-text { font-size:11px; color:var(--gr-3); text-transform:uppercase; letter-spacing:.08em; }
      `}</style>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────
export function LoginPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error: err } = await signIn({ email, password });
    setLoading(false);
    if (err) return setError(err.message);
    trackLogin('email');
    nav(redirect === 'checkout' ? '/checkout' : '/account');
  }

  return (
    <AuthShell title="Sign in" subtitle={redirect === 'checkout' ? 'Sign in to complete your order — your cart carries over.' : 'Welcome back to RacquetIn'}>
      <GoogleSignInButton redirect={redirect} onError={setError} mode="login" />
      <AuthDivider />
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="auth-error">{error}</div>}
        <div>
          <label className="auth-label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="auth-label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <motion.button className="btn btn-primary btn-full" type="submit" disabled={loading} whileTap={{ scale: .98 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </motion.button>
        <div className="auth-footer">
          <Link to="/auth/forgot-password">Forgot password?</Link>
        </div>
        <div className="auth-footer">
          New customer? <Link to={`/auth/register${redirect ? `?redirect=${redirect}` : ''}`}>Create account</Link>
        </div>
      </form>
    </AuthShell>
  );
}

// ── Register ──────────────────────────────────────────────────────
export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const loginHref = `/auth/login${redirect ? `?redirect=${redirect}` : ''}`;
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError(''); setLoading(true);
    const { error: err } = await signUp({ email, password, name });
    setLoading(false);
    if (err) return setError(err.message);
    trackSignUp('email');
    setSuccess(true);
  }

  if (success) return (
    <AuthShell title="Check your email" subtitle="We sent a verification link to your inbox.">
      <div className="auth-success" style={{ textAlign: 'center' }}>
        Verify your email to complete registration.
        <div style={{ marginTop: 16 }}><Link to={loginHref} className="btn btn-primary btn-sm">Go to Login</Link></div>
      </div>
    </AuthShell>
  );

  return (
    <AuthShell title="Create account" subtitle="Join RacquetIn for order history and wishlist sync">
      <GoogleSignInButton redirect={redirect} onError={setError} mode="signup" />
      <AuthDivider />
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="auth-error">{error}</div>}
        <div>
          <label className="auth-label">Full Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="auth-label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="auth-label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          <div className="t-small" style={{ marginTop: 4 }}>Minimum 8 characters</div>
        </div>
        <motion.button className="btn btn-primary btn-full" type="submit" disabled={loading} whileTap={{ scale: .98 }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </motion.button>
        <div className="auth-footer">
          Already have an account? <Link to={loginHref}>Sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}

// ── Forgot Password ───────────────────────────────────────────────
export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await forgotPassword(email);
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthShell title="Reset password" subtitle="Enter your email and we'll send a reset link.">
      {sent ? (
        <div className="auth-success">Check your inbox for a password reset link.</div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="auth-label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <motion.button className="btn btn-primary btn-full" type="submit" disabled={loading} whileTap={{ scale: .98 }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </motion.button>
          <div className="auth-footer"><Link to="/auth/login">Back to login</Link></div>
        </form>
      )}
    </AuthShell>
  );
}

// ── Reset Password ────────────────────────────────────────────────
export function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 8)  return setError('Password must be at least 8 characters.');
    setError(''); setLoading(true);
    const { error: err } = await resetPassword(password);
    setLoading(false);
    if (err) return setError(err.message);
    nav('/auth/login');
  }

  return (
    <AuthShell title="New password" subtitle="Choose a strong new password.">
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="auth-error">{error}</div>}
        <div>
          <label className="auth-label">New Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus />
        </div>
        <div>
          <label className="auth-label">Confirm Password</label>
          <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        </div>
        <motion.button className="btn btn-primary btn-full" type="submit" disabled={loading} whileTap={{ scale: .98 }}>
          {loading ? 'Updating...' : 'Update Password'}
        </motion.button>
      </form>
    </AuthShell>
  );
}

// ── Auth Callback ────────────────────────────────────────────────
// Supabase redirects here after email verification (signUp's
// emailRedirectTo) — and can also land here for other email link
// flows. Reads whatever Supabase put in the URL (PKCE ?code= or an
// already-parsed hash session), establishes the session, and moves
// the user on. Never assumes a fixed host — origin is read at
// runtime via window.location.origin wherever this URL is built.
export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setStatus('error');
          setMessage("Authentication isn't configured yet.");
        }
        return;
      }

      const url = new URL(window.location.href);
      const errorDescription = url.searchParams.get('error_description') || url.searchParams.get('error');
      if (errorDescription) {
        if (!cancelled) {
          setStatus('error');
          setMessage(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
        }
        return;
      }

      try {
        // PKCE flow: URL carries ?code=... and must be exchanged explicitly.
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        }

        // Implicit flow (#access_token=...) is auto-parsed by the Supabase
        // client on load (detectSessionInUrl: true) — either way, by now
        // the session should be readable.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          if (!cancelled) setStatus('success');
          setTimeout(() => { if (!cancelled) navigate(redirect === 'checkout' ? '/checkout' : '/account'); }, 1500);
        } else {
          if (!cancelled) {
            setStatus('error');
            setMessage('This link is invalid or has expired.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err.message || 'Verification failed.');
        }
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <AuthShell
      title={status === 'loading' ? 'Verifying your email' : status === 'success' ? 'Email verified' : 'Verification failed'}
      subtitle={
        status === 'loading' ? 'Hang tight while we confirm your account.' :
        status === 'success' ? "You're all set — taking you to your account." :
        null
      }
    >
      {status === 'loading' && (
        <div className="auth-callback-spinner" aria-hidden="true" />
      )}
      {status === 'success' && (
        <div className="auth-success" style={{ textAlign: 'center' }}>
          Redirecting to your account…
        </div>
      )}
      {status === 'error' && (
        <div>
          <div className="auth-error">{message || 'This link is invalid or has expired.'}</div>
          <div className="auth-footer" style={{ marginTop: 20 }}>
            <Link to="/auth/login" className="btn btn-primary btn-full">Back to Sign In</Link>
          </div>
        </div>
      )}
      <style>{`
        .auth-callback-spinner {
          width: 28px; height: 28px; margin: 8px auto 4px;
          border: 2px solid var(--gr-4); border-top-color: var(--cr);
          border-radius: 50%; animation: auth-spin .8s linear infinite;
        }
        @keyframes auth-spin { to { transform: rotate(360deg); } }
      `}</style>
    </AuthShell>
  );
}
