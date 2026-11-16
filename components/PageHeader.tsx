import type { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={className ? `page-header ${className}` : "page-header"}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
