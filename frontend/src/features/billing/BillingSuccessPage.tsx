import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { billingApi } from '@/api/billing';
import { useAuth } from '@/hooks/use-auth';

type ConfirmState = 'idle' | 'loading' | 'success' | 'error' | 'missing' | 'needs_login';

/**
 * Landing page after a successful Stripe Checkout session.
 * Stripe redirects here with ?session_id=... and we proactively confirm it with
 * backend so billing status updates immediately even if webhook delivery is slow.
 *
 * Must wait for AuthProvider bootstrap — confirm requires a JWT, and the access
 * token only lands in memory after silent refresh from localStorage.
 */
export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const auth = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ConfirmState>(sessionId ? 'loading' : 'missing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const silentRefresh = auth.silentRefresh;

  const confirm = useCallback(async () => {
    if (!sessionId) {
      setState('missing');
      return;
    }

    setState('loading');
    setErrorMessage(null);
    try {
      await billingApi.confirmCheckout(sessionId);
      setState('success');
      await silentRefresh();
    } catch (err) {
      const status =
        err && typeof err === 'object' && 'status' in err ? Number((err as { status?: number }).status) : 0;
      if (status === 401) {
        setState('needs_login');
        return;
      }
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : 'Something went wrong confirming your subscription.';
      setErrorMessage(message);
      setState('error');
    }
  }, [sessionId, silentRefresh]);

  useEffect(() => {
    if (!sessionId) {
      setState('missing');
      return;
    }
    if (auth.isLoading) {
      setState('loading');
      return;
    }
    if (!auth.isAuthenticated) {
      setState('needs_login');
      return;
    }
    void confirm();
  }, [auth.isAuthenticated, auth.isLoading, confirm, sessionId]);

  useEffect(() => {
    if (state !== 'needs_login' || !sessionId) {
      return;
    }
    const returnUrl = `/billing/success?session_id=${encodeURIComponent(sessionId)}`;
    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
  }, [navigate, sessionId, state]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      {(state === 'loading' || state === 'needs_login') && (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {state === 'needs_login' ? 'Signing you back in…' : 'Finalizing your subscription…'}
            </h1>
            <p className="mt-2 text-gray-600">This usually takes a few seconds.</p>
          </div>
        </>
      )}

      {state === 'success' && (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">You&apos;re all set!</h1>
            <p className="mt-2 text-gray-600">
              Your subscription is now active. Welcome to Mesaro Professional.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Go to dashboard
          </Link>
        </>
      )}

      {state === 'error' && (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
            <p className="mt-2 text-gray-600">
              {errorMessage ?? 'We could not confirm your subscription yet.'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              If you were charged, your access will activate shortly. You can retry confirmation.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void confirm()}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Retry
            </button>
            <Link
              to="/dashboard"
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Go to dashboard
            </Link>
          </div>
        </>
      )}

      {state === 'missing' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">You&apos;re all set!</h1>
            <p className="mt-2 text-gray-600">
              Your subscription is being finalized. Open the dashboard to continue.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Go to dashboard
          </Link>
        </>
      )}
    </main>
  );
}
