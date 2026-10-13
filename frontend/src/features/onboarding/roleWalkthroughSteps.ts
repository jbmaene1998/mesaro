import type { WalkthroughRole } from "@/features/onboarding/staffFirstRun";

export type WalkthroughLocale = "en" | "nl" | "fr" | "es";

export type WalkthroughCategory = "dashboard" | "tables" | "shifts" | "service" | "team" | "setup";

export interface WalkthroughStep {
  id: string;
  category: WalkthroughCategory;
  title: string;
  body: string;
  bullets: string[];
  href: string;
  openLabel?: string;
}

interface BuildOptions {
  role: WalkthroughRole;
  locale: string;
  onboardingIncomplete?: boolean;
}

type LocaleCopy = {
  categories: Record<WalkthroughCategory, string>;
  staff: WalkthroughStep[];
  manager: WalkthroughStep[];
  ownerExtras: WalkthroughStep[];
  finishSetup: WalkthroughStep;
};

export function getWalkthroughCategoryLabel(locale: string, category: WalkthroughCategory) {
  const copy = COPY[(locale as WalkthroughLocale) in COPY ? (locale as WalkthroughLocale) : "en"];
  return copy.categories[category];
}

export function buildRoleWalkthroughSteps(options: BuildOptions): WalkthroughStep[] {
  const locale = (options.locale as WalkthroughLocale) in COPY ? (options.locale as WalkthroughLocale) : "en";
  const copy = COPY[locale];

  if (options.role === "STAFF") {
    return copy.staff;
  }

  const steps = [...copy.manager];
  if (options.role === "OWNER") {
    steps.push(...copy.ownerExtras);
  }
  if (options.onboardingIncomplete) {
    steps.push(copy.finishSetup);
  }
  return steps;
}

