'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { conferenceApi, Conference, ConferenceSubmission } from '@/api/conferenceApi';
import { AlertCircle, Award, Check, FileText, Loader2, MessageSquare, RefreshCw, X } from 'lucide-react';

interface SubmissionItem extends ConferenceSubmission {
  conferenceName: string;
}

export default function ReviewSubmissionsPage() {
  const [reviews, setReviews] = useState<SubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState<{ [id: number]: string }>({});

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const conferences: Conference[] = await conferenceApi.getAll();
      const submissionsByConference = await Promise.all(
        conferences.map(async (conference) => ({
          conferenceName: conference.name,
          submissions: await conferenceApi.getSubmissions(conference.id),
        })),
      );
      setReviews(submissionsByConference.flatMap(({ conferenceName, submissions }) =>
        submissions.map((submission) => ({ ...submission, conferenceName })),
      ));
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not load conference submissions. Check the backend and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleDecision = async (id: number, status: 'ACCEPTED' | 'REJECTED') => {
    setActionLoading(id);
    setActionError(null);
    try {
      const updated = await conferenceApi.updateStatus(id, status, commentInput[id]?.trim());
      setReviews((prev) => prev.map((review) => review.id === id ? { ...review, ...updated } : review));
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setActionError(response?.data?.message ?? 'Could not save this review decision. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Conference Track Reviews</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Review student submissions for your departmental conference track. Accept or reject with peer feedback.
          </p>
        </div>

        {actionError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{actionError}</p>}
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-neutral-500" role="status">
            <Loader2 size={20} className="animate-spin text-indigo-600" /> Loading submissions...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
            <AlertCircle size={28} className="text-rose-500" />
            <p className="text-sm text-neutral-700">{error}</p>
            <button onClick={loadReviews} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><RefreshCw size={15} /> Retry</button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-500">No conference submissions are ready for review.</div>
        ) : <div className="space-y-4">
          {reviews.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    {sub.conferenceName} • {sub.track}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 mt-1.5">{sub.paperTitle}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Author: {sub.studentName}</p>
                </div>
                <div>
                  <ApplicationStatusBadge status={sub.status} />
                </div>
              </div>

              {sub.reviewComments && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs text-neutral-600 flex items-start gap-2">
                  <MessageSquare size={14} className="text-neutral-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-neutral-800">Faculty Review Comment: </span>
                    <span>{sub.reviewComments}</span>
                  </div>
                </div>
              )}

              {(sub.status === 'SUBMITTED' || sub.status === 'UNDER_REVIEW') && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Review Comments / Feedback
                    </label>
                    <input
                      type="text"
                      value={commentInput[sub.id] || ''}
                      onChange={(e) =>
                        setCommentInput({ ...commentInput, [sub.id]: e.target.value })
                      }
                      placeholder="Add constructive notes or reason for decision..."
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDecision(sub.id, 'REJECTED')}
                      disabled={actionLoading === sub.id}
                      className="px-3.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <X size={14} />
                      <span>Reject Submission</span>
                    </button>
                    <button
                      onClick={() => handleDecision(sub.id, 'ACCEPTED')}
                      disabled={actionLoading === sub.id}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Check size={14} />
                      <span>Accept to Conference</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>}
      </main>
    </ProtectedRoute>
  );
}
