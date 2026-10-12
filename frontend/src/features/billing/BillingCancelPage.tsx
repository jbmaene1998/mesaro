import { useNavigate } from 'react-router-dom';

import { useI18n } from '@/i18n';

export default function BillingCancelPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('billing.cancel.title')}</h1>
        <p className="mt-2 text-gray-600">{t('billing.cancel.description')}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/settings/billing')}
          className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
        >
          {t('billing.cancel.tryAgain')}
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {t('billing.cancel.backToDashboard')}
        </button>
      </div>
    </div>
  );
}
