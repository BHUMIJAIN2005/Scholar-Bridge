'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Sparkles,
  ArrowRight,
  Award,
  Users,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <main className="gradient-hero min-h-[calc(100vh-4rem)] space-y-16 py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-full glass-card text-white text-xs font-semibold shadow-xs">
          <span className="h-9 w-9 rounded-lg bg-white p-1 shadow-xs ring-1 ring-white/30">
            <Image
              src="/mits-gwalior-logo.png"
              alt="MITS Gwalior emblem"
              width={36}
              height={36}
              className="h-full w-full object-contain"
            />
          </span>
          <span className="text-left">
            <span className="block font-bold">Madhav Institute of Technology &amp; Science</span>
            <span className="mt-0.5 block text-[10px] font-medium text-mint">Gwalior · Research Collaboration Portal</span>
          </span>
          <Sparkles size={14} className="ml-1 shrink-0 text-mint" />
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Connecting Students &amp; Faculty for{' '}
          <span className="text-mint">
            Real Academic Research
          </span>
        </h1>

        <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
          ScholarBridge bridges the gap between undergraduate ambition and academic mentorship.
          Discover research opportunities, share your work, and take your ideas to academic conferences.
        </p>

        {/* CTA Buttons: Mint primary with forest text & white-outlined secondary */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {isAuthenticated && user ? (
            <Link
              href={user.role === 'STUDENT' ? '/student/dashboard' : '/faculty/dashboard'}
              className="w-full sm:w-auto px-6 py-3 rounded-[12px] bg-mint text-forest hover:bg-mint/90 font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-98"
            >
              <span>Go to Your {user.role === 'STUDENT' ? 'Student' : 'Faculty'} Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="w-full sm:w-auto px-6 py-3 rounded-[12px] bg-mint text-forest hover:bg-mint/90 font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-98"
              >
                <span>Create an Account</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-[12px] border-[1.5px] border-white text-white bg-transparent hover:bg-white/15 font-semibold text-sm shadow-xs transition flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-98"
              >
                <KeyRound size={16} />
                <span>Sign in (Student or Faculty)</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Three Glass Cards */}
      <section className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Find a mentor</h3>
              <p className="mt-1 text-sm text-white/80 leading-relaxed">
                Learn with faculty guidance, find research positions, and get direct mentorship.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Explore research</h3>
              <p className="mt-1 text-sm text-white/80 leading-relaxed">
                Discover lab openings, multidisciplinary domains, and cutting-edge projects.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner">
              <Award size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Share your work</h3>
              <p className="mt-1 text-sm text-white/80 leading-relaxed">
                Upload research papers, receive automated domain classifications, and present at conferences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Two Pillars: Student Portal vs Faculty Portal */}
      <section className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Student Pillar */}
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="inline-flex h-12 w-12 rounded-xl bg-white/20 text-white items-center justify-center mb-5">
              <BookOpen size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">For Students</h2>
            <p className="text-sm text-white/85 mb-6 leading-relaxed">
              Find faculty mentors looking for your skills, share your research, and explore opportunities to present your work.
            </p>
            <ul className="space-y-3 text-xs text-white/90 mb-8">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-mint shrink-0" />
                <span>Find opportunities that match your interests and experience</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-mint shrink-0" />
                <span>Share your research and get a suggested subject area</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-mint shrink-0" />
                <span>Track application statuses (Pending, Accepted, Rejected) in real time</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:text-white transition"
            >
              <span>Register as a Student</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Faculty Pillar */}
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="inline-flex h-12 w-12 rounded-xl bg-white/20 text-white items-center justify-center mb-5">
              <Briefcase size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">For Faculty Mentors</h2>
            <p className="text-sm text-white/85 mb-6 leading-relaxed">
              Connect with motivated student researchers, review their applications and work, and guide conference submissions.
            </p>
            <ul className="space-y-3 text-xs text-white/90 mb-8">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-mint shrink-0" />
                <span>Post research positions with required skills and seat limits</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-mint shrink-0" />
                <span>Review applicants, their statements of interest, and prior work</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-mint shrink-0" />
                <span>Evaluate conference paper submissions matching your domain</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-mint hover:text-white transition"
            >
              <span>Join as Faculty Mentor</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
