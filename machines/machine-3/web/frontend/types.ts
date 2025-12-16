export interface Department {
  id: number;
  name: string;
  parentDepartmentId?: number | null;
  children?: Department[];
}

export interface Project {
  id: number;
  name: string;
  code: string;
  description: string;
  department?: Department;
  memberships?: ProjectMembership[];
  files?: FileItem[];
  createdAt?: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  globalRole: 'employee' | 'lead' | 'manager' | 'admin';
  jobTitle: string;
  departmentId?: number;
  department?: Department;
  manager?: { id: number; fullName: string; jobTitle: string } | null;
  memberships?: ProjectMembership[];
  directReports?: { id: number; fullName: string; jobTitle: string }[];
}

export interface ProjectMembership {
  id: number;
  projectId: number;
  userId: number;
  role: 'DEV' | 'QA' | 'TL' | 'PM' | 'PO' | 'DEVOPS' | 'ANALYST';
  project?: Project;
  user?: User;
}

export interface FileItem {
  id: number;
  ownerId: number;
  name: string;
  mimeType: string;
  sizeBytes: number;
  accessLevel: 'personal' | 'department' | 'public';
  projectId?: number | null;
  project?: Project | null;
  createdAt: string;
  path: string;
}
