import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

import { MarketingCta } from "@/features/marketing/components/MarketingCta";
import { usePageMeta } from "@/features/marketing/hooks/usePageMeta";
import { GsapSplitReveal } from "@/features/marketing/motion/GsapText";
import { ParallaxImage } from "@/features/marketing/motion/ParallaxImage";
import { Reveal } from "@/features/marketing/motion/Reveal";
import { useI18n, type SupportedLocale } from "@/i18n";

const COPY: Record<SupportedLocale, {
  metaTitle: string;
  description: string;
  heroBadge: string;
  heroTitle: string;
  heroLead: string;
  heroTrust: string;
  reservationsTitle: string;
  reservationsEyebrow: string;
  reservationsBody: string;
  reservationFeatures: string[];
  widgetEyebrow: string;
  widgetTitle: string;
  widgetBody: string;
  widgetFeatures: string[];
  shiftEyebrow: string;
  shiftTitle: string;
  shiftBody: string;
  rolesEyebrow: string;
  rolesTitle: string;
  rolesBody: string;
  roles: Array<{ title: string; text: string }>;
  rolesAddOn: string;
  dashboardEyebrow: string;
  dashboardTitle: string;
  dashboardBody: string;
  multiEyebrow: string;
  multiTitle: string;
  multiBody: string;
  ctaTitle: string;
  ctaLead: string;
}> = {
  en: {
    metaTitle: "Features — Restaurant Reservation Management",
    description: "Real-time table holds, embeddable booking widget, shift management, and role-based staff access. Built for restaurant operations, not marketplaces.",
    heroBadge: "Features",
    heroTitle: "Every tool your front-of-house actually uses.",
    heroLead: "Mesaro covers the full reservation and shift lifecycle — from the moment a guest books to the moment they're seated. No bloat. No features you'll never touch.",
    heroTrust: "New platform — 14-day free trial, no credit card.",
    reservationsEyebrow: "Reservations",
    reservationsTitle: "Double bookings don't happen here.",
    reservationsBody: "When a guest starts booking online, Mesaro holds the table in Redis for a configurable window. No other booking can claim that slot. If the guest doesn't finish the process, the slot returns to availability on its own — no staff action needed.",
    reservationFeatures: [
      "Live availability across all your shifts",
      "Timed table holds before confirmation",
      "Automatic slot release when hold expires",
      "Guest-facing booking page at your own URL (/r/your-slug)",
      "Manual reservation entry for phone bookings",
      "Full history with audit trail"
    ],
    widgetEyebrow: "Website widget",
    widgetTitle: "Your website. Your widget. Your guest.",
    widgetBody: "The Mesaro booking widget is a single iframe. Paste it into your website. Guests book without leaving your page, without seeing a marketplace, without being shown your competitors. Access your embed code inside the admin.",
    widgetFeatures: [
      "Works on WordPress, Squarespace, Wix, or custom HTML",
      "Mobile-responsive out of the box",
      "No Mesaro branding unless you want it",
      "Live availability — not cached"
    ],
    shiftEyebrow: "Scheduling",
    shiftTitle: "Availability that matches how you actually run.",
    shiftBody: "Define lunch and dinner shifts separately. Set different capacities per shift. Block out holidays and closures without touching your shift structure. Mesaro only shows guests times that exist within your confirmed operating hours.",
    rolesEyebrow: "Access control",
    rolesTitle: "Everyone sees exactly what they need.",
    rolesBody: "Three roles, cleanly separated. No configuration complexity.",
    roles: [
      { title: "Owner", text: "Full access — billing, restaurant settings, staff management, all reservations across all locations." },
      { title: "Manager", text: "Reservations, shifts, staff assignments, closures, and reports. No billing access." },
      { title: "Front-of-house", text: "Their shift view and today's reservation list. Nothing outside their service scope." }
    ],
    rolesAddOn: "Invite a new staff member by email. They're active in under two minutes.",
    dashboardEyebrow: "Visibility",
    dashboardTitle: "Know what's coming before service starts.",
    dashboardBody: "The timeline view shows every table across every shift — what's booked, what's held, what's open. Weekly and monthly stats show covers, occupancy, and no-shows. Your managers can review tomorrow before leaving tonight.",
    multiEyebrow: "Multi-location",
    multiTitle: "One account. All your restaurants.",
    multiBody: "Switch between restaurants in the top navigation. Each location has its own floor plan, shifts, staff list, and bookings. Staff see only their assigned location. Owners see all of them.",
    ctaTitle: "Ready to see it in your restaurant?",
    ctaLead: "14-day free trial. No credit card required. Cancel anytime."
  },
  nl: {
    metaTitle: "Functies — Restaurantreserveringsbeheer",
    description: "Realtime tafelblokkeringen, insluitbare boekingswidget, shiftbeheer en rolgebaseerde personeelstoegang. Gebouwd voor restaurantoperaties.",
    heroBadge: "Functies",
    heroTitle: "Elk hulpmiddel dat je front-of-house echt gebruikt.",
    heroLead: "Mesaro dekt de volledige levenscyclus van reserveringen en shifts — van het moment dat een gast boekt tot het moment dat hij zit. Geen overbodige functies.",
    heroTrust: "Nieuw platform — 14 dagen gratis proefperiode, geen creditcard.",
    reservationsEyebrow: "Reserveringen",
    reservationsTitle: "Dubbele boekingen gebeuren hier niet.",
    reservationsBody: "Wanneer een gast online begint te boeken, blokkeert Mesaro de tafel via Redis voor een configureerbaar venster. Geen andere boeking kan dat slot opeisen. Bevestigt de gast niet, dan komt het slot automatisch vrij.",
    reservationFeatures: [
      "Realtime beschikbaarheid over alle shifts",
      "Tijdgebonden tafelblokkeringen voor bevestiging",
      "Automatische vrijgave wanneer blokkade vervalt",
      "Gastpagina op jouw eigen URL (/r/jouw-slug)",
      "Handmatige invoer voor telefonische reservaties",
      "Volledige geschiedenis met auditspoor"
    ],
    widgetEyebrow: "Websitewidget",
    widgetTitle: "Jouw website. Jouw widget. Jouw gast.",
    widgetBody: "De Mesaro-boekingswidget is een enkele iframe. Plak die in je website. Gasten boeken zonder jouw pagina te verlaten, zonder een marketplace te zien. Toegang tot je insluitcode via het admin-panel.",
    widgetFeatures: [
      "Werkt op WordPress, Squarespace, Wix of custom HTML",
      "Mobiel-responsief uit de doos",
      "Geen Mesaro-branding, tenzij gewenst",
      "Live beschikbaarheid — niet gecached"
    ],
    shiftEyebrow: "Planning",
    shiftTitle: "Beschikbaarheid die overeenkomt met hoe jij echt werkt.",
    shiftBody: "Definieer lunch- en dinershifts afzonderlijk. Stel verschillende capaciteiten per shift in. Blokkeer feestdagen en sluitingen zonder je shiftstructuur te wijzigen. Mesaro toont gasten alleen tijden binnen je bevestigde openingstijden.",
    rolesEyebrow: "Toegangsbeheer",
    rolesTitle: "Iedereen ziet precies wat hij nodig heeft.",
    rolesBody: "Drie rollen, duidelijk gescheiden. Geen configuratiecomplexiteit.",
    roles: [
      { title: "Eigenaar", text: "Volledige toegang — facturering, restaurantinstellingen, personeelsbeheer, alle reserveringen over alle locaties." },
      { title: "Manager", text: "Reserveringen, shifts, personeelsopdrachten, sluitingen en rapporten. Geen toegang tot facturering." },
      { title: "Front-of-house", text: "Hun shiftoverzicht en de reserveringen van vandaag. Niets buiten hun serviceomvang." }
    ],
    rolesAddOn: "Nodig een nieuw personeelslid uit via e-mail. Actief binnen twee minuten.",
    dashboardEyebrow: "Overzicht",
    dashboardTitle: "Weet wat er komt voor de service begint.",
    dashboardBody: "De tijdlijnweergave toont elke tafel over elke shift — wat geboekt is, wat geblokkeerd is, wat open is. Wekelijkse en maandelijkse statistieken tonen couverts, bezettingsgraad en no-shows.",
    multiEyebrow: "Multi-locatie",
    multiTitle: "Één account. Al je restaurants.",
    multiBody: "Wissel tussen restaurants in de bovenste navigatie. Elke locatie heeft zijn eigen plattegrond, shifts, personeelslijst en reserveringen. Medewerkers zien alleen hun toegewezen locatie. Eigenaars zien alles.",
    ctaTitle: "Klaar om het in je restaurant te zien?",
    ctaLead: "14 dagen gratis proefperiode. Geen creditcard. Altijd opzegbaar."
  },
  fr: {
    metaTitle: "Fonctionnalites — Gestion des Reservations Restaurant",
    description: "Blocages de tables en temps reel, widget de reservation integrable, gestion des services et acces du personnel par role. Concu pour les operations de restauration.",
    heroBadge: "Fonctionnalites",
    heroTitle: "Chaque outil que votre salle utilise vraiment.",
    heroLead: "Mesaro couvre l'ensemble du cycle de vie des reservations et des services — du moment ou un client reserve au moment ou il est assis. Pas de superflu.",
    heroTrust: "Nouvelle plateforme — essai gratuit de 14 jours, sans carte bancaire.",
    reservationsEyebrow: "Reservations",
    reservationsTitle: "Les doubles reservations n'arrivent pas ici.",
    reservationsBody: "Quand un client commence a reserver en ligne, Mesaro bloque la table via Redis pour une fenetre configurable. Aucune autre reservation ne peut prendre ce creneau. Si le client ne confirme pas, le creneau se libere seul.",
    reservationFeatures: [
      "Disponibilite en temps reel sur tous vos services",
      "Blocages temporaires avant confirmation",
      "Liberation automatique a l'expiration du blocage",
      "Page client a votre propre URL (/r/votre-slug)",
      "Saisie manuelle pour les reservations telephoniques",
      "Historique complet avec journal d'audit"
    ],
    widgetEyebrow: "Widget site web",
    widgetTitle: "Votre site. Votre widget. Votre client.",
    widgetBody: "Le widget de reservation Mesaro est un seul iframe. Collez-le sur votre site. Les clients reservent sans quitter votre page, sans voir une marketplace. Acces au code d'integration depuis l'admin.",
    widgetFeatures: [
      "Compatible WordPress, Squarespace, Wix ou HTML personnalise",
      "Responsive mobile d'origine",
      "Pas de marque Mesaro visible sauf si desire",
      "Disponibilite en direct — pas en cache"
    ],
    shiftEyebrow: "Planification",
    shiftTitle: "Une disponibilite qui correspond a votre fonctionnement reel.",
    shiftBody: "Definissez separement les services du dejeuner et du diner. Fixez des capacites differentes par service. Bloquez feries et fermetures sans toucher a votre structure de services. Mesaro n'affiche aux clients que les creneaux dans vos vrais horaires.",
    rolesEyebrow: "Controle des acces",
    rolesTitle: "Chacun voit exactement ce dont il a besoin.",
    rolesBody: "Trois roles, clairement separes. Pas de complexite de configuration.",
    roles: [
      { title: "Proprietaire", text: "Acces complet — facturation, parametres, gestion du personnel, toutes les reservations de tous les etablissements." },
      { title: "Manager", text: "Reservations, services, affectations du personnel, fermetures et rapports. Pas d'acces a la facturation." },
      { title: "Salle", text: "Leur vue de service et la liste des reservations du jour. Rien en dehors de leur perimetre de service." }
    ],
    rolesAddOn: "Invitez un nouveau membre du personnel par email. Actif en moins de deux minutes.",
    dashboardEyebrow: "Visibilite",
    dashboardTitle: "Sachez ce qui vient avant le debut du service.",
    dashboardBody: "La vue chronologique montre chaque table de chaque service — ce qui est reserve, bloque, disponible. Les statistiques hebdomadaires et mensuelles montrent les couverts, le taux d'occupation et les no-shows.",
    multiEyebrow: "Multi-etablissements",
    multiTitle: "Un seul compte. Tous vos restaurants.",
    multiBody: "Passez d'un restaurant a l'autre dans la navigation. Chaque etablissement a son propre plan, ses services, son personnel et ses reservations. Le personnel ne voit que son etablissement. Les proprietaires voient tout.",
    ctaTitle: "Pret a le voir dans votre restaurant ?",
    ctaLead: "Essai gratuit de 14 jours. Sans carte bancaire. Resiliation a tout moment."
  },
  es: {
    metaTitle: "Funciones — Gestion de Reservas para Restaurantes",
    description: "Bloqueos de mesa en tiempo real, widget de reserva integrable, gestion de turnos y acceso del personal por roles. Construido para operaciones de restauracion.",
    heroBadge: "Funciones",
    heroTitle: "Cada herramienta que tu sala realmente usa.",
    heroLead: "Mesaro cubre todo el ciclo de vida de las reservas y turnos — desde el momento en que un cliente reserva hasta que se sienta. Sin funciones superfluas.",
    heroTrust: "Nueva plataforma — 14 dias de prueba gratuita, sin tarjeta de credito.",
    reservationsEyebrow: "Reservas",
    reservationsTitle: "Las dobles reservas no ocurren aqui.",
    reservationsBody: "Cuando un cliente empieza a reservar en linea, Mesaro bloquea la mesa via Redis durante una ventana configurable. Ninguna otra reserva puede tomar ese hueco. Si el cliente no confirma, el hueco se libera solo.",
    reservationFeatures: [
      "Disponibilidad en tiempo real en todos tus turnos",
      "Bloqueos de mesa temporales antes de confirmar",
      "Liberacion automatica al expirar el bloqueo",
      "Pagina de cliente en tu propia URL (/r/tu-slug)",
      "Entrada manual para reservas telefonicas",
      "Historial completo con registro de auditoria"
    ],
    widgetEyebrow: "Widget web",
    widgetTitle: "Tu web. Tu widget. Tu cliente.",
    widgetBody: "El widget de reservas Mesaro es un unico iframe. Pegalo en tu web. Los clientes reservan sin salir de tu pagina, sin ver un marketplace. Accede al codigo de integracion desde el panel de administracion.",
    widgetFeatures: [
      "Compatible con WordPress, Squarespace, Wix o HTML personalizado",
      "Responsive en movil de serie",
      "Sin marca Mesaro visible, salvo que lo desees",
      "Disponibilidad en directo — no en cache"
    ],
    shiftEyebrow: "Planificacion",
    shiftTitle: "Disponibilidad que coincide con como realmente operas.",
    shiftBody: "Define los turnos de almuerzo y cena por separado. Establece capacidades distintas por turno. Bloquea festivos y cierres sin tocar tu estructura de turnos. Mesaro solo muestra a los clientes horas dentro de tus horarios reales.",
    rolesEyebrow: "Control de acceso",
    rolesTitle: "Cada uno ve exactamente lo que necesita.",
    rolesBody: "Tres roles, claramente separados. Sin complejidad de configuracion.",
    roles: [
      { title: "Propietario", text: "Acceso completo — facturacion, configuracion, gestion de personal, todas las reservas de todos los locales." },
      { title: "Gestor", text: "Reservas, turnos, asignaciones de personal, cierres e informes. Sin acceso a facturacion." },
      { title: "Sala", text: "Su vista de turno y la lista de reservas de hoy. Nada fuera de su ambito de servicio." }
    ],
    rolesAddOn: "Invita a un nuevo empleado por email. Activo en menos de dos minutos.",
    dashboardEyebrow: "Visibilidad",
    dashboardTitle: "Sabe lo que viene antes de que empiece el servicio.",
    dashboardBody: "La vista de cronograma muestra cada mesa en cada turno — reservada, bloqueada o libre. Las estadisticas semanales y mensuales muestran comensales, ocupacion y no-shows.",
    multiEyebrow: "Multi-local",
    multiTitle: "Una cuenta. Todos tus restaurantes.",
    multiBody: "Cambia entre restaurantes en la navegacion superior. Cada local tiene su propio plano, turnos, lista de personal y reservas. El personal solo ve su local asignado. Los propietarios lo ven todo.",
    ctaTitle: "¿Listo para verlo en tu restaurante?",
    ctaLead: "14 dias de prueba gratuita. Sin tarjeta de credito. Cancelacion en cualquier momento."
  }
};

