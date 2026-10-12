import type { PropsWithChildren } from "react";

interface SectionBlockProps extends PropsWithChildren {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionBlock({ id, eyebrow, title, description, className, children }: SectionBlockProps) {
  return (
    <section id={id} className={`mx-auto w-full max-w-6xl px-4 py-14 sm:py-16 ${className ?? ""}`}>
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h2>
        {description ? <p className="mt-3 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
