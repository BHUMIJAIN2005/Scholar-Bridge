'use client';

import React from 'react';
import type { RecommendedProfessor } from '@/api/studentsApi';

interface RecommendedProfessorCardProps {
  professor: RecommendedProfessor;
}

export const RecommendedProfessorCard: React.FC<RecommendedProfessorCardProps> = ({ professor }) => (
  <article className="solid-card p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-bold text-ink">{professor.name}</h3>
        {professor.department && <p className="mt-1 text-sm text-ink/70">{professor.department}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-forest">
          {professor.matchScore}% match
        </span>
        {professor.isDemo && (
          <span className="text-xs font-semibold text-amber-700">Demo data</span>
        )}
      </div>
    </div>

    <p className="mt-3 text-sm text-ink/80">{professor.whyMatched}</p>

    {professor.sharedInterests.length > 0 && (
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold text-ink/70">Shared interests</p>
        <div className="flex flex-wrap gap-1.5">
          {professor.sharedInterests.map((interest) => (
            <span key={interest} className="rounded-md border border-sage/30 bg-mint/50 px-2 py-0.5 text-xs text-forest">
              {interest}
            </span>
          ))}
        </div>
      </div>
    )}

    {professor.researchInterests.length > 0 && (
      <p className="mt-3 text-xs text-ink/70">
        Research interests: {professor.researchInterests.join(', ')}
      </p>
    )}
  </article>
);

export default RecommendedProfessorCard;
