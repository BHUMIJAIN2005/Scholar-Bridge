'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { directoryApi, type DirectoryPage, type FacultyDirectoryItem } from '@/api/directoryApi';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DirectoryEmpty, DirectoryPagination, DirectorySearch, DirectoryState, FacultyCard } from '@/components/directory/DirectoryComponents';

function FacultyDirectory() {
  const [result, setResult] = useState<DirectoryPage<FacultyDirectoryItem> | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFaculty = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await directoryApi.getFaculty({
        page,
        q: search || undefined,
        acceptingStudents: accepting ? true : undefined,
      }));
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      setError(response?.status === 403 ? 'FORBIDDEN' : response?.data?.message ?? 'Could not load faculty profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accepting, page, search]);

  useEffect(() => { void loadFaculty(); }, [loadFaculty]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSearch(query.trim());
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-forest">Research community</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Faculty directory</h1>
        <p className="mt-2 text-ink/70">Explore faculty expertise, current research, and opportunities to collaborate.</p>
      </header>

      <section className="solid-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Filter faculty">
        <DirectorySearch value={query} onChange={setQuery} onSubmit={submitSearch} placeholder="Search faculty by name..." />
        <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={accepting} onChange={(event) => { setAccepting(event.target.checked); setPage(0); }} className="h-4 w-4 rounded border-sage/40 text-forest focus:ring-leaf/40" />
          Accepting students
        </label>
      </section>

      <DirectoryState loading={loading} error={error} onRetry={() => void loadFaculty()} forbiddenMessage="This directory is available to signed-in members of ScholarBridge. Please sign in with an authorized account." />
      {!loading && !error && result && (result.content.length ? (
        <>
          <p className="text-sm text-ink/60">{result.totalElements} faculty profile{result.totalElements === 1 ? '' : 's'}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.content.map((faculty) => <FacultyCard key={faculty.id} faculty={faculty} />)}</div>
          <DirectoryPagination result={result} onPageChange={setPage} />
        </>
      ) : <DirectoryEmpty>No faculty profiles match your search yet. Try changing your search or filter.</DirectoryEmpty>)}
    </main>
  );
}

export default function FacultyDirectoryPage() {
  return <ProtectedRoute allowedRoles={['STUDENT']}><FacultyDirectory /></ProtectedRoute>;
}
