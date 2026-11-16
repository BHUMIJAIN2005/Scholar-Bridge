
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';

import { CategoryChip } from '@/components/CategoryChip';
import { conferenceApi, Conference, ConferenceSubmission } from '@/api/conferenceApi';
import { useAuth } from '@/context/AuthContext';

interface ShowcasePaper extends ConferenceSubmission {
  conferenceName: string;
}

export default function ShowcasePage() {
  const { user, isFaculty, isLoading: authLoading } = useAuth();

  const [papers, setPapers] = useState<ShowcasePaper[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedConference, setSelectedConference] = useState('ALL');
  const [selectedTrack, setSelectedTrack] = useState('ALL');
  const [searchText, setSearchText] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const [conferenceName, setConferenceName] = useState('');
  const [department, setDepartment] = useState(user?.department ?? 'Computer Science and Design');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [trackInput, setTrackInput] = useState('');
  const [tracks, setTracks] = useState<string[]>([]);

  useEffect(() => {
    if (user?.department) {
      setDepartment(user.department);
    }
  }, [user?.department]);

  const loadShowcase = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const conferenceList = await conferenceApi.getAll();

      const results = await Promise.all(
        conferenceList.map(async (conference: Conference) => ({
          conferenceName: conference.name,
          submissions: await conferenceApi.getShowcase(conference.id),
        }))
      );

      setConferences(conferenceList);

      setPapers(
        results.flatMap(({ conferenceName, submissions }) =>
          submissions
            .filter((submission) => submission.status === 'ACCEPTED')
            .map((submission) => ({
              ...submission,
              conferenceName,
            }))
        )
      );
    } catch (err) {
      const response = (err as {
        response?: { data?: { message?: string } };
      }).response;

      setError(
        response?.data?.message ??
          'Could not load the showcase. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShowcase();
  }, [loadShowcase]);

  const upcomingConferences = useMemo(() => {
    const now = Date.now();

    return conferences
      .filter((conference) => new Date(conference.eventDate).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.eventDate).getTime() -
          new Date(b.eventDate).getTime()
      );
  }, [conferences]);

  const conferencePapers = useMemo(
    () =>
      selectedConference === 'ALL'
        ? papers
        : papers.filter(
            (paper) => String(paper.conferenceId) === selectedConference
          ),
    [papers, selectedConference]
  );

  const availableTracks = useMemo(
    () =>
      Array.from(
        new Set(conferencePapers.map((paper) => paper.track))
      ).sort(),
    [conferencePapers]
  );

  const filteredPapers = conferencePapers.filter((paper) => {
    const matchesTrack =
      selectedTrack === 'ALL' || paper.track === selectedTrack;

    const normalizedSearch = searchText.trim().toLocaleLowerCase();
    const title = paper.paperTitle?.toLocaleLowerCase() ?? '';
    const author = paper.studentName?.toLocaleLowerCase() ?? '';

    const matchesSearch =
      !normalizedSearch ||
      title.includes(normalizedSearch) ||
      author.includes(normalizedSearch);

    return matchesTrack && matchesSearch;
  });

  const addTrack = () => {
    const value = trackInput.trim();

    if (!value) return;

    if (tracks.some((track) => track.toLowerCase() === value.toLowerCase())) {
      setCreateError('This research track has already been added.');
      return;
    }

    setTracks((current) => [...current, value]);
    setTrackInput('');
    setCreateError(null);
  };

  const removeTrack = (trackToRemove: string) => {
    setTracks((current) =>
      current.filter((track) => track !== trackToRemove)
    );
  };

  const resetForm = () => {
    setConferenceName('');
    setDepartment(user?.department ?? 'Computer Science and Design');
    setSubmissionDeadline('');
    setEventDate('');
    setTrackInput('');
    setTracks([]);
    setCreateError(null);
    setCreateSuccess(false);
  };

  const handleCreateConference = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setCreateError(null);
    setCreateSuccess(false);

    if (tracks.length === 0) {
      setCreateError('Please add at least one research track.');
      return;
    }

    if (
      !submissionDeadline ||
      !eventDate ||
      new Date(submissionDeadline).getTime() <= Date.now()
    ) {
      setCreateError('Please select a future submission deadline.');
      return;
    }

    if (new Date(eventDate).getTime() < new Date(submissionDeadline).getTime()) {
      setCreateError('The event date must be on or after the submission deadline.');
      return;
    }

    setIsCreating(true);

    try {
      await conferenceApi.create({
        name: conferenceName.trim(),
        department: department.trim(),
        submissionDeadline: new Date(submissionDeadline).toISOString(),
        eventDate: new Date(eventDate).toISOString(),
        tracks,
      });

      setCreateSuccess(true);
      resetForm();
      setShowCreateForm(false);
      await loadShowcase();
    } catch (err) {
      const response = (err as {
        response?: { data?: { message?: string } };
      }).response;

      setCreateError(
        response?.data?.message ??
          'Could not create the conference. Please try again.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

      {/* HERO */}
      <section className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-mint text-forest items-center justify-center border border-sage/30">
          <Award size={30} />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest">
          ScholarBridge · MITS Gwalior
        </p>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
          Conference & Research Showcase
        </h1>

        <p className="text-ink/70 text-sm sm:text-base max-w-2xl mx-auto">
          Discover research opportunities, present your work and celebrate
          the academic contributions of our CSD community.
        </p>
      </section>

      {/* UPCOMING CONFERENCES */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest">
              Explore opportunities
            </p>
            <h2 className="text-2xl font-bold text-ink">
              Upcoming Conferences
            </h2>
            <p className="text-sm text-ink/65 mt-1">
              Find conferences and submit your research papers.
            </p>
          </div>

          {!authLoading && isFaculty && (
            <button
              onClick={() => {
                setShowCreateForm((current) => !current);
                setCreateError(null);
                setCreateSuccess(false);
              }}
              className="btn-primary px-4 py-2.5 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-semibold"
            >
              {showCreateForm ? <X size={17} /> : <Plus size={17} />}
              {showCreateForm ? 'Close Form' : 'Post a Conference'}
            </button>
          )}
        </div>

        {/* FACULTY CONFERENCE FORM */}
        {showCreateForm && isFaculty && (
          <form
            onSubmit={handleCreateConference}
            className="solid-card p-5 sm:p-7 space-y-5"
          >
            <div>
              <h3 className="text-lg font-bold text-ink">
                Create a Conference Listing
              </h3>
              <p className="text-xs text-ink/65 mt-1">
                Publish a new research conference for students.
              </p>
            </div>

            {createError && (
              <div
                className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700"
                role="alert"
              >
                {createError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Conference Name *
                </label>
                <input
                  required
                  maxLength={180}
                  value={conferenceName}
                  onChange={(e) => setConferenceName(e.target.value)}
                  placeholder="e.g. IEEE International Conference on AI"
                  className="w-full rounded-lg border border-sage/40 bg-white px-3 py-2.5 text-sm text-ink"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Hosting Department *
                </label>
                <input
                  required
                  maxLength={160}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Computer Science and Design"
                  className="w-full rounded-lg border border-sage/40 bg-white px-3 py-2.5 text-sm text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Submission Deadline *
                </label>
                <input
                  required
                  type="datetime-local"
                  value={submissionDeadline}
                  onChange={(e) => setSubmissionDeadline(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="w-full rounded-lg border border-sage/40 bg-white px-3 py-2.5 text-sm text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Conference Event Date *
                </label>
                <input
                  required
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={submissionDeadline || new Date().toISOString().slice(0, 16)}
                  className="w-full rounded-lg border border-sage/40 bg-white px-3 py-2.5 text-sm text-ink"
                />
              </div>
            </div>

            {/* RESEARCH TRACKS */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-ink">
                Research Tracks *
              </label>

              <div className="flex gap-2">
                <input
                  value={trackInput}
                  maxLength={120}
                  onChange={(e) => setTrackInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTrack();
                    }
                  }}
                  placeholder="e.g. Machine Learning, Computer Vision"
                  className="flex-1 min-w-0 rounded-lg border border-sage/40 bg-white px-3 py-2.5 text-sm text-ink"
                />

                <button
                  type="button"
                  onClick={addTrack}
                  className="btn-secondary px-4 rounded-lg text-sm font-semibold"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {tracks.map((track) => (
                  <span
                    key={track}
                    className="inline-flex items-center gap-2 rounded-full bg-mint text-forest border border-sage/30 px-3 py-1.5 text-xs font-semibold"
                  >
                    {track}
                    <button
                      type="button"
                      onClick={() => removeTrack(track)}
                      aria-label={`Remove ${track}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>

              {tracks.length === 0 && (
                <p className="text-xs text-ink/50">
                  Add at least one track before publishing.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-3 border-t border-sage/20">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="btn-secondary px-4 py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isCreating || authLoading || !isFaculty}
                className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Publish Conference
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {createSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={17} />
            Conference published successfully.
          </div>
        )}

        {/* CONFERENCE LIST */}
        {isLoading ? (
          <div className="py-12 flex justify-center items-center gap-2 text-sm text-ink/60">
            <Loader2 size={19} className="animate-spin" />
            Loading conferences...
          </div>
        ) : upcomingConferences.length === 0 ? (
          <div className="solid-card border-dashed border-sage/40 py-12 text-center">
            <CalendarDays size={30} className="mx-auto text-ink/40 mb-3" />
            <h3 className="font-semibold text-ink">
              No upcoming conferences yet
            </h3>
            <p className="text-xs text-ink/60 mt-1">
              New conference announcements will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {upcomingConferences.map((conference) => (
              <article
                key={conference.id}
                className="solid-card p-5 sm:p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-forest bg-mint border border-sage/30 px-2.5 py-1 rounded-full">
                      Research Conference
                    </span>
                    <span className="text-xs text-ink/50">
                      #{conference.id}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-ink leading-snug">
                    {conference.name}
                  </h3>

                  <p className="text-sm text-ink/65 flex items-center gap-2">
                    <Building2 size={15} />
                    {conference.department}
                  </p>

                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-sage/20">
                    <div>
                      <p className="text-xs text-ink/50 mb-1">
                        Submission Deadline
                      </p>
                      <p className="text-xs font-semibold text-ink">
                        {formatDate(conference.submissionDeadline)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink/50 mb-1">
                        Event Date
                      </p>
                      <p className="text-xs font-semibold text-ink">
                        {formatDate(conference.eventDate)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-ink mb-2">
                      Research Tracks
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {conference.tracks.map((track) => (
                        <span
                          key={track}
                          className="rounded-full bg-mist border border-sage/20 px-2.5 py-1 text-xs text-ink/75"
                        >
                          {track}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  href="/student/conference"
                  className="btn-primary w-full text-center py-2.5 rounded-lg text-sm font-semibold"
                >
                  Submit Research Paper
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ACCEPTED RESEARCH PAPERS */}
      <section className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-forest">
            Research contributions
          </p>
          <h2 className="text-2xl font-bold text-ink">
            Accepted Research Papers
          </h2>
          <p className="text-sm text-ink/65 mt-1">
            Research approved for public presentation at departmental conferences.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative w-full max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
            />
            <label className="sr-only" htmlFor="showcase-search">
              Search papers by title or author
            </label>
            <input
              id="showcase-search"
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by paper title or student author"
              className="w-full rounded-lg border border-sage/40 bg-white py-2 pl-9 pr-3 text-sm text-ink"
            />
          </div>

          {conferences.length > 1 && (
            <select
              id="conference-filter"
              value={selectedConference}
              onChange={(event) => {
                setSelectedConference(event.target.value);
                setSelectedTrack('ALL');
              }}
              className="max-w-full rounded-lg border border-sage/40 bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="ALL">All conferences</option>
              {conferences.map((conference) => (
                <option key={conference.id} value={conference.id}>
                  {conference.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
            {['ALL', ...availableTracks].map((track) => (
              <button
                key={track}
                onClick={() => setSelectedTrack(track)}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition ${
                  selectedTrack === track ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {track}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-ink/70">
            <Loader2 size={20} className="animate-spin text-forest" />
            Loading accepted papers...
          </div>
        ) : error ? (
          <div
            className="solid-card flex flex-col items-center gap-3 py-12 text-center"
            role="alert"
          >
            <AlertCircle size={28} className="text-rose-500" />
            <p className="text-sm text-ink/80">{error}</p>
            <button
              onClick={loadShowcase}
              className="btn-secondary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"
            >
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="solid-card border-dashed border-sage/40 py-12 text-center text-sm text-ink/70">
            {papers.length === 0
              ? 'Accepted research papers will appear here once they are approved for the showcase.'
              : 'No papers match your search and filters. Try changing or clearing them.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredPapers.map((paper) => (
              <article
                key={paper.id}
                className="solid-card p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-forest bg-mint px-2.5 py-0.5 rounded-full border border-sage/30">
                      {paper.track}
                    </span>
                    <span className="text-xs text-ink/60">
                      {paper.conferenceName}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-ink mb-2 leading-snug">
                    {paper.paperTitle ?? `Paper #${paper.paperId}`}
                  </h3>

                  <p className="text-xs text-ink/70 mb-4 flex items-center gap-1.5">
                    <User size={13} className="text-leaf" />
                    {paper.studentName ?? 'Student author'}
                  </p>

                  {paper.abstractText && (
                    <p className="mb-4 text-sm leading-relaxed text-ink/80">
                      {paper.abstractText}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-forest/10 flex items-center justify-between gap-3">
                  {paper.category && (
                    <CategoryChip
                      category={paper.category}
                      confidenceScore={paper.confidenceScore}
                    />
                  )}

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
              </article>
            ))}
          </div>
        )}
      </section>

      {/* FACULTY ACHIEVEMENTS */}
      <section className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-forest">
            Celebrating academic excellence
          </p>
          <h2 className="text-2xl font-bold text-ink">
            CSD Faculty Achievements
          </h2>
          <p className="text-sm text-ink/65 mt-1">
            Recognising the research publications and academic contributions
            of our professors.
          </p>
        </div>

        <div className="solid-card border-dashed border-sage/40 p-8 sm:p-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-mint text-forest mb-3">
            <BookOpen size={25} />
          </div>

          <h3 className="font-bold text-ink">
            Faculty Research Publications
          </h3>

          <p className="text-sm text-ink/65 max-w-lg mx-auto mt-2">
            Recently published research papers by CSD professors will be
            featured here, along with publication details, journal or
            conference information, and official research links.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <div className="solid-card p-6 text-center text-xs text-ink/70">
        <p>
          Students can submit their research through the{' '}
          <Link
            href="/student/conference"
            className="font-semibold text-forest underline"
          >
            Student Portal
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
