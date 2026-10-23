import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ui } from '@cj/contracts';

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'secondary';
}) {
  const styles = {
    primary: 'bg-sky-500 text-slate-950 hover:bg-sky-400 font-semibold',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 font-semibold',
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'success';
  children: ReactNode;
}) {
  const styles = {
    info: 'border-sky-800 bg-sky-950/60 text-sky-200',
    error: 'border-rose-800 bg-rose-950/60 text-rose-200',
    success: 'border-emerald-800 bg-emerald-950/60 text-emerald-200',
  }[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-3 py-2 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}

export function Screen({
  title,
  back,
  children,
  action,
}: {
  title: string;
  back?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-24 pt-4">
      <header className="mb-4 flex items-center gap-3">
        {back ? (
          <a
            href={back}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
            aria-label={ui.shell.backLabel}
          >
            ←
          </a>
        ) : null}
        <h1 className="flex-1 text-lg font-semibold">{title}</h1>
        {action}
      </header>
      <main className="flex flex-1 flex-col gap-4">{children}</main>
    </div>
  );
}

export function Avatar({
  initial,
  color,
  size = 'md',
}: {
  initial: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const s = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-14 w-14 text-lg' }[size];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ${s}`}
      style={{ background: avatarBg(color) }}
      aria-hidden
    >
      {initial.slice(0, 1).toUpperCase()}
    </span>
  );
}

function avatarBg(color: string): string {
  const map: Record<string, string> = {
    cyan: '#0891b2',
    blue: '#2563eb',
    teal: '#0d9488',
    green: '#16a34a',
    violet: '#7c3aed',
    pink: '#db2777',
    red: '#dc2626',
    orange: '#ea580c',
    amber: '#d97706',
    slate: '#475569',
  };
  return map[color] ?? '#2563eb';
}

export const AVATAR_COLORS = [
  'cyan',
  'blue',
  'teal',
  'green',
  'violet',
  'pink',
  'orange',
  'amber',
  'slate',
] as const;
