import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { submitContactLead } from "@/features/marketing/api";
import { MarketingCta } from "@/features/marketing/components/MarketingCta";
import { usePageMeta } from "@/features/marketing/hooks/usePageMeta";
import { Reveal } from "@/features/marketing/motion/Reveal";
import { useI18n, type SupportedLocale } from "@/i18n";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

const COPY: Record<SupportedLocale, {
  title: string;
  description: string;
  heroTitle: string;
  heroLead: string;
  sendMessage: string;
  sendDetailsTitle: string;
  sendDetailsLead: string;
  contactFormTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  restaurantName: string;
  messageLabel: string;
  sending: string;
  send: string;
  validationSummary: string;
  idleText: string;
  successText: string;
  errorText: string;
  nextTitle: string;
  nextItems: string[];
  ctaTitle: string;
  ctaLead: string;
  validation: {
    firstName: string;
    lastName: string;
    emailRequired: string;
    emailInvalid: string;
    message: string;
  };
}> = {
  en: {
    title: "Contact Mesaro",
    description: "Get in touch with the Mesaro team. We respond within one business day — no sales scripts, just a direct conversation about your restaurant.",
    heroTitle: "Talk to us.",
    heroLead: "We respond within one business day. Tell us about your operation and we'll come back with answers specific to your setup — not a generic pitch.",
    sendMessage: "Send a message",
    sendDetailsTitle: "Send us a message",
    sendDetailsLead: "No sales scripts. Just a direct conversation about your restaurant and how we can help.",
    contactFormTitle: "Contact form",
    firstName: "First name",
    lastName: "Last name",
    email: "Work email",
    restaurantName: "Restaurant name (optional)",
    messageLabel: "What's on your mind?",
    sending: "Sending...",
    send: "Send message",
    validationSummary: "Please fix the highlighted fields.",
    idleText: "We read every message. Not sure what to write? Just describe your biggest reservation headache.",
    successText: "Got it. You'll hear from us within one business day — usually sooner.",
    errorText: "We could not send your message right now. Please try again.",
    nextTitle: "What happens next",
    nextItems: [
      "You'll hear back within one business day — often the same afternoon.",
      "We'll ask about your current setup: covers, reservation volume, how you handle no-shows.",
      "If Mesaro is a fit, we can have you live within the hour."
    ],
    ctaTitle: "Rather try it yourself first?",
    ctaLead: "14 days free. No card, no call, no commitment.",
    validation: {
      firstName: "First name is required",
      lastName: "Last name is required",
      emailRequired: "Work email is required",
      emailInvalid: "Enter a valid email address",
      message: "Share a bit more detail so we can prepare a relevant response"
    }
  },
  nl: {
    title: "Contact Mesaro",
    description: "Neem contact op met het Mesaro-team. We antwoorden binnen één werkdag — geen verkoopgesprekken, gewoon een directe conversatie over jouw restaurant.",
    heroTitle: "Praat met ons.",
    heroLead: "We antwoorden binnen één werkdag. Vertel ons over jouw operatie en we komen terug met antwoorden die specifiek op jouw situatie zijn afgestemd.",
    sendMessage: "Stuur een bericht",
    sendDetailsTitle: "Stuur ons een bericht",
    sendDetailsLead: "Geen verkoopverhalen. Gewoon een directe conversatie over jouw restaurant.",
    contactFormTitle: "Contactformulier",
    firstName: "Voornaam",
    lastName: "Achternaam",
    email: "Werk e-mail",
    restaurantName: "Restaurantnaam (optioneel)",
    messageLabel: "Wat staat je op het hart?",
    sending: "Verzenden...",
    send: "Bericht verzenden",
    validationSummary: "Corrigeer de gemarkeerde velden.",
    idleText: "We lezen elk bericht. Niet zeker wat te schrijven? Beschrijf gewoon je grootste reserveringsuitdaging.",
    successText: "Ontvangen. Je hoort van ons binnen één werkdag — meestal sneller.",
    errorText: "We konden je bericht nu niet verzenden. Probeer het opnieuw.",
    nextTitle: "Wat gebeurt er daarna",
    nextItems: [
      "Je hoort van ons binnen één werkdag — vaak dezelfde middag nog.",
      "We vragen naar je huidige setup: couverts, reserveringsvolume, hoe je no-shows beheert.",
      "Als Mesaro een goede match is, kunnen we je binnen het uur live zetten."
    ],
    ctaTitle: "Liever eerst zelf proberen?",
    ctaLead: "14 dagen gratis. Geen kaart, geen gesprek, geen verplichting.",
    validation: {
      firstName: "Voornaam is verplicht",
      lastName: "Achternaam is verplicht",
      emailRequired: "Werk e-mail is verplicht",
      emailInvalid: "Voer een geldig e-mailadres in",
      message: "Geef wat meer details zodat we een relevante reactie kunnen voorbereiden"
    }
  },
  fr: {
    title: "Contact Mesaro",
    description: "Contactez l'equipe Mesaro. Nous repondons sous un jour ouvre — pas de script commercial, juste une conversation directe sur votre restaurant.",
    heroTitle: "Parlons-en.",
    heroLead: "Nous repondons sous un jour ouvre. Parlez-nous de votre operation et nous reviendrons avec des reponses adaptees a votre situation — pas un argumentaire generique.",
    sendMessage: "Envoyer un message",
    sendDetailsTitle: "Envoyez-nous un message",
    sendDetailsLead: "Pas de script commercial. Juste une conversation directe sur votre restaurant.",
    contactFormTitle: "Formulaire de contact",
    firstName: "Prenom",
    lastName: "Nom",
    email: "Email professionnel",
    restaurantName: "Nom du restaurant (optionnel)",
    messageLabel: "Qu'avez-vous en tete ?",
    sending: "Envoi...",
    send: "Envoyer le message",
    validationSummary: "Corrigez les champs en erreur.",
    idleText: "Nous lisons chaque message. Vous ne savez pas quoi ecrire ? Decrivez simplement votre plus grand probleme de reservation.",
    successText: "Recu. Vous aurez de nos nouvelles sous un jour ouvre — souvent plus tot.",
    errorText: "Nous n'avons pas pu envoyer votre message. Veuillez reessayer.",
    nextTitle: "Et ensuite",
    nextItems: [
      "Vous aurez de nos nouvelles sous un jour ouvre — souvent le meme apres-midi.",
      "Nous vous poserons des questions sur votre configuration actuelle : couverts, volume de reservations, gestion des no-shows.",
      "Si Mesaro convient, nous pouvons vous rendre operationnel en moins d'une heure."
    ],
    ctaTitle: "Vous preferez essayer par vous-meme d'abord ?",
    ctaLead: "14 jours gratuits. Sans carte, sans appel, sans engagement.",
    validation: {
      firstName: "Le prenom est requis",
      lastName: "Le nom est requis",
      emailRequired: "L'email professionnel est requis",
      emailInvalid: "Entrez une adresse email valide",
      message: "Donnez un peu plus de details pour que nous puissions preparer une reponse pertinente"
    }
  },
  es: {
    title: "Contacto Mesaro",
    description: "Ponte en contacto con el equipo de Mesaro. Respondemos en un dia habil — sin guiones de venta, solo una conversacion directa sobre tu restaurante.",
    heroTitle: "Hablemos.",
    heroLead: "Respondemos en un dia habil. Cuentanos sobre tu operacion y volveremos con respuestas especificas para tu situacion — no un discurso generico.",
    sendMessage: "Enviar un mensaje",
    sendDetailsTitle: "Envianos un mensaje",
    sendDetailsLead: "Sin guiones de venta. Solo una conversacion directa sobre tu restaurante.",
    contactFormTitle: "Formulario de contacto",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Email de trabajo",
    restaurantName: "Nombre del restaurante (opcional)",
    messageLabel: "Que tienes en mente?",
    sending: "Enviando...",
    send: "Enviar mensaje",
    validationSummary: "Corrige los campos marcados.",
    idleText: "Leemos cada mensaje. No sabes que escribir? Describe tu mayor problema con las reservas.",
    successText: "Recibido. Tendras noticias nuestras en un dia habil — normalmente antes.",
    errorText: "No pudimos enviar tu mensaje en este momento. Por favor, intentalo de nuevo.",
    nextTitle: "Que pasa despues",
    nextItems: [
      "Tendras respuesta en un dia habil — a menudo la misma tarde.",
      "Te preguntaremos sobre tu configuracion actual: comensales, volumen de reservas, como gestionas los no-shows.",
      "Si Mesaro es la solucion adecuada, podemos tenerte en marcha en menos de una hora."
    ],
    ctaTitle: "Prefieres probarlo tu mismo primero?",
    ctaLead: "14 dias gratis. Sin tarjeta, sin llamada, sin compromiso.",
    validation: {
      firstName: "El nombre es obligatorio",
      lastName: "El apellido es obligatorio",
      emailRequired: "El email de trabajo es obligatorio",
      emailInvalid: "Introduce un email valido",
      message: "Comparte un poco mas de detalle para que podamos preparar una respuesta relevante"
    }
  }
};

