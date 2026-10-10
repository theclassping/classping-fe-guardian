import Link from "next/link";

export default function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand ${inverse ? "inverse" : ""}`} href="/activities">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>
        class<span>ping</span>
      </span>
    </Link>
  );
}
