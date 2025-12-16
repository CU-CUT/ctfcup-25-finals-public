'use client';

import { api } from '@/lib/api-client';
import { useCurrentUser } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { Menu } from '@headlessui/react';
import clsx from 'clsx';
import { Folder, Home, Layers3, MoonStar, Network, Phone, Mail, LifeBuoy, SunMedium } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';

const navItems = [
    { href: '/', label: 'Дашборд' },
    { href: '/org', label: 'Оргструктура' },
    { href: '/projects', label: 'Проекты' },
    { href: '/disk', label: 'Диск' },
];

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useCurrentUser();
    const { theme, toggle } = useTheme();

    const active = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

    const handleLogout = async () => {
        await api.auth.logout();
        router.replace('/login');
    };

    return (
        <div className="min-h-screen flex">
            <aside className="hidden lg:flex w-64 flex-col gap-6 p-6 border-r border-border/70 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
                <div className="flex items-center gap-3 text-xl font-semibold">
                    <div className="h-10 w-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold">MYT</div>
                    <div>
                        <div>Моя Тюрьма</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">внутренний</div>
                    </div>
                </div>
                <nav className="flex flex-col gap-2 text-sm">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                'rounded-xl px-3 py-2 transition hover:bg-primary/10 dark:hover:bg-primary/20',
                                active(item.href) && 'bg-primary/15 dark:bg-primary/30 text-primary font-semibold',
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="mt-auto space-y-2">
                    <p className="text-xs uppercase text-slate-500">Shortcuts</p>
                    <div className="flex flex-col gap-2">
                        <Link href="/" className="quick-link">
                            <Home className="h-4 w-4" /> Дашборд
                        </Link>
                        <Link href="/projects" className="quick-link">
                            <Layers3 className="h-4 w-4" /> Активные проекты
                        </Link>
                        <Link href="/disk" className="quick-link">
                            <Folder className="h-4 w-4" /> Мой диск
                        </Link>
                        <Link href="/org" className="quick-link">
                            <Network className="h-4 w-4" /> Оргграф
                        </Link>
                    </div>
                </div>
            </aside>
            <div className="flex-1 flex flex-col">
                <header className="flex items-center justify-between px-4 lg:px-8 py-4 sticky top-0 backdrop-blur z-10 bg-white/80 dark:bg-slate-900/70 border-b border-border/80">
                    <div className="flex items-center gap-3 lg:hidden">
                        <div className="h-9 w-9 rounded-2xl bg-primary text-white flex items-center justify-center font-bold">MYT</div>
                        <span className="font-semibold text-lg">MYT портал</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-3 text-sm">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    'rounded-full px-3 py-1.5 hover:bg-primary/10 transition',
                                    active(item.href) && 'bg-primary text-white shadow',
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggle}
                            className="p-2 rounded-full border border-border hover:border-primary transition"
                            title="Toggle theme"
                        >
                            {theme === 'light' ? <MoonStar className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
                        </button>
                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center gap-3 rounded-full border border-border px-3 py-1 hover:border-primary transition">
                                <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                                    {user?.fullName?.[0] ?? '?'}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <div className="text-sm font-semibold">{user?.fullName ?? 'User'}</div>
                                    <div className="text-xs text-slate-500">{user?.jobTitle ?? 'Employee'}</div>
                                </div>
                            </Menu.Button>
                            <Menu.Items className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 shadow-card border border-border p-2">
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href="/me"
                                            className={clsx('block px-3 py-2 rounded-lg', active && 'bg-primary/10 dark:bg-primary/20')}
                                        >
                                            Профиль
                                        </Link>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href="/disk"
                                            className={clsx('block px-3 py-2 rounded-lg', active && 'bg-primary/10 dark:bg-primary/20')}
                                        >
                                            Мой диск
                                        </Link>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            className={clsx('block w-full text-left px-3 py-2 rounded-lg', active && 'bg-primary/10 dark:bg-primary/20')}
                                            onClick={handleLogout}
                                        >
                                            Выйти
                                        </button>
                                    )}
                                </Menu.Item>
                            </Menu.Items>
                        </Menu>
                    </div>
                </header>
                <main className="flex-1 p-4 lg:p-8 bg-transparent">{children}</main>
                <footer className="px-4 lg:px-8 pb-6">
                    <div className="rounded-2xl border border-border/70 bg-white/80 dark:bg-slate-900/70 shadow-card p-4 lg:p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs uppercase text-slate-500">
                            <LifeBuoy className="h-4 w-4" />
                            Поддержка MYT
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-primary" />
                                <div>
                                    <div className="text-slate-500">Техподдержка</div>
                                    <div className="font-semibold">885842</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary" />
                                <div>
                                    <div className="text-slate-500">Email</div>
                                    <div className="font-semibold break-anywhere">helpdesk@myt.local</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <LifeBuoy className="h-4 w-4 text-primary" />
                                <div>
                                    <div className="text-slate-500">Дежурный канал</div>
                                    <div className="font-semibold">В будни 08:00–20:00 МСК</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export function PageSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{title}</h2>
                {action}
            </div>
            <div className="rounded-2xl border border-border/80 shadow-card bg-white/80 dark:bg-slate-900/70 p-4">{children}</div>
        </section>
    );
}
