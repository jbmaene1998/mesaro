import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";

import { MarketingCta } from "@/features/marketing/components/MarketingCta";
import { FaqAccordion } from "@/features/marketing/components/FaqAccordion";
import { usePageMeta } from "@/features/marketing/hooks/usePageMeta";
import { GsapSplitReveal } from "@/features/marketing/motion/GsapText";
import { ParallaxImage } from "@/features/marketing/motion/ParallaxImage";
import { Reveal } from "@/features/marketing/motion/Reveal";
import { useI18n, type SupportedLocale } from "@/i18n";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

type Copy = {
  metaTitle: string;
  metaDescription: string;
  heroBadge: string;
  heroTitle: string;
  heroLead: string;
  heroTrustLine: string;
  heroBullets: string[];
  sideTitle: string;
  sideBullets: string[];
  trustedBadge: string;
  trustedTitle: string;
  problemEyebrow: string;
  problemTitle: string;
  problemItems: string[];
  benefitEyebrow: string;
  benefitTitle: string;
  benefits: Array<{ title: string; body: string }>;
  featureSectionEyebrow: string;
  featureSectionTitle: string;
  featureSectionLead: string;
  features: Array<{ title: string; description: string }>;
  pricingTeaserTitle: string;
  pricingTeaserBody: string;
  pricingTeaserLink: string;
  faqTitle: string;
  faqLead: string;
  viewAllFaq: string;
  faqItems: Array<{ question: string; answer: string }>;
  finalTitle: string;
  finalLead: string;
  walkthroughTitle: string;
  walkthroughLead: string;
  trustItems: Array<{ title: string; body: string }>;
  marquee: string[];
  monthlyPrice: string;
};

