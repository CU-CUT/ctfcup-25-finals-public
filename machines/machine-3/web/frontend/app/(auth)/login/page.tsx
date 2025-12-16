'use client';

import { api, ApiError } from '@/lib/api-client';
import { useTheme } from '@/lib/theme';
import { MoonStar, SunMedium } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
    const router = useRouter();
    const { theme, toggle } = useTheme();
    const [email, setEmail] = useState('warden@myt.local');
    const [password, setPassword] = useState('mytpass123');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.auth.login({ email, password });
            router.replace('/');
        } catch (e) {
            const err = e as ApiError;
            setError(err.message || 'Не удалось войти');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="absolute top-4 right-4">
                <button
                    onClick={toggle}
                    className="p-2 rounded-full border border-border hover:border-primary transition"
                    title="Toggle theme"
                >
                    {theme === 'light' ? <MoonStar className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
                </button>
            </div>
            <div className="max-w-md w-full rounded-3xl shadow-card border border-border bg-white/90 dark:bg-slate-900/80 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl">myt</div>
                    <div>
                        <div className="text-lg font-semibold">Вход в MYT</div>
                        <div className="text-sm text-slate-500">Внутренний портал</div>
                    </div>
                </div>
                <form className="space-y-4" onSubmit={onSubmit}>
                    <div>
                        <label className="text-sm text-slate-600">Email</label>
                        <input
                            type="email"
                            className="w-full mt-1 rounded-xl border border-border px-3 py-2 bg-white/60 dark:bg-slate-800 focus:border-primary outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-600">Пароль</label>
                        <input
                            type="password"
                            className="w-full mt-1 rounded-xl border border-border px-3 py-2 bg-white/60 dark:bg-slate-800 focus:border-primary outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <div className="text-sm text-red-500">{error}</div>}
                    <button
                        type="submit"
                        className="w-full rounded-xl bg-primary text-white py-3 font-semibold hover:-translate-y-0.5 transition transform"
                        disabled={loading}
                    >
                        {loading ? 'Входим...' : 'Войти'}
                    </button>
                </form>
                <p className="mt-4 text-xs text-slate-500">У вас есть только один шанс войти… Не подведите свою команду.</p>
            </div>
        </div>
    );
}
