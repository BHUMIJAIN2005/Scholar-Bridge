'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OpeningCard } from '@/components/OpeningCard';
import { openingsApi, ResearchOpening } from '@/api/openingsApi';
import { AlertCircle, Loader2, RefreshCw, Search } from 'lucide-react';

export default function BrowseOpeningsPage() {
  const [search, setSearch] = useState('');
  const [openings, setOpenings] = useState<ResearchOpening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOpenings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOpenings(await openingsApi.getAll());
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not load research openings. Check the backend and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOpenings();
  }, [loadOpenings]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return openings.filter((opening) => opening.status === 'OPEN' &&
      [opening.title, opening.description, opening.requiredSkills, opening.facultyName, opening.department]
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [openings, search]);

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Browse Research Openings</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Research openings posted by MITS DU faculty. Filter by skill or research domain.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by skill (e.g. Python, NLP, PyTorch)..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-xs"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-neutral-500" role="status">
            <Loader2 size={20} className="animate-spin text-emerald-600" />
            Loading openings...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
            <AlertCircle size={28} className="text-rose-500" />
            <p className="text-sm text-neutral-700">{error}</p>
            <button onClick={loadOpenings} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">
            {search ? 'No openings match your search.' : 'There are no research openings available yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((opening) => (
            <OpeningCard
              key={opening.id}
              opening={opening}
              actionHref={`/student/openings/${opening.id}`}
              actionLabel="View Details & Apply"
            />
            ))}
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
