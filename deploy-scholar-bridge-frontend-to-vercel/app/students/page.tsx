'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { directoryApi, type DirectoryPage, type StudentDirectoryItem } from '@/api/directoryApi';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DirectoryEmpty, DirectoryPagination, DirectorySearch, DirectoryState, StudentCard } from '@/components/directory/DirectoryComponents';

function StudentDirectory() {
  const [result, setResult] = useState<DirectoryPage<StudentDirectoryItem> | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await directoryApi.getStudents({ page, q: search || undefined, skill: skill.trim() || undefined }));
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      setError(response?.status === 403 ? 'FORBIDDEN' : response?.data?.message ?? 'Could not load student profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, skill]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSearch(query.trim());
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-forest">Research community</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Student directory</h1>
        <p className="mt-2 text-ink/70">Discover student researchers, their skills, interests, and projects.</p>
      </header>

      <section className="solid-card space-y-4 p-4" aria-label="Filter students">
        <DirectorySearch value={query} onChange={setQuery} onSubmit={submitSearch} placeholder="Search students by name..." />
        <label className="block max-w-md text-xs font-semibold uppercase tracking-wide text-ink/60">
          Filter by skill
          <input value={skill} onChange={(event) => { setSkill(event.target.value); setPage(0); }} placeholder="e.g. Python, machine learning" className="mt-1.5 w-full rounded-lg border border-sage/40 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-ink focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40" />
        </label>
      </section>

      <DirectoryState loading={loading} error={error} onRetry={() => void loadStudents()} forbiddenMessage="The student directory is for faculty members. Sign in with a faculty account to browse eligible student profiles." />
      {!loading && !error && result && (result.content.length ? (
        <>
          <p className="text-sm text-ink/60">{result.totalElements} student profile{result.totalElements === 1 ? '' : 's'}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.content.map((student) => <StudentCard key={student.id} student={student} />)}</div>
          <DirectoryPagination result={result} onPageChange={setPage} />
        </>
      ) : <DirectoryEmpty>No student profiles match your search or skill filter.</DirectoryEmpty>)}
    </main>
  );
}

export default function StudentDirectoryPage() {
  return <ProtectedRoute allowedRoles={['FACULTY']}><StudentDirectory /></ProtectedRoute>;
}
