'use client';

import React from 'react';
import { PaperSubmission } from '@/api/papersApi';
import { CategoryChip } from './CategoryChip';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { FileText, Calendar, ExternalLink, RefreshCw } from 'lucide-react';

interface PaperCardProps {
  paper: PaperSubmission;
  onRefresh?: () => void;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onRefresh }) => {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 text-base leading-snug">{paper.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
              <Calendar size={13} />
              <span>{paper.uploadedAt ? new Date(paper.uploadedAt).toLocaleDateString() : 'Recently'}</span>
            </div>
          </div>
        </div>
        <ApplicationStatusBadge status={paper.status} />
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          {paper.category ? (
            <CategoryChip category={paper.category} confidenceScore={paper.confidenceScore} />
          ) : paper.status === 'PROCESSING' ? (
            <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
              <RefreshCw size={12} className="animate-spin" /> Auto-categorizing with ML model...
            </span>
          ) : (
            <span className="text-xs text-neutral-400">Category pending</span>
          )}
        </div>

        {paper.fileUrl && (
          <a
            href={paper.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
          >
            <span>View PDF</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
};

export default PaperCard;
