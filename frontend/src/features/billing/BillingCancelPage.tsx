import { useNavigate } from 'react-router-dom';

/**
 * Landing page when the user cancels out of the Stripe Checkout flow.
 * No subscription was created; guide them back or try again.
 */
export default function BillingCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Checkout cancelled</h1>
        <p className="mt-2 text-gray-600">
          No charge was made. You can subscribe whenever you're ready.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/settings/billing')}
          className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
        >
          Try again
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
