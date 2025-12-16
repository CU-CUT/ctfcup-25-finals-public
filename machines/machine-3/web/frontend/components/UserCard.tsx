import { User } from '@/types';

export function UserCard({ user }: { user: User }) {
  return (
    <div className="rounded-2xl border border-border shadow-card p-4 bg-white/80 dark:bg-slate-900/70 flex items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold">
        {user.fullName[0]}
      </div>
      <div>
        <div className="font-semibold">{user.fullName}</div>
        <div className="text-sm text-slate-500">{user.jobTitle}</div>
        <div className="text-xs text-slate-500">{user.department?.name}</div>
      </div>
    </div>
  );
}
