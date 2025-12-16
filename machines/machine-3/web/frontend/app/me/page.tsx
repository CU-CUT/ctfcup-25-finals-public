'use client';

import { useEffect, useState } from 'react';
import { AppShell, PageSection } from '@/components/AppShell';
import { useCurrentUser } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api-client';
import { UserCard } from '@/components/UserCard';

export default function ProfilePage() {
  const { user } = useCurrentUser();
  const { theme, setTheme, toggle } = useTheme();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = (await api.settings.get()) as { theme?: 'light' | 'dark' };
        if (settings?.theme) setTheme(settings.theme);
      } catch {
        // ignore
      }
    };
    loadSettings();
  }, [setTheme]);

  const persistTheme = async (value: 'light' | 'dark') => {
    setSaving(true);
    setTheme(value);
    await api.settings.updateTheme(value);
    setSaving(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageSection title="Профиль">
          {user && <UserCard user={user} />}
          <div className="mt-4 text-sm text-slate-500 space-y-1">
            <div>Роль: {formatGlobalRole(user?.globalRole)}</div>
            <div>Менеджер: {user?.manager?.fullName ?? '—'}</div>
            <div>Проекты: {user?.memberships?.map((m) => m.project?.code).join(', ')}</div>
          </div>
        </PageSection>

        <PageSection title="Настройки темы">
          <div className="flex items-center gap-4">
            <button
              className={`px-3 py-2 rounded-xl border ${theme === 'light' ? 'bg-primary text-white border-primary' : 'border-border'}`}
              onClick={() => persistTheme('light')}
              disabled={saving}
            >
              Светлая
            </button>
            <button
              className={`px-3 py-2 rounded-xl border ${theme === 'dark' ? 'bg-primary text-white border-primary' : 'border-border'}`}
              onClick={() => persistTheme('dark')}
              disabled={saving}
            >
              Тёмная
            </button>
            <button className="px-3 py-2 rounded-xl border border-border" onClick={toggle} disabled={saving}>
              Переключить
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Настройка также сохраняется в базе (UserSettings).</p>
        </PageSection>
      </div>
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
