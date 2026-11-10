'use client';

import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, RefreshCw, Search, Users } from 'lucide-react';
import type { DirectoryPage, FacultyDirectoryItem, StudentDirectoryItem } from '@/api/directoryApi';

export function DirectorySearch({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl gap-2">
      <label htmlFor="directory-search" className="sr-only">Search directory</label>
      <div className="relative flex-1">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input id="directory-search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-neutral-300 py-2.5 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none" />
      </div>
      <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">Search</button>
    </form>
  );
}

export function DirectoryState({
  loading,
  error,
  onRetry,
  forbiddenMessage,
}: {
  loading: boolean;
  error: string;
  onRetry: () => void;
  forbiddenMessage: string;
}) {
  if (loading) {
    return <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-neutral-500" role="status"><Loader2 size={20} className="animate-spin text-emerald-600" />Loading directory...</div>;
  }
  if (!error) return null;
  const isForbidden = error === 'FORBIDDEN';
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
      <AlertCircle size={28} className="text-amber-600" />
      <p className="max-w-lg text-sm text-neutral-700">{isForbidden ? forbiddenMessage : error}</p>
      {!isForbidden && <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><RefreshCw size={15} />Retry</button>}
    </div>
  );
}

export function DirectoryTags({ values }: { values?: string[] }) {
  if (!values?.length) return null;
  return <div className="flex flex-wrap gap-2">{values.map((tag) => <span key={tag} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">{tag}</span>)}</div>;
}

function InitialsAvatar({ name, photoUrl, faculty }: { name: string; photoUrl?: string; faculty?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
  return photoUrl
    ? <img src={photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
    : <div aria-hidden="true" className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold ${faculty ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>{initials}</div>;
}

export function FacultyCard({ faculty }: { faculty: FacultyDirectoryItem }) {
  return (
    <Link href={`/faculty/${faculty.id}`} className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <InitialsAvatar name={faculty.name} photoUrl={faculty.photoUrl} faculty />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-neutral-900 group-hover:text-indigo-800">{faculty.name}</h2>
          <p className="mt-0.5 text-sm text-neutral-600">{[faculty.designation, faculty.department].filter(Boolean).join(' · ') || 'Faculty member'}</p>
        </div>
      </div>
      {faculty.bio && <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">{faculty.bio}</p>}
      <div className="mt-4"><DirectoryTags values={faculty.researchInterests} /></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <span>{faculty.acceptingStudents ? 'Accepting students' : 'Not currently accepting students'}</span>
        <span>{faculty.citationsCount ?? 0} citations · h-index {faculty.hIndex ?? 0}</span>
      </div>
    </Link>
  );
}

export function StudentCard({ student }: { student: StudentDirectoryItem }) {
  return (
    <Link href={`/students/${student.id}`} className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <InitialsAvatar name={student.name} photoUrl={student.photoUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-neutral-900 group-hover:text-emerald-800">{student.name}</h2>
          <p className="mt-0.5 text-sm text-neutral-600">{student.year || 'Student'}</p>
        </div>
      </div>
      {student.skills && <p className="mt-4 line-clamp-2 text-sm text-neutral-600">{student.skills}</p>}
      <div className="mt-4 space-y-2"><DirectoryTags values={student.skillTags} /><DirectoryTags values={student.interests} /></div>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span>{student.projects?.length ?? 0} projects</span>
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">View profile <ArrowRight size={13} /></span>
      </div>
    </Link>
  );
}

export function DirectoryPagination<T>({ result, onPageChange }: { result: DirectoryPage<T>; onPageChange: (page: number) => void }) {
  return (
    <nav aria-label="Directory pagination" className="mt-8 flex items-center justify-center gap-4">
      <button type="button" disabled={result.first} onClick={() => onPageChange(Math.max(0, result.number - 1))} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-40"><ArrowLeft size={14} />Previous</button>
      <span className="text-sm text-neutral-600">Page {result.number + 1} of {Math.max(result.totalPages, 1)}</span>
      <button type="button" disabled={result.last} onClick={() => onPageChange(result.number + 1)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-40">Next<ArrowRight size={14} /></button>
    </nav>
  );
}

export function DirectoryEmpty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center"><Users size={28} className="mx-auto text-neutral-400" /><p className="mt-3 text-sm text-neutral-600">{children}</p></div>;
}
