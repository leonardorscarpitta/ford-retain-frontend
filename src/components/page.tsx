import { ViewTransition, type ReactNode } from "react";

/** Page wrapper: content fades in on navigation. Lives in each page, not the layout. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div className="page">{children}</div>
    </ViewTransition>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <div className="page-header-extra">{children}</div>}
    </header>
  );
}
