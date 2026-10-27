'use client';

import React from 'react';

export type StatusType =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'DONE'
  | 'FAILED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'OPEN'
  | 'CLOSED'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export const ApplicationStatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = (status || '').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'ACCEPTED':
      case 'DONE':
      case 'OPEN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING':
      case 'PROCESSING':
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'REJECTED':
      case 'FAILED':
      case 'CLOSED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getLabel = () => {
    switch (normalized) {
      case 'UNDER_REVIEW':
        return 'Under Review';
      case 'DONE':
        return 'Categorized';
      case 'PROCESSING':
        return 'Processing ML...';
      default:
        return normalized.charAt(0) + normalized.slice(1).toLowerCase();
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {getLabel()}
    </span>
  );
};

export default ApplicationStatusBadge;
