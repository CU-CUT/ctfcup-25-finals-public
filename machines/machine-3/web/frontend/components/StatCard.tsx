import { ReactNode } from 'react';

export function StatCard({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border shadow-card p-4 bg-white/80 dark:bg-slate-900/70 flex items-center justify-between">
      <div>
        <p className="text-xs uppercase text-slate-500">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
      {icon && <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>}
    </div>
  );
}