type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  restaurantName?: string;
  message: string;
  companyWebsite?: string;
};

export function ContactPage() {
  const { locale, t } = useI18n();
  const copy = COPY[locale];
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const contactSchema = useMemo(() => z.object({
    firstName: z.string().trim().min(1, copy.validation.firstName),
    lastName: z.string().trim().min(1, copy.validation.lastName),
    email: z.string().trim().min(1, copy.validation.emailRequired).email(copy.validation.emailInvalid),
    restaurantName: z.string().trim().optional(),
    message: z.string().trim().min(20, copy.validation.message),
    companyWebsite: z.string().optional()
  }), [copy.validation]);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur",
    defaultValues: { firstName: "", lastName: "", email: "", restaurantName: "", message: "", companyWebsite: "" }
  });

  usePageMeta({ title: copy.title, description: copy.description });

  const onSubmit = async (values: ContactFormValues) => {
    trackEvent(ANALYTICS_EVENTS.MARKETING_CONTACT_FORM_SUBMIT, { page: "contact" });
    setSubmitState("submitting");
    try {
      await submitContactLead(values);
      trackEvent(ANALYTICS_EVENTS.MARKETING_CONTACT_FORM_SUCCESS, { page: "contact" });
      setSubmitState("success");
      form.reset();
    } catch {
      trackEvent(ANALYTICS_EVENTS.MARKETING_CONTACT_FORM_ERROR, { page: "contact" });
      setSubmitState("error");
    }
  };

  const hasValidationErrors = Object.keys(form.formState.errors).length > 0;
  const validationEventSentRef = useRef(false);
  useEffect(() => {
    if (hasValidationErrors && !validationEventSentRef.current) {
      trackEvent(ANALYTICS_EVENTS.MARKETING_CONTACT_FORM_VALIDATION_ERROR, { page: "contact", errorCount: Object.keys(form.formState.errors).length });
      validationEventSentRef.current = true;
      return;
    }
    if (!hasValidationErrors) {
      validationEventSentRef.current = false;
    }
  }, [form.formState.errors, hasValidationErrors]);

  return (
    <div className="pb-20">
      <section className="mk-hero relative min-h-[58vh] overflow-hidden">
        <motion.img
          src="/marketing/contact-facade.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(42,50,40,0.92)] via-[rgba(62,74,50,0.78)] to-[rgba(62,74,50,0.35)]" />
        <div className="relative mx-auto flex min-h-[58vh] w-full max-w-6xl flex-col justify-end px-4 pb-14 pt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <p className="mk-display text-[clamp(3rem,10vw,6rem)] leading-[1.05] text-[var(--mk-mist)]">Mesaro</p>
            <h1 className="mt-6 text-2xl font-medium text-[var(--mk-stone)] sm:text-3xl">{copy.heroTitle}</h1>
            <p className="mt-4 max-w-xl text-[var(--mk-pewter)]">{copy.heroLead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="mk-btn-primary inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold"
              >
                {t("common.startNow")}
              </Link>
              <a
                href="#contact-form"
                className="mk-btn-ghost inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold"
              >
                {copy.sendMessage}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="contact-form" className="mx-auto mt-20 w-full max-w-6xl px-4">
        <Reveal className="mb-10 max-w-2xl">
          <h2 className="mk-display text-4xl text-[var(--mk-mist)] sm:text-5xl">{copy.sendDetailsTitle}</h2>
          <p className="mt-3 text-[var(--mk-pewter)]">{copy.sendDetailsLead}</p>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <Reveal className="mk-panel rounded-[1.75rem] p-6 sm:p-8">
            <h3 className="text-xl font-semibold text-[var(--mk-mist)]">{copy.contactFormTitle}</h3>
            <form noValidate className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div aria-live="assertive">
                {hasValidationErrors ? (
                  <p className="text-sm text-red-300" role="alert">
                    {copy.validationSummary}
                  </p>
                ) : null}
              </div>
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="companyWebsite">Company website</label>
                <input
                  id="companyWebsite"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  {...form.register("companyWebsite")}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-[var(--mk-stone)]">
                    {copy.firstName} <span aria-hidden="true">*</span>
                  </label>
                  <Input id="firstName" className="border-[var(--mk-line)] bg-white/70" {...form.register("firstName")} />
                  {form.formState.errors.firstName ? (
                    <p className="text-sm text-red-300" role="alert">
                      {form.formState.errors.firstName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-[var(--mk-stone)]">
                    {copy.lastName} <span aria-hidden="true">*</span>
                  </label>
                  <Input id="lastName" className="border-[var(--mk-line)] bg-white/70" {...form.register("lastName")} />
                  {form.formState.errors.lastName ? (
                    <p className="text-sm text-red-300" role="alert">
                      {form.formState.errors.lastName.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[var(--mk-stone)]">
                  {copy.email} <span aria-hidden="true">*</span>
                </label>
                <Input id="email" type="email" className="border-[var(--mk-line)] bg-white/70" {...form.register("email")} />
                {form.formState.errors.email ? (
                  <p className="text-sm text-red-300" role="alert">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label htmlFor="restaurantName" className="text-sm font-medium text-[var(--mk-stone)]">
                  {copy.restaurantName}
                </label>
                <Input
                  id="restaurantName"
                  className="border-[var(--mk-line)] bg-white/70"
                  {...form.register("restaurantName")}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-[var(--mk-stone)]">
                  {copy.messageLabel} <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="message"
                  rows={5}
                  className="w-full rounded-md border border-[var(--mk-line)] bg-white/70 px-3 py-2 text-sm text-[var(--mk-mist)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--mk-brass)]"
                  {...form.register("message")}
                />
                {form.formState.errors.message ? (
                  <p className="text-sm text-red-300" role="alert">
                    {form.formState.errors.message.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={submitState === "submitting"}
                  className="mk-btn-primary inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold disabled:opacity-60"
                >
                  {submitState === "submitting" ? copy.sending : copy.send}
                </button>
                <div aria-live="polite">
                  {submitState === "idle" ? <p className="text-sm text-[var(--mk-pewter)]">{copy.idleText}</p> : null}
                  {submitState === "success" ? <p className="text-sm text-[var(--mk-mist)]">{copy.successText}</p> : null}
                  {submitState === "error" ? (
                    <p className="text-sm text-red-300" role="alert">
                      {copy.errorText}
                    </p>
                  ) : null}
                </div>
              </div>
            </form>
          </Reveal>

          <Reveal delay={0.08} className="mk-panel h-fit rounded-[1.75rem] p-6 sm:p-8 lg:sticky lg:top-24">
            <h3 className="text-xl font-semibold text-[var(--mk-mist)]">{copy.nextTitle}</h3>
            <div className="mt-5 space-y-4 text-sm text-[var(--mk-pewter)]">
              {copy.nextItems.map((item, index) => (
                <p key={item} className="flex gap-3">
                  <span className="mk-display text-xl text-[var(--mk-brass)]">{index + 1}</span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
            <Link
              to="/register"
              className="mk-btn-primary mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full text-sm font-semibold"
            >
              {t("common.startNow")}
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="mt-24">
        <MarketingCta
          title={copy.ctaTitle}
          lead={copy.ctaLead}
          primaryLabel={t("common.startNow")}
          primaryTo="/register"
          onPrimaryClick={() =>
            trackEvent(ANALYTICS_EVENTS.MARKETING_CONTACT_PRIMARY_CTA_CLICK, { page: "contact" })
          }
        />
      </section>
    </div>
  );
}
