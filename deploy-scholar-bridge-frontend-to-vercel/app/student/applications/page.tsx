'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { applicationsApi, Application } from '@/api/applicationsApi';
import {
  Loader2,
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileSearch,
  ArrowRight,
} from 'lucide-react';

const STATEMENT_PREVIEW_LENGTH = 120;

// ─── Individual application card ──────────────────────────────────────────────
function ApplicationCard({ app }: { app: Application }) {
  const [expanded, setExpanded] = useState(false);

  const statement = app.statementOfInterest ?? '';
  const isLong = statement.length > STATEMENT_PREVIEW_LENGTH;
  const displayedStatement =
    expanded || !isLong ? statement : statement.slice(0, STATEMENT_PREVIEW_LENGTH) + '…';

  const formattedDate = app.appliedAt
    ? new Date(app.appliedAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown date';

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col gap-4 hover:border-emerald-200 hover:shadow-sm transition-all duration-200">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Briefcase size={15} className="text-emerald-600 shrink-0" />
            <h3 className="font-bold text-neutral-900 text-base leading-snug line-clamp-2">
              {app.openingTitle ?? `Opening #${app.openingId}`}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
            {app.facultyName && (
              <span className="flex items-center gap-1">
                <Building2 size={12} />
                {app.facultyName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Applied {formattedDate}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div className="shrink-0">
          <ApplicationStatusBadge status={app.status} />
        </div>
      </div>

      {/* Statement of interest */}
      {statement && (
        <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
            Statement of Interest
          </p>
          <p className="text-sm text-neutral-700 leading-relaxed">{displayedStatement}</p>
          {isLong && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors mt-1"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp size={13} />
                </>
              ) : (
                <>
                  Read more <ChevronDown size={13} />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function MyApplicationsContent() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await applicationsApi.getMyApplications();
      setApplications(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error.response?.data?.message ?? 'Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-neutral-400">
        <Loader2 size={36} className="animate-spin text-emerald-500" />
        <p className="text-sm">Loading your applications…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Research Applications</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Status of each application submitted to faculty research lab openings.
        </p>
      </div>

      {/* Backend error banner */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <p className="flex-1 text-sm">{errorMsg}</p>
          <button onClick={fetchApplications} className="shrink-0 text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!errorMsg && applications.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
          <div className="rounded-full bg-emerald-50 p-5">
            <FileSearch size={36} className="text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-neutral-800">No applications yet</h2>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
              Browse openings to apply for research positions.
            </p>
          </div>
          <Link
            href="/student/openings"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
          >
            Browse Openings <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* Application cards */}
      {applications.length > 0 && (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyApplicationsPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MyApplicationsContent />
      </main>
    </ProtectedRoute>
  );
}
