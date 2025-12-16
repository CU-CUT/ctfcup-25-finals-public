import Link from 'next/link';
import { Project } from '@/types';

export function ProjectCard({ project }: { project: Project }) {
  const tl = project.memberships?.find((m) => m.role === 'TL')?.user;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="rounded-2xl border border-border shadow-card p-4 bg-white/80 dark:bg-slate-900/70 hover:-translate-y-0.5 transition transform break-anywhere w-full"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-slate-500">{project.code}</div>
          <h3 className="text-lg font-semibold">{project.name}</h3>
        </div>
        <div className="badge">{project.department?.name ?? '—'}</div>
      </div>
      <p className="text-sm text-slate-500 mt-2 clamp-2 break-anywhere">{project.description}</p>
      <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        <div>Команда: {project.memberships?.length ?? 0} чел.</div>
        {tl && <div>Тимлид: {tl.fullName}</div>}
      </div>
    </Link>
  );
}
