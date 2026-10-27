'use client';

import React from 'react';
import { ResearchOpening } from '@/api/openingsApi';
import Link from 'next/link';
import { Briefcase, Users, User, ArrowRight } from 'lucide-react';

interface OpeningCardProps {
  opening: ResearchOpening;
  actionHref?: string;
  actionLabel?: string;
  isFacultyOwner?: boolean;
}

export const OpeningCard: React.FC<OpeningCardProps> = ({
  opening,
  actionHref,
  actionLabel = 'View Details',
  isFacultyOwner = false,
}) => {
  const skillsList = opening.requiredSkills
    ? opening.requiredSkills.split(',').map((s) => s.trim())
    : [];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              opening.status === 'OPEN'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
            }`}
          >
            {opening.status}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
            <Users size={14} className="text-neutral-400" />
            <span>{opening.seats} {opening.seats === 1 ? 'seat' : 'seats'}</span>
          </div>
        </div>

        <h3 className="font-bold text-neutral-900 text-lg mb-1 leading-snug">{opening.title}</h3>

        {opening.facultyName && (
          <p className="text-xs text-neutral-500 mb-3 flex items-center gap-1">
            <User size={12} />
            <span>{opening.facultyName}</span>
            {opening.department && <span>• {opening.department}</span>}
          </p>
        )}

        <p className="text-sm text-neutral-600 line-clamp-3 mb-4">{opening.description}</p>

        {skillsList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {skillsList.map((skill, index) => (
              <span
                key={index}
                className="text-[11px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
        <span className="text-xs text-neutral-400">
          ID: #{opening.id}
        </span>
        {actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
          >
            <span>{actionLabel}</span>
            <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
};

export default OpeningCard;
