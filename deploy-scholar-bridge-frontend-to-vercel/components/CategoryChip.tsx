'use client';

import React from 'react';
import { Tag } from 'lucide-react';

interface CategoryChipProps {
  category: string;
  confidenceScore?: number;
  className?: string;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  category,
  confidenceScore,
  className = '',
}) => {
  const confidencePercent = confidenceScore ? Math.round(confidenceScore * 100) : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${className}`}
    >
      <Tag size={12} className="text-emerald-600" />
      <span>{category}</span>
      {confidencePercent !== null && (
        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200/60 text-emerald-900 font-mono">
          {confidencePercent}%
        </span>
      )}
    </span>
  );
};

export default CategoryChip;
