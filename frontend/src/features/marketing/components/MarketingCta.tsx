import { Link } from "react-router-dom";
import { motion } from "motion/react";

import { Reveal } from "@/features/marketing/motion/Reveal";
import { cn } from "@/lib/utils";

type MarketingCtaProps = {
  title: string;
  lead: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  onPrimaryClick?: () => void;
  className?: string;
};

export function MarketingCta({
  title,
  lead,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
  onPrimaryClick,
  className
}: MarketingCtaProps) {
  return (
    <Reveal className={cn("relative overflow-hidden px-4", className)}>
      <div className="mk-panel mk-grain relative mx-auto max-w-6xl rounded-[2rem] px-6 py-14 sm:px-12">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,var(--mk-glow),transparent_70%)]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative max-w-2xl">
          <h2 className="mk-display text-4xl text-[var(--mk-mist)] sm:text-5xl">{title}</h2>
          <p className="mt-4 text-base text-[var(--mk-pewter)] sm:text-lg">{lead}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={primaryTo}
              onClick={onPrimaryClick}
              className="mk-btn-primary inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold"
            >
              {primaryLabel}
            </Link>
            {secondaryLabel && secondaryTo ? (
              <Link
                to={secondaryTo}
                className="mk-btn-ghost inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
