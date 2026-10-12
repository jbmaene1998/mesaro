import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function PageLoader({ className }: { className?: string }) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  return (
    <div className={cn("flex min-h-[60vh] items-center justify-center", className)} role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="sr-only">{copy.loadingContent}</span>
    </div>
  );
}

export function InlineLoader({ className }: { className?: string }) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <Loader2 className={cn("h-4 w-4 animate-spin", className)} />
      <span className="sr-only">{copy.loading}</span>
    </span>
  );
}

export function TableSkeleton({ rows = 4, label = "Loading table data..." }: { rows?: number; label?: string }) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const count = Math.max(3, Math.min(rows, 5));
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <span className="sr-only">{label === "Loading table data..." ? copy.loadingTableData : label}</span>
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={`table-skeleton-${index}`} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function CardSkeleton({ className, label = "Loading content..." }: { className?: string; label?: string }) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  return (
    <div className={cn("rounded-xl border bg-card p-6 shadow", className)} role="status" aria-live="polite">
      <span className="sr-only">{label === "Loading content..." ? copy.loadingContent : label}</span>
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 4, label = "Loading form..." }: { fields?: number; label?: string }) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const count = Math.max(3, Math.min(fields, 8));
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">{label === "Loading form..." ? copy.loadingForm : label}</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={`form-skeleton-${index}`} className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

const COPY = {
  en: {
    loadingContent: "Loading content...",
    loading: "Loading...",
    loadingTableData: "Loading table data...",
    loadingForm: "Loading form..."
  },
  nl: {
    loadingContent: "Inhoud laden...",
    loading: "Laden...",
    loadingTableData: "Tabelgegevens laden...",
    loadingForm: "Formulier laden..."
  },
  fr: {
    loadingContent: "Chargement du contenu...",
    loading: "Chargement...",
    loadingTableData: "Chargement des donnees du tableau...",
    loadingForm: "Chargement du formulaire..."
  },
  es: {
    loadingContent: "Cargando contenido...",
    loading: "Cargando...",
    loadingTableData: "Cargando datos de tabla...",
    loadingForm: "Cargando formulario..."
  }
} as const;