const COPY: Record<SupportedLocale, Copy> = {
  en: {
    metaTitle: "Restaurant Reservation Software Without Commission",
    metaDescription: "Manage restaurant reservations, table holds, and shifts in one place. Flat €49.99/month, no per-cover fees, 14-day free trial. No credit card required.",
    heroBadge: "Built on 10+ years of hospitality experience",
    heroTitle: "Your front desk stops taking reservation calls at 7pm. Mesaro doesn't.",
    heroLead: "Reservations, table holds, and shift planning — managed in one place, available 24 hours a day, at a flat €49.99 per month with no per-cover commission.",
    heroTrustLine: "No credit card required. No contracts. Cancel anytime.",
    heroBullets: [
      "14-day free trial, no card required",
      "Guests book at your own URL or website widget",
      "Real-time table holds — no double bookings",
      "Shift and opening hours management",
      "Role-based access for your whole team"
    ],
    sideTitle: "What changes when you switch",
    sideBullets: [
      "Guests never book a table that isn't actually available — Redis holds lock it before confirmation.",
      "Your front-of-house sees tomorrow's full service before they arrive.",
      "You pay €49.99 a month whether you seat 500 or 5,000 covers."
    ],
    trustedBadge: "Early product — honest facts",
    trustedTitle: "What is true today",
    problemEyebrow: "Sound familiar?",
    problemTitle: "The old way of taking reservations costs you more than you think.",
    problemItems: [
      "Phone reservations get lost during a dinner rush. Guests show up for bookings your staff has no record of.",
      "Your booking platform charges €1.50 per cover. You seat 3,000 guests a month. That's €4,500 gone — every month.",
      "A guest books online for Saturday at 8pm. Another calls and gets the same table. One of them leaves angry. Neither comes back."
    ],
    benefitEyebrow: "How Mesaro works",
    benefitTitle: "Every reservation locked in before it reaches your team.",
    benefits: [
      {
        title: "No reservation can slip through",
        body: "When a guest starts booking online, Mesaro immediately places a timed hold on that table. No other booking can claim that slot. If the guest doesn't confirm, the hold releases automatically. No manual chasing. No conflicts."
      },
      {
        title: "Your team knows exactly what's coming",
        body: "The service timeline shows every table, every shift, every reservation — updated on load. Your manager knows before service which tables are running tight. Your front-of-house doesn't need to radio back to find out what's booked for 7:30."
      },
      {
        title: "One platform. No marketplace.",
        body: "Your guests book through your own URL or your own website widget. They don't see your competitors. You don't share guest data with a platform. The relationship stays between you and your guests."
      }
    ],
    featureSectionEyebrow: "What's included",
    featureSectionTitle: "Everything a restaurant needs. Nothing you don't.",
    featureSectionLead: "One plan covers your whole operation — no feature tiers, no per-seat pricing.",
    features: [
      { title: "Real-time availability", description: "Slots update the moment a booking lands or a hold expires. Guests always see what's actually open — not a cached version from an hour ago." },
      { title: "Embeddable booking widget", description: "One iframe on your website. Guests book without leaving your domain, without being redirected to a marketplace. Setup takes two minutes." },
      { title: "Shift and opening hours management", description: "Define shifts by day and service. Block closures and holidays. Mesaro only shows bookable slots that match your actual operating hours — automatically." },
      { title: "Role-based staff access", description: "Owners, managers, and front-of-house staff each see exactly what they need. No configuration required beyond assigning the role at invite." },
      { title: "Multi-location under one login", description: "Manage all your restaurants from one account. Each location is separate; you see the full picture from the top level." },
      { title: "Full audit log", description: "Every reservation change — creation, edit, cancellation — is recorded with a timestamp and the name of the staff member who made it." }
    ],
    pricingTeaserTitle: "One plan. No surprises.",
    pricingTeaserBody: "€49.99 per restaurant per month. Covers every table, every reservation, every staff member. No per-cover fees. No annual lock-in.",
    pricingTeaserLink: "See what's included →",
    faqTitle: "Before you start",
    faqLead: "The questions operators usually ask first.",
    viewAllFaq: "View all FAQs",
    faqItems: [
      {
        question: "Is this safe to use for a fully booked Saturday evening?",
        answer: "Yes. Mesaro uses real-time table holds backed by Redis — two guests cannot book the same slot simultaneously. The hold either converts to a confirmed reservation or releases automatically. This is not a nice-to-have — it's the core of how the system works."
      },
      {
        question: "Can my front-of-house staff use this without training?",
        answer: "Most staff are comfortable within 10 minutes. Role-based access means they only see the parts of the system relevant to their shift. There's nothing for them to configure or break."
      },
      {
        question: "What happens to my reservation data if I cancel?",
        answer: "Your data stays accessible for 30 days after your subscription ends. You can export it during that window. After 30 days, it is permanently deleted."
      },
      {
        question: "Does Mesaro replace phone reservations?",
        answer: "It handles online bookings automatically. Staff can also create reservations manually for phone bookings — they appear in the same timeline. You don't need to reconcile two separate systems."
      }
    ],
    finalTitle: "Your next service starts without a reservation conflict.",
    finalLead: "14-day free trial. No credit card. No contracts.",
    walkthroughTitle: "Have a specific question first?",
    walkthroughLead: "We respond within one business day. No auto-replies, no sales scripts.",
    trustItems: [
      { title: "14-day trial", body: "Full product access to try with your restaurant. No credit card required." },
      { title: "€49.99 / month", body: "One flat fee per restaurant. No per-cover commission." },
      { title: "Your booking URL", body: "Guests book on your page or widget — not a marketplace listing." },
      { title: "Support", body: "We reply via the contact form within one business day." }
    ],
    marquee: [
      "Real-time holds",
      "Own booking URL",
      "Shift planning",
      "No commission",
      "Widget embed",
      "Multi-location",
      "Audit trail",
      "Role access"
    ],
    monthlyPrice: "€49.99 / month"
  },
  nl: {
    metaTitle: "Restaurantreserveringssoftware Zonder Commissie",
    metaDescription: "Beheer restaurantreserveringen, tafelblokkeringen en shifts op één plek. Vast tarief €49,99/maand, geen commissie per couvert, 14 dagen gratis proefperiode.",
    heroBadge: "Gebouwd op 10+ jaar horecaervaring",
    heroTitle: "Je front desk stopt met reservatietelefoontjes om 19u. Mesaro niet.",
    heroLead: "Reserveringen, tafelblokkades en shiftplanning — beheerd op één plek, 24 uur per dag beschikbaar, voor een vast tarief van €49,99 per maand zonder commissie.",
    heroTrustLine: "Geen creditcard vereist. Geen contract. Altijd opzegbaar.",
    heroBullets: [
      "14 dagen gratis proefperiode, geen kaart nodig",
      "Gasten boeken via jouw eigen URL of widget",
      "Realtime tafelblokkeringen — geen dubbele boekingen",
      "Shift- en openingstijdenbeheer",
      "Rolgebaseerde toegang voor je hele team"
    ],
    sideTitle: "Wat verandert als je overstapt",
    sideBullets: [
      "Gasten kunnen nooit een tafel boeken die niet echt beschikbaar is — Redis-blokkades vergrendelen die voor bevestiging.",
      "Je front-of-house ziet de volledige service van morgen al voor ze aankomen.",
      "Je betaalt €49,99 per maand, of je nu 500 of 5.000 couverts bedient."
    ],
    trustedBadge: "Vroeg product — eerlijke feiten",
    trustedTitle: "Wat vandaag klopt",
    problemEyebrow: "Herkenbaar?",
    problemTitle: "De oude manier van reservaties kosten je meer dan je denkt.",
    problemItems: [
      "Telefonische reservaties gaan verloren tijdens een drukke dinnerservice. Gasten komen aan voor boekingen die je team niet kan vinden.",
      "Je boekingsplatform rekent €1,50 per couvert. Je bedient 3.000 gasten per maand. Dat is €4.500 weg — elke maand.",
      "Een gast boekt online voor zaterdag om 20:00. Een andere belt en krijgt dezelfde tafel. Eén van hen gaat boos weg. Geen van beiden komt terug."
    ],
    benefitEyebrow: "Hoe Mesaro werkt",
    benefitTitle: "Elke reservatie vastgelegd voor die je team bereikt.",
    benefits: [
      {
        title: "Geen enkele reservatie kan wegvallen",
        body: "Wanneer een gast online begint te boeken, plaatst Mesaro meteen een tijdgebonden blokkade op die tafel. Geen andere boeking kan dat slot opeisen. Bevestigt de gast niet, dan vrijkomt het slot automatisch. Geen handmatig opvolgen. Geen conflicten."
      },
      {
        title: "Je team weet precies wat er komt",
        body: "De servicetijdlijn toont elke tafel, elke shift, elke reservering — bijgewerkt bij laden. Je manager weet voor de service welke tafels krap zitten. Je front-of-house hoeft niet te bellen om te weten wat er om 19:30 staat."
      },
      {
        title: "Één platform. Geen marketplace.",
        body: "Gasten boeken via jouw eigen URL of jouw eigen websitewidget. Ze zien je concurrenten niet. Je deelt geen gastgegevens met een platform. De relatie blijft tussen jou en je gasten."
      }
    ],
    featureSectionEyebrow: "Wat is inbegrepen",
    featureSectionTitle: "Alles wat een restaurant nodig heeft. Niets wat je niet nodig hebt.",
    featureSectionLead: "Één plan dekt je volledige operatie — geen functieniveaus, geen prijs per zetel.",
    features: [
      { title: "Realtime beschikbaarheid", description: "Slots worden bijgewerkt zodra een boeking binnenkomt of een blokkade vervalt. Gasten zien altijd wat werkelijk beschikbaar is." },
      { title: "Insluitbare boekingswidget", description: "Één iframe op je website. Gasten boeken zonder jouw domein te verlaten. Installatie duurt twee minuten." },
      { title: "Shift- en openingstijdenbeheer", description: "Definieer shifts per dag en service. Blokkeer sluitingen en feestdagen. Mesaro toont alleen boekbare slots die overeenkomen met je echte openingstijden." },
      { title: "Rolgebaseerde personeelstoegang", description: "Eigenaars, managers en front-of-house personeel zien elk precies wat ze nodig hebben. Geen configuratie nodig buiten het toewijzen van de rol bij uitnodiging." },
      { title: "Multi-locatie onder één login", description: "Beheer al je restaurants vanuit één account. Elke locatie is afzonderlijk; jij ziet het totaalplaatje." },
      { title: "Volledig auditlogboek", description: "Elke reserveringswijziging — aanmaak, aanpassing, annulering — wordt geregistreerd met tijdstempel en naam van het personeelslid." }
    ],
    pricingTeaserTitle: "Één plan. Geen verrassingen.",
    pricingTeaserBody: "€49,99 per restaurant per maand. Dekt elke tafel, elke reservering, elk personeelslid. Geen commissie per couvert. Geen jaarlijkse verplichting.",
    pricingTeaserLink: "Bekijk wat inbegrepen is →",
    faqTitle: "Voor je begint",
    faqLead: "Vragen die operators als eerste stellen.",
    viewAllFaq: "Bekijk alle FAQs",
    faqItems: [
      {
        question: "Is dit veilig voor een volledig bezette zaterdagavond?",
        answer: "Ja. Mesaro gebruikt realtime tafelblokkeringen via Redis — twee gasten kunnen niet tegelijkertijd hetzelfde slot boeken. De blokkade wordt bevestiging of vrijgegeven automatisch. Dit is de kern van hoe het systeem werkt."
      },
      {
        question: "Kan mijn front-of-house personeel dit zonder training gebruiken?",
        answer: "De meeste medewerkers zijn er binnen 10 minuten mee vertrouwd. Rolgebaseerde toegang betekent dat ze alleen de delen zien die relevant zijn voor hun shift."
      },
      {
        question: "Wat gebeurt er met mijn gegevens als ik opzeg?",
        answer: "Je gegevens blijven 30 dagen na het einde van je abonnement toegankelijk. Je kunt ze in die periode exporteren. Na 30 dagen worden ze permanent verwijderd."
      },
      {
        question: "Vervangt Mesaro telefonische reservaties?",
        answer: "Het verwerkt online boekingen automatisch. Medewerkers kunnen ook handmatig reservaties aanmaken voor telefonische boekingen — die verschijnen in dezelfde tijdlijn."
      }
    ],
    finalTitle: "Je volgende service begint zonder reserveringsconflict.",
    finalLead: "14 dagen gratis proefperiode. Geen creditcard. Geen contract.",
    walkthroughTitle: "Heb je eerst een specifieke vraag?",
    walkthroughLead: "We antwoorden binnen één werkdag. Geen automatische antwoorden, geen verkoopscripts.",
    trustItems: [
      { title: "14 dagen proef", body: "Volledige toegang om Mesaro met jouw restaurant te testen. Geen creditcard vereist." },
      { title: "€49,99 / maand", body: "Eén vast tarief per restaurant. Geen commissie per couvert." },
      { title: "Jouw boekings-URL", body: "Gasten boeken via jouw pagina of widget — geen marketplace." },
      { title: "Support", body: "We antwoorden via het contactformulier binnen één werkdag." }
    ],
    marquee: [
      "Realtime blokkades",
      "Eigen boekings-URL",
      "Shiftplanning",
      "Geen commissie",
      "Widget",
      "Multi-locatie",
      "Auditlog",
      "Rollen"
    ],
    monthlyPrice: "€49,99 / maand"
  },
  fr: {
    metaTitle: "Logiciel de Reservation Restaurant Sans Commission",
    metaDescription: "Gerez reservations, blocages de tables et services depuis un seul endroit. Forfait fixe 49,99 €/mois, sans commission par couvert, essai gratuit 14 jours.",
    heroBadge: "Construit sur plus de 10 ans d'experience en restauration",
    heroTitle: "Votre accueil arrete de prendre des reservations par telephone a 19h. Mesaro, non.",
    heroLead: "Reservations, blocages de tables et planification des services — geres depuis un seul endroit, disponibles 24h/24, a 49,99 € par mois sans commission par couvert.",
    heroTrustLine: "Pas de carte bancaire requise. Pas de contrat. Resiliation possible a tout moment.",
    heroBullets: [
      "Essai gratuit 14 jours, sans carte",
      "Les clients reservent via votre propre URL ou widget",
      "Blocages de tables en temps reel — pas de doubles reservations",
      "Gestion des services et horaires d'ouverture",
      "Acces par role pour toute votre equipe"
    ],
    sideTitle: "Ce qui change quand vous passez a Mesaro",
    sideBullets: [
      "Les clients ne peuvent jamais reserver une table qui n'est pas reellement disponible — les blocages Redis la verrouillent avant confirmation.",
      "Votre salle voit le service complet du lendemain avant d'arriver.",
      "Vous payez 49,99 € par mois que vous serviez 500 ou 5 000 couverts."
    ],
    trustedBadge: "Produit recent — faits verifies",
    trustedTitle: "Ce qui est vrai aujourd'hui",
    problemEyebrow: "Ca vous parle ?",
    problemTitle: "L'ancienne methode de reservation vous coute plus que vous ne le pensez.",
    problemItems: [
      "Les reservations par telephone se perdent pendant un service charge. Les clients arrivent pour des reservations dont votre equipe n'a pas trace.",
      "Votre plateforme de reservation facture 1,50 € par couvert. Vous accueillez 3 000 clients par mois. C'est 4 500 € perdus — chaque mois.",
      "Un client reserve en ligne pour samedi a 20h. Un autre appelle et obtient la meme table. L'un repart en colere. Aucun des deux ne revient."
    ],
    benefitEyebrow: "Comment fonctionne Mesaro",
    benefitTitle: "Chaque reservation confirmee avant qu'elle n'atteigne votre equipe.",
    benefits: [
      {
        title: "Aucune reservation ne peut passer a la trappe",
        body: "Quand un client commence a reserver en ligne, Mesaro place immediatement un blocage temporaire sur cette table. Aucune autre reservation ne peut prendre ce creneau. Si le client ne confirme pas, le blocage se libere automatiquement. Sans suivi manuel. Sans conflit."
      },
      {
        title: "Votre equipe sait exactement ce qui arrive",
        body: "La vue chronologique montre chaque table, chaque service, chaque reservation — mise a jour au chargement. Votre responsable sait avant le service quelles tables sont serrees. Votre salle n'a pas besoin d'appeler pour savoir ce qui est reserve a 19h30."
      },
      {
        title: "Une seule plateforme. Pas de marketplace.",
        body: "Vos clients reservent via votre propre URL ou votre propre widget sur votre site. Ils ne voient pas vos concurrents. Vous ne partagez pas les donnees clients avec une plateforme. La relation reste entre vous et vos clients."
      }
    ],
    featureSectionEyebrow: "Ce qui est inclus",
    featureSectionTitle: "Tout ce qu'un restaurant necessite. Rien de superflu.",
    featureSectionLead: "Un seul forfait couvre toute votre exploitation — pas de niveaux de fonctionnalites, pas de prix par siege.",
    features: [
      { title: "Disponibilite en temps reel", description: "Les creneaux se mettent a jour des qu'une reservation arrive ou qu'un blocage expire. Les clients voient toujours ce qui est vraiment disponible." },
      { title: "Widget de reservation integrable", description: "Un seul iframe sur votre site. Les clients reservent sans quitter votre domaine, sans etre redirige vers une marketplace. Installation en deux minutes." },
      { title: "Gestion des services et horaires", description: "Definissez des services par jour. Bloquez fermetures et jours feries. Mesaro n'affiche que les creneaux reservables qui correspondent a vos vraies heures d'ouverture." },
      { title: "Acces du personnel par role", description: "Proprietaires, managers et personnel de salle voient exactement ce dont ils ont besoin. Aucune configuration necessaire au-dela de l'attribution du role." },
      { title: "Multi-etablissements sous un seul compte", description: "Gerez tous vos restaurants depuis un compte. Chaque etablissement est separe ; vous voyez la vue d'ensemble." },
      { title: "Journal d'audit complet", description: "Chaque modification de reservation — creation, edition, annulation — est enregistree avec horodatage et nom du membre du personnel." }
    ],
    pricingTeaserTitle: "Un seul forfait. Aucune surprise.",
    pricingTeaserBody: "49,99 € par restaurant et par mois. Couvre chaque table, chaque reservation, chaque membre du personnel. Aucune commission par couvert. Aucun engagement annuel.",
    pricingTeaserLink: "Voir ce qui est inclus →",
    faqTitle: "Avant de commencer",
    faqLead: "Les questions que les exploitants posent en premier.",
    viewAllFaq: "Voir toutes les FAQs",
    faqItems: [
      {
        question: "Est-ce fiable pour un samedi soir complet ?",
        answer: "Oui. Mesaro utilise des blocages de tables en temps reel via Redis — deux clients ne peuvent pas reserver le meme creneau simultanement. Le blocage se convertit en reservation confirmee ou se libere automatiquement. C'est le coeur du fonctionnement du systeme."
      },
      {
        question: "Mon personnel de salle peut-il utiliser ceci sans formation ?",
        answer: "La plupart des employes sont a l'aise en 10 minutes. L'acces par role signifie qu'ils ne voient que les parties du systeme pertinentes pour leur service."
      },
      {
        question: "Que devient mes donnees si je resilie ?",
        answer: "Vos donnees restent accessibles pendant 30 jours apres la fin de votre abonnement. Vous pouvez les exporter pendant cette periode. Apres 30 jours, elles sont definitivement supprimees."
      },
      {
        question: "Mesaro remplace-t-il les reservations par telephone ?",
        answer: "Il gere les reservations en ligne automatiquement. Le personnel peut aussi creer des reservations manuellement pour les appels telephoniques — elles apparaissent dans la meme chronologie."
      }
    ],
    finalTitle: "Votre prochain service commence sans conflit de reservation.",
    finalLead: "Essai gratuit de 14 jours. Sans carte bancaire. Sans contrat.",
    walkthroughTitle: "Vous avez d'abord une question specifique ?",
    walkthroughLead: "Nous repondons sous un jour ouvre. Pas de reponse automatique, pas de script de vente.",
    trustItems: [
      { title: "Essai 14 jours", body: "Acces complet pour tester Mesaro avec votre restaurant. Pas de carte requise." },
      { title: "49,99 € / mois", body: "Un forfait fixe par restaurant. Aucune commission par couvert." },
      { title: "Votre URL de reservation", body: "Les clients reservent sur votre page ou widget — pas une marketplace." },
      { title: "Support", body: "Nous repondons via le formulaire de contact sous un jour ouvre." }
    ],
    marquee: [
      "Blocages temps reel",
      "URL de reservation",
      "Services",
      "Sans commission",
      "Widget",
      "Multi-sites",
      "Journal d'audit",
      "Roles"
    ],
    monthlyPrice: "49,99 € / mois"
  },
  es: {
    metaTitle: "Software de Reservas para Restaurantes Sin Comision",
    metaDescription: "Gestiona reservas, bloqueos de mesa y turnos en un solo lugar. Tarifa fija de 49,99 €/mes, sin comision por comensal, prueba gratuita de 14 dias.",
    heroBadge: "Construido sobre mas de 10 anos de experiencia en hosteleria",
    heroTitle: "Tu recepcion deja de atender llamadas de reserva a las 19h. Mesaro no.",
    heroLead: "Reservas, bloqueos de mesa y planificacion de turnos — gestionados en un solo lugar, disponibles las 24 horas, por una tarifa fija de 49,99 € al mes sin comision por comensal.",
    heroTrustLine: "Sin tarjeta de credito. Sin contrato. Cancelacion en cualquier momento.",
    heroBullets: [
      "14 dias de prueba gratuita, sin tarjeta",
      "Los clientes reservan en tu propia URL o widget",
      "Bloqueos de mesa en tiempo real — sin dobles reservas",
      "Gestion de turnos y horarios de apertura",
      "Acceso por roles para todo tu equipo"
    ],
    sideTitle: "Que cambia cuando cambias a Mesaro",
    sideBullets: [
      "Los clientes nunca pueden reservar una mesa que no esta disponible — los bloqueos Redis la aseguran antes de la confirmacion.",
      "Tu sala ve el servicio completo del dia siguiente antes de llegar.",
      "Pagas 49,99 € al mes tanto si atiendes 500 como 5.000 comensales."
    ],
    trustedBadge: "Producto nuevo — hechos honestos",
    trustedTitle: "Lo que es cierto hoy",
    problemEyebrow: "¿Te suena familiar?",
    problemTitle: "La antigua forma de tomar reservas te cuesta mas de lo que crees.",
    problemItems: [
      "Las reservas telefonicas se pierden durante un servicio de cena ocupado. Los clientes llegan para reservas de las que tu equipo no tiene registro.",
      "Tu plataforma de reservas cobra 1,50 € por comensal. Atiendes 3.000 clientes al mes. Son 4.500 € perdidos — cada mes.",
      "Un cliente reserva en linea para el sabado a las 20h. Otro llama y consigue la misma mesa. Uno se va enfadado. Ninguno vuelve."
    ],
    benefitEyebrow: "Como funciona Mesaro",
    benefitTitle: "Cada reserva confirmada antes de llegar a tu equipo.",
    benefits: [
      {
        title: "Ninguna reserva puede escaparse",
        body: "Cuando un cliente empieza a reservar en linea, Mesaro coloca inmediatamente un bloqueo temporal en esa mesa. Ninguna otra reserva puede reclamar ese hueco. Si el cliente no confirma, el bloqueo se libera automaticamente. Sin seguimiento manual. Sin conflictos."
      },
      {
        title: "Tu equipo sabe exactamente lo que viene",
        body: "La vista de cronograma de servicio muestra cada mesa, cada turno, cada reserva — actualizada al cargar. Tu responsable sabe antes del servicio que mesas estan ajustadas. Tu sala no necesita llamar para saber que esta reservado a las 19:30."
      },
      {
        title: "Una plataforma. Sin marketplace.",
        body: "Tus clientes reservan a traves de tu propia URL o tu propio widget en tu web. No ven a tus competidores. No compartes datos de clientes con una plataforma. La relacion queda entre tu y tus clientes."
      }
    ],
    featureSectionEyebrow: "Que esta incluido",
    featureSectionTitle: "Todo lo que un restaurante necesita. Nada mas.",
    featureSectionLead: "Un solo plan cubre toda tu operacion — sin niveles de funciones, sin precio por asiento.",
    features: [
      { title: "Disponibilidad en tiempo real", description: "Los huecos se actualizan en el momento en que llega una reserva o expira un bloqueo. Los clientes siempre ven lo que realmente esta disponible." },
      { title: "Widget de reserva integrable", description: "Un solo iframe en tu web. Los clientes reservan sin salir de tu dominio, sin ser redirigidos a un marketplace. Instalacion en dos minutos." },
      { title: "Gestion de turnos y horarios", description: "Define turnos por dia y servicio. Bloquea cierres y festivos. Mesaro solo muestra huecos reservables que coincidan con tus horarios reales de apertura." },
      { title: "Acceso del personal por roles", description: "Propietarios, gestores y personal de sala ven exactamente lo que necesitan. Sin configuracion adicional mas alla de asignar el rol al invitar." },
      { title: "Multi-local bajo un solo acceso", description: "Gestiona todos tus restaurantes desde una cuenta. Cada local es independiente; tu ves el panorama completo." },
      { title: "Registro de auditoria completo", description: "Cada cambio en una reserva — creacion, edicion, cancelacion — queda registrado con marca de tiempo y nombre del empleado." }
    ],
    pricingTeaserTitle: "Un plan. Sin sorpresas.",
    pricingTeaserBody: "49,99 € por restaurante al mes. Cubre cada mesa, cada reserva, cada empleado. Sin comision por comensal. Sin compromiso anual.",
    pricingTeaserLink: "Ver que esta incluido →",
    faqTitle: "Antes de empezar",
    faqLead: "Las preguntas que los operadores hacen primero.",
    viewAllFaq: "Ver todas las FAQs",
    faqItems: [
      {
        question: "¿Es seguro para un sabado por la noche con el aforo completo?",
        answer: "Si. Mesaro usa bloqueos de mesa en tiempo real respaldados por Redis — dos clientes no pueden reservar el mismo hueco simultaneamente. El bloqueo se convierte en reserva confirmada o se libera automaticamente. Este es el nucleo de como funciona el sistema."
      },
      {
        question: "¿Puede usar esto el personal de sala sin formacion?",
        answer: "La mayoria del personal se siente comodo en 10 minutos. El acceso por roles significa que solo ven las partes del sistema relevantes para su turno."
      },
      {
        question: "¿Que pasa con mis datos si cancelo?",
        answer: "Tus datos permanecen accesibles durante 30 dias tras el fin de tu suscripcion. Puedes exportarlos durante ese periodo. Despues de 30 dias, se eliminan permanentemente."
      },
      {
        question: "¿Mesaro reemplaza las reservas telefonicas?",
        answer: "Gestiona las reservas en linea automaticamente. El personal tambien puede crear reservas manualmente para llamadas telefonicas — aparecen en el mismo cronograma."
      }
    ],
    finalTitle: "Tu proximo servicio empieza sin conflicto de reservas.",
    finalLead: "14 dias de prueba gratuita. Sin tarjeta de credito. Sin contratos.",
    walkthroughTitle: "¿Tienes primero una pregunta especifica?",
    walkthroughLead: "Respondemos en un dia laborable. Sin respuestas automaticas, sin guiones de ventas.",
    trustItems: [
      { title: "Prueba 14 dias", body: "Acceso completo para probar Mesaro con tu restaurante. Sin tarjeta de credito." },
      { title: "49,99 € / mes", body: "Una tarifa fija por restaurante. Sin comision por comensal." },
      { title: "Tu URL de reservas", body: "Los clientes reservan en tu pagina o widget — no en un marketplace." },
      { title: "Soporte", body: "Respondemos por el formulario de contacto en un dia laborable." }
    ],
    marquee: [
      "Bloqueos en tiempo real",
      "URL propia",
      "Turnos",
      "Sin comision",
      "Widget",
      "Multi-local",
      "Auditoria",
      "Roles"
    ],
    monthlyPrice: "49,99 € / mes"
  }
};

