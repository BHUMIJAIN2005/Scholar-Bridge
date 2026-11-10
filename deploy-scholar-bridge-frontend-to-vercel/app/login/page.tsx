'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, Award, BookOpen, KeyRound, Loader2, Users } from 'lucide-react';
import type { UserRole } from '@/api/authApi';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: {
            theme: 'outline';
            size: 'large';
            shape: 'rectangular';
            text: 'signin_with';
            width: number;
          }) => void;
        };
      };
    };
  }
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle, isAuthenticated, user, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const [googleNeedsRole, setGoogleNeedsRole] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleCallbackRef = useRef<(credential: string) => void>(() => undefined);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const passwordLoginEnabled = process.env.NEXT_PUBLIC_PASSWORD_LOGIN_ENABLED !== 'false';

  const handleGoogleCredential = async (idToken: string, role?: UserRole) => {
    setFormError(null);
    clearError();
    try {
      setIsSubmitting(true);
      const result = await loginWithGoogle(idToken, role);
      if (result.needsRole) {
        setGoogleIdToken(idToken);
        setGoogleNeedsRole(true);
        return;
      }
      setGoogleNeedsRole(false);
      setGoogleIdToken(null);
      if (result.user.role === 'FACULTY' && result.user.approvalStatus === 'PENDING') {
        setPendingApproval(true);
        return;
      }
      router.push(result.user.role === 'STUDENT' ? '/student/dashboard' : '/faculty/dashboard');
    } catch (err: any) {
      setFormError(err.message || 'Google sign-in failed. Please try again.');
      if (role) {
        setGoogleNeedsRole(false);
        setGoogleIdToken(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  googleCallbackRef.current = (credential) => {
    void handleGoogleCredential(credential);
  };

  useEffect(() => {
    if (!googleScriptLoaded || !googleClientId || !googleButtonRef.current || !window.google) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => googleCallbackRef.current(response.credential),
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'signin_with',
      width: Math.min(360, googleButtonRef.current.clientWidth || 320),
    });
  }, [googleScriptLoaded, googleClientId]);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setExpiredNotice(true);
    }
  }, [searchParams]);

  // If already logged in, redirect to proper dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'FACULTY' && user.approvalStatus === 'PENDING') {
        setPendingApproval(true);
        return;
      }
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
      if (loggedUser.role === 'FACULTY' && loggedUser.approvalStatus === 'PENDING') {
        setPendingApproval(true);
        return;
      }
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
    <div className="mx-auto grid w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 md:grid-cols-[1.05fr_0.95fr] lg:px-8">
      {googleClientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGoogleScriptLoaded(true)}
        />
      )}
      <section className="relative isolate hidden overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 px-6 py-8 text-white shadow-xl shadow-emerald-950/10 sm:px-9 sm:py-10 md:block">
        <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 -z-10 h-64 w-64 rounded-full bg-teal-300/10 blur-3xl" />

        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm">
            <Image
              src="/mits-gwalior-logo.png"
              alt="MITS Gwalior emblem"
              width={56}
              height={56}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide">MITS GWALIOR</p>
            <p className="mt-0.5 max-w-xs text-xs leading-relaxed text-emerald-100">
              Madhav Institute of Technology &amp; Science
            </p>
          </div>
        </div>

        <div className="mt-9 max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
            MITS Research Community
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Good ideas grow together.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-emerald-50/90">
            Sign in to connect with mentors, explore research opportunities, and share your work with the MITS community.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
          {[
            { icon: Users, title: 'Find a mentor', detail: 'Learn with faculty guidance' },
            { icon: BookOpen, title: 'Explore research', detail: 'Discover projects and ideas' },
            { icon: Award, title: 'Share your work', detail: 'Celebrate research progress' },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white/15"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-emerald-50">
                <item.icon size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="mt-0.5 block text-xs text-emerald-100/85">{item.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xl shadow-neutral-100 sm:p-9">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-neutral-200 md:hidden">
            <Image
              src="/mits-gwalior-logo.png"
              alt="MITS Gwalior emblem"
              width={56}
              height={56}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Sign in to your account
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Continue to your student or faculty portal
          </p>
        </div>

        {expiredNotice && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle size={15} className="shrink-0 text-amber-600" />
            <span>Your session expired. Please sign in again.</span>
          </div>
        )}

        {(formError || authError) && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Authentication Error</p>
              <p>{formError || authError}</p>
            </div>
          </div>
        )}

        {pendingApproval && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm font-medium text-amber-800" role="status">
            Your account is waiting for approval.
          </div>
        )}

        <div className="space-y-3">
          {googleClientId ? (
            <div className="flex min-h-10 justify-center" ref={googleButtonRef} />
          ) : (
            <button
              type="button"
              disabled
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-500"
            >
              Google sign-in is not configured
            </button>
          )}
          {googleNeedsRole && (
            <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-center text-sm font-medium text-neutral-700">I am a...</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => googleIdToken && void handleGoogleCredential(googleIdToken, 'STUDENT')}
                  className="rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Student
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => googleIdToken && void handleGoogleCredential(googleIdToken, 'FACULTY')}
                  className="rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Faculty member
                </button>
              </div>
            </div>
          )}
        </div>

        {passwordLoginEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" />
              <span>or sign in with email</span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50/50 px-3.5 py-3 text-sm transition placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50/50 px-3.5 py-3 text-sm transition placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:translate-y-0 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <KeyRound size={16} />
                <span>Sign in</span>
              </>
            )}
          </button>
            </form>
          </>
        )}

        <div className="border-t border-neutral-100 pt-4 text-center">
          <p className="text-xs text-neutral-600">
            Don&apos;t have an account yet?{' '}
            <Link href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
              Create an account
            </Link>
          </p>
          <p className="mt-3 text-[11px] text-neutral-400">
            For students and faculty of MITS Gwalior
          </p>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-2 sm:px-6 lg:px-8">
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
