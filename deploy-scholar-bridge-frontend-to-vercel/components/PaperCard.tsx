'use client';

import React, { useState } from 'react';
import { PaperSubmission, papersApi } from '@/api/papersApi';
import { CategoryChip } from './CategoryChip';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { FileText, Calendar, ExternalLink, RefreshCw } from 'lucide-react';

interface PaperCardProps {
  paper: PaperSubmission;
  onRefresh?: () => void | Promise<void>;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onRefresh }) => {
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleReclassify = async () => {
    setIsRetrying(true);
    setActionError(null);
    try {
      await papersApi.reclassify(paper.id);
      await onRefresh?.();
    } catch {
      setActionError('Could not suggest a research area. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleViewPdf = async () => {
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) {
      setActionError('Allow pop-ups to view this PDF.');
      return;
    }

    previewWindow.opener = null;
    previewWindow.document.title = 'Loading PDF...';
    previewWindow.document.body.textContent = 'Loading PDF...';
    setIsOpeningPdf(true);
    setActionError(null);
    try {
      const file = await papersApi.getFile(paper.id);
      const fileUrl = URL.createObjectURL(file);
      previewWindow.location.replace(fileUrl);
      const cleanup = window.setInterval(() => {
        if (previewWindow.closed) {
          URL.revokeObjectURL(fileUrl);
          window.clearInterval(cleanup);
        }
      }, 1000);
    } catch {
      previewWindow.close();
      setActionError('Could not open this PDF. Check your connection and try again.');
    } finally {
      setIsOpeningPdf(false);
    }
  };

  return (
    <div className="solid-card p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-mint text-forest flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-ink text-base leading-snug">{paper.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-ink/70">
              <Calendar size={13} />
              <span>{paper.uploadedAt ? new Date(paper.uploadedAt).toLocaleDateString() : 'Recently'}</span>
            </div>
          </div>
        </div>
        <ApplicationStatusBadge status={paper.status} />
      </div>

      <div className="mt-4 pt-3 border-t border-sage/20 flex items-center justify-between flex-wrap gap-2">
        <div>
          {paper.category ? (
            <CategoryChip category={paper.category} confidenceScore={paper.confidenceScore} />
          ) : paper.status === 'PROCESSING' ? (
            <span className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
              <RefreshCw size={12} className="animate-spin" /> Finding a research area...
            </span>
          ) : (
            <span className="text-xs text-ink/50">No research area suggested yet</span>
          )}
        </div>

        {paper.fileUrl && (
          <button
            type="button"
            onClick={() => void handleViewPdf()}
            disabled={isOpeningPdf}
            className="text-xs font-semibold text-forest hover:text-mid-green flex items-center gap-1 hover:underline disabled:opacity-50"
          >
            <span>View PDF</span>
            <ExternalLink size={12} />
          </button>
        )}
        {paper.status === 'FAILED' && (
          <button
            type="button"
            onClick={() => void handleReclassify()}
            disabled={isRetrying}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
          >
            {isRetrying ? 'Trying again...' : 'Try again'}
          </button>
        )}
      </div>
      {actionError && <p className="mt-2 text-xs text-rose-700" role="alert">{actionError}</p>}
    </div>
  );
};

export default PaperCard;
