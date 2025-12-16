'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell, PageSection } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { FileTable, FileRow } from '@/components/FileTable';
import { useCurrentUser } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { UserCard } from '@/components/UserCard';
import { Layers3, Users, Folder } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useCurrentUser();
  const [files, setFiles] = useState<FileRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const list = await api.files.list(user.id);
      setFiles((list as unknown as FileRow[]).slice(0, 5));
    };
    load();
  }, [user?.id]);

  return (
    <AppShell>
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Мои проекты" value={String(user?.memberships?.length ?? 0)} icon={<Layers3 className="h-5 w-5" />} />
          <StatCard label="Подчиненные" value={String(user?.directReports?.length ?? 0)} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Файлы" value={String(files.length)} icon={<Folder className="h-5 w-5" />} />
        </div>

        <PageSection title="Мой профиль">
          {isLoading || !user ? (
            <div>Загрузка...</div>
          ) : (
            <UserCard user={user} />
          )}
        </PageSection>

        <PageSection title="Моя команда" action={<Link href="/org" className="text-primary text-sm">Открыть оргструктуру</Link>}>
          <div className="card-grid">
            {(user?.directReports || []).slice(0, 5).map((member) => (
              <div key={member.id} className="rounded-2xl border border-border p-3 bg-white/70 dark:bg-slate-900/70">
                <div className="font-semibold">{member.fullName}</div>
                <div className="text-sm text-slate-500">{member.jobTitle}</div>
              </div>
            ))}
            {(!user?.directReports || user.directReports.length === 0) && <p className="text-sm text-slate-500">Нет прямых отчётов.</p>}
          </div>
        </PageSection>

        <PageSection title="Мои проекты" action={<Link href="/projects" className="text-primary text-sm">Все проекты</Link>}>
          <div className="card-grid">
            {(user?.memberships || []).map((m) => (
              <Link
                key={m.project?.id}
                href={`/projects/${m.project?.id}`}
                className="rounded-2xl border border-border p-3 bg-white/70 dark:bg-slate-900/70 hover:-translate-y-0.5 transition"
              >
                <div className="text-xs uppercase text-slate-500">{m.project?.code}</div>
                <div className="text-lg font-semibold">{m.project?.name}</div>
                <div className="text-sm text-slate-500">Роль: {m.role}</div>
              </Link>
            ))}
            {(user?.memberships?.length ?? 0) === 0 && <p className="text-sm text-slate-500">Вы пока не привязаны к проектам.</p>}
          </div>
        </PageSection>

        <PageSection title="Последние файлы">
          {files.length === 0 ? <p className="text-sm text-slate-500">Нет загруженных файлов.</p> : <FileTable files={files} />}
        </PageSection>
      </div>
    </AppShell>
  );
}
