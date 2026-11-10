'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('STUDENT' | 'FACULTY')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-leaf" size={32} />
        <p className="text-ink/70 text-sm font-medium">Verifying access...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="solid-card max-w-xl mx-auto my-16 p-8 border-rose-200 bg-white text-center">
        <ShieldAlert size={48} className="text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-ink mb-2">Access Restricted</h2>
        <p className="text-ink/80 text-sm mb-6">
          This portal is restricted to {allowedRoles.join(' or ')} accounts. You are currently
          signed in as <span className="font-semibold">{user.role}</span>.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push(user.role === 'STUDENT' ? '/student/dashboard' : '/faculty/dashboard')}
            className="btn-primary px-4 py-2 text-sm"
          >
            Go to My Dashboard
          </button>
          <button
            onClick={logout}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
