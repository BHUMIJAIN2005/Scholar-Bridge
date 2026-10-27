'use client';

import React from 'react';
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
    <main className="space-y-16 py-10">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-xs">
          <Sparkles size={14} className="text-emerald-600" />
          <span>Department of Computer Science — MITS DU</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 max-w-4xl mx-auto leading-tight">
          Connecting Students &amp; Faculty for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
            Real Academic Research
          </span>
        </h1>

        <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          ScholarBridge bridges the gap between undergraduate ambition and academic mentorship.
          Discover open lab positions, upload research papers for AI categorization, and carry accepted work to conferences.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {isAuthenticated && user ? (
            <Link
              href={user.role === 'STUDENT' ? '/student/dashboard' : '/faculty/dashboard'}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Go to Your {user.role === 'STUDENT' ? 'Student' : 'Faculty'} Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>Create an Account</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm shadow-xs transition flex items-center justify-center gap-2"
              >
                <KeyRound size={16} />
                <span>Sign in (Student or Faculty)</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Two Pillars: Student Portal vs Faculty Portal */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Student Pillar */}
          <div className="bg-white rounded-2xl border border-emerald-200/80 p-8 shadow-sm hover:shadow-md transition relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 items-center justify-center mb-5">
              <BookOpen size={24} />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">For Students</h2>
            <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
              Find faculty labs actively seeking your specific skill set. Get your research papers auto-categorized by AI and submit to prestigious departmental tracks.
            </p>
            <ul className="space-y-3 text-xs text-neutral-700 mb-8">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Browse openings filtered by skills (Python, PyTorch, React, NLP)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Upload PDF papers and receive automated ML topic classifications</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Track application statuses (Pending, Accepted, Rejected) in real time</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>Register as a Student</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Faculty Pillar */}
          <div className="bg-white rounded-2xl border border-indigo-200/80 p-8 shadow-sm hover:shadow-md transition relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="inline-flex h-12 w-12 rounded-xl bg-indigo-100 text-indigo-700 items-center justify-center mb-5">
              <Briefcase size={24} />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">For Faculty Mentors</h2>
            <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
              Recruit motivated student researchers for your funded grants and projects. Review applicants alongside their AI-classified research history and oversee conference tracks.
            </p>
            <ul className="space-y-3 text-xs text-neutral-700 mb-8">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                <span>Post research positions with required skills and seat limits</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                <span>Review applicants, their statements of interest, and prior work</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                <span>Evaluate conference paper submissions matching your domain</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800"
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
