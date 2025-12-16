'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell, PageSection } from '@/components/AppShell';
import { api } from '@/lib/api-client';
import { FileTable, FileRow } from '@/components/FileTable';
import { Project, ProjectMembership } from '@/types';
import clsx from 'clsx';

export default function ProjectPage() {
  const params = useParams();
  const projectId = Number(params?.id);
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<'team' | 'files'>('team');

  useEffect(() => {
    const load = async () => {
      if (!projectId) return;
      const data = await api.projects.get(projectId);
      setProject(data as unknown as Project);
    };
    load();
  }, [projectId]);

  const leads = useMemo(
    () => project?.memberships?.filter((m) => m.role === 'TL' || m.role === 'PM'),
    [project?.memberships],
  );

  const files = (project?.files || []) as unknown as FileRow[];

  return (
    <AppShell>
      {!project ? (
        <div>Загрузка...</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border shadow-card p-5 bg-white/80 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-slate-500">{project.code}</div>
                <h1 className="text-2xl font-semibold">{project.name}</h1>
                <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                <p className="text-sm text-slate-500">Департамент: {project.department?.name}</p>
              </div>
              <div className="badge">{project.memberships?.length ?? 0} участников</div>
            </div>
            {leads && leads.length > 0 && (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                TL/PM: {leads.map((m) => m.user?.fullName).join(', ')}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              className={clsx('px-3 py-2 rounded-xl border', tab === 'team' ? 'bg-primary text-white border-primary' : 'border-border')}
              onClick={() => setTab('team')}
            >
              Команда
            </button>
            <button
              className={clsx('px-3 py-2 rounded-xl border', tab === 'files' ? 'bg-primary text-white border-primary' : 'border-border')}
              onClick={() => setTab('files')}
            >
              Файлы
            </button>
          </div>

          {tab === 'team' ? (
            <PageSection title="Участники">
              <div className="table-card overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Имя</th>
                      <th>Роль</th>
                      <th>Глобальная роль</th>
                      <th>Департамент</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.memberships?.map((member: ProjectMembership) => (
                      <tr key={member.id} className="hover:bg-primary/5 dark:hover:bg-white/5">
                        <td className="font-semibold">{member.user?.fullName}</td>
                        <td>{member.role}</td>
                        <td>{formatGlobalRole(member.user?.globalRole)}</td>
                        <td>{member.user?.department?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PageSection>
          ) : (
            <PageSection title="Файлы">
              {files.length === 0 ? <p className="text-sm text-slate-500">Нет файлов.</p> : <FileTable files={files} />}
            </PageSection>
          )}
        </div>
      )}
    </AppShell>
  );
}

function formatGlobalRole(role?: string | null) {
  if (!role) return '—';
  const map: Record<string, string> = {
    admin: 'Админ',
    manager: 'Менеджер',
    lead: 'Лид',
    employee: 'Сотрудник',
  };
  return map[role] ?? role;
}
