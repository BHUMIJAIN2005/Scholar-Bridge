'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

interface ProfileCompletenessCardProps {
  completeness?: number;
  role: 'STUDENT' | 'FACULTY';
}

export default function ProfileCompletenessCard({ completeness, role }: ProfileCompletenessCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || completeness === undefined || completeness >= 40) return null;

  const isFaculty = role === 'FACULTY';

  return (
    <section className={`relative rounded-xl border p-4 sm:p-5 ${isFaculty ? 'border-indigo-200 bg-indigo-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss profile reminder"
        className="absolute right-3 top-3 rounded-md p-1 text-neutral-500 hover:bg-white/70 hover:text-neutral-800"
      >
        <X size={17} />
      </button>
      <p className={`text-sm font-bold ${isFaculty ? 'text-indigo-950' : 'text-emerald-950'}`}>Complete your profile</p>
      <p className="mt-1 pr-8 text-sm text-neutral-700">
        Your profile is {completeness}% complete. Add your details to help the research community get to know you.
      </p>
      <Link
        href="/profile/edit"
        className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${isFaculty ? 'text-indigo-700 hover:text-indigo-900' : 'text-emerald-700 hover:text-emerald-900'}`}
      >
        Complete profile <ArrowRight size={15} />
      </Link>
    </section>
  );
}
