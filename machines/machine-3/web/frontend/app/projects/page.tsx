'use client';

import { useMemo, useState } from 'react';
import { AppShell, PageSection } from '@/components/AppShell';
import { useProjects } from '@/lib/hooks';
import { useCurrentUser } from '@/lib/hooks';
import { ProjectCard } from '@/components/ProjectCard';
import { Department } from '@/types';

export default function ProjectsPage() {
  const { data: projects } = useProjects();
  const { user } = useCurrentUser(false);
  const [department, setDepartment] = useState<string>('');
  const [onlyMine, setOnlyMine] = useState(false);

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p: any) => {
      const depOk = department ? p.department?.name === department : true;
      const mineOk = onlyMine ? p.memberships?.some((m: any) => m.userId === user?.id) : true;
      return depOk && mineOk;
    });
  }, [projects, department, onlyMine, user?.id]);

  const departments: Department[] = useMemo(() => {
    const set = new Set<string>();
    const list: Department[] = [];
    (projects || []).forEach((p: any) => {
      if (p.department && !set.has(p.department.name)) {
        set.add(p.department.name);
        list.push(p.department);
      }
    });
    return list;
  }, [projects]);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Проекты</h1>
          <p className="text-slate-500 text-sm">Карточки по системам тюрьмы: надзор, камеры, кухня, медчасть, логистика</p>
        </div>
      </div>

      <PageSection title="Фильтры">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-500">Департамент</label>
            <select
              className="w-full mt-1 rounded-xl border border-border bg-white/70 dark:bg-slate-900/70 px-3 py-2"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Все</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 mt-6">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Только мои
          </label>
        </div>
      </PageSection>

      <PageSection title="Список проектов">
        <div className="card-grid">
          {filtered.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          {filtered.length === 0 && <p className="text-sm text-slate-500">Нет проектов под фильтр.</p>}
        </div>
      </PageSection>
    </AppShell>
  );
}
