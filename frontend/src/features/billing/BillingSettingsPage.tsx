import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingApi, type BillingStatusResponse, type SubscriptionStatus } from '../../api/billing';
import type { AppError } from '../../api/types';
import { useAuth, useSelectedRestaurantId } from '../../hooks/use-auth';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIALING: 'Free trial',
  ACTIVE: 'Active',
  PAST_DUE: 'Payment past due',
  CANCELED: 'Cancelled',
  UNPAID: 'Unpaid',
  PAUSED: 'Paused',
};

const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  TRIALING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAST_DUE: 'bg-yellow-100 text-yellow-800',
  CANCELED: 'bg-red-100 text-red-800',
  UNPAID: 'bg-red-100 text-red-800',
  PAUSED: 'bg-gray-100 text-gray-800',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function TrialBanner({ endsAt }: { endsAt: string | null }) {
  if (!endsAt) return null;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000),
  );
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm text-blue-800">
        <strong>Your free trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> (
        {formatDate(endsAt)}). Subscribe now to keep full access.
      </p>
    </div>
  );
}

function PastDueBanner() {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <p className="text-sm text-yellow-800">
        <strong>Your last payment failed.</strong> Please update your payment method to avoid losing
        access.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BillingSettingsPage() {
  const auth = useAuth();
  const restaurantId = useSelectedRestaurantId();
  const queryClient = useQueryClient();

  const {
    data: billing,
    isLoading,
    error,
  } = useQuery<BillingStatusResponse>({
    queryKey: ['billing', 'status', restaurantId],
    queryFn: () => billingApi.getStatus(restaurantId!),
    enabled: restaurantId != null,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => billingApi.createCheckoutSession(restaurantId!),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => billingApi.createPortalSession(restaurantId!),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const quantityMutation = useMutation({
    mutationFn: (quantity: number) => billingApi.updateQuantity(restaurantId!, quantity),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['billing', 'status', restaurantId] });
      await auth.silentRefresh();
    },
  });

  if (!restaurantId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
        Select a restaurant first to manage its billing.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load billing information. Please refresh.
      </div>
    );
  }

  const isSubscribed = billing.stripeSubscriptionId != null;
  const showSubscribeButton =
    billing.status === 'TRIALING' || billing.status === 'CANCELED';
  const showManageButton = isSubscribed && billing.status !== 'CANCELED';
  const canDecrease = billing.currentQuantity > Math.max(1, billing.activeRestaurantCount);
  const quantityError = quantityMutation.error as AppError | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {/* Status banners */}
      {billing.status === 'TRIALING' && (
        <TrialBanner endsAt={billing.trialEndsAt} />
      )}
      {billing.status === 'PAST_DUE' && <PastDueBanner />}

      {/* Plan card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Current plan</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              Mesaro Professional — <span className="text-gray-600">€49.99 / month</span>
            </p>
          </div>
          <StatusBadge status={billing.status} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {billing.status === 'TRIALING' && billing.trialEndsAt && (
            <div>
              <dt className="text-gray-500">Trial ends</dt>
              <dd className="font-medium text-gray-900">{formatDate(billing.trialEndsAt)}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Restaurant capacity</dt>
            <dd className="font-medium text-gray-900">{billing.currentQuantity}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Active restaurants</dt>
            <dd className="font-medium text-gray-900">{billing.activeRestaurantCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Unlimited staff</dt>
            <dd className="font-medium text-gray-900">Included</dd>
          </div>
          <div>
            <dt className="text-gray-500">Unlimited reservations</dt>
            <dd className="font-medium text-gray-900">Included</dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {showSubscribeButton && (
          <button
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutMutation.isPending ? 'Redirecting…' : 'Subscribe now'}
          </button>
        )}

        {showManageButton && (
          <button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5
                       text-sm font-semibold text-gray-700 hover:bg-gray-50
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {portalMutation.isPending ? 'Redirecting…' : 'Manage subscription'}
          </button>
        )}
      </div>

      {showManageButton && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Restaurants in subscription</p>
          <p className="mt-1 text-sm text-gray-700">
            Stripe quantity is the source of truth. Update it here to upgrade or downgrade.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => quantityMutation.mutate(billing.currentQuantity - 1)}
              disabled={quantityMutation.isPending || !canDecrease}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700
                         hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {quantityMutation.isPending ? 'Updating...' : 'Downgrade -1'}
            </button>
            <button
              onClick={() => quantityMutation.mutate(billing.currentQuantity + 1)}
              disabled={quantityMutation.isPending}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white
                         hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {quantityMutation.isPending ? 'Updating...' : 'Upgrade +1'}
            </button>
          </div>
          {!canDecrease && (
            <p className="mt-3 text-sm text-gray-600">
              To downgrade, first archive restaurants until active count is below your target quantity.
            </p>
          )}
        </div>
      )}

      {/* Mutation errors */}
      {checkoutMutation.isError && (
        <p className="text-sm text-red-600">
          Could not start checkout. Please try again.
        </p>
      )}
      {portalMutation.isError && (
        <p className="text-sm text-red-600">
          Could not open billing portal. Please try again.
        </p>
      )}
      {quantityMutation.isError && (
        <p className="text-sm text-red-600">
          {quantityError?.message ?? 'Could not update subscription quantity. Please try again.'}
        </p>
      )}
    </div>
  );
}
