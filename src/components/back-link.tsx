import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

type BackLinkVariant = "button" | "text";

type BackLinkProps = Omit<ComponentProps<typeof Link>, "children" | "className"> & {
  children: ReactNode;
  className?: string;
  variant?: BackLinkVariant;
};

const baseByVariant: Record<BackLinkVariant, string> = {
  button: "btn btn-ghost btn-sm inline-flex w-fit items-center gap-1.5 rounded-xl",
  text: "inline-flex items-center gap-1.5 text-sm font-semibold hover:underline",
};

export function BackLink({ children, className, variant = "button", ...props }: BackLinkProps) {
  return (
    <Link className={[baseByVariant[variant], className].filter(Boolean).join(" ")} {...props}>
      <span aria-hidden>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12.5 4.16666L6.66667 9.99999L12.5 15.8333"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </Link>
  );
}
