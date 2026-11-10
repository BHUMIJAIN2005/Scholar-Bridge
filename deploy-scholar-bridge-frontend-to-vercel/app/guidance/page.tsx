'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Compass, Award, CheckCircle2, ArrowRight } from 'lucide-react';

export default function GuidancePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex h-12 w-12 rounded-xl bg-mint text-forest items-center justify-center mb-3 border border-sage/30">
          <BookOpen size={26} />
        </div>
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">
          Undergraduate Research Guidance
        </h1>
        <p className="text-ink/70 mt-2 text-sm sm:text-base">
          A step-by-step roadmap for students at MITS DU approaching academic research, writing statements of interest, and publishing conference papers.
        </p>
      </div>

      <div className="space-y-6">
        {/* Article 1 */}
        <section className="solid-card p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2 text-forest font-bold text-xs uppercase tracking-wider">
            <Compass size={16} />
            <span>Guide 01</span>
          </div>
          <h2 className="text-xl font-bold text-ink">How to Approach Faculty for Research Openings</h2>
          <p className="text-ink/80 text-sm leading-relaxed">
            Faculty openings listed on ScholarBridge have limited seats. Before applying, review the required skills and read at least one recent publication from the faculty member. Show that you understand the problem space rather than sending generic applications.
          </p>
          <ul className="text-sm text-ink/80 space-y-2 list-disc list-inside pt-2">
            <li>Check the opening's required skills and assess your current knowledge level.</li>
            <li>Highlight real class projects, GitHub repositories, or previous papers you have written.</li>
            <li>Be honest about your weekly time availability (typically 6–10 hours/week).</li>
          </ul>
        </section>

        {/* Article 2 */}
        <section className="solid-card p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2 text-forest font-bold text-xs uppercase tracking-wider">
            <Award size={16} />
            <span>Guide 02</span>
          </div>
          <h2 className="text-xl font-bold text-ink">Writing a Winning Statement of Interest</h2>
          <p className="text-ink/80 text-sm leading-relaxed">
            When applying to a research opening, your Statement of Interest is the primary factor professors evaluate. Avoid vague statements like "I am passionate about AI". Instead, follow this 3-part structure:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3.5 bg-mist rounded-xl border border-sage/20">
              <b className="text-ink block mb-1">1. The Hook & Fit</b>
              <p className="text-ink/70">Why does this specific research problem interest you? Cite the lab's objective.</p>
            </div>
            <div className="p-3.5 bg-mist rounded-xl border border-sage/20">
              <b className="text-ink block mb-1">2. Relevant Evidence</b>
              <p className="text-ink/70">What projects, tools, or research methods have you used?</p>
            </div>
            <div className="p-3.5 bg-mist rounded-xl border border-sage/20">
              <b className="text-ink block mb-1">3. Deliverable & Commitment</b>
              <p className="text-ink/70">What concrete contribution can you make toward the upcoming conference deadline?</p>
            </div>
          </div>
        </section>

        {/* Article 3 */}
        <section className="solid-card p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2 text-forest font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 size={16} />
            <span>Guide 03</span>
          </div>
          <h2 className="text-xl font-bold text-ink">Finding the Right Research Area</h2>
          <p className="text-ink/80 text-sm leading-relaxed">
            When you share a paper in My Papers, ScholarBridge suggests a research area based on its content. Use that suggestion to help choose a conference track, and review it to make sure it fits your work.
          </p>
        </section>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/student/openings"
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
        >
          <span>Explore Open Research Positions</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </main>
  );
}
