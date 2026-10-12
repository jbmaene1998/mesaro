import { motion } from "motion/react";

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
  whyEyebrow: string;
  whyTitle: string;
  whyParagraphs: string[];
  valuesTitle: string;
  valuesEyebrow: string;
  values: Array<{ title: string; description: string }>;
  audienceEyebrow: string;
  audienceTitle: string;
  audiencePrimary: string;
  audienceSecondary: string;
  ctaTitle: string;
  ctaLead: string;
}> = {
  en: {
    metaTitle: "About Mesaro — Built on 10 Years of Hospitality Experience",
    description: "Mesaro is a restaurant reservation platform built by hospitality professionals. No marketplace, no commission, no shared guest data.",
    heroBadge: "About Mesaro",
    heroTitle: "Reservations are not a software problem. They're an operations problem.",
    heroLead: "Mesaro was built by people with over 10 years of hospitality experience — who know the difference between a 12-table bistro on a quiet Tuesday and a 60-cover restaurant on a sold-out Saturday. We are building the tool we wished existed.",
    whyEyebrow: "Why we exist",
    whyTitle: "Most reservation software is built for platforms, not restaurants.",
    whyParagraphs: [
      "The dominant tools in this market were designed to drive bookings through a marketplace. They make their money on commissions, which means their incentive is volume across thousands of restaurants — not the success of yours.",
      "The side effect is software that prioritises discovery over operations. You get a listing, a customer-facing page, and a basic booking form. But what happens after a guest books? What happens when two guests book the same table by mistake? What happens when your Friday shift closes early because of a closure you set three weeks ago?",
      "Mesaro was built to answer those operational questions — not the marketplace ones."
    ],
    valuesEyebrow: "What we won't change",
    valuesTitle: "A few things we won't compromise on.",
    values: [
      {
        title: "Confirmed means confirmed.",
        description: "A reservation in Mesaro is backed by a real-time table hold. Two guests cannot book the same slot simultaneously. This is not a feature — it's the minimum requirement for a system you can actually rely on."
      },
      {
        title: "Flat pricing is a promise, not a marketing decision.",
        description: "We charge €49.99 per restaurant per month. That covers every seat, every reservation, every staff member. We will not introduce per-cover fees. If you grow from 40 to 80 covers a night, your bill stays exactly the same."
      },
      {
        title: "Your guests belong to you.",
        description: "You don't share guest data with a marketplace. Reservation details, guest contact information, and booking history are yours. They are not used to recommend your competitors. They are not sold."
      }
    ],
    audienceEyebrow: "Who we're built for",
    audienceTitle: "We built Mesaro for operators who are serious about their dining room.",
    audiencePrimary: "Independent restaurant owners running one to three locations who want reliable, simple reservation management without learning a new system every year. Owners who would rather spend time on their menu than managing software.",
    audienceSecondary: "Multi-location operators who need consistent reporting, role-based access across teams, and a single account that covers all their venues without per-location complexity.",
    ctaTitle: "Try Mesaro in your restaurant.",
    ctaLead: "14 days, free. No credit card. No sales call."
  },
  nl: {
    metaTitle: "Over Mesaro — Gebouwd op 10 Jaar Horecaervaring",
    description: "Mesaro is een restaurantreserveringsplatform gebouwd door horecaprofessionals. Geen marketplace, geen commissie, geen gedeelde gastgegevens.",
    heroBadge: "Over Mesaro",
    heroTitle: "Reserveringen zijn geen softwareprobleem. Het is een operationeel probleem.",
    heroLead: "Mesaro is gebouwd door mensen met meer dan 10 jaar horecaervaring — die het verschil kennen tussen een bistro met 12 tafels op een rustige dinsdag en een restaurant met 60 couverts op een uitverkochte zaterdag. We bouwen het hulpmiddel dat we zelf wensten.",
    whyEyebrow: "Waarom we bestaan",
    whyTitle: "De meeste reserveringssoftware is gebouwd voor platforms, niet voor restaurants.",
    whyParagraphs: [
      "De dominante tools op deze markt zijn ontworpen om boekingen via een marketplace te sturen. Ze verdienen hun geld via commissies, wat betekent dat hun prikkel volume is over duizenden restaurants — niet het succes van het jouwe.",
      "Het neveneffect is software die ontdekking boven operaties stelt. Je krijgt een vermelding, een klantpagina en een basisboekingsformulier. Maar wat gebeurt er nadat een gast boekt? Wat als twee gasten per vergissing dezelfde tafel boeken? Wat als je vrijdagshift vroeg sluit vanwege een sluiting die je drie weken geleden instelde?",
      "Mesaro werd gebouwd om die operationele vragen te beantwoorden — niet de marketplace-vragen."
    ],
    valuesEyebrow: "Wat we niet veranderen",
    valuesTitle: "Een paar dingen waarop we niet compromitteren.",
    values: [
      {
        title: "Bevestigd betekent bevestigd.",
        description: "Een reservering in Mesaro wordt ondersteund door een realtime tafelblokkeringen. Twee gasten kunnen niet tegelijkertijd hetzelfde slot boeken. Dit is geen feature — het is de minimumvereiste voor een systeem waarop je echt kunt vertrouwen."
      },
      {
        title: "Vast tarief is een belofte, geen marketingbeslissing.",
        description: "We rekenen €49,99 per restaurant per maand. Dat dekt elke stoel, elke reservering, elk personeelslid. We zullen geen commissies per couvert invoeren. Als je van 40 naar 80 couverts per avond groeit, blijft je factuur precies hetzelfde."
      },
      {
        title: "Jouw gasten behoren tot jou.",
        description: "Je deelt geen gastgegevens met een marketplace. Reserveringsdetails, contactgegevens van gasten en boekingsgeschiedenis zijn van jou. Ze worden niet gebruikt om je concurrenten aan te bevelen en niet verkocht."
      }
    ],
    audienceEyebrow: "Voor wie we gebouwd zijn",
    audienceTitle: "We bouwden Mesaro voor operators die serieus zijn over hun eetzaal.",
    audiencePrimary: "Onafhankelijke restauranteigenaars met één tot drie locaties die betrouwbaar, eenvoudig reserveringsbeheer willen zonder elk jaar een nieuw systeem te leren.",
    audienceSecondary: "Multi-locatie-operators die consistente rapportage, rolgebaseerde toegang over teams en één account nodig hebben dat al hun vestigingen dekt.",
    ctaTitle: "Probeer Mesaro in je restaurant.",
    ctaLead: "14 dagen, gratis. Geen creditcard. Geen verkoopgesprek."
  },
  fr: {
    metaTitle: "A propos de Mesaro — Construit sur 10 Ans d'Experience en Restauration",
    description: "Mesaro est une plateforme de reservation de restaurants construite par des professionnels de la restauration. Pas de marketplace, pas de commission, pas de partage des donnees clients.",
    heroBadge: "A propos de Mesaro",
    heroTitle: "Les reservations ne sont pas un probleme logiciel. C'est un probleme d'exploitation.",
    heroLead: "Mesaro est concu par des personnes avec plus de 10 ans d'experience en restauration — qui connaissent la difference entre un bistrot de 12 tables un mardi calme et un restaurant de 60 couverts un samedi complet. Nous construisons l'outil que nous aurions voulu avoir.",
    whyEyebrow: "Pourquoi nous existons",
    whyTitle: "La plupart des logiciels de reservation sont construits pour les plateformes, pas pour les restaurants.",
    whyParagraphs: [
      "Les outils dominants sur ce marche ont ete concus pour generer des reservations via une marketplace. Ils gagnent de l'argent sur les commissions, ce qui signifie que leur interet est le volume sur des milliers de restaurants — pas le succes du votre.",
      "L'effet secondaire est un logiciel qui privilegie la decouverte a l'exploitation. Vous obtenez une fiche, une page client et un formulaire de reservation basique. Mais que se passe-t-il apres qu'un client reserve ? Que se passe-t-il quand deux clients reservent la meme table par erreur ?",
      "Mesaro a ete concu pour repondre a ces questions operationnelles — pas aux questions de marketplace."
    ],
    valuesEyebrow: "Ce que nous ne changerons pas",
    valuesTitle: "Quelques points sur lesquels nous ne transigeons pas.",
    values: [
      {
        title: "Confirme signifie confirme.",
        description: "Une reservation dans Mesaro est soutenue par un blocage de table en temps reel. Deux clients ne peuvent pas reserver le meme creneau simultanement. Ce n'est pas une fonctionnalite — c'est l'exigence minimale d'un systeme fiable."
      },
      {
        title: "Le tarif fixe est une promesse, pas une decision marketing.",
        description: "Nous facturons 49,99 € par restaurant et par mois. Cela couvre chaque siege, chaque reservation, chaque membre du personnel. Nous n'introduirons pas de commissions par couvert. Si vous passez de 40 a 80 couverts par soir, votre facture reste exactement la meme."
      },
      {
        title: "Vos clients vous appartiennent.",
        description: "Vous ne partagez pas les donnees clients avec une marketplace. Les details de reservation, les coordonnees des clients et l'historique des reservations sont les votres. Ils ne sont pas utilises pour recommander vos concurrents et ne sont pas vendus."
      }
    ],
    audienceEyebrow: "Pour qui nous construisons",
    audienceTitle: "Nous avons construit Mesaro pour les exploitants serieux dans leur salle.",
    audiencePrimary: "Proprietaires de restaurants independants avec un a trois etablissements qui souhaitent une gestion des reservations fiable et simple sans apprendre un nouveau systeme chaque annee.",
    audienceSecondary: "Operateurs multi-etablissements qui ont besoin de rapports coherents, d'un acces par role entre les equipes et d'un compte unique couvrant tous leurs sites.",
    ctaTitle: "Essayez Mesaro dans votre restaurant.",
    ctaLead: "14 jours, gratuit. Sans carte bancaire. Sans appel commercial."
  },
  es: {
    metaTitle: "Sobre Mesaro — Construido sobre 10 Anos de Experiencia en Hosteleria",
    description: "Mesaro es una plataforma de reservas para restaurantes construida por profesionales de la hosteleria. Sin marketplace, sin comision, sin datos de clientes compartidos.",
    heroBadge: "Sobre Mesaro",
    heroTitle: "Las reservas no son un problema de software. Son un problema de operaciones.",
    heroLead: "Mesaro esta construido por personas con mas de 10 anos de experiencia en hosteleria — que conocen la diferencia entre un bistro de 12 mesas un martes tranquilo y un restaurante de 60 comensales un sabado lleno. Estamos construyendo la herramienta que deseabamos tener.",
    whyEyebrow: "Por que existimos",
    whyTitle: "La mayoria del software de reservas esta construido para plataformas, no para restaurantes.",
    whyParagraphs: [
      "Las herramientas dominantes en este mercado fueron disenadas para generar reservas a traves de un marketplace. Ganan dinero con comisiones, lo que significa que su incentivo es el volumen en miles de restaurantes — no el exito del tuyo.",
      "El efecto secundario es un software que prioriza el descubrimiento sobre las operaciones. Obtienes un listado, una pagina para clientes y un formulario de reserva basico. Pero ¿que pasa despues de que un cliente reserva? ¿Que pasa cuando dos clientes reservan la misma mesa por error?",
      "Mesaro fue construido para responder a esas preguntas operativas — no a las del marketplace."
    ],
    valuesEyebrow: "Lo que no cambiaremos",
    valuesTitle: "Algunas cosas en las que no cedemos.",
    values: [
      {
        title: "Confirmado significa confirmado.",
        description: "Una reserva en Mesaro esta respaldada por un bloqueo de mesa en tiempo real. Dos clientes no pueden reservar el mismo hueco simultaneamente. Esto no es una funcion — es el requisito minimo de un sistema en el que puedas confiar realmente."
      },
      {
        title: "La tarifa plana es una promesa, no una decision de marketing.",
        description: "Cobramos 49,99 € por restaurante al mes. Eso cubre cada asiento, cada reserva, cada empleado. No introduciremos comisiones por comensal. Si pasas de 40 a 80 comensales por noche, tu factura sigue siendo exactamente la misma."
      },
      {
        title: "Tus clientes son tuyos.",
        description: "No compartes datos de clientes con un marketplace. Los detalles de reserva, la informacion de contacto de los clientes y el historial de reservas son tuyos. No se usan para recomendar a tus competidores y no se venden."
      }
    ],
    audienceEyebrow: "Para quien construimos",
    audienceTitle: "Construimos Mesaro para operadores que se toman en serio su sala.",
    audiencePrimary: "Propietarios de restaurantes independientes con uno a tres locales que quieren una gestion de reservas fiable y sencilla sin aprender un nuevo sistema cada ano.",
    audienceSecondary: "Operadores multi-local que necesitan informes coherentes, acceso por roles entre equipos y una sola cuenta que cubra todos sus locales.",
    ctaTitle: "Prueba Mesaro en tu restaurante.",
    ctaLead: "14 dias, gratis. Sin tarjeta de credito. Sin llamada comercial."
  }
};