const COPY: Record<WalkthroughLocale, LocaleCopy> = {
  en: {
    categories: {
      dashboard: "Dashboard",
      tables: "Tables",
      shifts: "Shifts",
      service: "Service",
      team: "Team",
      setup: "Setup"
    },
    staff: [
      {
        id: "staff-dashboard",
        category: "dashboard",
        title: "Dashboard is your floor view",
        body: "Start every shift here. You’ll see who’s arriving, walk-ins, and which tables are free or occupied right now.",
        bullets: [
          "Tonight’s reservation counts and no-shows",
          "Live table strip: available, arriving soon, occupied",
          "Quick actions for walk-ins when the door gets busy"
        ],
        href: "/dashboard"
      },
      {
        id: "staff-reservations",
        category: "service",
        title: "Seat, move, complete, or no-show",
        body: "Open a reservation to run the table through service without leaving the floor flow.",
        bullets: [
          "Seat guests when they arrive",
          "Switch tables if the party needs a different size",
          "Mark complete or no-show so the room stays accurate"
        ],
        href: "/reservations"
      },
      {
        id: "staff-timeline",
        category: "service",
        title: "Timeline shows pressure by hour",
        body: "Use Timeline when you need a visual of overlapping parties and table turns.",
        bullets: ["See bookings across the day", "Spot tight turn windows before they stack up"],
        href: "/timeline"
      },
      {
        id: "staff-planning",
        category: "shifts",
        title: "Check which shifts you’re on",
        body: "Planning shows the shifts managers assigned you. Tables and shift setup stay with managers.",
        bullets: ["Confirm your upcoming services", "Ask a manager if a shift looks wrong"],
        href: "/planning"
      },
      {
        id: "staff-vacations",
        category: "team",
        title: "Request time off",
        body: "Use Vacations so managers can approve cover before the week is planned.",
        bullets: ["Submit requests early", "Managers approve so the floor stays covered"],
        href: "/vacations"
      }
    ],
    manager: [
      {
        id: "mgr-dashboard",
        category: "dashboard",
        title: "Dashboard is the command center",
        body: "After setup, run service from here: covers, live tables, and who’s next through the door.",
        bullets: [
          "Current shift capacity and reservation load",
          "Live seating status across the room",
          "Walk-in and manual booking shortcuts"
        ],
        href: "/dashboard"
      },
      {
        id: "mgr-tables-config",
        category: "tables",
        title: "Configure every table",
        body: "Tables → Configuration is the source of truth for the room. Labels should match what staff say on the floor; seats drive auto-assignment.",
        bullets: [
          "Add or edit tables: label + seat count",
          "Remove tables only when that physical spot is gone",
          "Use grid for a floor overview, list for quick edits",
          "Wrong seats = wrong party fits and overbooked kitchens"
        ],
        href: "/tables",
        openLabel: "Open Tables"
      },
      {
        id: "mgr-tables-live",
        category: "tables",
        title: "Live status during service",
        body: "Switch to Live status to run the room without risking layout edits. This mirrors what the dashboard strip shows, with more detail.",
        bullets: [
          "See available vs occupied and linked reservations",
          "Read-only mode protects seat counts mid-service",
          "Refresh automatically as parties turn",
          "Jump back to Configuration only between services"
        ],
        href: "/tables",
        openLabel: "Open live Tables"
      },
      {
        id: "mgr-tables-combinations",
        category: "tables",
        title: "Combine tables for larger parties",
        body: "Combinations let two or more tables book as one larger unit when a party won’t fit a single top.",
        bullets: [
          "Create a combination with shared min/max capacity",
          "Singles stay bookable when they’re not part of an active combo",
          "Rebuild combinations after you move furniture",
          "Use this instead of inventing fake oversized tables"
        ],
        href: "/tables",
        openLabel: "Open Combinations"
      },
      {
        id: "mgr-shifts-week",
        category: "shifts",
        title: "Build the weekly shift grid",
        body: "Shifts are the only bookable windows. No separate opening-hours calendar — if there is no active shift, guests cannot book that day/time.",
        bullets: [
          "One shift = one day + start/end + last booking time",
          "Set max covers for kitchen + room capacity",
          "Scan Mon–Sun for closed days or missing services",
          "Lunch and dinner can share a day with different cover caps"
        ],
        href: "/shifts",
        openLabel: "Open Shifts"
      },
      {
        id: "mgr-shifts-publish",
        category: "shifts",
        title: "Draft first, then publish",
        body: "Drafts are safe to prepare offline. Only published (active) shifts accept online bookings and show on the dashboard capacity.",
        bullets: [
          "Publish one shift or all drafts in one click",
          "Deactivate to pause bookings without deleting history",
          "Re-publish when seasonal hours change",
          "After go-live, revisit Shifts before busy weekends"
        ],
        href: "/shifts",
        openLabel: "Manage publish"
      },
      {
        id: "mgr-planning",
        category: "shifts",
        title: "Plan who works each shift",
        body: "Planning assigns people to the shifts you just defined so the floor knows who’s on lunch vs dinner.",
        bullets: [
          "Assign staff to upcoming shifts",
          "Adjust hours when someone covers late",
          "Tables/shifts setup stays on Tables & Shifts — Planning is who’s working"
        ],
        href: "/planning"
      },
      {
        id: "mgr-service",
        category: "service",
        title: "Run the floor from reservations",
        body: "During service, seat parties, switch tables, complete covers, and take walk-ins from the same flows.",
        bullets: [
          "Walk-in when someone arrives without a booking",
          "Switch tables if the party size changes",
          "Keep statuses current so live tables stay honest"
        ],
        href: "/reservations"
      },
      {
        id: "mgr-team",
        category: "team",
        title: "Invite the team",
        body: "Staff invites bring floor colleagues in with the right role. They’ll get their own short tour on first login.",
        bullets: ["Invite STAFF for floor service", "Approve vacation requests from Vacations"],
        href: "/staff"
      }
    ],
    ownerExtras: [
      {
        id: "owner-settings",
        category: "setup",
        title: "Settings stay owner-only",
        body: "Restaurant profile, booking link, and billing live under Settings. Managers handle tables and shifts; you keep the account.",
        bullets: [
          "Confirm booking is enabled for guests",
          "Share the public booking URL",
          "Review billing when the trial ends"
        ],
        href: "/settings"
      }
    ],
    finishSetup: {
      id: "finish-setup",
      category: "setup",
      title: "Restaurant isn’t fully live yet",
      body: "Finish the go-live wizard so tables, shifts, and online booking are all connected.",
      bullets: ["Add at least one table and one active shift", "Turn booking on and share the link"],
      href: "/onboarding",
      openLabel: "Resume setup"
    }
  },
  nl: {
    categories: {
      dashboard: "Dashboard",
      tables: "Tafels",
      shifts: "Shifts",
      service: "Service",
      team: "Team",
      setup: "Setup"
    },
    staff: [
      {
        id: "staff-dashboard",
        category: "dashboard",
        title: "Dashboard is je floor-overzicht",
        body: "Begin elke shift hier. Je ziet wie er aankomt, walk-ins en welke tafels vrij of bezet zijn.",
        bullets: [
          "Reserveringen en no-shows vanavond",
          "Live tafels: vrij, komt eraan, bezet",
          "Snel walk-ins toevoegen als het druk wordt"
        ],
        href: "/dashboard"
      },
      {
        id: "staff-reservations",
        category: "service",
        title: "Seat, verplaats, rond af of no-show",
        body: "Open een reservering om de tafel door de service te leiden.",
        bullets: [
          "Seat gasten bij aankomst",
          "Wissel van tafel als de partij een andere grootte nodig heeft",
          "Markeer complete of no-show zodat de zaal klopt"
        ],
        href: "/reservations"
      },
      {
        id: "staff-timeline",
        category: "service",
        title: "Timeline toont druk per uur",
        body: "Gebruik Timeline voor overlappingen en tafelturns.",
        bullets: ["Boekingen over de dag", "Zie krappe turns voor ze opstapelen"],
        href: "/timeline"
      },
      {
        id: "staff-planning",
        category: "shifts",
        title: "Bekijk op welke shifts je staat",
        body: "Planning toont de shifts die managers je toewezen. Tafel- en shiftsetup blijft bij managers.",
        bullets: ["Bevestig je komende services", "Vraag een manager als iets niet klopt"],
        href: "/planning"
      },
      {
        id: "staff-vacations",
        category: "team",
        title: "Vraag verlof aan",
        body: "Gebruik Vacations zodat managers dekking kunnen goedkeuren.",
        bullets: ["Dien verzoeken op tijd in", "Managers keuren goed zodat de floor gedekt blijft"],
        href: "/vacations"
      }
    ],
    manager: [
      {
        id: "mgr-dashboard",
        category: "dashboard",
        title: "Dashboard is het commandocentrum",
        body: "Na setup stuur je de service vanaf hier: covers, live tafels en wie er binnenkomt.",
        bullets: [
          "Capaciteit van de huidige shift",
          "Live seating in de zaal",
          "Snelkoppelingen voor walk-in en handmatige boeking"
        ],
        href: "/dashboard"
      },
      {
        id: "mgr-tables-config",
        category: "tables",
        title: "Configureer elke tafel",
        body: "Tafels → Configuratie is de bron voor de zaal. Labels moeten matchen met de floor; seats sturen auto-toewijzing.",
        bullets: [
          "Voeg of bewerk tafels: label + stoelen",
          "Verwijder alleen als de fysieke plek weg is",
          "Grid voor overzicht, lijst voor snelle edits",
          "Verkeerde seats = verkeerde party-fit en overboeking"
        ],
        href: "/tables",
        openLabel: "Open Tafels"
      },
      {
        id: "mgr-tables-live",
        category: "tables",
        title: "Live status tijdens service",
        body: "Live status om de zaal te draaien zonder layout te riskeren — zelfde info als het dashboard, met meer detail.",
        bullets: [
          "Vrij vs bezet en gekoppelde reserveringen",
          "Alleen-lezen beschermt stoelen tijdens service",
          "Vernieuwt automatisch bij turns",
          "Terug naar Configuratie alleen tussen services"
        ],
        href: "/tables",
        openLabel: "Open live Tafels"
      },
      {
        id: "mgr-tables-combinations",
        category: "tables",
        title: "Combineer tafels voor grotere groepen",
        body: "Combinaties laten twee of meer tafels als één grotere eenheid boeken.",
        bullets: [
          "Maak een combinatie met gedeelde min/max capaciteit",
          "Singles blijven boekbaar buiten een combo",
          "Bouw opnieuw na een herinrichting",
          "Beter dan nep-grote tafels verzinnen"
        ],
        href: "/tables",
        openLabel: "Open Combinaties"
      },
      {
        id: "mgr-shifts-week",
        category: "shifts",
        title: "Bouw het weekrooster van shifts",
        body: "Shifts zijn de enige boekbare vensters. Geen aparte openingsuren — zonder actieve shift geen boeking.",
        bullets: [
          "Eén shift = één dag + start/eind + laatste boeking",
          "Max covers voor keuken + zaal",
          "Scan ma–zo op gesloten of ontbrekende services",
          "Lunch en diner mogen dezelfde dag met andere caps"
        ],
        href: "/shifts",
        openLabel: "Open Shifts"
      },
      {
        id: "mgr-shifts-publish",
        category: "shifts",
        title: "Eerst draft, dan publiceren",
        body: "Drafts zijn veilig om voor te bereiden. Alleen actieve shifts nemen online boekingen aan.",
        bullets: [
          "Publiceer één shift of alle drafts",
          "Deactiveer om te pauzeren zonder te verwijderen",
          "Publiceer opnieuw bij seizoensuren",
          "Na go-live: check Shifts voor drukke weekenden"
        ],
        href: "/shifts",
        openLabel: "Beheer publiceren"
      },
      {
        id: "mgr-planning",
        category: "shifts",
        title: "Plan wie welke shift werkt",
        body: "Planning wijst mensen toe aan de shifts die je net definieerde.",
        bullets: [
          "Wijs staff toe aan shifts",
          "Pas uren aan bij late cover",
          "Setup blijft onder Tafels & Shifts — Planning is wie werkt"
        ],
        href: "/planning"
      },
      {
        id: "mgr-service",
        category: "service",
        title: "Stuur de floor via reserveringen",
        body: "Tijdens service: seat, wissel tafels, rond covers af en neem walk-ins.",
        bullets: [
          "Walk-in zonder boeking",
          "Wissel tafels bij andere partygrootte",
          "Houd statussen actueel voor live tafels"
        ],
        href: "/reservations"
      },
      {
        id: "mgr-team",
        category: "team",
        title: "Nodig het team uit",
        body: "Staff-uitnodigingen brengen collega’s binnen met de juiste rol. Zij krijgen een korte tour bij eerste login.",
        bullets: ["Nodig STAFF uit voor de floor", "Keur verlof goed via Vacations"],
        href: "/staff"
      }
    ],
    ownerExtras: [
      {
        id: "owner-settings",
        category: "setup",
        title: "Settings blijven voor de owner",
        body: "Profiel, boekingslink en billing staan onder Settings. Managers beheren tafels en shifts; jij het account.",
        bullets: [
          "Controleer of booking aan staat",
          "Deel de publieke boekings-URL",
          "Bekijk billing tegen het einde van de trial"
        ],
        href: "/settings"
      }
    ],
    finishSetup: {
      id: "finish-setup",
      category: "setup",
      title: "Restaurant is nog niet volledig live",
      body: "Rond de go-live wizard af zodat tafels, shifts en online booking verbonden zijn.",
      bullets: ["Minstens één tafel en één actieve shift", "Zet booking aan en deel de link"],
      href: "/onboarding",
      openLabel: "Setup hervatten"
    }
  },
  fr: {
    categories: {
      dashboard: "Tableau de bord",
      tables: "Tables",
      shifts: "Services",
      service: "Service",
      team: "Equipe",
      setup: "Configuration"
    },
    staff: [
      {
        id: "staff-dashboard",
        category: "dashboard",
        title: "Le tableau de bord est votre vue salle",
        body: "Commencez chaque service ici. Arrivees, walk-ins et tables libres ou occupees.",
        bullets: [
          "Reservations et no-shows du soir",
          "Bandeau live: disponible, arrive bientot, occupe",
          "Walk-ins rapides quand ca s'accelere"
        ],
        href: "/dashboard"
      },
      {
        id: "staff-reservations",
        category: "service",
        title: "Asseoir, deplacer, terminer ou no-show",
        body: "Ouvrez une reservation pour faire avancer la table pendant le service.",
        bullets: [
          "Asseyez les invites a l'arrivee",
          "Changez de table si la taille change",
          "Marquez termine ou no-show pour garder la salle juste"
        ],
        href: "/reservations"
      },
      {
        id: "staff-timeline",
        category: "service",
        title: "La timeline montre la pression horaire",
        body: "Utilisez Timeline pour visualiser les chevauchements et rotations.",
        bullets: ["Reservations sur la journee", "Anticipez les rotations serrees"],
        href: "/timeline"
      },
      {
        id: "staff-planning",
        category: "shifts",
        title: "Voyez vos services planifies",
        body: "Planning montre les services que les managers vous ont assignes. Config tables/shifts = managers.",
        bullets: ["Confirmez vos prochains services", "Demandez un manager si quelque chose cloche"],
        href: "/planning"
      },
      {
        id: "staff-vacations",
        category: "team",
        title: "Demandez un conge",
        body: "Utilisez Vacations pour que les managers valident le remplacement.",
        bullets: ["Demandez tot", "Les managers approuvent pour couvrir la salle"],
        href: "/vacations"
      }
    ],
    manager: [
      {
        id: "mgr-dashboard",
        category: "dashboard",
        title: "Le tableau de bord est le centre de commande",
        body: "Apres la config, pilotez le service ici: couverts, tables live, prochaines arrivees.",
        bullets: [
          "Capacite du service en cours",
          "Placement live dans la salle",
          "Raccourcis walk-in et reservation manuelle"
        ],
        href: "/dashboard"
      },
      {
        id: "mgr-tables-config",
        category: "tables",
        title: "Configurez chaque table",
        body: "Tables → Configuration: labels, couverts et disponibilite pour la reservation.",
        bullets: [
          "Ajoutez des tables (label + places)",
          "Modifiez ou supprimez si le plan change",
          "Grille ou liste selon votre usage"
        ],
        href: "/tables",
        openLabel: "Ouvrir Tables"
      },
      {
        id: "mgr-tables-live",
        category: "tables",
        title: "Statut live pendant le service",
        body: "Passez en statut live pour voir disponibilite et reservations sans editer le plan.",
        bullets: [
          "Libre vs occupe d'un coup d'oeil",
          "Lecture seule pendant le service",
          "Rafraichissement auto pendant les rotations"
        ],
        href: "/tables",
        openLabel: "Ouvrir Tables live"
      },
      {
        id: "mgr-tables-combinations",
        category: "tables",
        title: "Combinez des tables pour les grands groupes",
        body: "L'onglet Combinaisons unit plusieurs tables en une capacite commune.",
        bullets: [
          "Creez des combinaisons avec capacite partagee",
          "Gardez les tables seules reservables hors combinaison",
          "Mettez a jour apres un reamenagement"
        ],
        href: "/tables",
        openLabel: "Ouvrir Combinaisons"
      },
      {
        id: "mgr-shifts-week",
        category: "shifts",
        title: "Construisez la grille hebdomadaire",
        body: "Les services definissent quand on peut reserver: dejeuner, diner — debut/fin et max couverts.",
        bullets: [
          "Ajoutez un service par jour et creneau",
          "Fixez le max couverts pour la cuisine",
          "Parcourez lun–dim pour les trous ou doublons"
        ],
        href: "/shifts",
        openLabel: "Ouvrir Services"
      },
      {
        id: "mgr-shifts-publish",
        category: "shifts",
        title: "Brouillon d'abord, puis publier",
        body: "Les nouveaux services peuvent rester en brouillon. Seuls les services actifs acceptent les reservations en ligne.",
        bullets: [
          "Publiez un service ou tous les brouillons",
          "Desactivez pour suspendre sans supprimer",
          "Republiez quand les horaires changent"
        ],
        href: "/shifts",
        openLabel: "Gerer la publication"
      },
      {
        id: "mgr-planning",
        category: "shifts",
        title: "Planifiez qui travaille quel service",
        body: "Planning relie les personnes aux services (dejeuner vs diner).",
        bullets: ["Assignez le staff", "Ajustez les heures en cas de remplacement"],
        href: "/planning"
      },
      {
        id: "mgr-service",
        category: "service",
        title: "Pilotez la salle via les reservations",
        body: "Pendant le service: asseoir, changer de table, terminer, walk-ins.",
        bullets: [
          "Walk-in sans reservation",
          "Changer de table si la taille change",
          "Statuts a jour = tables live fiables"
        ],
        href: "/reservations"
      },
      {
        id: "mgr-team",
        category: "team",
        title: "Invitez l'equipe",
        body: "Les invitations staff arrivent avec le bon role. Ils auront une courte visite au premier login.",
        bullets: ["Invitez STAFF pour la salle", "Approuvez les conges dans Vacations"],
        href: "/staff"
      }
    ],
    ownerExtras: [
      {
        id: "owner-settings",
        category: "setup",
        title: "Settings reste reserve au proprietaire",
        body: "Profil, lien de reservation et facturation sont dans Settings. Les managers gerent tables et services.",
        bullets: [
          "Verifiez que la reservation est activee",
          "Partagez l'URL publique",
          "Surveillez la facturation en fin d'essai"
        ],
        href: "/settings"
      }
    ],
    finishSetup: {
      id: "finish-setup",
      category: "setup",
      title: "Le restaurant n'est pas encore totalement en ligne",
      body: "Terminez l'assistant go-live pour relier tables, services et reservation en ligne.",
      bullets: ["Au moins une table et un service actif", "Activez la reservation et partagez le lien"],
      href: "/onboarding",
      openLabel: "Reprendre la config"
    }
  },
  es: {
    categories: {
      dashboard: "Panel",
      tables: "Mesas",
      shifts: "Turnos",
      service: "Servicio",
      team: "Equipo",
      setup: "Configuracion"
    },
    staff: [
      {
        id: "staff-dashboard",
        category: "dashboard",
        title: "El panel es tu vista de sala",
        body: "Empieza cada turno aqui. Quien llega, walk-ins y mesas libres u ocupadas.",
        bullets: [
          "Reservas y no-shows de esta noche",
          "Franja live: disponible, llega pronto, ocupada",
          "Walk-ins rapidos cuando hay cola"
        ],
        href: "/dashboard"
      },
      {
        id: "staff-reservations",
        category: "service",
        title: "Sentar, mover, completar o no-show",
        body: "Abre una reserva para llevar la mesa por el servicio.",
        bullets: [
          "Sienta a los invitados al llegar",
          "Cambia de mesa si el grupo necesita otro tamano",
          "Marca completo o no-show para mantener la sala al dia"
        ],
        href: "/reservations"
      },
      {
        id: "staff-timeline",
        category: "service",
        title: "Timeline muestra la presion por hora",
        body: "Usa Timeline para ver solapes y rotaciones de mesas.",
        bullets: ["Reservas del dia", "Anticipa rotaciones apretadas"],
        href: "/timeline"
      },
      {
        id: "staff-planning",
        category: "shifts",
        title: "Mira en que turnos estas",
        body: "Planning muestra los turnos que te asignaron. Configurar mesas/turnos es de managers.",
        bullets: ["Confirma tus proximos servicios", "Pregunta a un manager si algo no cuadra"],
        href: "/planning"
      },
      {
        id: "staff-vacations",
        category: "team",
        title: "Pide tiempo libre",
        body: "Usa Vacations para que los managers aprueben la cobertura.",
        bullets: ["Pide con antelacion", "Los managers aprueban para cubrir la sala"],
        href: "/vacations"
      }
    ],
    manager: [
      {
        id: "mgr-dashboard",
        category: "dashboard",
        title: "El panel es el centro de mando",
        body: "Tras la config, dirige el servicio desde aqui: cubiertos, mesas live y quien entra.",
        bullets: [
          "Capacidad del turno actual",
          "Seating live en sala",
          "Atajos de walk-in y reserva manual"
        ],
        href: "/dashboard"
      },
      {
        id: "mgr-tables-config",
        category: "tables",
        title: "Configura cada mesa",
        body: "Mesas → Configuracion: etiquetas, asientos y si la mesa acepta reservas.",
        bullets: [
          "Anade mesas con etiqueta y asientos",
          "Edita o elimina si cambia el layout",
          "Elige vista rejilla o lista"
        ],
        href: "/tables",
        openLabel: "Abrir Mesas"
      },
      {
        id: "mgr-tables-live",
        category: "tables",
        title: "Estado live durante el servicio",
        body: "Pasa a estado live para ver disponibilidad sin editar el layout.",
        bullets: [
          "Libre vs ocupada de un vistazo",
          "Solo lectura durante el servicio",
          "Se actualiza solo en cada rotacion"
        ],
        href: "/tables",
        openLabel: "Abrir Mesas live"
      },
      {
        id: "mgr-tables-combinations",
        category: "tables",
        title: "Combina mesas para grupos grandes",
        body: "La pestana Combinaciones une dos o mas mesas como una unidad mayor.",
        bullets: [
          "Crea combinaciones con capacidad compartida",
          "Manten individuales reservables fuera de combinacion",
          "Revisa al reorganizar la sala"
        ],
        href: "/tables",
        openLabel: "Abrir Combinaciones"
      },
      {
        id: "mgr-shifts-week",
        category: "shifts",
        title: "Arma la grilla semanal de turnos",
        body: "Los turnos definen cuando se puede reservar: comida, cena — inicio/fin y max cubiertos.",
        bullets: [
          "Anade un turno por dia y ventana",
          "Define max cubiertos para cocina",
          "Revisa lun–dom por huecos o duplicados"
        ],
        href: "/shifts",
        openLabel: "Abrir Turnos"
      },
      {
        id: "mgr-shifts-publish",
        category: "shifts",
        title: "Borrador primero, luego publica",
        body: "Los turnos nuevos pueden quedar en borrador. Solo los activos aceptan reservas online.",
        bullets: [
          "Publica uno o todos los borradores",
          "Desactiva para pausar sin borrar",
          "Republica cuando cambien los horarios"
        ],
        href: "/shifts",
        openLabel: "Gestionar publicacion"
      },
      {
        id: "mgr-planning",
        category: "shifts",
        title: "Planifica quien trabaja cada turno",
        body: "Planning une personas con turnos (comida vs cena).",
        bullets: ["Asigna staff a turnos", "Ajusta horas si alguien cubre tarde"],
        href: "/planning"
      },
      {
        id: "mgr-service",
        category: "service",
        title: "Dirige la sala desde reservas",
        body: "Durante el servicio: sentar, cambiar mesas, completar y walk-ins.",
        bullets: [
          "Walk-in sin reserva",
          "Cambia mesa si cambia el tamano del grupo",
          "Estados al dia = mesas live fiables"
        ],
        href: "/reservations"
      },
      {
        id: "mgr-team",
        category: "team",
        title: "Invita al equipo",
        body: "Las invitaciones de staff llegan con el rol correcto. Veran un tour corto en el primer login.",
        bullets: ["Invita STAFF para sala", "Aprueba vacaciones en Vacations"],
        href: "/staff"
      }
    ],
    ownerExtras: [
      {
        id: "owner-settings",
        category: "setup",
        title: "Settings es solo del owner",
        body: "Perfil, enlace de reservas y facturacion estan en Settings. Los managers gestionan mesas y turnos.",
        bullets: [
          "Confirma que las reservas estan activas",
          "Comparte la URL publica",
          "Revisa facturacion al final del trial"
        ],
        href: "/settings"
      }
    ],
    finishSetup: {
      id: "finish-setup",
      category: "setup",
      title: "El restaurante aun no esta del todo en vivo",
      body: "Termina el asistente go-live para conectar mesas, turnos y reservas online.",
      bullets: ["Al menos una mesa y un turno activo", "Activa reservas y comparte el enlace"],
      href: "/onboarding",
      openLabel: "Reanudar setup"
    }
  }
};
