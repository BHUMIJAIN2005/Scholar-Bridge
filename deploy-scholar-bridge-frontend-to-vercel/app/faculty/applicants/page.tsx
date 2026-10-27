'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { openingsApi, ResearchOpening, ApplicantSummary } from '@/api/openingsApi';
import { applicationsApi } from '@/api/applicationsApi';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { CategoryChip } from '@/components/CategoryChip';
import { useAuth } from '@/context/AuthContext';
import {
  Check,
  X,
  FileText,
  User,
  Mail,
  Loader2,
  AlertCircle,
  ChevronDown,
  BookOpen,
  PlusCircle,
  Calendar,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function ViewApplicantsPage() {
  const { user } = useAuth();
  const [openings, setOpenings] = useState<ResearchOpening[]>([]);
  const [selectedOpeningId, setSelectedOpeningId] = useState<number | null>(null);
  const [applicants, setApplicants] = useState<ApplicantSummary[]>([]);

  const [loadingOpenings, setLoadingOpenings] = useState(true);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const [openingsError, setOpeningsError] = useState<string | null>(null);
  const [applicantsError, setApplicantsError] = useState<string | null>(null);

  // Per-application loading state for accept/reject buttons
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Fetch faculty openings on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchOpenings = async () => {
      setLoadingOpenings(true);
      setOpeningsError(null);

      try {
        const data = await openingsApi.getAll();
        const facultyOpenings = data.filter((opening) => String(opening.facultyId) === String(user?.id));
        setOpenings(facultyOpenings);
        if (facultyOpenings.length > 0) setSelectedOpeningId(facultyOpenings[0].id);
      } catch (err: unknown) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        setOpeningsError(response?.data?.message ?? 'Failed to load your research openings. Please check the backend and retry.');
      } finally {
        setLoadingOpenings(false);
      }
    };

    fetchOpenings();
  }, [user?.id]);

  // ---------------------------------------------------------------------------
  // 2. Fetch applicants whenever selectedOpeningId changes
  // ---------------------------------------------------------------------------
  const fetchApplicants = useCallback(
    async (openingId: number) => {
      setLoadingApplicants(true);
      setApplicantsError(null);

      try {
        const data = await openingsApi.getApplicants(openingId);
        setApplicants(data);
      } catch (err: unknown) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        setApplicantsError(response?.data?.message ?? 'Failed to load applicants for this opening. Please check the backend and retry.');
      } finally {
        setLoadingApplicants(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedOpeningId !== null) {
      fetchApplicants(selectedOpeningId);
    }
  }, [selectedOpeningId, fetchApplicants]);

  // ---------------------------------------------------------------------------
  // 3. Accept / Reject handler
  // ---------------------------------------------------------------------------
  const handleUpdateStatus = async (
    applicationId: number,
    status: 'ACCEPTED' | 'REJECTED',
  ) => {
    setActionLoading((prev) => ({ ...prev, [applicationId]: true }));
    setActionError(null);

    try {
      await applicationsApi.updateStatus(applicationId, status);
      // Update local state on success
      setApplicants((prev) =>
        prev.map((a) =>
          a.applicationId === applicationId ? { ...a, status } : a,
        ),
      );
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setActionError(response?.data?.message ?? `Failed to ${status === 'ACCEPTED' ? 'accept' : 'reject'} the applicant. Please try again.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const selectedOpening = openings.find((o) => o.id === selectedOpeningId) ?? null;
  const pendingCount = applicants.filter((a) => a.status === 'PENDING').length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Student Applicants</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Review candidate applications for your openings alongside their
            auto-categorized research history.
          </p>
        </div>

        {/* ── Action error banner ── */}
        {actionError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="ml-auto text-rose-500 hover:text-rose-700"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Loading openings ── */}
        {loadingOpenings && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
            <span className="ml-3 text-sm text-neutral-500">Loading your openings…</span>
          </div>
        )}

        {/* ── Openings error ── */}
        {!loadingOpenings && openingsError && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle size={36} className="text-rose-400" />
            <p className="text-sm font-medium text-neutral-700">{openingsError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-1 text-xs text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── No openings yet ── */}
        {!loadingOpenings && !openingsError && openings.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-20 text-center">
            <BookOpen size={40} className="text-neutral-300" />
            <div>
              <p className="text-sm font-semibold text-neutral-700">
                You haven't posted any research openings yet.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Create an opening to start receiving applications from students.
              </p>
            </div>
            <Link
              href="/faculty/post-opening"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <PlusCircle size={14} />
              Post a Research Opening
            </Link>
          </div>
        )}

        {/* ── Main content ── */}
        {!loadingOpenings && !openingsError && openings.length > 0 && (
          <>
            {/* Opening selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label
                htmlFor="opening-select"
                className="text-xs font-semibold text-neutral-600 shrink-0"
              >
                Viewing applicants for:
              </label>
              <div className="relative flex-1 max-w-sm">
                <select
                  id="opening-select"
                  value={selectedOpeningId ?? ''}
                  onChange={(e) => setSelectedOpeningId(Number(e.target.value))}
                  className="w-full appearance-none rounded-lg border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-neutral-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                >
                  {openings.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
              </div>

              {/* Stats pill */}
              {!loadingApplicants && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 font-medium text-neutral-700">
                    <User size={11} />
                    {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
                  </span>
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 border border-amber-200">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Opening meta */}
            {selectedOpening && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-800">
                <span className="font-semibold">{selectedOpening.title}</span>
                {selectedOpening.department && (
                  <span className="text-indigo-600">Dept: {selectedOpening.department}</span>
                )}
                <span className="text-indigo-600">Seats: {selectedOpening.seats}</span>
                <ApplicationStatusBadge status={selectedOpening.status} />
              </div>
            )}

            {/* ── Loading applicants ── */}
            {loadingApplicants && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
                <span className="ml-2.5 text-sm text-neutral-500">
                  Fetching applicants…
                </span>
              </div>
            )}

            {/* ── Applicants error ── */}
            {!loadingApplicants && applicantsError && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertCircle size={32} className="text-rose-400" />
                <p className="text-sm font-medium text-neutral-700">{applicantsError}</p>
                <button
                  onClick={() =>
                    selectedOpeningId !== null && fetchApplicants(selectedOpeningId)
                  }
                  className="text-xs text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── Empty applicants ── */}
            {!loadingApplicants && !applicantsError && applicants.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-16 text-center">
                <User size={36} className="text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-700">
                  No applicants for this opening yet.
                </p>
                <p className="text-xs text-neutral-500">
                  Students who apply will appear here.
                </p>
              </div>
            )}

            {/* ── Applicant cards ── */}
            {!loadingApplicants && !applicantsError && applicants.length > 0 && (
              <div className="space-y-4">
                {applicants.map((app) => (
                  <div
                    key={app.applicationId}
                    className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4"
                  >
                    {/* ── Card header ── */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-neutral-100">
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                          <User size={16} className="text-neutral-400 shrink-0" />
                          <span>{app.studentName}</span>
                          <span className="text-xs font-normal text-neutral-500">
                            ({app.year})
                          </span>
                        </h3>
                        <p className="text-xs text-neutral-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="flex items-center gap-1">
                            <Mail size={11} />
                            {app.studentEmail}
                          </span>
                          <span className="text-neutral-300">•</span>
                          <span>Skills: {app.skills}</span>
                        </p>
                        {app.appliedAt && (
                          <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                            <Calendar size={10} />
                            Applied {formatDate(app.appliedAt)}
                          </p>
                        )}
                      </div>
                      <ApplicationStatusBadge status={app.status} className="shrink-0 self-start sm:self-auto" />
                    </div>

                    {/* ── Statement of Interest ── */}
                    <div>
                      <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Statement of Interest
                      </p>
                      <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100 leading-relaxed">
                        {app.statementOfInterest}
                      </p>
                    </div>

                    {/* ── Research papers ── */}
                    {app.papers && app.papers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={12} className="text-indigo-400" />
                          Prior Research Paper{app.papers.length > 1 ? 's' : ''}
                        </p>
                        {app.papers.map((paper) => (
                          <div
                            key={paper.id}
                            className="p-3.5 bg-neutral-50/70 border border-neutral-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={15} className="text-neutral-400 shrink-0" />
                              <span className="text-neutral-700 italic truncate">
                                "{paper.title}"
                              </span>
                            </div>
                            <CategoryChip
                              category={paper.category}
                              confidenceScore={paper.confidenceScore}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Actions (only for PENDING) ── */}
                    {app.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          onClick={() =>
                            handleUpdateStatus(app.applicationId, 'REJECTED')
                          }
                          disabled={actionLoading[app.applicationId]}
                          className="px-3.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading[app.applicationId] ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                          <span>Decline Applicant</span>
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateStatus(app.applicationId, 'ACCEPTED')
                          }
                          disabled={actionLoading[app.applicationId]}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading[app.applicationId] ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          <span>Accept to Research Lab</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </ProtectedRoute>
  );
}
