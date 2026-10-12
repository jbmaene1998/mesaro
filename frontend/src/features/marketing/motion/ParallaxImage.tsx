import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

type ParallaxImageProps = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  intensity?: number;
};

export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  intensity = 18
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [intensity, -intensity]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1.08, 1]);

  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ""}`}>
      <motion.img
        src={src}
        alt={alt}
        style={{ y, scale }}
        className={`h-full w-full object-cover will-change-transform ${imgClassName ?? ""}`}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
