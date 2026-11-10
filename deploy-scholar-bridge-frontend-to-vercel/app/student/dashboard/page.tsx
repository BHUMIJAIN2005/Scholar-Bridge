'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ProfileCompletenessCard from '@/components/ProfileCompletenessCard';
import { applicationsApi, Application } from '@/api/applicationsApi';
import { openingsApi, ResearchOpening } from '@/api/openingsApi';
import { papersApi, PaperSubmission } from '@/api/papersApi';
import {
  AlertCircle,
  Briefcase,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [papers, setPapers] = useState<PaperSubmission[]>([]);
  const [openings, setOpenings] = useState<ResearchOpening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [applicationData, paperData, openingData] = await Promise.all([
        applicationsApi.getMyApplications(),
        papersApi.getMyPapers(),
        openingsApi.getAll(),
      ]);
      setApplications(applicationData);
      setPapers(paperData);
      setOpenings(openingData.filter((opening) => opening.status === 'OPEN'));
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not load your dashboard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const activeApplications = applications.filter((application) => application.status !== 'REJECTED').length;
  const recentActivity = [
    ...applications.map((application) => ({
      key: `application-${application.id}`,
      label: application.openingTitle ?? `Application for opening #${application.openingId}`,
      status: application.status,
      date: application.appliedAt,
      href: '/student/applications',
      icon: Briefcase,
    })),
    ...papers.map((paper) => ({
      key: `paper-${paper.id}`,
      label: paper.title,
      status: paper.status,
      date: paper.uploadedAt,
      href: '/student/papers',
      icon: FileText,
    })),
  ].sort((first, second) => new Date(second.date ?? 0).getTime() - new Date(first.date ?? 0).getTime()).slice(0, 5);

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
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
                <span>MITS Gwalior · Student Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome, {user?.name}!
              </h1>
              <p className="text-white/85 text-sm mt-1 max-w-xl">
                {user?.year ? `${user.year} • ` : ''}Explore opportunities, share your research, and submit your work to conferences.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <Link
                href="/student/openings"
                className="btn-secondary border-white text-white hover:bg-white/15 px-4 py-2.5 rounded-[12px] text-sm font-semibold shadow-xs transition flex items-center gap-2"
              >
                <span>Browse Openings</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        <ProfileCompletenessCard completeness={user?.profileCompleteness} role="STUDENT" />

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
                My Applications
              </span>
              <div className="h-8 w-8 rounded-lg bg-mint text-forest flex items-center justify-center">
                <Briefcase size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink mb-1">{isLoading ? <Loader2 size={20} className="animate-spin text-leaf" /> : `${activeApplications} Active`}</div>
            <p className="text-xs text-ink/70 mb-3">Applications submitted to faculty research openings.</p>
            <Link
              href="/student/applications"
              className="text-xs font-semibold text-forest hover:text-mid-green flex items-center gap-1"
            >
              <span>View applications</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="solid-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-ink/70 uppercase tracking-wider">
                My Research Papers
              </span>
              <div className="h-8 w-8 rounded-lg bg-mint text-forest flex items-center justify-center">
                <FileText size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink mb-1">{isLoading ? <Loader2 size={20} className="animate-spin text-leaf" /> : `${papers.length} Papers`}</div>
            <p className="text-xs text-ink/70 mb-3">Your papers and suggested research areas.</p>
            <Link
              href="/student/papers"
              className="text-xs font-semibold text-forest hover:text-mid-green flex items-center gap-1"
            >
              <span>Upload new paper</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="solid-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-ink/70 uppercase tracking-wider">
                Matched Openings
              </span>
              <div className="h-8 w-8 rounded-lg bg-mint text-forest flex items-center justify-center">
                <BookOpen size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink mb-1">{isLoading ? <Loader2 size={20} className="animate-spin text-leaf" /> : `${openings.length} Open`}</div>
            <p className="text-xs text-ink/70 mb-3">Research openings currently accepting applications.</p>
            <Link
              href="/student/openings"
              className="text-xs font-semibold text-forest hover:text-mid-green flex items-center gap-1"
            >
              <span>Find openings</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Recent activity</h2>
            <Link href="/student/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-mid-green">Applications <ArrowRight size={14} /></Link>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink/70"><Loader2 size={18} className="animate-spin text-leaf" />Loading activity...</div>
          ) : recentActivity.length === 0 ? (
            <div className="solid-card border-dashed border-sage/40 px-5 py-10 text-center text-sm text-ink/70">Your applications and uploaded papers will appear here.</div>
          ) : (
            <ul className="divide-y divide-sage/20 solid-card overflow-hidden">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return <li key={activity.key}><Link href={activity.href} className="flex items-center gap-3 px-4 py-3 hover:bg-mint/40 transition">
                  <Icon size={17} className="shrink-0 text-forest" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{activity.label}</span>
                  <span className="shrink-0 text-xs text-ink/60">{activity.status}</span>
                </Link></li>;
              })}
            </ul>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
