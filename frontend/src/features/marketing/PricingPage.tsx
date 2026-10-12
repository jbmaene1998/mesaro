import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

import { FaqAccordion } from "@/features/marketing/components/FaqAccordion";
import { MarketingCta } from "@/features/marketing/components/MarketingCta";
import { usePageMeta } from "@/features/marketing/hooks/usePageMeta";
import { Reveal } from "@/features/marketing/motion/Reveal";
import { useI18n, type SupportedLocale } from "@/i18n";

const COPY: Record<SupportedLocale, {
  metaTitle: string;
  description: string;
  heroBadge: string;
  heroTitle: string;
  heroLead: string;
  comparisonTitle: string;
  comparisonEyebrow: string;
  comparisonHeaders: [string, string, string];
  comparisonRows: Array<[string, string, string]>;
  planName: string;
  planPrice: string;
  planPriceNote: string;
  planHighlights: string[];
  planCta: string;
  planTrustItems: string[];
  onboardingEyebrow: string;
  onboardingTitle: string;
  onboardingItems: Array<{ step: string; title: string; description: string }>;
  faqTitle: string;
  faqLead: string;
  faqItems: Array<{ question: string; answer: string }>;
  ctaTitle: string;
  ctaLead: string;
}> = {
  en: {
    metaTitle: "Pricing — €49.99/month, No Commission",
    description: "One flat monthly fee. No per-cover commission. Unlimited reservations and staff accounts. 14-day free trial, no credit card required.",
    heroBadge: "Pricing",
    heroTitle: "€49.99 per month. Everything included.",
    heroLead: "One flat fee. No per-cover commission. No extra charge for more staff, more reservations, or support.",
    comparisonEyebrow: "Why flat pricing wins",
    comparisonTitle: "What you get vs. what you'd pay elsewhere",
    comparisonHeaders: ["", "Mesaro", "Commission-based alternative"],
    comparisonRows: [
      ["Monthly base cost", "€49.99", "€0–€30"],
      ["Per-cover fee", "None", "€1.00–€2.00 per cover"],
      ["1,000 covers/month — total cost", "€49.99", "€1,000–€2,030"],
      ["3,000 covers/month — total cost", "€49.99", "€3,000–€6,030"],
      ["Guest data sharing", "None — data is yours", "Shared with platform"],
      ["Marketplace listing", "No — direct bookings only", "Yes — alongside competitors"],
      ["Custom booking URL", "Yes (/r/your-slug)", "Rarely"]
    ],
    planName: "Restaurant Plan",
    planPrice: "€49.99",
    planPriceNote: "/ month — less than €1.70 per day",
    planHighlights: [
      "Unlimited reservations — no per-cover fees, ever",
      "Unlimited staff accounts with role-based access",
      "Embeddable booking widget for your website",
      "Real-time table holds (no double bookings)",
      "Shift management, opening hours, and closures",
      "Timeline dashboard with weekly and monthly stats",
      "Full history of every reservation change",
      "Email confirmations with ICS calendar attachments",
      "14-day free trial — no credit card required",
      "No annual contract — cancel anytime"
    ],
    planCta: "Start your 14-day free trial",
    planTrustItems: [
      "No credit card required",
      "Cancel anytime, no fees",
      "All features from day one"
    ],
    onboardingEyebrow: "Getting started",
    onboardingTitle: "Up and running in under 30 minutes.",
    onboardingItems: [
      { step: "1", title: "Create your account", description: "No credit card. Takes 2 minutes." },
      { step: "2", title: "Add your restaurant", description: "Set up your tables, floor plan, shifts, and opening hours." },
      { step: "3", title: "Embed the booking widget", description: "One line of HTML on your website. Five minutes on any CMS." },
      { step: "4", title: "Go live", description: "Your first online reservation can arrive the same day." }
    ],
    faqTitle: "Pricing questions",
    faqLead: "Billing-specific answers. More on the FAQ page.",
    faqItems: [
      { question: "Is the 14-day trial really free?", answer: "Yes. No credit card at signup. You get full access to all features for 14 days. If you decide not to subscribe, you pay nothing." },
      { question: "I have three restaurants. Do I pay three times?", answer: "Yes — €49.99 per restaurant per month on one subscription (quantity = locations). Three locations is €149.97/month under the same login." },
      { question: "Can I cancel mid-month?", answer: "Yes. No contracts, no cancellation fees. When you cancel, your subscription runs until the end of the current billing period and then stops." },
      { question: "Are there hidden fees for support or additional users?", answer: "No. Every staff account, all support channels, all features — same price. We will never charge per seat." },
      { question: "What happens to my data if I cancel?", answer: "Your reservation history remains accessible for 30 days after cancellation. You can export it at any time during that window. After 30 days, the data is permanently deleted." }
    ],
    ctaTitle: "Try it free for 14 days.",
    ctaLead: "No card required. If it doesn't work for your restaurant, you haven't spent a cent."
  },
  nl: {
    metaTitle: "Prijzen — €49,99/maand, Geen Commissie",
    description: "Eén vast maandtarief. Geen commissie per couvert. Onbeperkte reserveringen en personeelsaccounts. 14 dagen gratis proefperiode, geen creditcard nodig.",
    heroBadge: "Prijzen",
    heroTitle: "€49,99 per maand. Alles inbegrepen.",
    heroLead: "Één vast tarief. Geen commissie per couvert. Geen extra kosten voor meer personeel, meer reserveringen of support.",
    comparisonEyebrow: "Waarom een vast tarief wint",
    comparisonTitle: "Wat je krijgt vs. wat je elders betaalt",
    comparisonHeaders: ["", "Mesaro", "Commissie-gebaseerd alternatief"],
    comparisonRows: [
      ["Maandelijks basistarief", "€49,99", "€0–€30"],
      ["Commissie per couvert", "Geen", "€1,00–€2,00 per couvert"],
      ["1.000 couverts/maand — totale kost", "€49,99", "€1.000–€2.030"],
      ["3.000 couverts/maand — totale kost", "€49,99", "€3.000–€6.030"],
      ["Gastgegevens delen", "Geen — jouw data", "Gedeeld met platform"],
      ["Marketplace-vermelding", "Nee — directe boekingen", "Ja — naast concurrenten"],
      ["Eigen boekings-URL", "Ja (/r/jouw-slug)", "Zelden"]
    ],
    planName: "Restaurantplan",
    planPrice: "€49,99",
    planPriceNote: "/ maand — minder dan €1,70 per dag",
    planHighlights: [
      "Onbeperkte reserveringen — nooit commissie per couvert",
      "Onbeperkte personeelsaccounts met rolgebaseerde toegang",
      "Insluitbare boekingswidget voor je website",
      "Realtime tafelblokkeringen (geen dubbele boekingen)",
      "Shiftbeheer, openingstijden en sluitingen",
      "Tijdlijndashboard met wekelijkse en maandelijkse statistieken",
      "Volledige geschiedenis van elke reserveringswijziging",
      "E-mailbevestigingen met ICS-kalenderbevestiging",
      "14 dagen gratis proefperiode — geen creditcard nodig",
      "Geen jaarcontract — altijd opzegbaar"
    ],
    planCta: "Start jouw 14 dagen gratis proefperiode",
    planTrustItems: [
      "Geen creditcard nodig",
      "Altijd opzegbaar, geen kosten",
      "Alle functies vanaf dag één"
    ],
    onboardingEyebrow: "Aan de slag",
    onboardingTitle: "Binnen 30 minuten operationeel.",
    onboardingItems: [
      { step: "1", title: "Maak je account aan", description: "Geen creditcard. Duurt 2 minuten." },
      { step: "2", title: "Voeg je restaurant toe", description: "Stel je tafels, plattegrond, shifts en openingstijden in." },
      { step: "3", title: "Integreer de boekingswidget", description: "Één regel HTML op je website. Vijf minuten op elke CMS." },
      { step: "4", title: "Ga live", description: "Je eerste online reservering kan dezelfde dag binnenkomen." }
    ],
    faqTitle: "Prijsvragen",
    faqLead: "Factuurspecifieke antwoorden. Meer op de FAQ-pagina.",
    faqItems: [
      { question: "Is de proefperiode van 14 dagen echt gratis?", answer: "Ja. Geen creditcard bij aanmelding. Je krijgt 14 dagen volledige toegang. Als je niet abonneert, betaal je niets." },
      { question: "Ik heb drie restaurants. Betaal ik driemaal?", answer: "Ja — €49,99 per restaurant per maand op één abonnement (quantity = locaties). Drie locaties is €149,97/maand onder hetzelfde account." },
      { question: "Kan ik midden in de maand opzeggen?", answer: "Ja. Geen contract, geen opzegkosten. Je abonnement loopt tot het einde van de huidige factuurperiode en stopt dan." },
      { question: "Zijn er verborgen kosten voor support of extra gebruikers?", answer: "Nee. Elk personeelsaccount, alle supportkanalen, alle functies — zelfde prijs. We rekenen nooit per zetel." },
      { question: "Wat gebeurt er met mijn gegevens als ik opzeg?", answer: "Je reserveringsgeschiedenis blijft 30 dagen na annulering toegankelijk. Je kunt die exporteren. Na 30 dagen worden de gegevens permanent verwijderd." }
    ],
    ctaTitle: "Probeer het 14 dagen gratis.",
    ctaLead: "Geen kaart nodig. Als het niet werkt voor jouw restaurant, heb je niets betaald."
  },
  fr: {
    metaTitle: "Tarifs — 49,99 €/mois, Sans Commission",
    description: "Un forfait mensuel fixe. Aucune commission par couvert. Reservations et comptes du personnel illimites. Essai gratuit de 14 jours, sans carte bancaire.",
    heroBadge: "Tarifs",
    heroTitle: "49,99 € par mois. Tout inclus.",
    heroLead: "Un forfait unique. Aucune commission par couvert. Aucun supplement pour plus de personnel, plus de reservations ou le support.",
    comparisonEyebrow: "Pourquoi le tarif fixe gagne",
    comparisonTitle: "Ce que vous obtenez vs. ce que vous paieriez ailleurs",
    comparisonHeaders: ["", "Mesaro", "Alternative avec commission"],
    comparisonRows: [
      ["Cout mensuel de base", "49,99 €", "0–30 €"],
      ["Commission par couvert", "Aucune", "1,00–2,00 € par couvert"],
      ["1 000 couverts/mois — cout total", "49,99 €", "1 000–2 030 €"],
      ["3 000 couverts/mois — cout total", "49,99 €", "3 000–6 030 €"],
      ["Partage des donnees clients", "Aucun — vos donnees", "Partage avec la plateforme"],
      ["Listing marketplace", "Non — reservations directes", "Oui — aux cotes des concurrents"],
      ["URL de reservation personnalisee", "Oui (/r/votre-slug)", "Rarement"]
    ],
    planName: "Forfait Restaurant",
    planPrice: "49,99 €",
    planPriceNote: "/ mois — moins de 1,70 € par jour",
    planHighlights: [
      "Reservations illimitees — jamais de commission par couvert",
      "Comptes du personnel illimites avec acces par role",
      "Widget de reservation integrable sur votre site",
      "Blocages de tables en temps reel (pas de doubles reservations)",
      "Gestion des services, horaires et fermetures",
      "Tableau de bord avec statistiques hebdomadaires et mensuelles",
      "Historique complet de chaque modification de reservation",
      "Confirmations par email avec piece jointe ICS",
      "Essai gratuit de 14 jours — sans carte bancaire",
      "Pas d'engagement annuel — resiliation a tout moment"
    ],
    planCta: "Commencez votre essai gratuit de 14 jours",
    planTrustItems: [
      "Pas de carte bancaire requise",
      "Resiliation a tout moment, sans frais",
      "Toutes les fonctionnalites des le premier jour"
    ],
    onboardingEyebrow: "Pour commencer",
    onboardingTitle: "Operationnel en moins de 30 minutes.",
    onboardingItems: [
      { step: "1", title: "Creez votre compte", description: "Sans carte bancaire. En 2 minutes." },
      { step: "2", title: "Ajoutez votre restaurant", description: "Configurez vos tables, plan, services et horaires." },
      { step: "3", title: "Integrez le widget de reservation", description: "Une ligne de HTML sur votre site. Cinq minutes sur n'importe quel CMS." },
      { step: "4", title: "Passez en ligne", description: "Votre premiere reservation en ligne peut arriver le jour meme." }
    ],
    faqTitle: "Questions tarifaires",
    faqLead: "Reponses specifiques a la facturation. Plus sur la page FAQ.",
    faqItems: [
      { question: "L'essai de 14 jours est-il vraiment gratuit ?", answer: "Oui. Aucune carte a l'inscription. Vous avez un acces complet pendant 14 jours. Si vous ne souscrivez pas, vous ne payez rien." },
      { question: "J'ai trois restaurants. Je paie trois fois ?", answer: "Oui — chaque restaurant est facture separement a 49,99 €/mois. Les trois sont geres sous le meme compte. Total : 149,97 €/mois pour trois etablissements." },
      { question: "Puis-je resilier en cours de mois ?", answer: "Oui. Pas de contrat, pas de frais de resiliation. Votre abonnement se poursuit jusqu'a la fin de la periode de facturation en cours, puis s'arrete." },
      { question: "Y a-t-il des frais caches pour le support ou les utilisateurs ?", answer: "Non. Chaque compte du personnel, tous les canaux de support, toutes les fonctionnalites — meme prix. Nous ne facturerons jamais par siege." },
      { question: "Que deviennent mes donnees si je resilie ?", answer: "Votre historique de reservations reste accessible pendant 30 jours apres la resiliation. Vous pouvez l'exporter pendant cette periode. Apres 30 jours, les donnees sont definitivement supprimees." }
    ],
    ctaTitle: "Essayez gratuitement pendant 14 jours.",
    ctaLead: "Pas de carte requise. Si ca ne convient pas a votre restaurant, vous n'avez rien depense."
  },
  es: {
    metaTitle: "Precios — 49,99 €/mes, Sin Comision",
    description: "Una tarifa mensual fija. Sin comision por comensal. Reservas y cuentas de personal ilimitadas. Prueba gratuita de 14 dias, sin tarjeta de credito.",
    heroBadge: "Precios",
    heroTitle: "49,99 € al mes. Todo incluido.",
    heroLead: "Una tarifa fija. Sin comision por comensal. Sin cargo adicional por mas personal, mas reservas o soporte.",
    comparisonEyebrow: "Por que la tarifa plana gana",
    comparisonTitle: "Lo que obtienes vs. lo que pagarias en otro lugar",
    comparisonHeaders: ["", "Mesaro", "Alternativa con comision"],
    comparisonRows: [
      ["Coste mensual base", "49,99 €", "0–30 €"],
      ["Comision por comensal", "Ninguna", "1,00–2,00 € por comensal"],
      ["1.000 comensales/mes — coste total", "49,99 €", "1.000–2.030 €"],
      ["3.000 comensales/mes — coste total", "49,99 €", "3.000–6.030 €"],
      ["Compartir datos de clientes", "Ninguno — tus datos", "Compartido con la plataforma"],
      ["Listado en marketplace", "No — reservas directas", "Si — junto a competidores"],
      ["URL de reserva personalizada", "Si (/r/tu-slug)", "Raramente"]
    ],
    planName: "Plan Restaurante",
    planPrice: "49,99 €",
    planPriceNote: "/ mes — menos de 1,70 € al dia",
    planHighlights: [
      "Reservas ilimitadas — sin comision por comensal, nunca",
      "Cuentas de personal ilimitadas con acceso por roles",
      "Widget de reserva integrable en tu web",
      "Bloqueos de mesa en tiempo real (sin dobles reservas)",
      "Gestion de turnos, horarios y cierres",
      "Panel de control con estadisticas semanales y mensuales",
      "Historial completo de cada cambio de reserva",
      "Confirmaciones por email con archivo ICS adjunto",
      "14 dias de prueba gratuita — sin tarjeta de credito",
      "Sin contrato anual — cancelacion en cualquier momento"
    ],
    planCta: "Empieza tu prueba gratuita de 14 dias",
    planTrustItems: [
      "Sin tarjeta de credito",
      "Cancelacion en cualquier momento, sin costes",
      "Todas las funciones desde el primer dia"
    ],
    onboardingEyebrow: "Como empezar",
    onboardingTitle: "Operativo en menos de 30 minutos.",
    onboardingItems: [
      { step: "1", title: "Crea tu cuenta", description: "Sin tarjeta de credito. Tarda 2 minutos." },
      { step: "2", title: "Anade tu restaurante", description: "Configura tus mesas, plano, turnos y horarios de apertura." },
      { step: "3", title: "Integra el widget de reservas", description: "Una linea de HTML en tu web. Cinco minutos en cualquier CMS." },
      { step: "4", title: "Sal en directo", description: "Tu primera reserva en linea puede llegar el mismo dia." }
    ],
    faqTitle: "Preguntas sobre precios",
    faqLead: "Respuestas especificas sobre facturacion. Mas en la pagina de FAQ.",
    faqItems: [
      { question: "¿La prueba de 14 dias es realmente gratuita?", answer: "Si. Sin tarjeta al registrarte. Tienes acceso completo a todas las funciones durante 14 dias. Si decides no suscribirte, no pagas nada." },
      { question: "Tengo tres restaurantes. ¿Pago tres veces?", answer: "Si — cada restaurante se factura por separado a 49,99 €/mes. Los tres se gestionan bajo el mismo acceso. Total: 149,97 €/mes para tres locales." },
      { question: "¿Puedo cancelar a mitad de mes?", answer: "Si. Sin contratos, sin gastos de cancelacion. Tu suscripcion se mantiene hasta el final del periodo de facturacion actual y luego se detiene." },
      { question: "¿Hay costes ocultos por soporte o usuarios adicionales?", answer: "No. Cada cuenta de personal, todos los canales de soporte, todas las funciones — mismo precio. Nunca cobraremos por asiento." },
      { question: "¿Que pasa con mis datos si cancelo?", answer: "Tu historial de reservas permanece accesible durante 30 dias tras la cancelacion. Puedes exportarlo durante ese periodo. Despues de 30 dias, los datos se eliminan permanentemente." }
    ],
    ctaTitle: "Pruebalo gratis durante 14 dias.",
    ctaLead: "Sin tarjeta. Si no funciona para tu restaurante, no has gastado nada."
  }
};

