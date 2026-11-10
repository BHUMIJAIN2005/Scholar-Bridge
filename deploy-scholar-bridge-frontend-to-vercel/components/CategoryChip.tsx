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
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-mint text-forest border border-sage/40 ${className}`}
    >
      <Tag size={12} className="text-forest" />
      <span>{category}</span>
      {confidencePercent !== null && (
        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/80 text-forest font-mono">
          {confidencePercent}%
        </span>
      )}
    </span>
  );
};

export default CategoryChip;
