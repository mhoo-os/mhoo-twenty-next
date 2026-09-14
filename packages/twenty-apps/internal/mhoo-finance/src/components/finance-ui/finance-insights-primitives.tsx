import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const FinanceHeader = ({ workspaceLabel, sample }: Readonly<{ workspaceLabel: string; sample: boolean }>) => <header className="hi-title"><h1>Insights <span>{workspaceLabel}</span></h1><span className="hi-demo">{sample ? 'Fictional demo' : 'Workspace records'}</span></header>;

export const FinanceSourceRow = ({ children, onClick }: Readonly<{ children: ReactNode; onClick: () => void }>) => <button type="button" className="hi-source-row" onClick={onClick}>{children}</button>;

export const FinanceButton = ({ children, className = '', ...props }: Readonly<ButtonHTMLAttributes<HTMLButtonElement>>) => <button type="button" className={`hi-button ${className}`.trim()} {...props}>{children}</button>;

export const FinancePageHeader = ({ title, detail, actions }: Readonly<{ title: string; detail: string; actions?: ReactNode }>) => <header className="fi-page-header"><div><h1>{title}</h1><p>{detail}</p></div>{actions ? <div className="fi-page-actions">{actions}</div> : null}</header>;

export const FinanceEmptyState = ({ children }: Readonly<{ children: ReactNode }>) => <div className="fi-empty" role="status">{children}</div>;
