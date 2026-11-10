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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ConferenceSubmitPageInner() {
  const [donePapers, setDonePapers] = useState<PaperSubmission[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedPaperId, setSelectedPaperId] = useState<number | ''>('');
  const [selectedConferenceId, setSelectedConferenceId] = useState<number | ''>('');
  const [track, setTrack] = useState('');
  const [allowPublicPdf, setAllowPublicPdf] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const selectedPaper =
    selectedPaperId !== '' ? donePapers.find((p) => p.id === selectedPaperId) ?? null : null;
  const selectedConference =
    selectedConferenceId !== ''
      ? conferences.find((c) => c.id === selectedConferenceId) ?? null
      : null;

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
        'Could not load your papers and conferences. Please try again.';
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedPaper?.category) {
      setTrack(selectedPaper.category);
    }
  }, [selectedPaper]);

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
        allowPublicPdf,
      });
      setSubmitSuccess(true);
      setSelectedPaperId('');
      setSelectedConferenceId('');
      setTrack('');
      setAllowPublicPdf(false);
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-leaf" />
        <p className="text-sm text-ink/70">Loading papers and conferences…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 border border-rose-200 rounded-2xl bg-rose-50/70 text-center shadow-sm">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-ink mb-2">Something went wrong</h2>
        <p className="text-sm text-ink/70 mb-6">{fetchError}</p>
        <button
          onClick={fetchData}
          className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint text-forest border border-sage/40 text-xs font-semibold mb-4">
          <Send size={12} className="text-leaf" />
          Conference Submission
        </div>
        <h1 className="text-3xl font-bold text-ink mb-2 tracking-tight">
          Submit to a Conference
        </h1>
        <p className="text-ink/70 text-sm">
          Submit a paper with a suggested research area to an open conference for faculty review.
        </p>
      </div>

      {submitSuccess && (
        <div className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-sage/40 bg-mint/40">
          <CheckCircle2 size={18} className="text-leaf mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-forest">Submission successful!</p>
            <p className="text-sm text-forest/90 mt-0.5">
              Paper submitted to conference! Faculty will review your submission.
            </p>
          </div>
        </div>
      )}

      {submitError && (
        <div className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50">
          <AlertCircle size={17} className="text-rose-600 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-800">{submitError}</p>
        </div>
      )}

      {donePapers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 solid-card border-dashed border-sage/40 text-center">
          <div className="w-14 h-14 rounded-full bg-mint text-forest flex items-center justify-center mb-4">
            <BookOpen size={26} />
          </div>
          <h3 className="text-base font-semibold text-ink mb-2">
            No papers ready to submit
          </h3>
          <p className="text-sm text-ink/70 mb-6 max-w-sm">
            Share a paper first. Once we’ve suggested a research area, you can submit it to a conference.
          </p>
          <Link
            href="/student/papers"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            <FileText size={15} />
            Go to My Papers
          </Link>
        </div>
      )}

      {donePapers.length > 0 && conferences.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 solid-card border-dashed border-sage/40 text-center">
          <div className="w-14 h-14 rounded-full bg-mint text-forest flex items-center justify-center mb-4">
            <CalendarDays size={26} />
          </div>
          <h3 className="text-base font-semibold text-ink mb-2">
            No open conferences at this time
          </h3>
          <p className="text-sm text-ink/70 max-w-sm">
            There are currently no conferences accepting submissions. Check back later or contact
            your faculty for more information.
          </p>
        </div>
      )}

      {donePapers.length > 0 && conferences.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 solid-card p-6 sm:p-8"
        >
          {/* Paper selector */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-ink" htmlFor="paper-select">
              Select Paper
            </label>
            <p className="text-xs text-ink/60">Only papers with a suggested research area are shown.</p>
            <div className="relative">
              <select
                id="paper-select"
                required
                value={selectedPaperId}
                onChange={(e) =>
                  setSelectedPaperId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full appearance-none rounded-xl border border-sage/40 bg-white px-4 py-3 pr-10 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40 transition"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sage pointer-events-none"
              />
            </div>

            {selectedPaper && (
              <div className="flex items-start gap-3 mt-3 p-3 rounded-xl bg-mint/50 border border-sage/30">
                <FileText size={16} className="text-forest mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">
                    {selectedPaper.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {selectedPaper.category && (
                      <CategoryChip
                        category={selectedPaper.category}
                        confidenceScore={selectedPaper.confidenceScore}
                      />
                    )}
                    <span className="text-xs text-ink/60">
                      Uploaded {formatDate(selectedPaper.uploadedAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-sage/20" />

          {/* Conference selector */}
          <div className="space-y-2">
            <label
              className="block text-sm font-semibold text-ink"
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
                className="w-full appearance-none rounded-xl border border-sage/40 bg-white px-4 py-3 pr-10 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40 transition"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sage pointer-events-none"
              />
            </div>

            {selectedConference && (
              <div className="mt-3 p-4 rounded-xl bg-mint/30 border border-sage/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-forest shrink-0" />
                  <span className="text-xs font-semibold text-ink">{selectedConference.department}</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-amber-600 shrink-0" />
                    <span className="text-xs text-ink/70">
                      <span className="font-semibold text-ink">Deadline:</span>{' '}
                      {formatDate(selectedConference.submissionDeadline)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-forest shrink-0" />
                    <span className="text-xs text-ink/70">
                      <span className="font-semibold text-ink">Event:</span>{' '}
                      {formatDate(selectedConference.eventDate)}
                    </span>
                  </div>
                </div>
                {selectedConference.tracks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedConference.tracks.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-mint text-forest border border-sage/30"
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

          <div className="border-t border-sage/20" />

          {/* Track field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-ink" htmlFor="track-input">
              Submission Track
            </label>
            <p className="text-xs text-ink/60">
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
              className="w-full rounded-xl border border-sage/40 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40 transition"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-sage/30 bg-mint/20 p-4 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={allowPublicPdf}
              onChange={(event) => setAllowPublicPdf(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-sage text-forest focus:ring-leaf/40"
            />
            <span>
              I confirm I have permission to share this PDF and allow it to be viewed publicly if accepted.
              Leave this unchecked to keep the PDF private.
            </span>
          </label>

          {/* Submit button */}
          <button
            type="submit"
            disabled={
              isSubmitting ||
              selectedPaperId === '' ||
              selectedConferenceId === '' ||
              !track.trim()
            }
            className="btn-primary w-full py-3 px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
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

export default function ConferenceSubmitPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <ConferenceSubmitPageInner />
    </ProtectedRoute>
  );
}
