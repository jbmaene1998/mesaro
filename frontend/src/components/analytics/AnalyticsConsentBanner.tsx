import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics-consent";

const BANNER_COPY = {
  en: {
    body: "We use optional analytics cookies to improve the product. You can accept or decline.",
    privacy: "Privacy Policy",
    decline: "Decline",
    accept: "Accept analytics"
  },
  nl: {
    body: "We gebruiken optionele analytics-cookies om het product te verbeteren. Je kunt accepteren of weigeren.",
    privacy: "Privacybeleid",
    decline: "Weigeren",
    accept: "Analytics accepteren"
  },
  fr: {
    body: "Nous utilisons des cookies analytiques optionnels pour ameliorer le produit. Vous pouvez accepter ou refuser.",
    privacy: "Politique de confidentialite",
    decline: "Refuser",
    accept: "Accepter l'analytique"
  },
  es: {
    body: "Usamos cookies analiticas opcionales para mejorar el producto. Puedes aceptar o rechazar.",
    privacy: "Politica de privacidad",
    decline: "Rechazar",
    accept: "Aceptar analitica"
  }
} as const;

export function AnalyticsConsentBanner() {
  const { locale } = useI18n();
  const copy = BANNER_COPY[locale] ?? BANNER_COPY.en;
  const [consent, setConsent] = useState(() => getAnalyticsConsent());

  if (consent !== null) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {copy.body}{" "}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
            {copy.privacy}
          </Link>
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAnalyticsConsent("denied");
              setConsent("denied");
            }}
          >
            {copy.decline}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setAnalyticsConsent("granted");
              setConsent("granted");
            }}
          >
            {copy.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
