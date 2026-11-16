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
    <main className="landing-page min-h-[calc(100vh-4rem)] pb-16">
      {/* Hero Section */}
      <section className="landing-hero-section relative w-full">
        <div className="landing-hero-backdrop absolute overflow-hidden">
          <Image
            src="/hero-bg.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1280px"
            className="landing-hero-backdrop-image object-contain object-right"
          />
        </div>

        <div className="landing-hero-content relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
          {/* Hero Copy */}
          <div className="lg:col-span-7 space-y-6 z-10">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-white/45 border border-white/50 text-white backdrop-blur-md shadow-xs">
              Madhav Institute of Technology and Science -DU
            </div>

            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              Research that shapes the future of computing
            </h1>

            <p className="max-w-xl text-base font-normal leading-relaxed text-[#011023] sm:text-lg">
              We study intelligent systems, software and networks, and turn the results into technology people can use.
            </p>

            {/* CTA Buttons: Pill style matching reference design */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {isAuthenticated && user ? (
                <>
                  <Link
                    href={user.role === 'STUDENT' ? '/student/dashboard' : '/faculty/dashboard'}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#042558] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#071e3d] active:scale-98"
                  >
                    <span>Go to Your {user.role === 'STUDENT' ? 'Student' : 'Faculty'} Dashboard</span>
                    <ArrowRight size={16} />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center gap-2 rounded-full bg-[#042558] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#071e3d] active:scale-98"
                  >
                    <span>Explore our research</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 rounded-full bg-[#042558] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#071e3d] active:scale-98"
                  >
                    <KeyRound size={16} />
                    <span>Sign in (Student or Faculty)</span>
                  </Link>
                </>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Three Glass Cards */}
      <section className="landing-feature-cards relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <section className="landing-pillars-section max-w-6xl mx-auto">
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
