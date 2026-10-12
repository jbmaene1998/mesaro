import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type PropsWithChildren } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type GsapSplitRevealProps = PropsWithChildren<{
  className?: string;
}>;

/** Line-clip reveal using GSAP ScrollTrigger */
export function GsapSplitReveal({ children, className }: GsapSplitRevealProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      gsap.fromTo(
        el,
        { clipPath: "inset(0 0 100% 0)", opacity: 0.35 },
        {
          clipPath: "inset(0 0 0% 0)",
          opacity: 1,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%"
          }
        }
      );
    },
    { scope: root }
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
