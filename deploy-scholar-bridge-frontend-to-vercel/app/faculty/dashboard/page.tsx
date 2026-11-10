'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ProfileCompletenessCard from '@/components/ProfileCompletenessCard';
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
      setError(response?.data?.message ?? 'Could not load your dashboard. Please try again.');
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
        {/* Welcome Header with .gradient-hero band */}
        <div className="gradient-hero text-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-3">
                <Image
                  src="/mits-gwalior-logo.png"
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full bg-white p-0.5 object-contain"
                />
                <span>MITS Gwalior · Faculty Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome, {user?.name}!
              </h1>
              <p className="text-white/85 text-sm mt-1 max-w-xl">
                {user?.department ? `${user.department} • ` : ''}Manage research opportunities, review student applications and research, and guide conference submissions.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <Link
                href="/faculty/post-opening"
                className="btn-secondary border-white text-white hover:bg-white/15 px-4 py-2.5 rounded-[12px] text-sm font-semibold shadow-xs transition flex items-center gap-2"
              >
                <PlusCircle size={16} />
                <span>Post New Opening</span>
              </Link>
            </div>
          </div>
        </div>

        <ProfileCompletenessCard completeness={user?.profileCompleteness} role="FACULTY" />

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            <span className="inline-flex items-center gap-2"><AlertCircle size={16} />{error}</span>
            <button onClick={loadDashboard} className="btn-secondary px-3 py-1 text-xs inline-flex shrink-0 items-center gap-1.5 font-semibold"><RefreshCw size={14} />Retry</button>
          </div>
        )}

        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="solid-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-ink/70 uppercase tracking-wider">
                My Research Openings
              </span>
              <div className="h-8 w-8 rounded-lg bg-mint text-forest flex items-center justify-center">
                <Briefcase size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink mb-1">{isLoading ? <Loader2 size={20} className="animate-spin text-leaf" /> : `${openings.length} Openings`}</div>
            <p className="text-xs text-ink/70 mb-3">Active research lab positions posted by your department.</p>
            <Link
              href="/faculty/post-opening"
              className="text-xs font-semibold text-forest hover:text-mid-green flex items-center gap-1"
            >
              <span>Create new opening</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="solid-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-ink/70 uppercase tracking-wider">
                Pending Applicants
              </span>
              <div className="h-8 w-8 rounded-lg bg-mint text-forest flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink mb-1">{isLoading ? <Loader2 size={20} className="animate-spin text-leaf" /> : `${pendingApplicants} Applicants`}</div>
            <p className="text-xs text-ink/70 mb-3">Student candidates awaiting your accept/reject decision.</p>
            <Link
              href="/faculty/applicants"
              className="text-xs font-semibold text-forest hover:text-mid-green flex items-center gap-1"
            >
              <span>Review applicants</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="solid-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-ink/70 uppercase tracking-wider">
                Conference Track Reviews
              </span>
              <div className="h-8 w-8 rounded-lg bg-mint text-forest flex items-center justify-center">
                <Award size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink mb-1">{isLoading ? <Loader2 size={20} className="animate-spin text-leaf" /> : `${pendingSubmissions} Submissions`}</div>
            <p className="text-xs text-ink/70 mb-3">Department conference submissions for peer review.</p>
            <Link
              href="/faculty/reviews"
              className="text-xs font-semibold text-forest hover:text-mid-green flex items-center gap-1"
            >
              <span>Review submissions</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Your openings</h2>
            <Link href="/faculty/applicants" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-mid-green">Review applicants <ArrowRight size={14} /></Link>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink/70"><Loader2 size={18} className="animate-spin text-leaf" />Loading openings...</div>
          ) : openings.length === 0 ? (
            <div className="solid-card border-dashed border-sage/40 px-5 py-10 text-center text-sm text-ink/70">
              You have not posted any openings yet. <Link href="/faculty/post-opening" className="font-semibold text-forest underline hover:text-mid-green">Post an opening</Link>
            </div>
          ) : (
            <ul className="divide-y divide-sage/20 solid-card overflow-hidden">
              {openings.slice(0, 5).map((opening) => (
                <li key={opening.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-mint/40 transition">
                  <span className="min-w-0 truncate text-sm font-semibold text-ink">{opening.title}</span>
                  <span className="shrink-0 text-xs text-ink/60">{opening.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
