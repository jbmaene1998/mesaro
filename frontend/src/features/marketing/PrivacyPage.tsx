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
    metaTitle: "Privacy Policy — Mesaro",
    description: "How Mesaro collects, uses, and protects restaurant and guest data.",
    title: "Privacy Policy",
    lead: "Mesaro is an early-stage product. This policy describes how we handle data today. For privacy or legal questions, contact support@mesaro.com.",
    sections: [
      {
        heading: "Who we are",
        body: [
          "Mesaro provides reservation and floor operations software for restaurants. Controllers of personal data are the restaurant operators who use Mesaro; Mesaro acts as a processor for guest reservation data and as a controller for account and billing data.",
          "Mesaro is not yet operated by a registered company. Until a legal entity is formed, privacy and support requests go to support@mesaro.com."
        ]
      },
      {
        heading: "Data we process",
        body: [
          "Account data: name, email, role, restaurant membership.",
          "Guest reservation data: name, email, party size, date/time, notes, cancel tokens.",
          "Billing data: Stripe customer and subscription identifiers (card details stay with Stripe).",
          "Technical logs: IP, timestamps, and security events needed to operate the service."
        ]
      },
      {
        heading: "Why we process it",
        body: [
          "To provide booking, staff tools, and email confirmations.",
          "To bill subscriptions and prevent abuse.",
          "To meet legal obligations (e.g. accounting, security)."
        ]
      },
      {
        heading: "Retention",
        body: [
          "Reservation personal data is retained according to the restaurant’s operational needs and our retention jobs (typically up to 12 months unless law requires longer).",
          "After subscription cancellation, export access is available for 30 days; then data is deleted per our purge schedule."
        ]
      },
      {
        heading: "Hosting & subprocessors",
        body: [
          "Guest reservation data is stored in PostgreSQL to operate your restaurant’s bookings. We do not sell guest data.",
          "Production infrastructure is hosted with Hostinger in the European Union. Payment (Stripe) and email delivery providers may process limited data under their own terms, which can include processing outside the EU. Contact support@mesaro.com for the current subprocessor list and a Data Processing Agreement (DPA)."
        ]
      },
      {
        heading: "Your rights",
        body: [
          "EU/EEA users may request access, correction, deletion, or portability of personal data, and may lodge a complaint with a supervisory authority.",
          "Contact support@mesaro.com for privacy requests. Restaurants remain responsible for guest-facing disclosures on their own sites."
        ]
      },
      {
        heading: "Cookies & analytics",
        body: [
          "Essential cookies keep you signed in. Optional analytics cookies run only after consent via our banner."
        ]
      }
    ]
  },
  nl: {
    metaTitle: "Privacybeleid — Mesaro",
    description: "Hoe Mesaro restaurant- en gastgegevens verzamelt, gebruikt en beschermt.",
    title: "Privacybeleid",
    lead: "Mesaro is een product in een vroege fase. Dit beleid beschrijft hoe we gegevens vandaag behandelen. Voor privacy- of juridische vragen: support@mesaro.com.",
    sections: [
      {
        heading: "Wie we zijn",
        body: [
          "Mesaro levert reserverings- en zaalsoftware voor restaurants. Restaurants zijn verwerkingsverantwoordelijke voor gastgegevens; Mesaro is verwerker daarvoor en verantwoordelijke voor account- en facturatiegegevens.",
          "Mesaro wordt nog niet door een geregistreerde vennootschap geëxploiteerd. Tot er een entiteit is, gaan privacy- en supportvragen naar support@mesaro.com."
        ]
      },
      {
        heading: "Welke gegevens",
        body: [
          "Account: naam, e-mail, rol, restaurantlidmaatschap.",
          "Gastreserveringen: naam, e-mail, gezelschap, datum/tijd, notities.",
          "Facturatie: Stripe-klant- en abonnements-ID’s (kaartgegevens blijven bij Stripe).",
          "Technische logs voor beveiliging en werking."
        ]
      },
      {
        heading: "Doelen",
        body: [
          "Boekingen, personeelstools en bevestigingsmails leveren.",
          "Abonnementen factureren en misbruik voorkomen.",
          "Wettelijke verplichtingen nakomen."
        ]
      },
      {
        heading: "Bewaartermijn",
        body: [
          "Persoonsgegevens van reserveringen volgens operationele noodzaak en retentiejobs.",
          "Na opzegging 30 dagen exporttoegang, daarna verwijdering volgens purge-schema."
        ]
      },
      {
        heading: "Hosting & subverwerkers",
        body: [
          "Gastreserveringsgegevens worden in PostgreSQL opgeslagen voor de werking van je boekingen. We verkopen gastgegevens niet.",
          "Productie-infrastructuur draait bij Hostinger in de Europese Unie. Betaling (Stripe) en e-mailproviders kunnen beperkte gegevens verwerken onder hun eigen voorwaarden, soms buiten de EU. Neem contact op via support@mesaro.com voor de actuele subverwerkerslijst en een verwerkersovereenkomst (DPA)."
        ]
      },
      {
        heading: "Rechten",
        body: [
          "EU/EER-gebruikers kunnen inzage, correctie, verwijdering of overdraagbaarheid vragen.",
          "Contact: support@mesaro.com."
        ]
      },
      {
        heading: "Cookies & analytics",
        body: [
          "Essentiële cookies voor login. Optionele analytics alleen na toestemming."
        ]
      }
    ]
  },
  fr: {
    metaTitle: "Politique de confidentialite — Mesaro",
    description: "Comment Mesaro collecte, utilise et protege les donnees restaurants et clients.",
    title: "Politique de confidentialite",
    lead: "Mesaro est un produit en phase initiale. Cette politique decrit comment nous traitons les donnees aujourd'hui. Pour toute question de confidentialite ou juridique : support@mesaro.com.",
    sections: [
      {
        heading: "Qui nous sommes",
        body: [
          "Mesaro fournit un logiciel de reservations pour restaurants. Les restaurants sont responsables des donnees clients; Mesaro est sous-traitant pour ces donnees et responsable pour comptes et facturation.",
          "Mesaro n'est pas encore exploite par une societe enregistree. Jusqu'a creation d'une entite, les demandes privacy et support vont a support@mesaro.com."
        ]
      },
      {
        heading: "Donnees traitees",
        body: [
          "Compte: nom, e-mail, role, rattachement restaurant.",
          "Reservations: nom, e-mail, taille du groupe, date/heure, notes.",
          "Facturation: identifiants Stripe (cartes chez Stripe).",
          "Journaux techniques de securite."
        ]
      },
      {
        heading: "Finalites",
        body: [
          "Fournir reservations, outils equipe et e-mails de confirmation.",
          "Facturer et prevenir les abus.",
          "Obligations legales."
        ]
      },
      {
        heading: "Conservation",
        body: [
          "Selon besoins operationnels et tâches de retention.",
          "Apres resiliation: export 30 jours puis suppression."
        ]
      },
      {
        heading: "Hebergement & sous-traitants",
        body: [
          "Les donnees de reservation clients sont stockees dans PostgreSQL pour gerer vos reservations. Nous ne vendons pas les donnees clients.",
          "L'infrastructure de production est hebergee chez Hostinger dans l'Union europeenne. Le paiement (Stripe) et les fournisseurs d'e-mail peuvent traiter des donnees limitees selon leurs conditions, parfois hors UE. Contactez support@mesaro.com pour la liste actuelle et un accord de traitement (DPA)."
        ]
      },
      {
        heading: "Droits",
        body: [
          "Droits d'acces, rectification, effacement, portabilite pour l'UE/EEE.",
          "Contact: support@mesaro.com."
        ]
      },
      {
        heading: "Cookies et analytique",
        body: [
          "Cookies essentiels pour la session. Analytique optionnelle apres consentement."
        ]
      }
    ]
  },
  es: {
    metaTitle: "Politica de privacidad — Mesaro",
    description: "Como Mesaro recoge, usa y protege datos de restaurantes y clientes.",
    title: "Politica de privacidad",
    lead: "Mesaro es un producto en fase inicial. Esta politica describe como tratamos los datos hoy. Para preguntas de privacidad o legales: support@mesaro.com.",
    sections: [
      {
        heading: "Quienes somos",
        body: [
          "Mesaro ofrece software de reservas para restaurantes. El restaurante es responsable del tratamiento de datos de clientes; Mesaro actúa como encargado para esos datos y como responsable para cuentas y facturacion.",
          "Mesaro aun no es operado por una empresa registrada. Hasta constituir una entidad, las solicitudes de privacidad y soporte van a support@mesaro.com."
        ]
      },
      {
        heading: "Datos que tratamos",
        body: [
          "Cuenta: nombre, email, rol, pertenencia al restaurante.",
          "Reservas: nombre, email, comensales, fecha/hora, notas.",
          "Facturacion: IDs de Stripe (tarjetas en Stripe).",
          "Registros tecnicos de seguridad."
        ]
      },
      {
        heading: "Finalidades",
        body: [
          "Prestar reservas, herramientas de equipo y emails de confirmacion.",
          "Facturar y prevenir abusos.",
          "Cumplir obligaciones legales."
        ]
      },
      {
        heading: "Conservacion",
        body: [
          "Segun necesidad operativa y trabajos de retencion.",
          "Tras cancelar: exportacion 30 dias y luego borrado."
        ]
      },
      {
        heading: "Alojamiento y subencargados",
        body: [
          "Los datos de reserva de clientes se almacenan en PostgreSQL para gestionar tus reservas. No vendemos datos de clientes.",
          "La infraestructura de produccion esta alojada en Hostinger en la Union Europea. El pago (Stripe) y los proveedores de email pueden tratar datos limitados bajo sus propias condiciones, a veces fuera de la UE. Contacta support@mesaro.com para la lista actual y un DPA."
        ]
      },
      {
        heading: "Derechos",
        body: [
          "Acceso, rectificacion, supresion y portabilidad en UE/EEE.",
          "Contacto: support@mesaro.com."
        ]
      },
      {
        heading: "Cookies y analitica",
        body: [
          "Cookies esenciales de sesion. Analitica opcional solo con consentimiento."
        ]
      }
    ]
  }
};

export function PrivacyPage() {
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
