'use client';

import { useEffect, useState } from 'react';
import { AppShell, PageSection } from '@/components/AppShell';
import { useCurrentUser } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { FileTable, FileRow } from '@/components/FileTable';
import Link from 'next/link';

export default function MyDiskPage() {
  const { user } = useCurrentUser();
  const [files, setFiles] = useState<FileRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const list = await api.files.list(user.id);
      setFiles(list as unknown as FileRow[]);
    };
    load();
  }, [user?.id]);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Мой диск</h1>
          <p className="text-slate-500 text-sm">Уровни доступа: личный, департамент, публичный (публичные доступны всем).</p>
        </div>
      </div>

      <PageSection
        title="Файлы"
        action={
          <div className="text-sm text-slate-500">
            Посмотреть диски коллег: <Link href="/org" className="text-primary">Оргструктура</Link>
          </div>
        }
      >
        {files.length === 0 ? <p className="text-sm text-slate-500">Нет файлов.</p> : <FileTable files={files} />}
      </PageSection>
    </AppShell>
  );
}
