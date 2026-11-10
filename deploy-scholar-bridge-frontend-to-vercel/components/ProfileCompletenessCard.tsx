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

  return (
    <section className="relative solid-card p-4 sm:p-5 border-sage/40 bg-white">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss profile reminder"
        className="absolute right-3 top-3 rounded-md p-1 text-ink/50 hover:bg-mint/50 hover:text-forest"
      >
        <X size={17} />
      </button>
      <p className="text-sm font-bold text-forest">Complete your profile</p>
      <p className="mt-1 pr-8 text-sm text-ink/80">
        Your profile is {completeness}% complete. Add your details to help the research community get to know you.
      </p>
      <Link
        href="/profile/edit"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:text-mid-green"
      >
        Complete profile <ArrowRight size={15} />
      </Link>
    </section>
  );
}
