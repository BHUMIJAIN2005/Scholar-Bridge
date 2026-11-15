'use client';

import { GuidanceContent } from '@/app/guidance/page';
import { BlogFeed } from '@/app/blog/page';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';

export default function InsightsPage() {
  const [section, setSection] = useState<'guidance' | 'blog'>('guidance');

  return (
    <div>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-lg font-bold text-ink">Insights</h1>
        <label className="flex items-center gap-2 text-sm font-semibold text-forest">
          <span className="sr-only">Choose an insights section</span>
          <select
            value={section}
            onChange={(event) => setSection(event.target.value as 'guidance' | 'blog')}
            className="rounded-lg border border-sage/40 bg-white px-3 py-2 text-sm font-semibold text-forest shadow-sm outline-none transition focus:border-leaf focus:ring-3 focus:ring-leaf/30"
          >
            <option value="guidance">Research Guidance</option>
            <option value="blog">Blog</option>
          </select>
        </label>
      </div>

      {section === 'guidance' ? (
        <GuidanceContent />
      ) : (
        <ProtectedRoute>
          <BlogFeed />
        </ProtectedRoute>
      )}
    </div>
  );
}
