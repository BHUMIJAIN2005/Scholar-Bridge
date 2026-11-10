'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Award, Download, FileText, Loader2, RefreshCw, Search, User } from 'lucide-react';
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
  const [searchText, setSearchText] = useState('');
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
      setError(response?.data?.message ?? 'Could not load the showcase. Please try again.');
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
  const filteredPapers = conferencePapers.filter((paper) => {
    const matchesTrack = selectedTrack === 'ALL' || paper.track === selectedTrack;
    const normalizedSearch = searchText.trim().toLocaleLowerCase();
    const title = paper.paperTitle?.toLocaleLowerCase() ?? '';
    const author = paper.studentName?.toLocaleLowerCase() ?? '';
    const matchesSearch = !normalizedSearch
      || title.includes(normalizedSearch)
      || author.includes(normalizedSearch);
    return matchesTrack && matchesSearch;
  });

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex h-12 w-12 rounded-xl bg-mint text-forest items-center justify-center mb-3 border border-sage/30">
          <Award size={26} />
        </div>
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">
          Conference Research Showcase
        </h1>
        <p className="text-ink/70 mt-2 text-sm sm:text-base">
          Public gallery of accepted undergraduate and faculty research papers presented at departmental conferences.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <label className="sr-only" htmlFor="showcase-search">Search papers by title or author</label>
          <input
            id="showcase-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by paper title or student author"
            className="w-full rounded-lg border border-sage/40 bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/40 focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
          />
        </div>
        {conferences.length > 1 && (
          <label className="sr-only" htmlFor="conference-filter">Filter by conference</label>
        )}
        {conferences.length > 1 && (
          <select id="conference-filter" value={selectedConference} onChange={(event) => { setSelectedConference(event.target.value); setSelectedTrack('ALL'); }} className="max-w-full rounded-lg border border-sage/40 bg-white px-3 py-2 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40">
            <option value="ALL">All conferences</option>
            {conferences.map((conference) => <option key={conference.id} value={conference.id}>{conference.name}</option>)}
          </select>
        )}
        <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
          {['ALL', ...tracks].map((track) => (
          <button
            key={track}
            onClick={() => setSelectedTrack(track)}
            className={`px-3.5 py-1 text-xs font-semibold rounded-full transition ${
              selectedTrack === track
                ? 'btn-primary'
                : 'btn-secondary'
            }`}
          >
            {track}
          </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-sm text-ink/70" role="status">
          <Loader2 size={20} className="animate-spin text-forest" /> Loading accepted papers...
        </div>
      ) : error ? (
        <div className="solid-card flex flex-col items-center gap-3 py-16 text-center" role="alert">
          <AlertCircle size={28} className="text-rose-500" />
          <p className="text-sm text-ink/80">{error}</p>
          <button onClick={loadShowcase} className="btn-secondary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"><RefreshCw size={15} /> Retry</button>
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="solid-card border-dashed border-sage/40 py-16 text-center text-sm text-ink/70">
          {papers.length === 0
            ? 'Accepted research papers will appear here once they are approved for the showcase.'
            : 'No papers match your search and filters. Try changing or clearing them.'}
        </div>
      ) : <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPapers.map((paper) => (
          <div
            key={paper.id}
            className="solid-card p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-forest bg-mint px-2.5 py-0.5 rounded-full border border-sage/30">
                  {paper.track}
                </span>
                <span className="text-xs text-ink/60">{paper.conferenceName}</span>
              </div>

              <h2 className="text-lg font-bold text-ink mb-2 leading-snug">
                  {paper.paperTitle ?? `Paper #${paper.paperId}`}
              </h2>

              <p className="text-xs text-ink/70 mb-4 flex items-center gap-1.5">
                <User size={13} className="text-leaf" />
                <span>{paper.studentName ?? 'Student author'}</span>
              </p>
              {paper.abstractText && (
                <p className="mb-4 text-sm leading-relaxed text-ink/80">{paper.abstractText}</p>
              )}
            </div>

            <div className="pt-4 border-t border-forest/10 flex items-center justify-between">
              {paper.category && <CategoryChip category={paper.category} confidenceScore={paper.confidenceScore} />}
              {paper.publicPdfUrl && (
                <a
                  href={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${paper.publicPdfUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-mid-green"
                >
                  <Download size={14} /> View PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>}

      <div className="solid-card p-6 text-center text-xs text-ink/70">
        <p>
          Students with accepted papers can submit directly through the{' '}
          <Link href="/login" className="font-semibold text-forest underline">
            Student Portal
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
