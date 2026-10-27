'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Briefcase, Building2, CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react';
import { applicationsApi, Application } from '@/api/applicationsApi';
import { openingsApi, ResearchOpening } from '@/api/openingsApi';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function OpeningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const openingId = Number(id);
  const [opening, setOpening] = useState<ResearchOpening | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [statement, setStatement] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadOpening = useCallback(async () => {
    if (!Number.isInteger(openingId) || openingId < 1) {
      setError('This opening link is invalid.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const [openingResult, applicationsResult] = await Promise.allSettled([
      openingsApi.getById(openingId),
      applicationsApi.getMyApplications(),
    ]);
    if (openingResult.status === 'rejected') {
      const response = (openingResult.reason as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not load this opening. Check the backend and try again.');
    } else {
      setOpening(openingResult.value);
      if (applicationsResult.status === 'fulfilled') {
        setHasApplied(applicationsResult.value.some((application: Application) => application.openingId === openingId));
      }
    }
    setIsLoading(false);
  }, [openingId]);

  useEffect(() => {
    void loadOpening();
  }, [loadOpening]);

  const handleApply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!opening || !statement.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await applicationsApi.apply({ openingId: opening.id, statementOfInterest: statement.trim() });
      setHasApplied(true);
      setSuccess(true);
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setSubmitError(response?.data?.message ?? 'Your application could not be submitted. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/student/openings" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowLeft size={16} /> Browse openings
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm text-neutral-500" role="status">
            <Loader2 size={20} className="animate-spin text-emerald-600" /> Loading opening...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center" role="alert">
            <AlertCircle size={28} className="text-rose-500" />
            <p className="text-sm text-neutral-700">{error}</p>
            <button onClick={loadOpening} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        ) : opening ? (
          <article className="mt-6 space-y-6">
            <header className="border-b border-neutral-200 pb-6">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${opening.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                {opening.status}
              </span>
              <h1 className="mt-3 text-3xl font-bold text-neutral-900">{opening.title}</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
                {opening.facultyName && <span className="inline-flex items-center gap-2"><Briefcase size={15} />{opening.facultyName}</span>}
                {opening.department && <span className="inline-flex items-center gap-2"><Building2 size={15} />{opening.department}</span>}
                <span className="inline-flex items-center gap-2"><Users size={15} />{opening.seats} {opening.seats === 1 ? 'seat' : 'seats'}</span>
              </div>
            </header>

            <section>
              <h2 className="text-sm font-semibold uppercase text-neutral-500">About this project</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{opening.description}</p>
            </section>

            {opening.requiredSkills && (
              <section>
                <h2 className="text-sm font-semibold uppercase text-neutral-500">Skills and experience</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {opening.requiredSkills.split(',').map((skill) => (
                    <span key={skill.trim()} className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">{skill.trim()}</span>
                  ))}
                </div>
              </section>
            )}

            <section className="border-t border-neutral-200 pt-6">
              {success ? (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700" role="status">
                  <CheckCircle2 size={18} /> Your application was submitted.
                  <Link href="/student/applications" className="underline">View applications</Link>
                </div>
              ) : hasApplied ? (
                <p className="text-sm font-medium text-neutral-700">You have already applied to this opening.</p>
              ) : opening.status !== 'OPEN' ? (
                <p className="text-sm text-neutral-600">This opening is no longer accepting applications.</p>
              ) : (
                <form onSubmit={handleApply} className="space-y-3">
                  <label htmlFor="statement" className="block text-sm font-semibold text-neutral-800">Statement of interest</label>
                  <textarea
                    id="statement"
                    required
                    minLength={20}
                    maxLength={5000}
                    rows={6}
                    value={statement}
                    onChange={(event) => setStatement(event.target.value)}
                    placeholder="Describe your relevant skills, experience, and interest in this project."
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {submitError && <p className="text-sm text-rose-700" role="alert">{submitError}</p>}
                  <button type="submit" disabled={isSubmitting || statement.trim().length < 20} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                    Submit application
                  </button>
                </form>
              )}
            </section>
          </article>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}