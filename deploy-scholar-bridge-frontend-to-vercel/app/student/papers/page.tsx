'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PaperCard } from '@/components/PaperCard';
import { PaperSubmission, papersApi } from '@/api/papersApi';
import { AlertCircle, Loader2, RefreshCw, UploadCloud } from 'lucide-react';

export default function MyPapersPage() {
  const [papers, setPapers] = useState<PaperSubmission[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAbstract, setUploadAbstract] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const loadPapers = useCallback(async () => {
    setError(null);
    try {
      setPapers(await papersApi.getMyPapers());
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not load your papers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPapers();
  }, [loadPapers]);

  const hasProcessingPapers = papers.some((paper) => paper.status === 'PROCESSING');

  useEffect(() => {
    if (!hasProcessingPapers) return;
    const interval = window.setInterval(() => void loadPapers(), 5000);
    return () => window.clearInterval(interval);
  }, [hasProcessingPapers, loadPapers]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(false);
    if (!uploadTitle.trim() || !uploadFile) {
      setUploadError('Enter a title and choose a PDF file.');
      return;
    }
    if (uploadFile.type !== 'application/pdf' && !uploadFile.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Choose a PDF file to upload.');
      return;
    }
    setIsUploading(true);
    try {
      await papersApi.upload(uploadFile, uploadTitle.trim(), uploadAbstract.trim());
      setUploadSuccess(true);
      setUploadTitle('');
      setUploadAbstract('');
      setUploadFile(null);
      setShowUploadModal(false);
      await loadPapers();
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setUploadError(response?.data?.message ?? 'We couldn’t upload your paper. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">My Research Papers</h1>
            <p className="text-xs text-ink/70 mt-1">
              Share a PDF of your research. We’ll suggest a subject area based on its content.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary px-4 py-2.5 text-xs self-start sm:self-auto flex items-center gap-2"
          >
            <UploadCloud size={16} />
            <span>Upload Research Paper</span>
          </button>
        </div>

        {uploadSuccess && (
          <p className="rounded-xl border border-sage/40 bg-mint/40 px-4 py-3 text-sm font-semibold text-forest" role="status">
            Paper uploaded. Its suggested research area will appear shortly.
          </p>
        )}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            <span>{error}</span>
            <button onClick={() => { setIsLoading(true); void loadPapers(); }} className="btn-secondary px-3 py-1 text-xs inline-flex shrink-0 items-center gap-1.5 font-semibold">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-ink/70" role="status">
            <Loader2 size={20} className="animate-spin text-leaf" /> Loading your papers...
          </div>
        ) : papers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} onRefresh={loadPapers} />
            ))}
          </div>
        ) : !error ? (
          <div className="solid-card border-dashed border-sage/40 py-16 text-center text-sm text-ink/70">No papers uploaded yet.</div>
        ) : null}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="solid-card p-6 max-w-md w-full shadow-2xl space-y-4">
              <h2 className="text-lg font-bold text-ink">Upload Research Paper (PDF)</h2>
              <p className="text-xs text-ink/70">
                Add a title and choose the PDF you’d like to share.
              </p>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Paper Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Cross-Lingual Pre-training for Indic Scripts"
                    className="w-full px-3.5 py-2 rounded-lg border border-sage/40 bg-white text-ink text-sm focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
                  />
                </div>

                <div>
                  <label htmlFor="paper-abstract" className="block text-xs font-semibold text-ink mb-1">
                    Short Abstract <span className="font-normal text-ink/60">(optional)</span>
                  </label>
                  <textarea
                    id="paper-abstract"
                    rows={4}
                    maxLength={5000}
                    value={uploadAbstract}
                    onChange={(e) => setUploadAbstract(e.target.value)}
                    placeholder="Briefly describe your research and its main findings."
                    className="w-full px-3.5 py-2 rounded-lg border border-sage/40 bg-white text-ink text-sm focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
                  />
                  <p className="mt-1 text-[11px] text-ink/60">
                    This summary will appear publicly if your paper is accepted at a conference.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Select PDF File
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    required
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    className="w-full text-xs text-ink/70 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-mint file:text-forest hover:file:bg-mint/80"
                  />
                </div>

                {uploadError && <p className="text-xs text-rose-700" role="alert">{uploadError}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowUploadModal(false); setUploadError(null); }}
                    className="btn-secondary px-4 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Paper'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
