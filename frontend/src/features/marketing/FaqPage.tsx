import { motion } from "motion/react";

import { FaqAccordion, type FaqItem } from "@/features/marketing/components/FaqAccordion";
import { MarketingCta } from "@/features/marketing/components/MarketingCta";
import { usePageMeta } from "@/features/marketing/hooks/usePageMeta";
import { Reveal } from "@/features/marketing/motion/Reveal";
import { useI18n, type SupportedLocale } from "@/i18n";

type FaqCategory = {
  id: string;
  title: string;
  items: FaqItem[];
};

type Copy = {
  metaTitle: string;
  description: string;
  heroBadge: string;
  heroTitle: string;
  heroLead: string;
  ctaTitle: string;
  ctaLead: string;
  categories: FaqCategory[];
};

const COPY: Record<SupportedLocale, Copy> = {
  en: {
    metaTitle: "FAQ — Mesaro Restaurant Reservation Software",
    description: "Answers to common questions about Mesaro pricing, setup, the booking widget, GDPR, staff roles, and technical reliability.",
    heroBadge: "FAQ",
    heroTitle: "Common questions about Mesaro.",
    heroLead: "Grouped by topic. If something isn't covered here, use the contact form — we'll answer and add it.",
    ctaTitle: "Ready to try it?",
    ctaLead: "14-day free trial. No credit card. Cancel anytime.",
    categories: [
      {
        id: "pricing",
        title: "Pricing & Billing",
        items: [
          { question: "How much does Mesaro cost?", answer: "€49.99 per restaurant per month. That covers unlimited reservations, unlimited staff accounts, all features, and all support. There are no per-cover fees, no setup costs, and no annual commitment required." },
          { question: "Is there a free trial?", answer: "Yes. 14 days, fully functional, no credit card required at signup. You can set up your restaurant, configure your tables, and take real bookings during the trial. If you subscribe after the trial, your data carries over." },
          { question: "Do I need a credit card to start a trial?", answer: "No. You sign up with an email address and get 14 days of full access. You only enter payment details if you choose to subscribe at the end of the trial." },
          { question: "What if I manage three restaurants?", answer: "One Stripe subscription covers your account. Quantity is the number of restaurants — three locations is €149.97/month (3 × €49.99). You manage all locations from one login." },
          { question: "Can I cancel at any time?", answer: "Yes. No contracts, no cancellation fees. Your subscription ends at the close of the current billing period when you cancel. Nothing is charged after that." },
          { question: "Are there discounts for annual billing or multiple locations?", answer: "Not at this time. All restaurants are billed monthly at the same flat rate. We keep pricing simple and predictable." }
        ]
      },
      {
        id: "features",
        title: "Features & Functionality",
        items: [
          { question: "Can Mesaro prevent double bookings?", answer: "Yes. When a guest starts a booking online, Mesaro places a timed hold on that table. No other booking can claim that slot while the hold is active. If the guest doesn't complete the booking, the hold releases automatically." },
          { question: "Can I take phone reservations and still use Mesaro?", answer: "Yes. Staff with the correct role can create reservations manually through the admin interface. Phone reservations appear in the same timeline as online ones — there is no separate system to reconcile." },
          { question: "Does Mesaro handle table combinations for larger parties?", answer: "Yes. You can define which tables can be combined. Mesaro factors combinations into availability calculations, so a party of 10 can book two adjacent tables if you've configured them as a valid combination." },
          { question: "Does the dashboard update in real time?", answer: "The timeline and reservation list update when you load or refresh the page. There is no automatic push in the current release — refresh to see the latest state during a busy service." },
          { question: "What reporting does Mesaro provide?", answer: "The dashboard shows daily, weekly, and monthly covers, occupancy trends, and no-show data. The timeline gives a visual overview of every table per shift." },
          { question: "Can I block dates for holidays or private events?", answer: "Yes. Create a closure for any date or date range with a reason. Mesaro removes those dates from the guest availability calendar automatically." }
        ]
      },
      {
        id: "widget",
        title: "Booking Widget & Guest Experience",
        items: [
          { question: "How does the booking widget work?", answer: "Mesaro generates an embeddable iframe for your restaurant. Copy one line of HTML and paste it into your website. The widget shows live availability and lets guests complete a booking without leaving your site." },
          { question: "What does the guest-facing booking page look like?", answer: "Guests visit /r/your-restaurant-slug — a dedicated URL with your restaurant name. The flow is: choose a date, choose a shift, select party size, confirm. No account creation required. No marketplace branding." },
          { question: "Does Mesaro send confirmation emails to guests?", answer: "Yes. Confirmation emails include booking details and an ICS calendar attachment the guest can add directly to their calendar app." },
          { question: "Can guests cancel or modify their own reservations?", answer: "Guests can cancel via the secure link in their confirmation email. Modification or reschedule from the guest side is not available yet — your staff can change bookings in the admin interface." },
          { question: "Is the booking widget mobile-friendly?", answer: "Yes. The widget and the guest booking page are fully responsive and tested on mobile browsers." }
        ]
      },
      {
        id: "setup",
        title: "Setup & Migration",
        items: [
          { question: "How long does it take to set up Mesaro?", answer: "Most restaurants are live within 30 minutes. The setup flow walks you through tables and shifts. Embedding the widget on your website takes under five minutes on any standard CMS." },
          { question: "Can I import reservations from another system?", answer: "There is no automated import tool at this time. We recommend going live with Mesaro for new reservations from your start date and manually entering any confirmed future bookings from your old system." },
          { question: "Can I migrate from Zenchef, Resengo, or Formitable?", answer: "Yes. Export your current reservation data from your existing tool before your migration date. Enter any upcoming confirmed reservations into Mesaro manually. Most restaurants switch during a quieter midweek period and go live before the following weekend service." },
          { question: "Do I need technical skills to set up Mesaro?", answer: "No. The admin interface is designed for restaurant operators. Embedding the booking widget requires pasting one line of HTML. If you need help at any step, our support team will walk you through it." }
        ]
      },
      {
        id: "multi-location",
        title: "Multi-location",
        items: [
          { question: "Can I manage multiple restaurants from one account?", answer: "Yes. Mesaro supports multiple restaurants under a single login. Each restaurant has its own tables, shifts, staff, and reservations. You switch between them from the restaurant selector in the navigation." },
          { question: "Can a staff member work across multiple locations?", answer: "Yes. A staff member can belong to multiple restaurants. Each assignment has its own role — someone can be a manager at one location and a staff member at another." },
          { question: "Is there a limit to how many restaurants I can add?", answer: "No hard limit. Increase your subscription quantity by one seat (€49.99/month) before adding each new location — billed on the same owner subscription." }
        ]
      },
      {
        id: "staff",
        title: "Staff & Roles",
        items: [
          { question: "What are the staff roles in Mesaro?", answer: "Three roles: Owner, Manager, and Staff. Owner has full access including billing and restaurant settings. Manager handles reservations, shifts, staff management, and reports. Staff can see their assigned shifts and manage reservations during their service window." },
          { question: "How do I invite a new staff member?", answer: "Invite them from the go-live wizard or the Staff page. They open the email link, set a password if they are new, and land on a short floor tour. The process takes under two minutes." },
          { question: "Can I remove a staff member immediately?", answer: "Yes. Remove them from the staff list and their access is revoked immediately. There is no delay." },
          { question: "Can a staff member see billing details?", answer: "No. Billing is visible only to the Owner role." }
        ]
      },
      {
        id: "technical",
        title: "Technical & Reliability",
        items: [
          { question: "What uptime does Mesaro target?", answer: "Mesaro is an early-stage product. We monitor the service and can restore reservation data from backups when needed. We have not published a formal uptime SLA." },
          { question: "What happens if Mesaro goes down during a service?", answer: "All confirmed reservations are stored in the database. When service resumes, the data is intact. For high-traffic evenings, we recommend a brief printed runsheet of confirmed bookings as a fallback." },
          { question: "Is Mesaro a white-label of another platform?", answer: "No. Mesaro was built from scratch and is not affiliated with any reservation marketplace." },
          { question: "What browsers and devices does Mesaro support?", answer: "The admin interface works in all modern browsers (Chrome, Firefox, Safari, Edge). It is responsive for tablet and desktop. Most front-of-house staff use it on an iPad at the host stand." },
          { question: "How are database backups handled?", answer: "We take regular automated backups of reservation data. Contact support@mesaro.com for current backup frequency and retention details." }
        ]
      },
      {
        id: "gdpr",
        title: "GDPR & Data",
        items: [
          { question: "Is Mesaro GDPR-compliant?", answer: "Mesaro stores guest reservation data — name, email, party size, date — in PostgreSQL for your restaurant. We do not sell guest data or use it for our own marketing. We aim to align our processing with GDPR expectations; for subprocessors, a Data Processing Agreement, or a formal privacy inquiry, contact support@mesaro.com." },
          { question: "Where is my data stored?", answer: "Reservation and account data are stored to operate the service. Production infrastructure is hosted with Hostinger in the European Union. Payment (Stripe) and email providers may process limited data under their own terms. Contact support@mesaro.com for current subprocessors and a DPA." },
          { question: "Who owns the guest booking data?", answer: "You do. Guest names, emails, and reservation history are your data. Mesaro does not use it for its own purposes, does not sell it, and does not share it with partners." },
          { question: "What happens to my data when I cancel?", answer: "Your data is accessible for 30 days after your subscription ends. During that window, you can export your reservation history. After 30 days, all data is permanently deleted." }
        ]
      },
      {
        id: "support",
        title: "Support",
        items: [
          { question: "How do I get help if something isn't working?", answer: "Use the Contact page. For technical issues, describe what you expected to happen and what happened instead. Include your restaurant name. We respond within one business day; service-impacting issues are escalated." },
          { question: "Is there phone support?", answer: "Not at this time. All support is handled via email and the contact form. We aim to respond within one business day, with priority for active subscribers experiencing issues during service hours." },
          { question: "Is there a help center or documentation?", answer: "It's being built. The FAQ on this page covers the most common questions. For anything not covered, use the contact form — we'll answer and add it here." }
        ]
      }
    ]
  },
  nl: {
    metaTitle: "FAQ — Mesaro Restaurantreserveringssoftware",
    description: "Antwoorden op veelgestelde vragen over Mesaro-prijzen, installatie, de boekingswidget, AVG, personeelsrollen en technische betrouwbaarheid.",
    heroBadge: "FAQ",
    heroTitle: "Veelgestelde vragen over Mesaro.",
    heroLead: "Gegroepeerd per onderwerp. Staat je vraag er niet bij, gebruik dan het contactformulier — we antwoorden en voegen het toe.",
    ctaTitle: "Klaar om het te proberen?",
    ctaLead: "14 dagen gratis proefperiode. Geen creditcard. Altijd opzegbaar.",
    categories: [
      {
        id: "prijzen",
        title: "Prijzen & Facturering",
        items: [
          { question: "Wat kost Mesaro?", answer: "€49,99 per restaurant per maand. Dat dekt onbeperkte reserveringen, onbeperkte personeelsaccounts, alle functies en alle support. Geen commissies per couvert, geen installatiekosten en geen jaarlijkse verplichting." },
          { question: "Is er een gratis proefperiode?", answer: "Ja. 14 dagen, volledig functioneel, geen creditcard nodig bij aanmelding. Je kunt je restaurant instellen en echte boekingen ontvangen tijdens de proefperiode." },
          { question: "Heb ik een creditcard nodig om de proefperiode te starten?", answer: "Nee. Je meldt je aan met een e-mailadres en krijgt 14 dagen volledige toegang. Je voert alleen betalingsgegevens in als je aan het einde van de proefperiode kiest voor een abonnement." },
          { question: "Wat als ik drie restaurants beheer?", answer: "Eén Stripe-abonnement dekt je account. De quantity is het aantal restaurants — drie locaties is €149,97/maand (3 × €49,99), beheerd vanuit één login." },
          { question: "Kan ik op elk moment opzeggen?", answer: "Ja. Geen contract, geen opzegkosten. Je abonnement eindigt aan het einde van de lopende factuurperiode bij opzegging." },
          { question: "Zijn er kortingen voor jaarlijkse facturering of meerdere locaties?", answer: "Momenteel niet. Alle restaurants worden maandelijks gefactureerd tegen hetzelfde vaste tarief." }
        ]
      },
      {
        id: "functies",
        title: "Functies & Functionaliteit",
        items: [
          { question: "Kan Mesaro dubbele boekingen voorkomen?", answer: "Ja. Wanneer een gast online begint te boeken, plaatst Mesaro een tijdgebonden blokkade op die tafel. Geen andere boeking kan dat slot opeisen zolang de blokkade actief is." },
          { question: "Kan ik telefonische reservaties opnemen en toch Mesaro gebruiken?", answer: "Ja. Personeel met de juiste rol kan handmatig reservaties aanmaken. Telefonische reservaties verschijnen in dezelfde tijdlijn als online boekingen." },
          { question: "Verwerkt Mesaro tafelcombinaties voor grotere gezelschappen?", answer: "Ja. Je kunt definiëren welke tafels gecombineerd kunnen worden. Mesaro houdt combinaties bij in de beschikbaarheidsberekeningen." },
          { question: "Wat voor rapporten biedt Mesaro?", answer: "Het dashboard toont dagelijkse, wekelijkse en maandelijkse couverts, bezettingstrends en no-showdata." },
          { question: "Kan ik data blokkeren voor feestdagen of privé-evenementen?", answer: "Ja. Maak een sluiting aan voor elke datum of datumreeks met een reden. Mesaro verwijdert die datums automatisch uit de beschikbaarheidskalender." }
        ]
      },
      {
        id: "widget",
        title: "Boekingswidget & Gastervaring",
        items: [
          { question: "Hoe werkt de boekingswidget?", answer: "Mesaro genereert een insluitbare iframe voor je restaurant. Kopieer één regel HTML en plak die in je website. De widget toont live beschikbaarheid en laat gasten boeken zonder je site te verlaten." },
          { question: "Hoe ziet de gastpagina eruit?", answer: "Gasten bezoeken /r/jouw-restaurant-slug — een eigen URL met jouw restaurantnaam. Geen accountaanmaak vereist. Geen marketplace-branding." },
          { question: "Stuurt Mesaro bevestigingsmails naar gasten?", answer: "Ja. Bevestigingsmails bevatten boekingsdetails en een ICS-agendabijlage die gasten direct kunnen toevoegen." },
          { question: "Is de widget mobiel-vriendelijk?", answer: "Ja. De widget en de gastpagina zijn volledig responsief en getest op mobiele browsers." }
        ]
      },
      {
        id: "installatie",
        title: "Installatie & Migratie",
        items: [
          { question: "Hoe lang duurt de installatie van Mesaro?", answer: "De meeste restaurants zijn binnen 30 minuten live. De widget integreren op je website duurt minder dan vijf minuten op elke gangbare CMS." },
          { question: "Kan ik reservaties importeren vanuit een ander systeem?", answer: "Momenteel is er geen automatisch importgereedschap. Wij raden aan om Mesaro live te zetten voor nieuwe reservaties en bevestigde toekomstige boekingen handmatig in te voeren." },
          { question: "Heb ik technische vaardigheden nodig om Mesaro in te stellen?", answer: "Nee. De beheerinterface is ontworpen voor restaurantoperators. Widget integreren vereist het plakken van één regel HTML." }
        ]
      },
      {
        id: "multi-locatie",
        title: "Multi-locatie",
        items: [
          { question: "Kan ik meerdere restaurants vanuit één account beheren?", answer: "Ja. Mesaro ondersteunt meerdere restaurants onder één login. Elk restaurant heeft zijn eigen tafels, shifts, personeel en reservaties." },
          { question: "Kan een personeelslid op meerdere locaties werken?", answer: "Ja. Een personeelslid kan bij meerdere restaurants horen. Elke toewijzing heeft een eigen rol." },
          { question: "Is er een limiet aan het aantal restaurants dat ik kan toevoegen?", answer: "Geen vaste limiet. Elk restaurant wordt gefactureerd à €49,99/maand." }
        ]
      },
      {
        id: "personeel",
        title: "Personeel & Rollen",
        items: [
          { question: "Wat zijn de personeelsrollen in Mesaro?", answer: "Drie rollen: Eigenaar, Manager en Medewerker. Eigenaar heeft volledige toegang inclusief facturering. Manager beheert reservaties, shifts en personeel. Medewerker ziet hun shifts en de reservaties van de dag." },
          { question: "Hoe nodig ik een nieuw personeelslid uit?", answer: "Nodig ze uit via de go-live wizard of de pagina Personeel. Ze openen de e-maillink, stellen een wachtwoord in als ze nieuw zijn, en krijgen een korte floor-tour. Minder dan twee minuten." },
          { question: "Kan een personeelslid factureringsgegevens zien?", answer: "Nee. Facturering is alleen zichtbaar voor de eigenaarsrol." }
        ]
      },
      {
        id: "technisch",
        title: "Technisch & Betrouwbaarheid",
        items: [
          { question: "Welke uptime streeft Mesaro na?", answer: "Mesaro is een product in een vroege fase. We monitoren de dienst en kunnen reserveringsgegevens indien nodig herstellen vanuit back-ups. We hebben nog geen formele uptime-SLA gepubliceerd." },
          { question: "Wat gebeurt er als Mesaro uitvalt tijdens een service?", answer: "Alle bevestigde reservaties zijn opgeslagen in de database. Wanneer de service hervat wordt, zijn de gegevens intact." },
          { question: "Welke browsers en apparaten ondersteunt Mesaro?", answer: "De beheerinterface werkt in alle moderne browsers. Responsief voor tablet en desktop. De meeste front-of-house medewerkers gebruiken het op een iPad." },
          { question: "Hoe worden databaseback-ups afgehandeld?", answer: "We maken regelmatig geautomatiseerde back-ups van reserveringsgegevens. Neem contact op via support@mesaro.com voor actuele frequentie en bewaartermijnen." }
        ]
      },
      {
        id: "avg",
        title: "AVG & Gegevens",
        items: [
          { question: "Is Mesaro AVG-conform?", answer: "Mesaro slaat gastreserveringsgegevens — naam, e-mail, gezelschap, datum — op in PostgreSQL voor jouw restaurant. We verkopen gastgegevens niet en gebruiken ze niet voor onze eigen marketing. We streven ernaar onze verwerking aan te laten sluiten bij AVG-verwachtingen; voor subverwerkers, een verwerkersovereenkomst of een formeel privacyverzoek: support@mesaro.com." },
          { question: "Waar worden mijn gegevens opgeslagen?", answer: "Reserverings- en accountgegevens worden opgeslagen om de dienst te leveren. Productie-infrastructuur draait bij Hostinger in de Europese Unie. Betaling (Stripe) en e-mailproviders kunnen beperkte gegevens verwerken onder hun eigen voorwaarden. Neem contact op via support@mesaro.com voor actuele subverwerkers en een DPA." },
          { question: "Wie is eigenaar van de gastboekingsgegevens?", answer: "Jij. Namen, e-mails en reserveringsgeschiedenis van gasten zijn jouw data. Mesaro verkoopt ze niet en deelt ze niet." },
          { question: "Wat gebeurt er met mijn gegevens als ik opzeg?", answer: "Gegevens zijn 30 dagen na afloop van je abonnement toegankelijk voor export. Daarna worden ze permanent verwijderd." }
        ]
      },
      {
        id: "support",
        title: "Support",
        items: [
          { question: "Hoe krijg ik hulp als er iets niet werkt?", answer: "Gebruik de contactpagina. Beschrijf wat je verwachtte en wat er werkelijk gebeurde. Vermeld je restaurantnaam. We antwoorden binnen één werkdag." },
          { question: "Is er telefonische support?", answer: "Momenteel niet. Alle support verloopt via e-mail en het contactformulier. We streven naar een reactietijd van één werkdag." },
          { question: "Is er documentatie of een helpcenter?", answer: "Dit wordt gebouwd. De FAQ op deze pagina dekt de meest voorkomende vragen. Voor alles wat hier niet staat, gebruik het contactformulier." }
        ]
      }
    ]
  },
  fr: {
    metaTitle: "FAQ — Logiciel de Reservation Restaurant Mesaro",
    description: "Reponses aux questions frequentes sur les tarifs Mesaro, la configuration, le widget de reservation, le RGPD, les roles du personnel et la fiabilite technique.",
    heroBadge: "FAQ",
    heroTitle: "Questions frequentes sur Mesaro.",
    heroLead: "Regroupees par sujet. Si votre question n'est pas couverte, utilisez le formulaire de contact — nous repondrons et l'ajouterons.",
    ctaTitle: "Pret a essayer ?",
    ctaLead: "Essai gratuit de 14 jours. Sans carte bancaire. Resiliation a tout moment.",
    categories: [
      {
        id: "tarifs",
        title: "Tarifs & Facturation",
        items: [
          { question: "Combien coute Mesaro ?", answer: "49,99 € par restaurant et par mois. Cela couvre les reservations illimitees, les comptes du personnel illimites, toutes les fonctionnalites et tout le support. Aucune commission par couvert, aucun frais d'installation, aucun engagement annuel." },
          { question: "Y a-t-il un essai gratuit ?", answer: "Oui. 14 jours, entierement fonctionnel, sans carte bancaire requise. Vous pouvez configurer votre restaurant et prendre de vraies reservations pendant l'essai." },
          { question: "Faut-il une carte bancaire pour commencer l'essai ?", answer: "Non. Vous vous inscrivez avec une adresse email et obtenez 14 jours d'acces complet." },
          { question: "J'ai trois restaurants. Je paie trois fois ?", answer: "Oui — chaque restaurant est facture separement a 49,99 €/mois sous le meme compte. Total : 149,97 €/mois." },
          { question: "Puis-je resilier a tout moment ?", answer: "Oui. Pas de contrat, pas de frais de resiliation. Votre abonnement se termine a la fin de la periode de facturation en cours." },
          { question: "Y a-t-il des remises pour la facturation annuelle ?", answer: "Pas pour l'instant. Tous les restaurants sont factures mensuellement au meme tarif fixe." }
        ]
      },
      {
        id: "fonctionnalites",
        title: "Fonctionnalites",
        items: [
          { question: "Mesaro peut-il empecher les doubles reservations ?", answer: "Oui. Quand un client commence a reserver en ligne, Mesaro place un blocage temporaire sur cette table. Aucune autre reservation ne peut prendre ce creneau." },
          { question: "Puis-je prendre des reservations par telephone et utiliser Mesaro ?", answer: "Oui. Le personnel avec le bon role peut creer des reservations manuellement. Elles apparaissent dans la meme chronologie que les reservations en ligne." },
          { question: "Mesaro gere-t-il les combinaisons de tables ?", answer: "Oui. Vous pouvez definir quelles tables peuvent etre combinees. Mesaro integre les combinaisons dans les calculs de disponibilite." },
          { question: "Quels rapports Mesaro fournit-il ?", answer: "Le tableau de bord affiche les couverts quotidiens, hebdomadaires et mensuels, les tendances d'occupation et les no-shows." },
          { question: "Puis-je bloquer des dates pour les jours feries ?", answer: "Oui. Creez une fermeture pour n'importe quelle date ou plage de dates. Mesaro supprime automatiquement ces dates du calendrier de disponibilite." }
        ]
      },
      {
        id: "widget",
        title: "Widget & Experience Client",
        items: [
          { question: "Comment fonctionne le widget de reservation ?", answer: "Mesaro genere un iframe integrable. Copiez une ligne de HTML et collez-la sur votre site. Les clients reservent sans quitter votre page." },
          { question: "A quoi ressemble la page de reservation pour les clients ?", answer: "Les clients visitent /r/votre-slug — une URL dediee. Pas de creation de compte. Pas de marque marketplace." },
          { question: "Mesaro envoie-t-il des emails de confirmation aux clients ?", answer: "Oui. Les emails de confirmation incluent les details de reservation et une piece jointe ICS." },
          { question: "Le widget est-il adapte au mobile ?", answer: "Oui. Le widget et la page client sont entierement responsifs et testes sur les navigateurs mobiles." }
        ]
      },
      {
        id: "installation",
        title: "Installation & Migration",
        items: [
          { question: "Combien de temps faut-il pour configurer Mesaro ?", answer: "La plupart des restaurants sont en ligne en 30 minutes. L'integration du widget sur votre site prend moins de cinq minutes sur n'importe quel CMS." },
          { question: "Puis-je importer des reservations depuis un autre systeme ?", answer: "Il n'y a pas d'outil d'importation automatique pour l'instant. Nous recommandons de lancer Mesaro pour les nouvelles reservations et de saisir manuellement les reservations confirmees existantes." },
          { question: "Faut-il des competences techniques pour configurer Mesaro ?", answer: "Non. L'interface d'administration est concue pour les exploitants. L'integration du widget necessite de coller une ligne de HTML." }
        ]
      },
      {
        id: "multi-etablissements",
        title: "Multi-etablissements",
        items: [
          { question: "Puis-je gerer plusieurs restaurants depuis un seul compte ?", answer: "Oui. Mesaro supporte plusieurs restaurants sous un seul compte. Chaque etablissement a ses propres tables, services, personnel et reservations." },
          { question: "Un employe peut-il travailler dans plusieurs etablissements ?", answer: "Oui. Un employe peut appartenir a plusieurs restaurants, avec un role propre dans chacun." },
          { question: "Y a-t-il une limite au nombre de restaurants ?", answer: "Pas de limite fixe. Chaque restaurant est facture a 49,99 €/mois." }
        ]
      },
      {
        id: "personnel",
        title: "Personnel & Roles",
        items: [
          { question: "Quels sont les roles du personnel dans Mesaro ?", answer: "Trois roles : Proprietaire, Manager et Personnel. Le proprietaire a un acces complet. Le manager gere les reservations, les services et le personnel. Le personnel voit ses services et les reservations du jour." },
          { question: "Comment inviter un nouveau membre du personnel ?", answer: "Invitez-les depuis l'assistant go-live ou la page Personnel. Ils ouvrent le lien email, definissent un mot de passe s'ils sont nouveaux, puis voient une courte visite du floor. En moins de deux minutes." },
          { question: "Un employe peut-il voir les informations de facturation ?", answer: "Non. La facturation n'est visible que pour le role Proprietaire." }
        ]
      },
      {
        id: "technique",
        title: "Technique & Fiabilite",
        items: [
          { question: "Quel taux de disponibilite Mesaro vise-t-il ?", answer: "Mesaro est un produit en phase initiale. Nous surveillons le service et pouvons restaurer les donnees de reservation a partir de sauvegardes si necessaire. Nous n'avons pas publie de SLA de disponibilite formel." },
          { question: "Que se passe-t-il si Mesaro tombe en panne pendant un service ?", answer: "Toutes les reservations confirmees sont dans la base de donnees. Quand le service reprend, les donnees sont intactes." },
          { question: "Quels navigateurs et appareils Mesaro supporte-t-il ?", answer: "Tous les navigateurs modernes. Responsive pour tablette et desktop. La plupart des equipes de salle utilisent une tablette a l'accueil." },
          { question: "Comment les sauvegardes de base de donnees sont-elles gerees ?", answer: "Nous effectuons des sauvegardes automatiques regulieres des donnees de reservation. Contactez support@mesaro.com pour la frequence et la duree de conservation actuelles." }
        ]
      },
      {
        id: "rgpd",
        title: "RGPD & Donnees",
        items: [
          { question: "Mesaro est-il conforme au RGPD ?", answer: "Mesaro stocke les donnees de reservation des clients — nom, e-mail, taille du groupe, date — dans PostgreSQL pour votre restaurant. Nous ne vendons pas les donnees clients et ne les utilisons pas pour notre propre marketing. Nous visons a aligner notre traitement sur le RGPD; pour les sous-traitants, un accord de traitement (DPA) ou une demande formelle : support@mesaro.com." },
          { question: "Ou sont stockees mes donnees ?", answer: "Les donnees de reservation et de compte sont stockees pour faire fonctionner le service. L'infrastructure de production est hebergee chez Hostinger dans l'Union europeenne. Le paiement (Stripe) et les fournisseurs d'e-mail peuvent traiter des donnees limitees selon leurs conditions. Contactez support@mesaro.com pour la liste actuelle des sous-traitants et un DPA." },
          { question: "Qui possede les donnees de reservation des clients ?", answer: "Vous. Les noms, emails et historiques de reservation sont vos donnees. Mesaro ne les vend pas et ne les partage pas." },
          { question: "Que deviennent mes donnees en cas de resiliation ?", answer: "Vos donnees restent accessibles pendant 30 jours. Vous pouvez les exporter. Apres 30 jours, elles sont definitivement supprimees." }
        ]
      },
      {
        id: "support",
        title: "Support",
        items: [
          { question: "Comment obtenir de l'aide si quelque chose ne fonctionne pas ?", answer: "Utilisez la page Contact. Decrivez ce que vous attendiez et ce qui s'est passe. Indiquez le nom de votre restaurant. Reponse sous un jour ouvre." },
          { question: "Y a-t-il un support telephonique ?", answer: "Pas pour l'instant. Tout le support est gere par email et formulaire de contact. Delai cible : un jour ouvre." },
          { question: "Y a-t-il de la documentation ?", answer: "Elle est en cours de construction. La FAQ couvre les questions les plus courantes. Pour le reste, utilisez le formulaire de contact." }
        ]
      }
    ]
  },
  es: {
    metaTitle: "FAQ — Software de Reservas para Restaurantes Mesaro",
    description: "Respuestas a preguntas frecuentes sobre precios de Mesaro, configuracion, el widget de reservas, RGPD, roles del personal y fiabilidad tecnica.",
    heroBadge: "FAQ",
    heroTitle: "Preguntas frecuentes sobre Mesaro.",
    heroLead: "Agrupadas por tema. Si tu pregunta no esta aqui, usa el formulario de contacto — responderemos y la anadiremos.",
    ctaTitle: "¿Listo para probarlo?",
    ctaLead: "14 dias de prueba gratuita. Sin tarjeta de credito. Cancelacion en cualquier momento.",
    categories: [
      {
        id: "precios",
        title: "Precios & Facturacion",
        items: [
          { question: "¿Cuanto cuesta Mesaro?", answer: "49,99 € por restaurante al mes. Cubre reservas ilimitadas, cuentas de personal ilimitadas, todas las funciones y todo el soporte. Sin comisiones por comensal, sin costes de instalacion, sin compromiso anual." },
          { question: "¿Hay una prueba gratuita?", answer: "Si. 14 dias, completamente funcional, sin tarjeta de credito al registrarse. Puedes configurar tu restaurante y recibir reservas reales durante la prueba." },
          { question: "¿Necesito una tarjeta de credito para empezar la prueba?", answer: "No. Te registras con un correo electronico y obtienes 14 dias de acceso completo." },
          { question: "Tengo tres restaurantes. ¿Pago tres veces?", answer: "Si — cada restaurante se factura por separado a 49,99 €/mes bajo el mismo acceso. Total: 149,97 €/mes." },
          { question: "¿Puedo cancelar en cualquier momento?", answer: "Si. Sin contratos, sin gastos de cancelacion. Tu suscripcion termina al final del periodo de facturacion actual." },
          { question: "¿Hay descuentos por facturacion anual?", answer: "Por el momento no. Todos los restaurantes se facturan mensualmente a la misma tarifa plana." }
        ]
      },
      {
        id: "funciones",
        title: "Funciones",
        items: [
          { question: "¿Puede Mesaro evitar las dobles reservas?", answer: "Si. Cuando un cliente empieza a reservar en linea, Mesaro coloca un bloqueo temporal en esa mesa. Ninguna otra reserva puede tomar ese hueco." },
          { question: "¿Puedo tomar reservas por telefono y usar Mesaro?", answer: "Si. El personal con el rol correcto puede crear reservas manualmente. Aparecen en el mismo cronograma que las reservas en linea." },
          { question: "¿Mesaro gestiona combinaciones de mesas?", answer: "Si. Puedes definir que mesas se pueden combinar. Mesaro incorpora las combinaciones en los calculos de disponibilidad." },
          { question: "¿Que informes proporciona Mesaro?", answer: "El panel muestra comensales diarios, semanales y mensuales, tendencias de ocupacion y datos de no-shows." },
          { question: "¿Puedo bloquear fechas para festivos?", answer: "Si. Crea un cierre para cualquier fecha o rango. Mesaro elimina automaticamente esas fechas del calendario de disponibilidad." }
        ]
      },
      {
        id: "widget",
        title: "Widget & Experiencia del Cliente",
        items: [
          { question: "¿Como funciona el widget de reservas?", answer: "Mesaro genera un iframe integrable. Copia una linea de HTML y pegala en tu web. Los clientes reservan sin salir de tu pagina." },
          { question: "¿Como es la pagina de reservas para los clientes?", answer: "Los clientes visitan /r/tu-slug — una URL propia. Sin creacion de cuenta. Sin marca de marketplace." },
          { question: "¿Mesaro envia correos de confirmacion a los clientes?", answer: "Si. Los correos incluyen detalles de la reserva y un archivo ICS adjunto." },
          { question: "¿El widget es compatible con moviles?", answer: "Si. El widget y la pagina del cliente son totalmente responsivos." }
        ]
      },
      {
        id: "configuracion",
        title: "Configuracion & Migracion",
        items: [
          { question: "¿Cuanto tarda configurar Mesaro?", answer: "La mayoria de restaurantes estan en marcha en 30 minutos. Integrar el widget en tu web lleva menos de cinco minutos en cualquier CMS." },
          { question: "¿Puedo importar reservas desde otro sistema?", answer: "No hay herramienta de importacion automatica por el momento. Recomendamos arrancar Mesaro para nuevas reservas e introducir manualmente las reservas confirmadas existentes." },
          { question: "¿Necesito conocimientos tecnicos para configurar Mesaro?", answer: "No. La interfaz de administracion esta disenada para operadores de restaurantes. Integrar el widget solo requiere pegar una linea de HTML." }
        ]
      },
      {
        id: "multi-local",
        title: "Multi-local",
        items: [
          { question: "¿Puedo gestionar varios restaurantes desde una sola cuenta?", answer: "Si. Mesaro admite varios restaurantes bajo un mismo acceso. Cada local tiene sus propias mesas, turnos, personal y reservas." },
          { question: "¿Puede un empleado trabajar en varios locales?", answer: "Si. Un empleado puede pertenecer a varios restaurantes, con un rol propio en cada uno." },
          { question: "¿Hay limite de restaurantes que puedo anadir?", answer: "Sin limite fijo. Cada restaurante se factura a 49,99 €/mes." }
        ]
      },
      {
        id: "personal",
        title: "Personal & Roles",
        items: [
          { question: "¿Cuales son los roles del personal en Mesaro?", answer: "Tres roles: Propietario, Gestor y Personal. El propietario tiene acceso completo. El gestor administra reservas, turnos y personal. El personal ve sus turnos y las reservas del dia." },
          { question: "¿Como invito a un nuevo empleado?", answer: "Invitalo desde el asistente go-live o la pagina Personal. Abre el enlace del correo, elige contrasena si es nuevo, y ve un recorrido corto del floor. En menos de dos minutos." },
          { question: "¿Puede un empleado ver los datos de facturacion?", answer: "No. La facturacion solo es visible para el rol de Propietario." }
        ]
      },
      {
        id: "tecnico",
        title: "Tecnico & Fiabilidad",
        items: [
          { question: "¿Que disponibilidad objetivo tiene Mesaro?", answer: "Mesaro es un producto en fase inicial. Monitorizamos el servicio y podemos restaurar datos de reserva desde copias de seguridad cuando haga falta. No hemos publicado un SLA de disponibilidad formal." },
          { question: "¿Que pasa si Mesaro cae durante un servicio?", answer: "Todas las reservas confirmadas estan en la base de datos. Cuando se reanuda el servicio, los datos estan intactos." },
          { question: "¿Que navegadores y dispositivos admite Mesaro?", answer: "Todos los navegadores modernos. Responsive para tableta y escritorio. La mayoria del personal de sala lo usa en un iPad." },
          { question: "¿Como se gestionan las copias de seguridad de la base de datos?", answer: "Realizamos copias de seguridad automaticas regulares de los datos de reserva. Escribe a support@mesaro.com para conocer la frecuencia y retencion actuales." }
        ]
      },
      {
        id: "rgpd",
        title: "RGPD & Datos",
        items: [
          { question: "¿Es Mesaro compatible con el RGPD?", answer: "Mesaro almacena datos de reserva de clientes — nombre, email, comensales, fecha — en PostgreSQL para tu restaurante. No vendemos datos de clientes ni los usamos para nuestro propio marketing. Buscamos alinear el tratamiento con el RGPD; para subencargados, un DPA o una consulta formal: support@mesaro.com." },
          { question: "¿Donde se almacenan mis datos?", answer: "Los datos de reserva y cuenta se almacenan para operar el servicio. La infraestructura de produccion esta alojada en Hostinger en la Union Europea. El pago (Stripe) y los proveedores de email pueden tratar datos limitados bajo sus propias condiciones. Contacta support@mesaro.com para subencargados actuales y un DPA." },
          { question: "¿Quien posee los datos de reservas de clientes?", answer: "Tu. Los nombres, correos e historiales de reservas son tus datos. Mesaro no los vende ni los comparte." },
          { question: "¿Que pasa con mis datos si cancelo?", answer: "Tus datos son accesibles durante 30 dias tras la cancelacion para exportarlos. Despues de 30 dias se eliminan permanentemente." }
        ]
      },
      {
        id: "soporte",
        title: "Soporte",
        items: [
          { question: "¿Como obtengo ayuda si algo no funciona?", answer: "Usa la pagina de Contacto. Describe lo que esperabas y lo que ocurrio. Incluye el nombre de tu restaurante. Respondemos en un dia laborable." },
          { question: "¿Hay soporte telefonico?", answer: "Por el momento no. Todo el soporte se gestiona por correo y formulario de contacto. Objetivo: un dia laborable." },
          { question: "¿Hay documentacion o centro de ayuda?", answer: "Esta en construccion. La FAQ cubre las preguntas mas frecuentes. Para el resto, usa el formulario de contacto." }
        ]
      }
    ]
  }
};

export function FaqPage() {
  const { locale, t } = useI18n();
  const copy = COPY[locale];

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

      {copy.categories.map((category, index) => (
        <section key={category.id} id={category.id} className="mx-auto mt-16 w-full max-w-6xl px-4">
          <Reveal delay={index * 0.02}>
            <h2 className="mk-display mb-6 text-3xl text-[var(--mk-mist)] sm:text-4xl">{category.title}</h2>
            <FaqAccordion items={category.items} />
          </Reveal>
        </section>
      ))}

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
