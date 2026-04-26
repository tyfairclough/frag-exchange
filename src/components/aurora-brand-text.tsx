import type { CSSProperties } from "react";
import styles from "@/components/aurora-brand-text.module.css";

export type AuroraBrandTextSize = "sm" | "md" | "lg";

type AuroraBrandTextProps = {
  className?: string;
  /** Match surrounding surface so the clip rect does not show a seam (e.g. footer grey). */
  background?: string;
  /** Text / letter colour under the aurora layer */
  textColor?: string;
  size?: AuroraBrandTextSize;
  title?: string;
};

export function AuroraBrandText({
  className,
  background = "#ffffff",
  textColor = "#0b1e3b",
  size = "md",
  title,
}: AuroraBrandTextProps) {
  const cssVars = {
    "--aurora-bg": background,
    "--aurora-text": textColor,
  } as CSSProperties;

  return (
    <span
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-size={size}
      style={cssVars}
      title={title}
    >
      <span className={styles.title}>
        REEFxCHANGE
        <span className={styles.aurora} aria-hidden>
          <span className={styles.item} />
          <span className={styles.item} />
          <span className={styles.item} />
          <span className={styles.item} />
        </span>
      </span>
    </span>
  );
}
