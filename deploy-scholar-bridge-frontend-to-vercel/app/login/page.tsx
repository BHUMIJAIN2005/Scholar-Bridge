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
    <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 py-6 sm:px-6 md:grid-cols-[1.05fr_0.95fr] lg:px-8">
      {googleClientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGoogleScriptLoaded(true)}
        />
      )}
      <section className="relative isolate hidden overflow-hidden rounded-3xl glass-card px-6 py-8 text-white sm:px-9 sm:py-10 md:block">
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
            <p className="text-sm font-bold tracking-wide text-white">MITS GWALIOR</p>
            <p className="mt-0.5 max-w-xs text-xs leading-relaxed text-mint">
              Madhav Institute of Technology &amp; Science
            </p>
          </div>
        </div>

        <div className="mt-9 max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">
            MITS Research Community
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-white">
            Good ideas grow together.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
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
              className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white/15"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-mint">
                <item.icon size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{item.title}</span>
                <span className="mt-0.5 block text-xs text-white/80">{item.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-md space-y-6 glass-card p-6 sm:p-9">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-white/30 md:hidden">
            <Image
              src="/mits-gwalior-logo.png"
              alt="MITS Gwalior emblem"
              width={56}
              height={56}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Sign in to your account
          </h2>
          <p className="mt-1 text-sm text-white/80">
            Continue to your student or faculty portal
          </p>
        </div>

        {expiredNotice && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-500/20 p-3 text-xs text-white">
            <AlertCircle size={15} className="shrink-0 text-amber-300" />
            <span>Your session expired. Please sign in again.</span>
          </div>
        )}

        {(formError || authError) && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-300 bg-rose-500/20 p-3.5 text-xs text-white">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-300" />
            <div>
              <p className="font-semibold text-white">Authentication Error</p>
              <p className="text-white/90">{formError || authError}</p>
            </div>
          </div>
        )}

        {pendingApproval && (
          <div className="rounded-lg border border-amber-300 bg-amber-500/20 p-3.5 text-sm font-medium text-white" role="status">
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
              className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white/60"
            >
              Google sign-in is not configured
            </button>
          )}
          {googleNeedsRole && (
            <div className="space-y-2 rounded-lg border border-white/20 bg-white/10 p-3">
              <p className="text-center text-sm font-medium text-white">I am a...</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => googleIdToken && void handleGoogleCredential(googleIdToken, 'STUDENT')}
                  className="rounded-[12px] bg-mint px-3 py-2.5 text-sm font-semibold text-forest transition hover:bg-mint/90 disabled:opacity-50"
                >
                  Student
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => googleIdToken && void handleGoogleCredential(googleIdToken, 'FACULTY')}
                  className="rounded-[12px] bg-mint px-3 py-2.5 text-sm font-semibold text-forest transition hover:bg-mint/90 disabled:opacity-50"
                >
                  Faculty member
                </button>
              </div>
            </div>
          )}
        </div>

        {passwordLoginEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs text-white/70">
              <span className="h-px flex-1 bg-white/20" />
              <span>or sign in with email</span>
              <span className="h-px flex-1 bg-white/20" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/90">
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
                  className="w-full rounded-lg border border-white/30 bg-white px-3.5 py-3 text-sm text-ink transition placeholder:text-ink/40 focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/90">
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
                  className="w-full rounded-lg border border-white/30 bg-white px-3.5 py-3 text-sm text-ink transition placeholder:text-ink/40 focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-mint px-4 py-3 text-sm font-semibold text-forest shadow-md transition hover:-translate-y-0.5 hover:bg-mint/90 active:scale-98 disabled:translate-y-0 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-forest" />
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

        <div className="border-t border-white/15 pt-4 text-center">
          <p className="text-xs text-white/80">
            Don&apos;t have an account yet?{' '}
            <Link href="/signup" className="font-semibold text-mint hover:text-white underline">
              Create an account
            </Link>
          </p>
          <p className="mt-3 text-[11px] text-white/60">
            For students and faculty of MITS Gwalior
          </p>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="gradient-hero flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-mint" />
        </div>
      }>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
