import { useState } from 'react';
import { X, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import useAuthStore from '@/lib/authStore';
import { authApi } from '@/lib/api';
import useCartStore from '@/lib/cartStore';

const TABS = { signin: 'signin', signup: 'signup', forgot: 'forgot' };

export default function AuthModal({ open, onClose, initialTab = 'signin' }) {
  const [tab, setTab] = useState(initialTab);
  const [showPw, setShowPw] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, signup, isLoading } = useAuthStore();
  const { fetchCart } = useCartStore();

  const [form, setFormState] = useState({
    email: '', password: '', firstName: '', lastName: '', forgotEmail: '',
  });

  const setField = (k, v) => setFormState((f) => ({ ...f, [k]: v }));

  const handleSignin = async (e) => {
    e.preventDefault();
    const result = await login({ email: form.email, password: form.password });
    if (result.success) {
      toast.success('Welcome back!');
      await fetchCart();
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const result = await signup({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
    });
    if (result.success) {
      toast.success(result.message || 'Account created! Check your email to verify.');
      await fetchCart();
      onClose();
    } else {
      if (result.details) {
        result.details.forEach((d) => toast.error(d.message));
      } else {
        toast.error(result.message);
      }
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(form.forgotEmail);
      setForgotSent(true);
    } catch {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      data-testid="auth-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md glass rounded-2xl p-8 shadow-2xl fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
          data-testid="auth-modal-close"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight">
            {tab === TABS.signin && 'Welcome back'}
            {tab === TABS.signup && 'Create account'}
            {tab === TABS.forgot && 'Reset password'}
          </h2>
          <p className="text-[13px] text-neutral-500 mt-1">
            {tab === TABS.signin && 'Sign in to access your orders and account'}
            {tab === TABS.signup && 'Join Reflexity RAM — track orders, get alerts'}
            {tab === TABS.forgot && "We'll send a reset link to your email"}
          </p>
        </div>

        {/* Tab switcher */}
        {tab !== TABS.forgot && (
          <div className="flex gap-1 mb-6 p-1 glass rounded-xl">
            {[TABS.signin, TABS.signup].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-[13px] font-medium rounded-lg transition-all ${
                  tab === t
                    ? 'bg-white/8 text-white border border-white/12'
                    : 'text-neutral-400 hover:text-white'
                }`}
                data-testid={`auth-tab-${t}`}
              >
                {t === TABS.signin ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>
        )}

        {/* Sign In Form */}
        {tab === TABS.signin && (
          <form onSubmit={handleSignin} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              className="input"
              required
              autoComplete="email"
              data-testid="signin-email"
            />
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                className="input pr-10"
                required
                autoComplete="current-password"
                data-testid="signin-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTab(TABS.forgot)}
              className="text-[12px] text-neutral-400 hover:text-white text-left transition-colors"
            >
              Forgot password?
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary mt-1 flex items-center justify-center gap-2"
              data-testid="signin-submit"
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              Sign in
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === TABS.signup && (
          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                className="input"
                required
                data-testid="signup-firstname"
              />
              <input
                type="text"
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                className="input"
                required
                data-testid="signup-lastname"
              />
            </div>
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              className="input"
              required
              autoComplete="email"
              data-testid="signup-email"
            />
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password (min 8 chars, 1 uppercase, 1 number)"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                className="input pr-10"
                required
                minLength={8}
                autoComplete="new-password"
                data-testid="signup-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-600">
              By creating an account you agree to our{' '}
              <a href="/terms" className="text-neutral-400 hover:text-white underline">Terms</a>{' '}
              and{' '}
              <a href="/privacy" className="text-neutral-400 hover:text-white underline">Privacy Policy</a>.
            </p>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary mt-1 flex items-center justify-center gap-2"
              data-testid="signup-submit"
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              Create account
            </button>
          </form>
        )}

        {/* Forgot Password */}
        {tab === TABS.forgot && (
          <>
            {forgotSent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle size={40} className="text-emerald-400" />
                <div>
                  <p className="font-semibold">Check your inbox</p>
                  <p className="text-[13px] text-neutral-400 mt-1">
                    If an account exists for <strong>{form.forgotEmail}</strong>, a reset link has been sent. Check your spam folder too.
                  </p>
                </div>
                <button
                  onClick={() => { setTab(TABS.signin); setForgotSent(false); }}
                  className="btn-secondary text-[13px]"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.forgotEmail}
                  onChange={(e) => setField('forgotEmail', e.target.value)}
                  className="input"
                  required
                  data-testid="forgot-email"
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary flex items-center justify-center gap-2"
                  data-testid="forgot-submit"
                >
                  {forgotLoading && <Loader2 size={15} className="animate-spin" />}
                  Send reset link
                </button>
                <button
                  type="button"
                  onClick={() => setTab(TABS.signin)}
                  className="btn-ghost text-[13px]"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