export function HomePage() {
  const { locale, t } = useI18n();
  const copy = COPY[locale];
  const reduceMotion = useReducedMotion();
  const howLabel =
    locale === "nl"
      ? "Hoe het werkt"
      : locale === "fr"
        ? "Comment ça marche"
        : locale === "es"
          ? "Cómo funciona"
          : "See how it works";

  usePageMeta({
    title: copy.metaTitle,
    description: copy.metaDescription,
    ogImage: "https://mesaro.com/marketing/hero-service-night.jpg",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Mesaro",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: copy.metaDescription,
      offers: {
        "@type": "Offer",
        price: "49.99",
        priceCurrency: "EUR"
      },
      url: "https://mesaro.com/"
    },
    hreflang: [
      { locale: "en", href: "https://mesaro.com/?lang=en" },
      { locale: "nl", href: "https://mesaro.com/?lang=nl" },
      { locale: "fr", href: "https://mesaro.com/?lang=fr" },
      { locale: "es", href: "https://mesaro.com/?lang=es" },
      { locale: "x-default", href: "https://mesaro.com/" }
    ]
  });

  return (
    <div className="pb-20">
      <section className="mk-hero relative min-h-[min(92vh,920px)] overflow-hidden">
        <motion.img
          src="/marketing/hero-service-night.jpg"
          alt={
            locale === "nl"
              ? "Sfeervolle restaurantdining room 's avonds"
              : locale === "fr"
                ? "Salle de restaurant atmospherique le soir"
                : locale === "es"
                  ? "Comedor de restaurante atmosferico por la noche"
                  : "Atmospheric restaurant dining room at night"
          }
          className="absolute inset-0 h-full w-full object-cover"
          initial={reduceMotion ? false : { scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 2.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(42,50,40,0.92)] via-[rgba(62,74,50,0.72)] to-[rgba(62,74,50,0.28)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(200,85,61,0.22),transparent_45%)]" />

        <div className="relative mx-auto flex min-h-[min(92vh,920px)] w-full max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:pb-24">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <p className="mk-display text-[clamp(3.5rem,12vw,7.5rem)] leading-[0.9] text-[var(--mk-mist)]">
              Mesaro
            </p>
            <h1 className="mt-6 max-w-2xl text-2xl font-medium leading-snug text-[var(--mk-stone)] sm:text-3xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-base text-[var(--mk-pewter)] sm:text-lg">{copy.heroLead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                onClick={() => trackEvent(ANALYTICS_EVENTS.MARKETING_HOME_PRIMARY_CTA_CLICK, { page: "home" })}
                className="mk-btn-primary inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold"
                data-analytics-event={ANALYTICS_EVENTS.MARKETING_HOME_PRIMARY_CTA_CLICK}
              >
                {t("common.startNow")}
              </Link>
              <Link
                to="/features"
                onClick={() => trackEvent(ANALYTICS_EVENTS.MARKETING_HOME_SECONDARY_CTA_CLICK, { page: "home" })}
                className="mk-btn-ghost inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold"
                data-analytics-event={ANALYTICS_EVENTS.MARKETING_HOME_SECONDARY_CTA_CLICK}
              >
                {howLabel}
              </Link>
            </div>
            <p className="mt-4 text-xs text-[var(--mk-pewter)]">{copy.heroTrustLine}</p>
          </motion.div>
        </div>
      </section>

      <div className="mk-marquee relative overflow-hidden border-y border-[var(--mk-line)] py-4">
        <motion.div
          className="flex w-max gap-10 whitespace-nowrap text-sm uppercase tracking-[0.2em] text-[var(--mk-pewter)]"
          animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
          transition={reduceMotion ? undefined : { duration: 28, ease: "linear", repeat: Infinity }}
        >
          {[...copy.marquee, ...copy.marquee].map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex items-center gap-10">
              <span>{item}</span>
              <span className="text-[var(--mk-brass)]" aria-hidden>
                ◆
              </span>
            </span>
          ))}
        </motion.div>
      </div>

      <section className="mx-auto mt-20 w-full max-w-6xl px-4">
        <Reveal>
          <p className="mk-eyebrow">{copy.trustedBadge}</p>
          <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.trustedTitle}</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {copy.trustItems.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08} className="mk-panel rounded-2xl px-5 py-6">
              <p className="text-lg font-semibold text-[var(--mk-brass)]">{item.title}</p>
              <p className="mt-2 text-sm text-[var(--mk-pewter)]">{item.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 grid w-full max-w-6xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <Reveal>
          <p className="mk-eyebrow">{copy.problemEyebrow}</p>
          <GsapSplitReveal>
            <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.problemTitle}</h2>
          </GsapSplitReveal>
          <ul className="mt-8 space-y-5">
            {copy.problemItems.map((item, index) => (
              <li key={item} className="flex gap-4 text-sm leading-relaxed text-[var(--mk-pewter)] sm:text-base">
                <span className="mk-display text-2xl text-[var(--mk-brass)]">{String(index + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.12}>
          <ParallaxImage
            src="/marketing/benefit-table.jpg"
            alt=""
            className="aspect-[4/5] rounded-[2rem]"
            intensity={28}
          />
        </Reveal>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <Reveal className="max-w-3xl">
          <p className="mk-eyebrow">{copy.benefitEyebrow}</p>
          <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.benefitTitle}</h2>
        </Reveal>
        <div className="mt-12 space-y-16">
          {copy.benefits.map((benefit, index) => (
            <Reveal key={benefit.title} delay={index * 0.05}>
              <div
                className={`grid gap-8 lg:grid-cols-2 lg:items-center ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                {index === 0 ? (
                  <ParallaxImage
                    src="/marketing/feature-timeline.jpg"
                    alt=""
                    className="aspect-[16/10] rounded-[1.75rem]"
                    intensity={22}
                  />
                ) : index === 1 ? (
                  <ParallaxImage
                    src="/marketing/mesaro-feature-floor.jpg"
                    alt=""
                    className="aspect-[16/10] rounded-[1.75rem]"
                    intensity={22}
                  />
                ) : (
                  <ParallaxImage
                    src="/marketing/mesaro-hero-dining.jpg"
                    alt=""
                    className="aspect-[16/10] rounded-[1.75rem]"
                    intensity={22}
                  />
                )}
                <div>
                  <p className="mk-eyebrow">0{index + 1}</p>
                  <h3 className="mk-display mt-3 text-3xl text-[var(--mk-mist)] sm:text-4xl">{benefit.title}</h3>
                  <p className="mt-4 text-base leading-relaxed text-[var(--mk-pewter)]">{benefit.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <Reveal className="mb-10 max-w-2xl">
          <p className="mk-eyebrow">{copy.featureSectionEyebrow}</p>
          <h2 className="mk-display mt-3 text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.featureSectionTitle}</h2>
          <p className="mt-4 text-[var(--mk-pewter)]">{copy.featureSectionLead}</p>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2">
          {copy.features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.04} className="mk-panel rounded-2xl p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-[var(--mk-mist)]">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--mk-pewter)]">{feature.description}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <Reveal className="mk-panel overflow-hidden rounded-[2rem]">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 sm:p-12">
              <h2 className="mk-display text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.pricingTeaserTitle}</h2>
              <p className="mt-4 text-[var(--mk-pewter)]">{copy.pricingTeaserBody}</p>
              <p className="mk-display mt-8 text-5xl text-[var(--mk-brass)]">
                <NumberFlow value={49.99} prefix="€" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                <span className="ml-2 text-lg text-[var(--mk-pewter)]">/ mo</span>
              </p>
              <Link
                to="/pricing"
                className="mt-8 inline-flex text-sm font-semibold text-[var(--mk-brass)] hover:text-[var(--mk-brass-hot)]"
                onClick={() =>
                  trackEvent(ANALYTICS_EVENTS.MARKETING_HOME_PRIMARY_CTA_CLICK, {
                    page: "home",
                    section: "pricing-teaser"
                  })
                }
              >
                {copy.pricingTeaserLink}
              </Link>
            </div>
            <ParallaxImage
              src="/marketing/mesaro-feature-timeline.jpg"
              alt=""
              className="min-h-[260px] lg:min-h-full"
              intensity={16}
            />
          </div>
        </Reveal>
      </section>

      <section className="mx-auto mt-24 w-full max-w-6xl px-4">
        <div className="mb-8 flex items-end justify-between gap-4">
          <Reveal className="max-w-2xl">
            <h2 className="mk-display text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.faqTitle}</h2>
            <p className="mt-3 text-[var(--mk-pewter)]">{copy.faqLead}</p>
          </Reveal>
          <Link
            to="/faq"
            className="hidden text-sm font-semibold text-[var(--mk-brass)] sm:inline-flex"
            onClick={() => trackEvent(ANALYTICS_EVENTS.MARKETING_HOME_FAQ_PAGE_CLICK, { page: "home" })}
            data-analytics-event={ANALYTICS_EVENTS.MARKETING_HOME_FAQ_PAGE_CLICK}
          >
            {copy.viewAllFaq}
          </Link>
        </div>
        <Reveal>
          <FaqAccordion items={copy.faqItems} />
        </Reveal>
      </section>

      <section className="mt-24">
        <MarketingCta
          title={copy.finalTitle}
          lead={copy.finalLead}
          primaryLabel={t("common.startNow")}
          primaryTo="/register"
          secondaryLabel={t("common.requestDemo")}
          secondaryTo="/contact"
          onPrimaryClick={() =>
            trackEvent(ANALYTICS_EVENTS.MARKETING_HOME_PRIMARY_CTA_CLICK, { page: "home", section: "final-cta" })
          }
        />
      </section>
    </div>
  );
}
