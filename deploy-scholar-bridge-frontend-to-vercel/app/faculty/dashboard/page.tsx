'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { openingsApi, ResearchOpening } from '@/api/openingsApi';
import { conferenceApi, Conference, ConferenceSubmission } from '@/api/conferenceApi';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Loader2,
  PlusCircle,
  RefreshCw,
  Users,
  Award,
  ShieldCheck,
} from 'lucide-react';

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const [openings, setOpenings] = useState<ResearchOpening[]>([]);
  const [pendingApplicants, setPendingApplicants] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [allOpenings, conferenceData] = await Promise.all([
        openingsApi.getAll(),
        conferenceApi.getAll(),
      ]);
      const openingData = allOpenings.filter((opening) => String(opening.facultyId) === String(user?.id));
      const [applicantsByOpening, submissionsByConference]: [Awaited<ReturnType<typeof openingsApi.getApplicants>>[], ConferenceSubmission[][]] = await Promise.all([
        Promise.all(openingData.map((opening) => openingsApi.getApplicants(opening.id))),
        Promise.all(conferenceData.map((conference: Conference) => conferenceApi.getSubmissions(conference.id))),
      ]);
      setOpenings(openingData);
      setPendingApplicants(applicantsByOpening.flat().filter((applicant) => applicant.status === 'PENDING').length);
      setPendingSubmissions(submissionsByConference.flat().filter((submission) => submission.status === 'SUBMITTED' || submission.status === 'UNDER_REVIEW').length);
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not load your faculty dashboard. Check the backend and retry.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-700/60 text-indigo-100 text-xs font-medium mb-3">
                <ShieldCheck size={14} />
                <span>Authenticated Faculty Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome, {user?.name}!
              </h1>
              <p className="text-indigo-200 text-sm mt-1 max-w-xl">
                {user?.department ? `${user.department} • ` : ''}Manage your research lab openings, review student applicants with ML paper categories, and evaluate conference submissions.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <Link
                href="/faculty/post-opening"
                className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-sm font-semibold shadow-xs transition flex items-center gap-2"
              >
                <PlusCircle size={16} />
                <span>Post New Opening</span>
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            <span className="inline-flex items-center gap-2"><AlertCircle size={16} />{error}</span>
            <button onClick={loadDashboard} className="inline-flex shrink-0 items-center gap-1.5 font-semibold"><RefreshCw size={14} />Retry</button>
          </div>
        )}

        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                My Research Openings
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Briefcase size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900 mb-1">{isLoading ? <Loader2 size={20} className="animate-spin" /> : `${openings.length} Openings`}</div>
            <p className="text-xs text-neutral-500 mb-3">Active research lab positions posted by your department.</p>
            <Link
              href="/faculty/post-opening"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Create new opening</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Pending Applicants
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900 mb-1">{isLoading ? <Loader2 size={20} className="animate-spin" /> : `${pendingApplicants} Applicants`}</div>
            <p className="text-xs text-neutral-500 mb-3">Student candidates awaiting your accept/reject decision.</p>
            <Link
              href="/faculty/applicants"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Review applicants</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Conference Track Reviews
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900 mb-1">{isLoading ? <Loader2 size={20} className="animate-spin" /> : `${pendingSubmissions} Submissions`}</div>
            <p className="text-xs text-neutral-500 mb-3">Department conference submissions for peer review.</p>
            <Link
              href="/faculty/reviews"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Review submissions</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Your openings</h2>
            <Link href="/faculty/applicants" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700">Review applicants <ArrowRight size={14} /></Link>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500"><Loader2 size={18} className="animate-spin" />Loading openings...</div>
          ) : openings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 px-5 py-10 text-center text-sm text-neutral-500">
              You have not posted any openings yet. <Link href="/faculty/post-opening" className="font-semibold text-indigo-700 underline">Post an opening</Link>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {openings.slice(0, 5).map((opening) => (
                <li key={opening.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="min-w-0 truncate text-sm font-medium text-neutral-800">{opening.title}</span>
                  <span className="shrink-0 text-xs text-neutral-500">{opening.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
