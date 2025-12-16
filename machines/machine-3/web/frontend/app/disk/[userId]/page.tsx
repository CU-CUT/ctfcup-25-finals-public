'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell, PageSection } from '@/components/AppShell';
import { api } from '@/lib/api-client';
import { FileTable, FileRow } from '@/components/FileTable';
import { UserCard } from '@/components/UserCard';
import { User } from '@/types';
import Link from 'next/link';

export default function UserDiskPage() {
  const params = useParams();
  const userId = Number(params?.userId);
  const [owner, setOwner] = useState<User | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const info = await api.org.getUser(userId);
      setOwner(info as unknown as User);
      const list = await api.files.list(userId);
      setFiles(list as unknown as FileRow[]);
    };
    load();
  }, [userId]);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Диск сотрудника</h1>
          <p className="text-slate-500 text-sm">Публичные файлы доступны к скачиванию</p>
        </div>
        <Link href="/org" className="text-primary text-sm">Вернуться к оргструктуре</Link>
      </div>

      {owner && (
        <PageSection title="Профиль">
          <UserCard user={owner} />
        </PageSection>
      )}

      <PageSection title="Файлы">
        {files.length === 0 ? <p className="text-sm text-slate-500">Нет файлов.</p> : <FileTable files={files} />}
      </PageSection>
    </AppShell>
  );
}
