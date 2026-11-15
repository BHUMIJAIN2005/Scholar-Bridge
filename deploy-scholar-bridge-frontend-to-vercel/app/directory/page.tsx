'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  directoryApi,
  type DirectoryPage as DirectoryPageData,
  type FacultyDirectoryItem,
  type StudentDirectoryItem,
} from '@/api/directoryApi';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  DirectoryEmpty,
  DirectoryPagination,
  DirectorySearch,
  DirectoryState,
  FacultyCard,
  StudentCard,
} from '@/components/directory/DirectoryComponents';

type DirectoryTab = 'faculty' | 'students';

function tabFromUrl(): DirectoryTab {
  return new URLSearchParams(window.location.search).get('tab') === 'students'
    ? 'students'
    : 'faculty';
}

function DirectoryPageContent() {
  const router = useRouter();
  const [tab, setTab] = useState<DirectoryTab>('faculty');
  const [facultyResult, setFacultyResult] = useState<DirectoryPageData<FacultyDirectoryItem> | null>(null);
  const [studentResult, setStudentResult] = useState<DirectoryPageData<StudentDirectoryItem> | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [acceptingStudents, setAcceptingStudents] = useState(false);
  const [skill, setSkill] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const changeTab = (nextTab: DirectoryTab) => {
    setTab(nextTab);
    setPage(0);
    router.replace(nextTab === 'students' ? '/directory?tab=students' : '/directory', { scroll: false });
  };

  useEffect(() => {
    const syncTab = () => setTab(tabFromUrl());
    syncTab();
    window.addEventListener('popstate', syncTab);
    return () => window.removeEventListener('popstate', syncTab);
  }, []);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'faculty') {
        setFacultyResult(await directoryApi.getFaculty({
          page,
          q: search || undefined,
          acceptingStudents: acceptingStudents ? true : undefined,
        }));
      } else {
        setStudentResult(await directoryApi.getStudents({
          page,
          q: search || undefined,
          skill: skill.trim() || undefined,
        }));
      }
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      setError(response?.status === 403 ? 'FORBIDDEN' : response?.data?.message ?? 'Could not load directory profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [acceptingStudents, page, search, skill, tab]);

  useEffect(() => { void loadDirectory(); }, [loadDirectory]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSearch(query.trim());
  };

  const result = tab === 'faculty' ? facultyResult : studentResult;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-forest">Research community</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Directory</h1>
        <p className="mt-2 text-ink/70">Discover faculty expertise and student researchers across the community.</p>
      </header>

      <nav className="solid-card flex gap-2 p-2" aria-label="Directory type">
        {(['faculty', 'students'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeTab(item)}
            aria-pressed={tab === item}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
              tab === item ? 'bg-forest text-white' : 'text-ink/70 hover:bg-mint hover:text-forest'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      <section className={`solid-card flex flex-col gap-4 p-4 ${tab === 'faculty' ? 'sm:flex-row sm:items-center sm:justify-between' : 'space-y-4'}`} aria-label={`Filter ${tab}`}>
        <DirectorySearch
          value={query}
          onChange={setQuery}
          onSubmit={submitSearch}
          placeholder={`Search ${tab} by name...`}
        />
        {tab === 'faculty' ? (
          <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={acceptingStudents}
              onChange={(event) => { setAcceptingStudents(event.target.checked); setPage(0); }}
              className="h-4 w-4 rounded border-sage/40 text-forest focus:ring-leaf/40"
            />
            Accepting students
          </label>
        ) : (
          <label className="block max-w-md text-xs font-semibold uppercase tracking-wide text-ink/60">
            Filter by skill
            <input
              value={skill}
              onChange={(event) => { setSkill(event.target.value); setPage(0); }}
              placeholder="e.g. Python, machine learning"
              className="mt-1.5 w-full rounded-lg border border-sage/40 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-ink focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
            />
          </label>
        )}
      </section>

      <DirectoryState
        loading={loading}
        error={error}
        onRetry={() => void loadDirectory()}
        forbiddenMessage="This directory is available to signed-in members of ScholarBridge."
      />
      {!loading && !error && result && (result.content.length ? (
        <>
          <p className="text-sm text-ink/60">
            {result.totalElements} {tab === 'faculty' ? 'faculty' : 'student'} profile{result.totalElements === 1 ? '' : 's'}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tab === 'faculty'
              ? (result as DirectoryPageData<FacultyDirectoryItem>).content.map((faculty) => <FacultyCard key={faculty.id} faculty={faculty} />)
              : (result as DirectoryPageData<StudentDirectoryItem>).content.map((student) => <StudentCard key={student.id} student={student} />)}
          </div>
          <DirectoryPagination result={result} onPageChange={setPage} />
        </>
      ) : (
        <DirectoryEmpty>
          {tab === 'faculty'
            ? 'No faculty profiles match your search or filter.'
            : 'No student profiles match your search or skill filter.'}
        </DirectoryEmpty>
      ))}
    </main>
  );
}

export default function DirectoryPage() {
  return <ProtectedRoute allowedRoles={['STUDENT', 'FACULTY']}><DirectoryPageContent /></ProtectedRoute>;
}