export function PricingPage() {
  const { locale, t } = useI18n();
  const copy = COPY[locale];
  const stepLabel =
    locale === "nl" ? "Stap" : locale === "fr" ? "Étape" : locale === "es" ? "Paso" : "Step";

  usePageMeta({ title: copy.metaTitle, description: copy.description });

  return (
    <div className="pb-20">
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="mk-display text-[clamp(3rem,10vw,6rem)] leading-[1.05] text-[var(--mk-mist)]">Mesaro</p>
          <p className="mk-eyebrow mt-6">{copy.heroBadge}</p>
          <h1 className="mt-3 text-2xl font-medium text-[var(--mk-stone)] sm:text-4xl">{copy.heroTitle}</h1>
          <p className="mt-4 max-w-xl text-[var(--mk-pewter)]">{copy.heroLead}</p>
        </motion.div>
      </section>

      <section className="mx-auto mt-16 w-full max-w-6xl px-4">
        <Reveal>
          <p className="mk-eyebrow">{copy.comparisonEyebrow}</p>
          <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.comparisonTitle}</h2>
        </Reveal>
        <Reveal delay={0.08} className="mk-panel mt-8 overflow-x-auto rounded-[1.5rem]">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="text-left">
              <tr className="border-b border-[var(--mk-line)]">
                {copy.comparisonHeaders.map((header, index) => (
                  <th
                    key={`${header}-${index}`}
                    className={`px-5 py-4 font-semibold ${index === 1 ? "text-[var(--mk-brass)]" : "text-[var(--mk-mist)]"}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {copy.comparisonRows.map((row) => (
                <tr key={row[0]} className="border-b border-[var(--mk-line)] last:border-0">
                  <td className="px-5 py-4 font-medium text-[var(--mk-mist)]">{row[0]}</td>
                  <td className="px-5 py-4 font-medium text-[var(--mk-brass)]">{row[1]}</td>
                  <td className="px-5 py-4 text-[var(--mk-pewter)]">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </section>

      <section className="mx-auto mt-20 w-full max-w-6xl px-4">
        <Reveal className="mk-panel mk-grain relative mx-auto max-w-xl overflow-hidden rounded-[2rem] p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--mk-brass)]">{copy.planName}</p>
          <p className="mk-display mt-4 text-6xl text-[var(--mk-mist)]">
            <NumberFlow value={49.99} prefix="€" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
          </p>
          <p className="mt-2 text-sm text-[var(--mk-pewter)]">{copy.planPriceNote}</p>
          <ul className="mt-8 space-y-3">
            {copy.planHighlights.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[var(--mk-pewter)]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mk-brass)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/register"
            className="mk-btn-primary mt-8 inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold"
          >
            {copy.planCta}
          </Link>
          <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {copy.planTrustItems.map((item) => (
              <li key={item} className="flex items-center gap-1 text-xs text-[var(--mk-pewter)]">
                <Check className="h-3 w-3 text-[var(--mk-brass)]" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <Reveal>
          <p className="mk-eyebrow">{copy.onboardingEyebrow}</p>
          <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.onboardingTitle}</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.onboardingItems.map((item, index) => (
            <Reveal key={item.step} delay={index * 0.06} className="mk-panel rounded-2xl p-6">
              <p className="mk-eyebrow">
                {stepLabel} {item.step}
              </p>
              <h3 className="mt-3 text-base font-semibold text-[var(--mk-mist)]">{item.title}</h3>
              <p className="mt-2 text-sm text-[var(--mk-pewter)]">{item.description}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <Reveal className="mb-8">
          <h2 className="mk-display text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.faqTitle}</h2>
          <p className="mt-3 text-[var(--mk-pewter)]">{copy.faqLead}</p>
        </Reveal>
        <Reveal>
          <FaqAccordion items={copy.faqItems} />
        </Reveal>
      </section>

      <section className="mt-24">
        <MarketingCta
          title={copy.ctaTitle}
          lead={copy.ctaLead}
          primaryLabel={t("common.startNow")}
          primaryTo="/register"
        />
      </section>
    </div>
  );
}
