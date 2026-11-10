'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, FileText } from 'lucide-react';
import { directoryApi, type StudentDetail } from '@/api/directoryApi';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DirectoryState, DirectoryTags } from '@/components/directory/DirectoryComponents';

function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudent = useCallback(async () => {
    const studentId = Number(id);
    if (!Number.isInteger(studentId) || studentId < 1) {
      setError('This student profile link is invalid.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setStudent(await directoryApi.getStudentById(studentId));
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      setError(response?.status === 403 ? 'FORBIDDEN' : response?.data?.message ?? 'Could not load this student profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadStudent(); }, [loadStudent]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/students" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft size={16} />Student directory</Link>
      <div className="mt-6"><DirectoryState loading={loading} error={error} onRetry={() => void loadStudent()} forbiddenMessage="Student profiles are only available to faculty. This profile may also be limited to faculty whose openings the student applied to." /></div>
      {!loading && !error && student && (
        <article className="mt-6 space-y-5">
          <header className="rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white sm:p-8">
            <div className="flex items-center gap-5">
              {student.photoUrl ? <img src={student.photoUrl} alt="" className="h-20 w-20 rounded-full border-2 border-white/50 object-cover" /> : <div aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-bold">{student.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>}
              <div><p className="text-sm font-medium text-emerald-100">{student.year || 'Student researcher'}</p><h1 className="mt-1 text-3xl font-bold">{student.name}</h1></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {student.githubUrl && <a href={student.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20">GitHub<ArrowUpRight size={14} /></a>}
              {student.linkedinUrl && <a href={student.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20">LinkedIn<ArrowUpRight size={14} /></a>}
            </div>
          </header>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
            <h2 className="font-bold text-neutral-900">Skills and interests</h2>
            {student.skills && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{student.skills}</p>}
            <div className="mt-3 space-y-3"><DirectoryTags values={student.skillTags} />{student.interests?.length ? <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Interests</h3><DirectoryTags values={student.interests} /></div> : null}</div>
          </section>

          {student.projects?.length ? <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
            <h2 className="font-bold text-neutral-900">Projects</h2>
            <ul className="mt-3 divide-y divide-neutral-100">{student.projects.map((project, index) => <li key={`${project.title}-${index}`} className="py-3 first:pt-0 last:pb-0"><h3 className="text-sm font-semibold text-neutral-800">{project.title}</h3>{project.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-600">{project.description}</p>}</li>)}</ul>
          </section> : null}

          <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-bold text-neutral-900"><FileText size={18} />Uploaded papers</h2>
            {student.papers?.length ? <ul className="mt-3 divide-y divide-neutral-100">{student.papers.map((paper) => <li key={paper.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"><div><p className="text-sm font-semibold text-neutral-800">{paper.title}</p>{paper.category && <p className="mt-1 text-xs text-neutral-500">{paper.category}</p>}</div>{paper.confidenceScore != null && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">Confidence {(paper.confidenceScore * 100).toFixed(0)}%</span>}</li>)}</ul> : <p className="mt-3 text-sm text-neutral-500">No papers have been shared on this profile.</p>}
          </section>
        </article>
      )}
    </main>
  );
}

export default function StudentDetailPage() {
  return <ProtectedRoute allowedRoles={['FACULTY']}><StudentProfile /></ProtectedRoute>;
}
