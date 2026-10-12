import { usePageMeta } from "@/features/marketing/hooks/usePageMeta";
import { useI18n, type SupportedLocale } from "@/i18n";

const COPY: Record<SupportedLocale, {
  metaTitle: string;
  description: string;
  title: string;
  lead: string;
  sections: Array<{ heading: string; body: string[] }>;
}> = {
  en: {
    metaTitle: "Terms of Service — Mesaro",
    description: "Terms for using the Mesaro restaurant reservation platform.",
    title: "Terms of Service",
    lead: "Mesaro is an early-stage product. These terms describe how you may use the service today. For questions, contact support@mesaro.com.",
    sections: [
      {
        heading: "The service",
        body: [
          "Mesaro provides software for restaurant reservations, staff floor tools, and related operations. We do not operate a guest marketplace and do not take a commission on covers."
        ]
      },
      {
        heading: "Accounts",
        body: [
          "You must provide accurate account information and keep credentials secure. Restaurant owners are responsible for staff access they grant."
        ]
      },
      {
        heading: "Subscription & billing",
        body: [
          "Paid plans are billed per active restaurant at the published price (currently €49.99/month unless otherwise agreed). Trials, if offered, convert to paid only when you subscribe via Stripe.",
          "You can cancel anytime; access continues until the end of the current billing period unless otherwise stated."
        ]
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not abuse the API, attempt unauthorized access, or use Mesaro for unlawful activity. We may suspend accounts that threaten service integrity or other customers."
        ]
      },
      {
        heading: "Data & availability",
        body: [
          "We monitor the service and take regular backups, but Mesaro is early-stage: we do not guarantee uninterrupted availability and have not published a formal uptime SLA. Production hosting runs on Hostinger in the EU; payment and email providers may process limited data under their own terms. Contact support@mesaro.com for current subprocessors.",
          "You remain responsible for your own guest communications and legal obligations toward diners.",
          "After cancellation, data export may be available for a limited window as described in the Privacy Policy."
        ]
      },
      {
        heading: "Liability",
        body: [
          "To the extent permitted by law, Mesaro is not liable for lost profits, no-shows, or damages arising from booking conflicts outside our reasonable control. Mandatory consumer protections remain unaffected where they apply."
        ]
      },
      {
        heading: "Contact",
        body: [
          "Questions: support@mesaro.com."
        ]
      }
    ]
  },
  nl: {
    metaTitle: "Gebruiksvoorwaarden — Mesaro",
    description: "Voorwaarden voor het gebruik van het Mesaro-reserveringsplatform.",
    title: "Gebruiksvoorwaarden",
    lead: "Mesaro is een product in een vroege fase. Deze voorwaarden beschrijven hoe je de dienst vandaag mag gebruiken. Vragen: support@mesaro.com.",
    sections: [
      {
        heading: "De dienst",
        body: [
          "Mesaro levert software voor restaurantreserveringen en zaaloperaties. Geen marketplace, geen commissie per couvert."
        ]
      },
      {
        heading: "Accounts",
        body: [
          "Geef juiste accountgegevens en beveilig inloggegevens. Eigenaars zijn verantwoordelijk voor toegekende personeelstoegang."
        ]
      },
      {
        heading: "Abonnement & facturatie",
        body: [
          "Betaalde plannen per actief restaurant tegen de gepubliceerde prijs. Je kunt altijd opzeggen; toegang loopt tot het einde van de facturatieperiode."
        ]
      },
      {
        heading: "Aanvaardbaar gebruik",
        body: [
          "Geen misbruik van de API of ongeautoriseerde toegang. We kunnen accounts schorsen die de dienst of anderen bedreigen."
        ]
      },
      {
        heading: "Gegevens & beschikbaarheid",
        body: [
          "We monitoren de dienst en maken regelmatig back-ups, maar Mesaro is in een vroege fase: we garanderen geen ononderbroken beschikbaarheid en hebben geen formele uptime-SLA gepubliceerd. Productiehosting draait bij Hostinger in de EU; betaling en e-mailproviders kunnen beperkte gegevens verwerken onder hun eigen voorwaarden. Neem contact op via support@mesaro.com voor actuele subverwerkers.",
          "Jij blijft verantwoordelijk voor gastcommunicatie en wettelijke plichten.",
          "Na opzegging kan export beschikbaar zijn gedurende een beperkte periode zoals in het privacybeleid."
        ]
      },
      {
        heading: "Aansprakelijkheid",
        body: [
          "Voor zover wettelijk toegestaan geen aansprakelijkheid voor gederfde winst of schade buiten redelijke controle. Dwingende consumentenrechten blijven gelden."
        ]
      },
      {
        heading: "Contact",
        body: ["support@mesaro.com"]
      }
    ]
  },
  fr: {
    metaTitle: "Conditions d'utilisation — Mesaro",
    description: "Conditions d'utilisation de la plateforme de reservations Mesaro.",
    title: "Conditions d'utilisation",
    lead: "Mesaro est un produit en phase initiale. Ces conditions decrivent comment vous pouvez utiliser le service aujourd'hui. Questions : support@mesaro.com.",
    sections: [
      {
        heading: "Le service",
        body: [
          "Mesaro fournit un logiciel de reservations et d'operations en salle. Pas de marketplace, pas de commission par couvert."
        ]
      },
      {
        heading: "Comptes",
        body: [
          "Informations exactes et identifiants securises. Les proprietaires sont responsables des acces accords au personnel."
        ]
      },
      {
        heading: "Abonnement et facturation",
        body: [
          "Facturation par restaurant actif au tarif publie. Resiliation possible a tout moment; acces jusqu'a la fin de la periode."
        ]
      },
      {
        heading: "Usage acceptable",
        body: [
          "Pas d'abus API ni d'acces non autorise. Suspension possible en cas de menace pour le service."
        ]
      },
      {
        heading: "Donnees et disponibilite",
        body: [
          "Nous surveillons le service et effectuons des sauvegardes regulieres, mais Mesaro est en phase initiale : nous ne garantissons pas une disponibilite ininterrompue et n'avons pas publie de SLA formel. L'hebergement de production tourne chez Hostinger dans l'UE; paiement et e-mail peuvent traiter des donnees limitees selon leurs conditions. Contactez support@mesaro.com pour les sous-traitants actuels.",
          "Vous restez responsable des obligations envers vos clients.",
          "Apres resiliation, l'export peut etre disponible pendant une duree limitee comme decrit dans la politique de confidentialite."
        ]
      },
      {
        heading: "Responsabilite",
        body: [
          "Dans les limites de la loi, pas de responsabilite pour pertes de profits hors controle raisonnable."
        ]
      },
      {
        heading: "Contact",
        body: ["support@mesaro.com"]
      }
    ]
  },
  es: {
    metaTitle: "Terminos del servicio — Mesaro",
    description: "Terminos de uso de la plataforma de reservas Mesaro.",
    title: "Terminos del servicio",
    lead: "Mesaro es un producto en fase inicial. Estos terminos describen como puedes usar el servicio hoy. Preguntas: support@mesaro.com.",
    sections: [
      {
        heading: "El servicio",
        body: [
          "Mesaro ofrece software de reservas y operaciones de sala. Sin marketplace ni comision por comensal."
        ]
      },
      {
        heading: "Cuentas",
        body: [
          "Datos correctos y credenciales seguras. El propietario responde del acceso del personal."
        ]
      },
      {
        heading: "Suscripcion y facturacion",
        body: [
          "Facturacion por restaurante activo al precio publicado. Cancelacion en cualquier momento; acceso hasta fin de periodo."
        ]
      },
      {
        heading: "Uso aceptable",
        body: [
          "Sin abuso de API ni acceso no autorizado. Podemos suspender cuentas que amenacen el servicio."
        ]
      },
      {
        heading: "Datos y disponibilidad",
        body: [
          "Monitorizamos el servicio y hacemos copias de seguridad regulares, pero Mesaro esta en fase inicial: no garantizamos disponibilidad ininterrumpida y no hemos publicado un SLA formal. El alojamiento de produccion corre en Hostinger en la UE; pago y email pueden tratar datos limitados bajo sus condiciones. Contacta support@mesaro.com para subencargados actuales.",
          "Tu sigues siendo responsable frente a tus comensales.",
          "Tras cancelar, la exportacion puede estar disponible durante un plazo limitado segun la politica de privacidad."
        ]
      },
      {
        heading: "Responsabilidad",
        body: [
          "En la medida legal permitida, sin responsabilidad por lucros cesantes fuera de control razonable."
        ]
      },
      {
        heading: "Contacto",
        body: ["support@mesaro.com"]
      }
    ]
  }
};

export function TermsPage() {
  const { locale } = useI18n();
  const copy = COPY[locale] ?? COPY.en;
  usePageMeta({ title: copy.metaTitle, description: copy.description });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <p className="mk-eyebrow">Legal</p>
      <h1 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.title}</h1>
      <p className="mt-4 text-[var(--mk-pewter)]">{copy.lead}</p>
      <div className="mt-10 space-y-8 text-sm leading-relaxed text-[var(--mk-pewter)]">
        {copy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2 text-base font-semibold text-[var(--mk-mist)]">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mb-2">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
