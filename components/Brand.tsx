import Link from "next/link";

/**
 * ClassPing lockup: "The Happy Bubble" mark next to the lowercase wordmark.
 * Default composition sits on cream/white; `inverse` is the on-green composition
 * (cream bubble, green smile, cream wordmark) from the brand guidelines.
 */
export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 110 110" aria-hidden="true" focusable="false">
      <path className="brand-mark-bubble" d="M8 44C8 20 24 8 55 8s47 12 47 36-16 36-47 36c-8 0-15-1-21-3L18 96l4-22C12 66 8 56 8 44Z" />
      <path className="brand-mark-smile" d="M38 48q17 16 34 0" />
    </svg>
  );
}

export default function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand ${inverse ? "inverse" : ""}`} href="/activities" aria-label="ClassPing">
      <BrandMark />
      <span className="brand-word">classping</span>
    </Link>
  );
}
