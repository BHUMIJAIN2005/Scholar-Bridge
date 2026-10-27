'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Award, FileText, Loader2, RefreshCw, User } from 'lucide-react';
import { CategoryChip } from '@/components/CategoryChip';
import { conferenceApi, Conference, ConferenceSubmission } from '@/api/conferenceApi';

interface ShowcasePaper extends ConferenceSubmission {
  conferenceName: string;
}

export default function ShowcasePage() {
  const [papers, setPapers] = useState<ShowcasePaper[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedConference, setSelectedConference] = useState('ALL');
  const [selectedTrack, setSelectedTrack] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShowcase = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const conferenceList = await conferenceApi.getAll();
      const results = await Promise.all(conferenceList.map(async (conference: Conference) => ({
        conferenceName: conference.name,
        submissions: await conferenceApi.getShowcase(conference.id),
      })));
      setConferences(conferenceList);
      setPapers(results.flatMap(({ conferenceName, submissions }) => submissions
        .filter((submission) => submission.status === 'ACCEPTED')
        .map((submission) => ({ ...submission, conferenceName })),
      ));
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not load the public showcase. Check the backend and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShowcase();
  }, [loadShowcase]);

  const conferencePapers = useMemo(() => selectedConference === 'ALL'
    ? papers
    : papers.filter((paper) => String(paper.conferenceId) === selectedConference), [papers, selectedConference]);
  const tracks = useMemo(() => Array.from(new Set(conferencePapers.map((paper) => paper.track))).sort(), [conferencePapers]);
  const filteredPapers = conferencePapers.filter((paper) => selectedTrack === 'ALL' || paper.track === selectedTrack);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex h-12 w-12 rounded-xl bg-amber-100 text-amber-700 items-center justify-center mb-3">
          <Award size={26} />
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
          Conference Research Showcase
        </h1>
        <p className="text-neutral-500 mt-2 text-sm sm:text-base">
          Public gallery of accepted undergraduate and faculty research papers presented at departmental conferences.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3">
        {conferences.length > 1 && (
          <label className="sr-only" htmlFor="conference-filter">Filter by conference</label>
        )}
        {conferences.length > 1 && (
          <select id="conference-filter" value={selectedConference} onChange={(event) => { setSelectedConference(event.target.value); setSelectedTrack('ALL'); }} className="max-w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
            <option value="ALL">All conferences</option>
            {conferences.map((conference) => <option key={conference.id} value={conference.id}>{conference.name}</option>)}
          </select>
        )}
        <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
          {['ALL', ...tracks].map((track) => (
          <button
            key={track}
            onClick={() => setSelectedTrack(track)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              selectedTrack === track
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {track}
          </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-sm text-neutral-500" role="status">
          <Loader2 size={20} className="animate-spin text-emerald-600" /> Loading accepted papers...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
          <AlertCircle size={28} className="text-rose-500" />
          <p className="text-sm text-neutral-700">{error}</p>
          <button onClick={loadShowcase} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><RefreshCw size={15} /> Retry</button>
        </div>
      ) : filteredPapers.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-500">No accepted papers are available for this selection yet.</p>
      ) : <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPapers.map((paper) => (
          <div
            key={paper.id}
            className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {paper.track}
                </span>
                <span className="text-xs text-neutral-400">{paper.acceptedAt ? new Date(paper.acceptedAt).toLocaleDateString() : paper.conferenceName}</span>
              </div>

              <h2 className="text-lg font-bold text-neutral-900 mb-2 leading-snug">
                  {paper.paperTitle ?? `Paper #${paper.paperId}`}
              </h2>

              <p className="text-xs text-neutral-600 mb-4 flex items-center gap-1.5">
                <User size={13} className="text-neutral-400" />
                <span>{paper.studentName ?? 'Student author'}</span>
              </p>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              {paper.category && <CategoryChip category={paper.category} confidenceScore={paper.confidenceScore} />}
            </div>
          </div>
        ))}
      </div>}

      <div className="p-6 rounded-2xl bg-neutral-100 text-center text-xs text-neutral-600">
        <p>
          Students with accepted papers can submit directly through the{' '}
          <Link href="/login" className="font-semibold text-emerald-700 underline">
            Student Portal
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
