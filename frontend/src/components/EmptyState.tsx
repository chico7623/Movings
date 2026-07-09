/**
 * Reusable empty-state component for pages/modals with no results.
 */
import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({ icon, eyebrow, title, body, action, className }: EmptyStateProps) {
  return (
    <section className={cn('empty-state rounded-3xl border border-dashed border-border bg-card/45 p-8 text-center md:p-10 animate-fade-up', className)}>
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-lg shadow-primary/10">
        {icon || <Sparkles className="h-8 w-8" />}
      </div>
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">{eyebrow}</p>}
      <h3 className="mx-auto max-w-2xl font-display text-2xl font-bold tracking-[-0.03em] text-foreground md:text-3xl">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  );
}