export function AboutPage() {
  const { locale, t } = useI18n();
  const copy = COPY[locale];
  const primaryLabel =
    locale === "nl" ? "Primair" : locale === "fr" ? "Principal" : locale === "es" ? "Principal" : "Primary";
  const secondaryLabel =
    locale === "nl" ? "Secundair" : locale === "fr" ? "Secondaire" : locale === "es" ? "Secundario" : "Secondary";

  usePageMeta({ title: copy.metaTitle, description: copy.description });

  return (
    <div className="pb-20">
      <section className="mk-hero relative min-h-[68vh] overflow-hidden">
        <motion.img
          src="/marketing/about-kitchen.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(42,50,40,0.92)] via-[rgba(62,74,50,0.78)] to-[rgba(62,74,50,0.32)]" />
        <div className="relative mx-auto flex min-h-[68vh] w-full max-w-6xl flex-col justify-end px-4 pb-16 pt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <p className="mk-display text-[clamp(3rem,10vw,6rem)] leading-none text-[var(--mk-mist)]">Mesaro</p>
            <p className="mk-eyebrow mt-6">{copy.heroBadge}</p>
            <h1 className="mt-3 text-2xl font-medium text-[var(--mk-stone)] sm:text-3xl">{copy.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-[var(--mk-pewter)]">{copy.heroLead}</p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto mt-24 grid w-full max-w-6xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <Reveal>
          <p className="mk-eyebrow">{copy.whyEyebrow}</p>
          <GsapSplitReveal>
            <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.whyTitle}</h2>
          </GsapSplitReveal>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-[var(--mk-pewter)]">
            {copy.whyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ParallaxImage
            src="/marketing/mesaro-about-pass.jpg"
            alt=""
            className="aspect-[4/5] rounded-[2rem]"
            intensity={26}
          />
        </Reveal>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <Reveal>
          <p className="mk-eyebrow">{copy.valuesEyebrow}</p>
          <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.valuesTitle}</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {copy.values.map((value, index) => (
            <Reveal key={value.title} delay={index * 0.08} className="mk-panel rounded-2xl p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-[var(--mk-mist)]">{value.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--mk-pewter)]">{value.description}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <Reveal>
          <p className="mk-eyebrow">{copy.audienceEyebrow}</p>
          <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.audienceTitle}</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Reveal className="mk-panel rounded-2xl p-6 sm:p-8">
            <h3 className="text-base font-semibold text-[var(--mk-brass)]">{primaryLabel}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--mk-pewter)]">{copy.audiencePrimary}</p>
          </Reveal>
          <Reveal delay={0.08} className="mk-panel rounded-2xl p-6 sm:p-8">
            <h3 className="text-base font-semibold text-[var(--mk-brass)]">{secondaryLabel}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--mk-pewter)]">{copy.audienceSecondary}</p>
          </Reveal>
        </div>
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
