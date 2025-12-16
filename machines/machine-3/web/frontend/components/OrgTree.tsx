'use client';

import { Department, User } from '@/types';
import { useMemo } from 'react';

function UserChip({ user }: { user: User }) {
  return (
    <div className="px-3 py-2 rounded-xl border border-border bg-white/70 dark:bg-slate-900/60 flex items-center gap-2 shadow-sm">
      <div className="h-8 w-8 rounded-full bg-primary/80 text-white flex items-center justify-center text-sm font-semibold">
        {user.fullName[0]}
      </div>
      <div>
        <div className="text-sm font-semibold">{user.fullName}</div>
        <div className="text-xs text-slate-500">{user.jobTitle}</div>
      </div>
    </div>
  );
}

export function OrgTree({ departments, users }: { departments: Department[]; users: User[] }) {
  const tree = useMemo(() => buildTree(departments), [departments]);
  const usersByDep = useMemo(() => {
    const map: Record<number, User[]> = {};
    users.forEach((u) => {
      const depId = u.departmentId ?? u.department?.id;
      if (!depId) return;
      map[depId] = map[depId] || [];
      map[depId].push(u);
    });
    return map;
  }, [users]);

  const renderNode = (node: Department) => (
    <div key={node.id} className="border border-border rounded-2xl p-4 bg-white/80 dark:bg-slate-900/70 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-slate-500">Департамент</div>
          <div className="text-lg font-semibold">{node.name}</div>
        </div>
        <div className="badge">{usersByDep[node.id]?.length ?? 0} чел.</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {usersByDep[node.id]?.map((u) => (
          <UserChip key={u.id} user={u} />
        ))}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {node.children.map((child) => renderNode(child))}
        </div>
      )}
    </div>
  );

  return <div className="grid grid-cols-1 gap-4">{tree.map((root) => renderNode(root))}</div>;
}

function buildTree(departments: Department[]) {
  const map: Record<number, Department & { children: Department[] }> = {};
  const roots: (Department & { children: Department[] })[] = [];

  departments.forEach((dep) => {
    map[dep.id] = { ...dep, children: [] };
  });

  departments.forEach((dep) => {
    const parentId = dep.parentDepartmentId;
    if (parentId && map[parentId]) {
      map[parentId].children.push(map[dep.id]);
    } else {
      roots.push(map[dep.id]);
    }
  });

  return roots;
}
