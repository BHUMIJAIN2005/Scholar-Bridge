'use client';

import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, RefreshCw, Search, Users } from 'lucide-react';
import type { DirectoryPage, FacultyDirectoryItem, StudentDirectoryItem } from '@/api/directoryApi';
import { Avatar } from '@/components/Avatar';

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
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
        <input
          id="directory-search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-sage/40 bg-white py-2.5 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
        />
      </div>
      <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>
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
    return <DirectorySkeleton />;
  }
  if (!error) return null;
  const isForbidden = error === 'FORBIDDEN';
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
      <AlertCircle size={28} className="text-amber-600" />
      <p className="max-w-lg text-sm text-ink/80">{isForbidden ? forbiddenMessage : error}</p>
      {!isForbidden && <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-mid-green"><RefreshCw size={15} />Retry</button>}
    </div>
  );
}

export function DirectorySkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading directory">
      {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="solid-card animate-pulse p-5">
        <div className="flex items-start gap-4"><div className="h-14 w-14 shrink-0 rounded-full bg-mist" /><div className="min-w-0 flex-1 space-y-2"><div className="h-4 w-3/4 rounded bg-mist" /><div className="h-3 w-1/2 rounded bg-mist" /></div></div>
        <div className="mt-4 h-3 w-full rounded bg-mist" /><div className="mt-2 h-3 w-5/6 rounded bg-mist" /><div className="mt-4 h-3 w-2/5 rounded bg-mist" />
      </div>)}
    </div>
  );
}

export function ProfileSkeleton() {
  return <div className="solid-card animate-pulse overflow-hidden" role="status" aria-label="Loading profile"><div className="h-32 bg-mist" /><div className="space-y-5 p-6 sm:p-8"><div className="-mt-14 h-28 w-28 rounded-full border-4 border-white bg-sage/30" /><div className="space-y-3"><div className="h-8 w-2/5 rounded bg-mist" /><div className="h-4 w-1/4 rounded bg-mist" /><div className="h-3 w-3/5 rounded bg-mist" /></div><div className="grid gap-4 md:grid-cols-3"><div className="h-20 rounded bg-mist" /><div className="h-20 rounded bg-mist" /><div className="h-20 rounded bg-mist" /></div><div className="h-48 rounded bg-mist" /></div></div>;
}

export function DirectoryTags({ values }: { values?: string[] }) {
  if (!values?.length) return null;
  return <div className="flex flex-wrap gap-2">{values.map((tag) => <span key={tag} className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-forest border border-sage/30">{tag}</span>)}</div>;
}

export function FacultyCard({ faculty }: { faculty: FacultyDirectoryItem }) {
  return (
    <Link href={`/faculty/${faculty.id}`} className="group relative solid-card p-5 block">
      <div className="flex items-start gap-4">
        <Avatar name={faculty.name} photoUrl={faculty.photoUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-ink group-hover:text-forest">{faculty.name}</h2>
          <p className="mt-0.5 text-sm text-ink/70">{[faculty.designation, faculty.department].filter(Boolean).join(' · ') || 'Faculty member'}</p>
        </div>
      </div>
      {faculty.bio && <p className="mt-4 line-clamp-3 text-sm leading-6 text-ink/80">{faculty.bio}</p>}
      <div className="mt-4"><DirectoryTags values={faculty.researchInterests} /></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/70">
        <span>{faculty.acceptingStudents ? 'Accepting students' : 'Not currently accepting students'}</span>
        <span>{faculty.citationsCount ?? 0} citations · h-index {faculty.hIndex ?? 0}</span>
      </div>
      <div className="pointer-events-none absolute left-4 right-4 top-full z-20 mt-2 hidden rounded-xl border border-sage/30 bg-white p-4 text-left shadow-xl md:block md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-forest">Profile preview</p>
        <p className="mt-2 line-clamp-3 text-sm leading-5 text-ink/80">{faculty.bio || 'No biography has been added yet.'}</p>
        {faculty.researchInterests?.length ? <div className="mt-3"><p className="text-xs font-semibold text-ink/60">Interests</p><p className="mt-1 line-clamp-2 text-xs text-ink/70">{faculty.researchInterests.join(' · ')}</p></div> : null}
      </div>
    </Link>
  );
}

export function StudentCard({ student }: { student: StudentDirectoryItem }) {
  return (
    <Link href={`/students/${student.id}`} className="group relative solid-card p-5 block">
      <div className="flex items-start gap-4">
        <Avatar name={student.name} photoUrl={student.photoUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-ink group-hover:text-forest">{student.name}</h2>
          <p className="mt-0.5 text-sm text-ink/70">{student.year || 'Student'}</p>
        </div>
      </div>
      {student.skills && <p className="mt-4 line-clamp-2 text-sm text-ink/80">{student.skills}</p>}
      <div className="mt-4 space-y-2"><DirectoryTags values={student.skillTags} /><DirectoryTags values={student.interests} /></div>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-ink/70">
        <span>{student.projects?.length ?? 0} projects</span>
        <span className="inline-flex items-center gap-1 font-semibold text-forest group-hover:text-mid-green">View profile <ArrowRight size={13} /></span>
      </div>
      <div className="pointer-events-none absolute left-4 right-4 top-full z-20 mt-2 hidden rounded-xl border border-sage/30 bg-white p-4 text-left shadow-xl md:block md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-forest">Profile preview</p>
        <p className="mt-2 line-clamp-3 text-sm leading-5 text-ink/80">{student.skills || 'No profile summary has been added yet.'}</p>
        {student.interests?.length ? <div className="mt-3"><p className="text-xs font-semibold text-ink/60">Interests</p><p className="mt-1 line-clamp-2 text-xs text-ink/70">{student.interests.join(' · ')}</p></div> : null}
      </div>
    </Link>
  );
}

export function DirectoryPagination<T>({ result, onPageChange }: { result: DirectoryPage<T>; onPageChange: (page: number) => void }) {
  return (
    <nav aria-label="Directory pagination" className="mt-8 flex items-center justify-center gap-4">
      <button type="button" disabled={result.first} onClick={() => onPageChange(Math.max(0, result.number - 1))} className="btn-secondary inline-flex items-center gap-1 px-4 py-2 text-sm disabled:opacity-40"><ArrowLeft size={14} />Previous</button>
      <span className="text-sm text-ink/70">Page {result.number + 1} of {Math.max(result.totalPages, 1)}</span>
      <button type="button" disabled={result.last} onClick={() => onPageChange(result.number + 1)} className="btn-secondary inline-flex items-center gap-1 px-4 py-2 text-sm disabled:opacity-40">Next<ArrowRight size={14} /></button>
    </nav>
  );
}

export function DirectoryEmpty({ children }: { children: ReactNode }) {
  return <div className="solid-card border-dashed border-sage/40 px-6 py-14 text-center"><Users size={28} className="mx-auto text-sage" /><p className="mt-3 text-sm text-ink/70">{children}</p></div>;
}
