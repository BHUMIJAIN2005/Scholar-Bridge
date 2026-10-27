'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/api/authApi';
import { ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-neutral-600">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Role verification check
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 border border-rose-200 rounded-xl bg-rose-50/70 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-neutral-600 mb-6">
          This section is exclusively for {allowedRoles.join(' or ')} accounts.
          You are currently signed in as a <span className="font-semibold text-neutral-800">{user.role}</span> ({user.email}).
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href={user.role === 'STUDENT' ? '/student/dashboard' : '/faculty/dashboard'}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition"
          >
            Go to Your Dashboard
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition"
          >
            Switch Account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
