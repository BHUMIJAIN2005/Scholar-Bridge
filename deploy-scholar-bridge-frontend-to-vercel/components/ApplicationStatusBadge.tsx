'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock, Info } from 'lucide-react';

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
      case 'UNDER_REVIEW':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'ACCEPTED':
      case 'DONE':
      case 'OPEN':
        return 'bg-mint text-forest border-sage/40';
      case 'PENDING':
      case 'PROCESSING':
      case 'SUBMITTED':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'REJECTED':
      case 'FAILED':
      case 'CLOSED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getIcon = () => {
    switch (normalized) {
      case 'UNDER_REVIEW':
        return <Info size={13} className="mr-1 text-slate-600 shrink-0" />;
      case 'ACCEPTED':
      case 'DONE':
      case 'OPEN':
        return <CheckCircle2 size={13} className="mr-1 text-leaf shrink-0" />;
      case 'REJECTED':
      case 'FAILED':
      case 'CLOSED':
        return <XCircle size={13} className="mr-1 text-rose-600 shrink-0" />;
      case 'PENDING':
      case 'PROCESSING':
      case 'SUBMITTED':
      default:
        return <Clock size={13} className="mr-1 text-amber-600 shrink-0" />;
    }
  };

  const getLabel = () => {
    switch (normalized) {
      case 'UNDER_REVIEW':
        return 'Under Review';
      case 'DONE':
        return 'Category suggested';
      case 'PROCESSING':
        return 'Finding a category';
      case 'FAILED':
        return 'Needs attention';
      default:
        return normalized.charAt(0) + normalized.slice(1).toLowerCase();
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle()} ${className}`}
    >
      {getIcon()}
      {getLabel()}
    </span>
  );
};

export default ApplicationStatusBadge;
