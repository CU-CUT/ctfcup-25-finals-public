'use client';

import { Download, Lock } from 'lucide-react';
import { api } from '@/lib/api-client';

export interface FileRow {
  id: number;
  name: string;
  mimeType: string;
  sizeBytes: number;
  accessLevel: 'personal' | 'department' | 'public';
  createdAt: string;
  path: string;
  project?: { id: number; name: string; code: string } | null;
  canDownload?: boolean;
}

function formatSize(size: number) {
  if (!size) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let value = size;
  while (value > 1024 && idx < units.length - 1) {
    value /= 1024;
    idx++;
  }
  return `${value.toFixed(1)} ${units[idx]}`;
}

export function FileTable({ files }: { files: FileRow[] }) {
  return (
    <div className="table-card overflow-hidden">
      <table>
        <thead>
          <tr>
            <th>Имя</th>
            <th>Доступ</th>
            <th>Размер</th>
            <th>Проект</th>
            <th>Дата</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id} className="hover:bg-primary/5 dark:hover:bg-white/5">
              <td className="font-semibold break-anywhere">{file.name}</td>
              <td>
                {file.accessLevel === 'public' && <span className="badge badge-success">Публичный</span>}
                {file.accessLevel === 'department' && (
                  <span className={`badge ${file.canDownload === false ? 'badge-danger' : ''}`}>
                    Департамент {file.canDownload === false ? '(нет доступа)' : '(есть доступ)'}
                  </span>
                )}
                {file.accessLevel === 'personal' && <span className="badge badge-danger">Личный (только владелец)</span>}
              </td>
              <td>{formatSize(file.sizeBytes)}</td>
              <td>{file.project?.name ?? '—'}</td>
              <td>{new Date(file.createdAt).toLocaleDateString()}</td>
              <td className="text-right">
                {file.canDownload === false ? (
                  <span className="inline-flex items-center gap-1 text-slate-500"><Lock className="h-4 w-4" /> Недоступно</span>
                ) : (
                  <a
                    href={api.files.downloadPathUrl(stripFilesPrefix(file.path))}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border hover:border-primary text-sm"
                  >
                    <Download className="h-4 w-4" /> Скачать
                  </a>
                )}
             </td>
           </tr>
         ))}
       </tbody>
     </table>
   </div>
 );
}

function stripFilesPrefix(path: string) {
  return path.replace(/^files\//, '');
}
