'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OpeningCard } from '@/components/OpeningCard';
import { openingsApi, ResearchOpening } from '@/api/openingsApi';
import type { RecommendedOpening } from '@/api/openingsApi';
import { AlertCircle, Loader2, RefreshCw, Search } from 'lucide-react';

export default function BrowseOpeningsPage() {
  const [search, setSearch] = useState('');
  const [openings, setOpenings] = useState<ResearchOpening[]>([]);
  const [recommendedOpenings, setRecommendedOpenings] = useState<RecommendedOpening[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOpenings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOpenings(await openingsApi.getAll());
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not load research opportunities. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOpenings();
  }, [loadOpenings]);

  const loadRecommendations = useCallback(async () => {
    setRecommendationsLoading(true);
    setRecommendationsError(null);
    try {
      setRecommendedOpenings(await openingsApi.getRecommended());
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setRecommendationsError(response?.data?.message ?? 'Could not load matched research openings. Please try again.');
    } finally {
      setRecommendationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

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
          <h1 className="text-2xl font-bold text-ink">Browse Research Openings</h1>
          <p className="text-xs text-ink/70 mt-1">
            Research openings posted by MITS DU faculty. Filter by skill or research domain.
          </p>
        </div>

        <section className="space-y-4" aria-label="Recommended research openings">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Recommended for your profile</h2>
              <p className="text-xs text-ink/70 mt-1">Ranked by semantic research relevance and stated skill overlap. Scores are not probabilities.</p>
            </div>
            {!recommendationsLoading && <button type="button" onClick={() => void loadRecommendations()} className="btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"><RefreshCw size={14} />Refresh matches</button>}
          </div>
          {recommendationsLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink/70" role="status"><Loader2 size={18} className="animate-spin text-leaf" />Finding relevant openings...</div>
          ) : recommendationsError ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              <span className="inline-flex items-center gap-2"><AlertCircle size={16} />{recommendationsError}</span>
              <button type="button" onClick={() => void loadRecommendations()} className="btn-secondary inline-flex shrink-0 items-center gap-1.5 px-3 py-1 text-xs font-semibold"><RefreshCw size={14} />Retry</button>
            </div>
          ) : recommendedOpenings.length === 0 ? (
            <div className="solid-card border-dashed border-sage/40 py-10 text-center text-sm text-ink/70">No matched openings are available yet. Complete your profile or check back when faculty post openings.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendedOpenings.map((recommendation) => (
                <article key={recommendation.opening.id} className="space-y-3">
                  <OpeningCard opening={recommendation.opening} actionHref={`/student/openings/${recommendation.opening.id}`} actionLabel="View Details & Apply" />
                  <div className="solid-card p-4 space-y-2 text-xs">
                    <p className="font-semibold text-forest">Match score {recommendation.matchScore.toFixed(1)} · research relevance {recommendation.relevanceScore.toFixed(1)}</p>
                    {recommendation.matchingReasons.length > 0 && <ul className="list-disc space-y-1 pl-4 text-ink/75">{recommendation.matchingReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
                    {recommendation.eligibilityGaps.length > 0 && <div><p className="font-semibold text-ink">Eligibility notes</p><ul className="mt-1 list-disc space-y-1 pl-4 text-ink/75">{recommendation.eligibilityGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></div>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-sage" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by skill (e.g. Python, NLP, PyTorch)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sage/40 text-sm text-ink bg-white shadow-xs focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-ink/70" role="status">
            <Loader2 size={20} className="animate-spin text-leaf" />
            Loading openings...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
            <AlertCircle size={28} className="text-rose-500" />
            <p className="text-sm text-ink/80">{error}</p>
            <button onClick={loadOpenings} className="btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2 font-semibold">
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="solid-card border-dashed border-sage/40 py-16 text-center text-sm text-ink/70">
            {search ? 'No openings match your search.' : 'There are no research openings available yet.'}
          </div>
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
