import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useAuthStore from '@/lib/authStore';
import useCartStore from '@/lib/cartStore';

const ERROR_MESSAGES = {
  google_denied:         'Google sign-in was cancelled.',
  token_exchange_failed: 'Google sign-in failed. Please try again.',
  no_email:              'Could not retrieve your email from Google.',
  account_deactivated:   'This account has been deactivated.',
  state_mismatch:        'Security check failed. Please try signing in again.',
  server_error:          'Something went wrong. Please try again.',
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const setGoogleAuth = useAuthStore((s) => s.setGoogleAuth);
  const fetchCart = useCartStore((s) => s.fetchCart);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    window.history.replaceState({}, '', '/auth/callback');

    const authError = params.get('auth_error');
    if (authError) {
      toast.error(ERROR_MESSAGES[authError] || 'Authentication failed.');
      navigate('/', { replace: true });
      return;
    }

    const token   = params.get('token');
    const userRaw = params.get('user');

    if (!token || !userRaw) {
      toast.error('Authentication failed. Please try again.');
      navigate('/', { replace: true });
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw));
      setGoogleAuth(token, user);
      fetchCart();
      toast.success(`Welcome, ${user.firstName}!`);
      navigate('/', { replace: true });
    } catch {
      toast.error('Authentication failed. Please try again.');
      navigate('/', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-neutral-400">Signing you in with Google...</p>
      </div>
    </div>
  );
}
