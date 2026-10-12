import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  alt?: string;
  variant?: "default" | "onDark";
}

export function BrandLogo({
  className,
  imageClassName,
  alt = "Mesaro",
  variant = "default"
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      <img
        src={variant === "onDark" ? "/brand/mesaro-wordmark-on-dark.svg" : "/brand/mesaro-wordmark.svg"}
        alt={alt}
        className={cn("mx-auto h-12 w-auto max-w-full object-contain object-center", imageClassName)}
      />
    </span>
  );
}
