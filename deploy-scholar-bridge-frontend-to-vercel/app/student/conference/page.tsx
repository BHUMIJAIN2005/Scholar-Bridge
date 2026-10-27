'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
  FileText,
  CalendarDays,
  Building2,
  Tag,
  ChevronDown,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { papersApi, PaperSubmission } from '@/api/papersApi';
import { conferenceApi, Conference } from '@/api/conferenceApi';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { CategoryChip } from '@/components/CategoryChip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Page component (inner — wrapped by ProtectedRoute)
// ---------------------------------------------------------------------------
function ConferenceSubmitPageInner() {
  // ── Data state ────────────────────────────────────────────────────────────
  const [donePapers, setDonePapers] = useState<PaperSubmission[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedPaperId, setSelectedPaperId] = useState<number | ''>('');
  const [selectedConferenceId, setSelectedConferenceId] = useState<number | ''>('');
  const [track, setTrack] = useState('');

  // ── Submission state ──────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedPaper =
    selectedPaperId !== '' ? donePapers.find((p) => p.id === selectedPaperId) ?? null : null;
  const selectedConference =
    selectedConferenceId !== ''
      ? conferences.find((c) => c.id === selectedConferenceId) ?? null
      : null;

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [papers, confs] = await Promise.all([
        papersApi.getMyPapers(),
        conferenceApi.getAll(),
      ]);
      setDonePapers(papers.filter((p) => p.status === 'DONE'));
      setConferences(confs);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Failed to load papers and conferences. Check the backend and try again.';
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-fill track from selected paper's category
  useEffect(() => {
    if (selectedPaper?.category) {
      setTrack(selectedPaper.category);
    }
  }, [selectedPaper]);

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPaperId === '' || selectedConferenceId === '' || !track.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await conferenceApi.submit(selectedConferenceId as number, {
        paperId: selectedPaperId as number,
        track: track.trim(),
      });
      setSubmitSuccess(true);
      // Reset form
      setSelectedPaperId('');
      setSelectedConferenceId('');
      setTrack('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      if (!axiosErr.response) {
        setSubmitError(
          'Cannot reach the server right now. Please check your connection and try again.'
        );
      } else {
        setSubmitError(
          axiosErr.response?.data?.message ?? 'Submission failed. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="text-sm text-neutral-500">Loading papers and conferences…</p>
      </div>
    );
  }

  // ── Fetch error ───────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 border border-rose-200 rounded-2xl bg-rose-50/70 text-center shadow-sm">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-neutral-600 mb-6">{fetchError}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4">
          <Send size={12} />
          Conference Submission
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2 tracking-tight">
          Submit to a Conference
        </h1>
        <p className="text-neutral-500 text-sm">
          Submit one of your categorized research papers to an open conference for faculty review.
        </p>
      </div>

      {/* Success banner */}
      {submitSuccess && (
        <div className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
          <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Submission successful!</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Paper submitted to conference! Faculty will review your submission.
            </p>
          </div>
        </div>
      )}

      {/* Submit error banner */}
      {submitError && (
        <div className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50">
          <AlertCircle size={17} className="text-rose-600 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-800">{submitError}</p>
        </div>
      )}

      {/* No done papers */}
      {donePapers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border border-dashed border-neutral-300 rounded-2xl bg-neutral-50 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <BookOpen size={26} className="text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold text-neutral-800 mb-2">
            No categorized papers available
          </h3>
          <p className="text-sm text-neutral-500 mb-6 max-w-sm">
            Only papers that have been processed and categorized (status:{' '}
            <span className="font-mono font-semibold text-emerald-700">DONE</span>) can be submitted
            to conferences. Upload and wait for categorization first.
          </p>
          <Link
            href="/student/papers"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition shadow-sm"
          >
            <FileText size={15} />
            Go to My Papers
          </Link>
        </div>
      )}

      {/* No conferences */}
      {donePapers.length > 0 && conferences.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border border-dashed border-neutral-300 rounded-2xl bg-neutral-50 text-center">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
            <CalendarDays size={26} className="text-indigo-500" />
          </div>
          <h3 className="text-base font-semibold text-neutral-800 mb-2">
            No open conferences at this time
          </h3>
          <p className="text-sm text-neutral-500 max-w-sm">
            There are currently no conferences accepting submissions. Check back later or contact
            your faculty for more information.
          </p>
        </div>
      )}

      {/* Submission form */}
      {donePapers.length > 0 && conferences.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm"
        >
          {/* Paper selector */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-800" htmlFor="paper-select">
              Select Paper
            </label>
            <p className="text-xs text-neutral-500">Only categorized (DONE) papers are shown.</p>
            <div className="relative">
              <select
                id="paper-select"
                required
                value={selectedPaperId}
                onChange={(e) =>
                  setSelectedPaperId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full appearance-none rounded-xl border border-neutral-300 bg-white px-4 py-3 pr-10 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              >
                <option value="">— Choose a paper —</option>
                {donePapers.map((paper) => (
                  <option key={paper.id} value={paper.id}>
                    {paper.title}
                    {paper.category ? ` · ${paper.category}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* Selected paper preview */}
            {selectedPaper && (
              <div className="flex items-start gap-3 mt-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <FileText size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800 leading-snug line-clamp-2">
                    {selectedPaper.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {selectedPaper.category && (
                      <CategoryChip
                        category={selectedPaper.category}
                        confidenceScore={selectedPaper.confidenceScore}
                      />
                    )}
                    <span className="text-xs text-neutral-400">
                      Uploaded {formatDate(selectedPaper.uploadedAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100" />

          {/* Conference selector */}
          <div className="space-y-2">
            <label
              className="block text-sm font-semibold text-neutral-800"
              htmlFor="conference-select"
            >
              Select Conference
            </label>
            <div className="relative">
              <select
                id="conference-select"
                required
                value={selectedConferenceId}
                onChange={(e) =>
                  setSelectedConferenceId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full appearance-none rounded-xl border border-neutral-300 bg-white px-4 py-3 pr-10 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              >
                <option value="">— Choose a conference —</option>
                {conferences.map((conf) => (
                  <option key={conf.id} value={conf.id}>
                    {conf.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* Selected conference preview */}
            {selectedConference && (
              <div className="mt-3 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-indigo-500 shrink-0" />
                  <span className="text-xs text-neutral-600">{selectedConference.department}</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-amber-500 shrink-0" />
                    <span className="text-xs text-neutral-600">
                      <span className="font-medium text-neutral-700">Deadline:</span>{' '}
                      {formatDate(selectedConference.submissionDeadline)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-emerald-500 shrink-0" />
                    <span className="text-xs text-neutral-600">
                      <span className="font-medium text-neutral-700">Event:</span>{' '}
                      {formatDate(selectedConference.eventDate)}
                    </span>
                  </div>
                </div>
                {selectedConference.tracks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedConference.tracks.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700 border border-indigo-200"
                      >
                        <Tag size={10} />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100" />

          {/* Track field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-800" htmlFor="track-input">
              Submission Track
            </label>
            <p className="text-xs text-neutral-500">
              Auto-filled from your paper's category. You may adjust it to match the conference
              track names above.
            </p>
            <input
              id="track-input"
              type="text"
              required
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              placeholder="e.g. Computer Vision"
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={
              isSubmitting ||
              selectedPaperId === '' ||
              selectedConferenceId === '' ||
              !track.trim()
            }
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send size={15} />
                Submit Paper to Conference
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export — wraps inner page with ProtectedRoute
// ---------------------------------------------------------------------------
export default function ConferenceSubmitPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <ConferenceSubmitPageInner />
    </ProtectedRoute>
  );
}
