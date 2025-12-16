'use client';

import { useMemo, useState } from 'react';
import { AppShell, PageSection } from '@/components/AppShell';
import { useDepartments, useOrgUsers } from '@/lib/hooks';
import { OrgTree } from '@/components/OrgTree';
import { Department, User } from '@/types';
import Link from 'next/link';
import clsx from 'clsx';

export default function OrgPage() {
  const [depId, setDepId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'tree' | 'table'>('tree');

  const { data: departments } = useDepartments();
  const { data: users } = useOrgUsers({ depId, search: search || undefined });

  const filteredDeps = useMemo(() => {
    if (!departments) return [] as Department[];
    if (!depId) return departments as unknown as Department[];
    return departments.filter((d: Department) => d.id === depId || d.parentDepartmentId === depId);
  }, [departments, depId]);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Оргструктура</h1>
          <p className="text-slate-500 text-sm">Дерево департаментов и сотрудники</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('tree')}
            className={clsx('px-3 py-2 rounded-xl border', view === 'tree' ? 'bg-primary text-white border-primary' : 'border-border')}
          >
            Дерево
          </button>
          <button
            onClick={() => setView('table')}
            className={clsx('px-3 py-2 rounded-xl border', view === 'table' ? 'bg-primary text-white border-primary' : 'border-border')}
          >
            Таблица
          </button>
        </div>
      </div>

      <PageSection title="Фильтры">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-500">Департамент</label>
            <select
              className="w-full mt-1 rounded-xl border border-border bg-white/70 dark:bg-slate-900/70 px-3 py-2"
              value={depId ?? ''}
              onChange={(e) => setDepId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Все</option>
              {departments?.map((dep: Department) => (
                <option key={dep.id} value={dep.id}>
                  {dep.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-slate-500">Поиск</label>
            <input
              className="w-full mt-1 rounded-xl border border-border px-3 py-2 bg-white/70 dark:bg-slate-900/70"
              placeholder="ФИО или позиция"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </PageSection>

      {view === 'tree' ? (
        <PageSection title="Дерево">
          <OrgTree departments={(filteredDeps as Department[]) ?? []} users={(users as User[]) ?? []} />
        </PageSection>
      ) : (
        <PageSection title="Таблица">
          <div className="table-card overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Должность</th>
                  <th>Департамент</th>
                  <th>Менеджер</th>
                  <th>Проекты</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user: User) => (
                  <tr key={user.id} className="hover:bg-primary/5 dark:hover:bg-white/5">
                    <td className="font-semibold">
                      <Link href={`/disk/${user.id}`} className="hover:text-primary">
                        {user.fullName}
                      </Link>
                    </td>
                    <td>{user.jobTitle}</td>
                    <td>{user.department?.name}</td>
                    <td>{user.manager?.fullName ?? '—'}</td>
                    <td>{user.memberships?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageSection>
      )}
    </AppShell>
  );
}
