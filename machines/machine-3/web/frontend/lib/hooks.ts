'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { api, ApiError } from './api-client';
import { User, Project, Department } from '@/types';

export function useCurrentUser(redirectToLogin = true) {
  const router = useRouter();
  const swr = useSWR<User>('/auth/me', async () => (await api.auth.me()) as User);

  if (redirectToLogin && swr.error && (swr.error as ApiError).status === 401) {
    router.replace('/login');
  }

  return { ...swr, user: swr.data } as const;
}

export function useOrgUsers(params?: { depId?: number; search?: string }) {
  const queryKey = `/org/users?depId=${params?.depId ?? ''}&search=${params?.search ?? ''}`;
  const swr = useSWR<User[]>(queryKey, async () => (await api.org.listUsers(params)) as User[]);
  return swr;
}

export function useProjects() {
  return useSWR<Project[]>('/org/projects', async () => (await api.org.projects()) as Project[]);
}

export function useDepartments() {
  return useSWR<Department[]>('/org/departments', async () => (await api.org.departments()) as Department[]);
}
