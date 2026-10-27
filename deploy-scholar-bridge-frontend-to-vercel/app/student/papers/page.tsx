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
      setError(response?.data?.message ?? 'Could not load your papers. Check the backend and try again.');
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
      await papersApi.upload(uploadFile, uploadTitle.trim());
      setUploadSuccess(true);
      setUploadTitle('');
      setUploadFile(null);
      setShowUploadModal(false);
      await loadPapers();
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setUploadError(response?.data?.message ?? 'Upload failed. Check the backend and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">My Research Papers</h1>
            <p className="text-xs text-neutral-500 mt-1">
              Upload PDF research drafts. Our Python ML microservice will extract text and predict the research category.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 shadow-xs transition flex items-center gap-2 self-start sm:self-auto"
          >
            <UploadCloud size={16} />
            <span>Upload Research Paper</span>
          </button>
        </div>

        {uploadSuccess && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
            Paper uploaded. Its category will appear when processing finishes.
          </p>
        )}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            <span>{error}</span>
            <button onClick={() => { setIsLoading(true); void loadPapers(); }} className="inline-flex shrink-0 items-center gap-1.5 font-semibold">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-neutral-500" role="status">
            <Loader2 size={20} className="animate-spin text-emerald-600" /> Loading your papers...
          </div>
        ) : papers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {papers.map((paper) => <PaperCard key={paper.id} paper={paper} />)}
          </div>
        ) : !error ? (
          <div className="py-16 text-center text-sm text-neutral-500">No papers uploaded yet.</div>
        ) : null}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4">
              <h2 className="text-lg font-bold text-neutral-900">Upload Research Paper (PDF)</h2>
              <p className="text-xs text-neutral-500">
                The document will be submitted to <code className="bg-neutral-100 px-1 py-0.5 rounded">/api/papers/upload</code> for processing.
              </p>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Paper Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Cross-Lingual Pre-training for Indic Scripts"
                    className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Select PDF File
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    required
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    className="w-full text-xs text-neutral-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>

                {uploadError && <p className="text-xs text-rose-700" role="alert">{uploadError}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowUploadModal(false); setUploadError(null); }}
                    className="px-4 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload & Classify'}
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
