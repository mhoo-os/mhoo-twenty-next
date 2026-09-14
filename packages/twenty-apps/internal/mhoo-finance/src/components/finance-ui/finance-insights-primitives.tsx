import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const FinanceHeader = ({ workspaceLabel, sample }: Readonly<{ workspaceLabel: string; sample: boolean }>) => <FinancePageHeader variant="overview" title="Insights" detail={workspaceLabel} badge={sample ? 'Fictional demo' : 'Workspace records'} />;

export const FinanceSourceRow = ({ children, onClick }: Readonly<{ children: ReactNode; onClick: () => void }>) => <button type="button" className="hi-source-row" onClick={onClick}>{children}</button>;

export const FinanceButton = ({ children, className = '', ...props }: Readonly<ButtonHTMLAttributes<HTMLButtonElement>>) => <button type="button" className={`hi-button ${className}`.trim()} {...props}>{children}</button>;

export const FinancePageHeader = ({ title, detail, actions, badge, variant = 'page' }: Readonly<{ title: string; detail: string; actions?: ReactNode; badge?: string; variant?: 'overview' | 'page' }>) => variant === 'overview'
  ? <header className="hi-title"><h1>{title} <span>{detail}</span></h1><span className="hi-demo">{badge}</span></header>
  : <header className="fi-page-header"><div><h1>{title}</h1><p>{detail}</p></div>{actions ? <div className="fi-page-actions">{actions}</div> : null}</header>;

export const FinanceEmptyState = ({ children }: Readonly<{ children: ReactNode }>) => <div className="fi-empty" role="status">{children}</div>;
