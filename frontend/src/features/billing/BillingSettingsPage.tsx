import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingApi, type BillingStatusResponse, type SubscriptionStatus } from '../../api/billing';
import type { AppError } from '../../api/types';
import { useAuth, useSelectedRestaurantId } from '../../hooks/use-auth';
import { useI18n } from '@/i18n';
import type { messages } from '@/i18n/messages';

const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  TRIALING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAST_DUE: 'bg-yellow-100 text-yellow-800',
  CANCELED: 'bg-red-100 text-red-800',
  UNPAID: 'bg-red-100 text-red-800',
  PAUSED: 'bg-gray-100 text-gray-800',
};

const STATUS_MESSAGE_KEY: Record<SubscriptionStatus, keyof typeof messages.en> = {
  TRIALING: 'billing.status.TRIALING',
  ACTIVE: 'billing.status.ACTIVE',
  PAST_DUE: 'billing.status.PAST_DUE',
  CANCELED: 'billing.status.CANCELED',
  UNPAID: 'billing.status.UNPAID',
  PAUSED: 'billing.status.PAUSED',
};

function interpolateTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template
  );
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
}

function StatusBadge({ status, label }: { status: SubscriptionStatus; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}>
      {label}
    </span>
  );
}

function TrialBanner({
  endsAt,
  locale,
  t,
}: {
  endsAt: string | null;
  locale: string;
  t: (key: keyof typeof messages.en) => string;
}) {
  if (!endsAt) return null;
  const daysLeft = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000));
  const formattedEnd = formatDate(endsAt, locale);
  const templateKey = daysLeft === 1 ? 'billing.trialBanner.one' : 'billing.trialBanner.many';
  const text = interpolateTemplate(t(templateKey), { daysLeft, endsAt: formattedEnd });

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm text-blue-800">{text}</p>
    </div>
  );
}

export default function BillingSettingsPage() {
  const { t, locale } = useI18n();
  const auth = useAuth();
  const restaurantId = useSelectedRestaurantId();
  const queryClient = useQueryClient();

  const { data: billing, isLoading, error } = useQuery<BillingStatusResponse>({
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
        {t('billing.selectRestaurantFirst')}
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
        {t('billing.loadFailed')}
      </div>
    );
  }

  const isSubscribed = billing.stripeSubscriptionId != null;
  const showSubscribeButton = billing.status === 'TRIALING' || billing.status === 'CANCELED';
  const showManageButton = isSubscribed && billing.status !== 'CANCELED';
  const canDecrease = billing.currentQuantity > Math.max(1, billing.activeRestaurantCount);
  const quantityError = quantityMutation.error as AppError | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('billing.title')}</h1>

      {billing.status === 'TRIALING' && <TrialBanner endsAt={billing.trialEndsAt} locale={locale} t={t} />}
      {billing.status === 'PAST_DUE' && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">{t('billing.pastDueBanner')}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{t('billing.currentPlan')}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{t('billing.planLine')}</p>
          </div>
          <StatusBadge status={billing.status} label={t(STATUS_MESSAGE_KEY[billing.status])} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {billing.status === 'TRIALING' && billing.trialEndsAt && (
            <div>
              <dt className="text-gray-500">{t('billing.trialEnds')}</dt>
              <dd className="font-medium text-gray-900">{formatDate(billing.trialEndsAt, locale)}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">{t('billing.restaurantCapacity')}</dt>
            <dd className="font-medium text-gray-900">{billing.currentQuantity}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('billing.activeRestaurants')}</dt>
            <dd className="font-medium text-gray-900">{billing.activeRestaurantCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('billing.unlimitedStaff')}</dt>
            <dd className="font-medium text-gray-900">{t('billing.included')}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('billing.unlimitedReservations')}</dt>
            <dd className="font-medium text-gray-900">{t('billing.included')}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {showSubscribeButton && (
          <button
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutMutation.isPending ? t('billing.redirecting') : t('billing.subscribeNow')}
          </button>
        )}

        {showManageButton && (
          <button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {portalMutation.isPending ? t('billing.redirecting') : t('billing.manageSubscription')}
          </button>
        )}
      </div>

      {showManageButton && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{t('billing.restaurantsInSubscription')}</p>
          <p className="mt-1 text-sm text-gray-700">{t('billing.stripeQuantityHint')}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => quantityMutation.mutate(billing.currentQuantity - 1)}
              disabled={quantityMutation.isPending || !canDecrease}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {quantityMutation.isPending ? t('billing.updating') : t('billing.downgrade')}
            </button>
            <button
              onClick={() => quantityMutation.mutate(billing.currentQuantity + 1)}
              disabled={quantityMutation.isPending}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {quantityMutation.isPending ? t('billing.updating') : t('billing.upgrade')}
            </button>
          </div>
          {!canDecrease && <p className="mt-3 text-sm text-gray-600">{t('billing.downgradeHint')}</p>}
        </div>
      )}

      {checkoutMutation.isError && <p className="text-sm text-red-600">{t('billing.checkoutError')}</p>}
      {portalMutation.isError && <p className="text-sm text-red-600">{t('billing.portalError')}</p>}
      {quantityMutation.isError && (
        <p className="text-sm text-red-600">{quantityError?.message ?? t('billing.quantityErrorDefault')}</p>
      )}
    </div>
  );
}