export function FeaturesPage() {
  const { locale, t } = useI18n();
  const copy = COPY[locale];

  usePageMeta({ title: copy.metaTitle, description: copy.description });

  return (
    <div className="pb-20">
      <section className="mk-hero relative min-h-[70vh] overflow-hidden">
        <motion.img
          src="/marketing/device-timeline.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(42,50,40,0.92)] via-[rgba(62,74,50,0.75)] to-[rgba(62,74,50,0.35)]" />
        <div className="relative mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col justify-end px-4 pb-16 pt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <p className="mk-display text-[clamp(3rem,10vw,6rem)] leading-[1.05] text-[var(--mk-mist)]">Mesaro</p>
            <p className="mk-eyebrow mt-6">{copy.heroBadge}</p>
            <h1 className="mt-3 text-2xl font-medium text-[var(--mk-stone)] sm:text-3xl">{copy.heroTitle}</h1>
            <p className="mt-4 max-w-xl text-[var(--mk-pewter)]">{copy.heroLead}</p>
            <Link
              to="/register"
              className="mk-btn-primary mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold"
            >
              {t("common.startNow")}
            </Link>
            <p className="mt-3 text-xs text-[var(--mk-pewter)]">{copy.heroTrust}</p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto mt-24 grid w-full max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="mk-eyebrow">{copy.reservationsEyebrow}</p>
          <GsapSplitReveal>
            <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.reservationsTitle}</h2>
          </GsapSplitReveal>
          <p className="mt-4 text-[var(--mk-pewter)]">{copy.reservationsBody}</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {copy.reservationFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-[var(--mk-pewter)]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mk-brass)]" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <ParallaxImage
            src="/marketing/ui-timeline.jpg"
            alt="Mesaro service timeline"
            className="aspect-[4/3] overflow-hidden rounded-[2rem] border border-[var(--mk-line)]"
            intensity={24}
          />
        </Reveal>
      </section>

      <section className="mx-auto mt-24 grid w-full max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
        <Reveal className="lg:order-2">
          <p className="mk-eyebrow">{copy.widgetEyebrow}</p>
          <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.widgetTitle}</h2>
          <p className="mt-4 text-[var(--mk-pewter)]">{copy.widgetBody}</p>
          <ul className="mt-8 space-y-3">
            {copy.widgetFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-[var(--mk-pewter)]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mk-brass)]" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1} className="lg:order-1">
          <ParallaxImage
            src="/marketing/ui-guest-booking.jpg"
            alt="Mesaro guest booking widget"
            className="aspect-[4/3] overflow-hidden rounded-[2rem] border border-[var(--mk-line)]"
            intensity={24}
          />
        </Reveal>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="mk-panel overflow-hidden rounded-[1.75rem] md:col-span-2">
            <div className="grid lg:grid-cols-2 lg:items-center">
              <div className="p-8">
                <p className="mk-eyebrow">{copy.shiftEyebrow}</p>
                <h2 className="mk-display mt-3 text-3xl text-[var(--mk-mist)] sm:text-4xl">{copy.shiftTitle}</h2>
                <p className="mt-4 max-w-3xl text-[var(--mk-pewter)]">{copy.shiftBody}</p>
              </div>
              <ParallaxImage
                src="/marketing/ui-tables.jpg"
                alt="Mesaro live table status"
                className="min-h-[220px] border-t border-[var(--mk-line)] lg:min-h-full lg:border-l lg:border-t-0"
                intensity={18}
              />
            </div>
          </Reveal>
          <Reveal delay={0.06} className="mk-panel overflow-hidden rounded-[1.75rem]">
            <ParallaxImage
              src="/marketing/ui-dashboard.jpg"
              alt="Mesaro dashboard"
              className="aspect-[16/10] border-b border-[var(--mk-line)]"
              intensity={16}
            />
            <div className="p-8">
              <p className="mk-eyebrow">{copy.dashboardEyebrow}</p>
              <h2 className="mk-display mt-3 text-3xl text-[var(--mk-mist)] sm:text-4xl">{copy.dashboardTitle}</h2>
              <p className="mt-4 text-[var(--mk-pewter)]">{copy.dashboardBody}</p>
            </div>
          </Reveal>
          <Reveal delay={0.12} className="mk-panel overflow-hidden rounded-[1.75rem]">
            <ParallaxImage
              src="/marketing/ui-reservations.jpg"
              alt="Mesaro reservations list"
              className="aspect-[16/10] border-b border-[var(--mk-line)]"
              intensity={16}
            />
            <div className="p-8">
              <p className="mk-eyebrow">{copy.multiEyebrow}</p>
              <h2 className="mk-display mt-3 text-3xl text-[var(--mk-mist)] sm:text-4xl">{copy.multiTitle}</h2>
              <p className="mt-4 text-[var(--mk-pewter)]">{copy.multiBody}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <Reveal>
          <p className="mk-eyebrow">{copy.rolesEyebrow}</p>
          <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.rolesTitle}</h2>
          <p className="mt-4 max-w-2xl text-[var(--mk-pewter)]">{copy.rolesBody}</p>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {copy.roles.map((role, index) => (
            <Reveal key={role.title} delay={index * 0.08} className="mk-panel rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-[var(--mk-mist)]">{role.title}</h3>
              <p className="mt-3 text-sm text-[var(--mk-pewter)]">{role.text}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-sm text-[var(--mk-pewter)]">{copy.rolesAddOn}</p>
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
