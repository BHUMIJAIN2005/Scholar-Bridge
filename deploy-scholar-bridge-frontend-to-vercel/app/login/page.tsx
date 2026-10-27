'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, AlertCircle, KeyRound, Loader2 } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setExpiredNotice(true);
    }
  }, [searchParams]);

  // If already logged in, redirect to proper dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'STUDENT') {
        router.push('/student/dashboard');
      } else {
        router.push('/faculty/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const loggedUser = await login({ email, password });
      if (loggedUser.role === 'STUDENT') {
        router.push('/student/dashboard');
      } else {
        router.push('/faculty/dashboard');
      }
    } catch (err: any) {
      setFormError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-2xl border border-neutral-200/80 shadow-xl shadow-neutral-100">
      <div className="text-center">
        <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 items-center justify-center mb-3">
          <GraduationCap size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Welcome back to ScholarBridge
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Sign in to access your research dashboard and opportunities
        </p>
      </div>

      {expiredNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle size={15} className="shrink-0 text-amber-600" />
          <span>Your session expired. Please sign in again.</span>
        </div>
      )}

      {(formError || authError) && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold">Authentication Error</p>
            <p>{formError || authError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. student@scholarbridge.edu"
            className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50/50 transition"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
              Password
            </label>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50/50 transition"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <KeyRound size={16} />
              <span>Sign in with JWT</span>
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-neutral-100 text-center">
        <p className="text-xs text-neutral-600">
          Don&apos;t have an account yet?{' '}
          <Link href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
            Create an account (Student or Faculty)
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
