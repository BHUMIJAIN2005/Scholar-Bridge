'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Compass,
  FileText,
  UploadCloud,
  Award,
  PlusCircle,
  Users,
  CheckSquare,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout, isStudent, isFaculty } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLoginPage = pathname === '/login';

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-sage/20 bg-mist/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-white p-1 shadow-sm ring-1 ring-sage/30 transition-transform duration-200 group-hover:scale-105">
                <Image
                  src="/mits-gwalior-logo.png"
                  alt="MITS Gwalior emblem"
                  width={40}
                  height={40}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-ink">
                  Scholar<span className="text-leaf">Bridge</span>
                </span>
                <span className="text-[10px] text-ink/70 font-medium tracking-wide">
                  MITS Gwalior
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {isLoginPage ? (
                <Link
                  href="/login"
                  aria-current="page"
                  className="rounded-md bg-mint px-3 py-1.5 text-sm font-semibold text-forest"
                >
                  Sign in
                </Link>
              ) : (
                <div className="contents">
              {/* Public links */}
              <Link
                href="/showcase"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isActive('/showcase')
                    ? 'bg-mint text-forest font-semibold'
                    : 'text-ink hover:text-forest hover:bg-mint/50'
                }`}
              >
                Conference Showcase
              </Link>
              <Link
                href="/guidance"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isActive('/guidance')
                    ? 'bg-mint text-forest font-semibold'
                    : 'text-ink hover:text-forest hover:bg-mint/50'
                }`}
              >
                Research Guidance
              </Link>
              <Link
                href="/blog"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isActive('/blog')
                    ? 'bg-mint text-forest font-semibold'
                    : 'text-ink hover:text-forest hover:bg-mint/50'
                }`}
              >
                Blog
              </Link>

              {/* Student specific links */}
              {isAuthenticated && isStudent && (
                <>
                  <div className="h-4 w-px bg-sage/30 mx-2" />
                  <Link
                    href="/student/dashboard"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/dashboard')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile/edit"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/profile/edit')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/faculty"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/faculty')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    Faculty
                  </Link>
                  <Link
                    href="/student/openings"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/openings')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    Browse Openings
                  </Link>
                  <Link
                    href="/student/applications"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/applications')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    My Applications
                  </Link>
                  <Link
                    href="/student/papers"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/papers')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    My Papers
                  </Link>
                  <Link
                    href="/student/conference"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/conference')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    Conference Submission
                  </Link>
                </>
              )}

              {/* Faculty specific links */}
              {isAuthenticated && isFaculty && (
                <>
                  <div className="h-4 w-px bg-sage/30 mx-2" />
                  <Link
                    href="/faculty/dashboard"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/faculty/dashboard')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile/edit"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/profile/edit')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/students"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/students')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    Students
                  </Link>
                  <Link
                    href="/faculty/post-opening"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/faculty/post-opening')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    Post Opening
                  </Link>
                  <Link
                    href="/faculty/applicants"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/faculty/applicants')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    Applicants
                  </Link>
                  <Link
                    href="/faculty/reviews"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/faculty/reviews')
                        ? 'bg-mint text-forest font-semibold'
                        : 'text-ink hover:text-forest hover:bg-mint/50'
                    }`}
                  >
                    Submissions
                  </Link>
                </>
              )}
                </div>
              )}
            </nav>
          </div>

          {/* Right Action Menu: Auth or Profile */}
          {!isLoginPage && (
            <div className="hidden items-center gap-3 md:flex">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2.5 rounded-full border border-sage/30 bg-white/90 px-3 py-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white bg-forest">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold leading-tight text-ink">
                        {user.name}
                      </span>
                      <span className="text-[10px] font-medium text-ink/70">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    title="Sign out"
                    className="rounded-lg p-2 text-ink/70 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="btn-secondary px-3.5 py-1.5 text-sm"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="btn-primary px-4 py-2 text-sm shadow-sm"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            {isLoginPage ? (
              <Link
                href="/login"
                aria-current="page"
                className="rounded-md bg-mint px-3 py-1.5 text-sm font-semibold text-forest"
              >
                Sign in
              </Link>
            ) : (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-ink hover:bg-mint/50"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && !isLoginPage && (
        <div className="md:hidden border-t border-sage/20 bg-mist px-4 pt-3 pb-6 space-y-2 shadow-lg">
          <Link
            href="/showcase"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-ink hover:bg-mint/60"
          >
            Conference Showcase
          </Link>
          <Link
            href="/guidance"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-ink hover:bg-mint/60"
          >
            Research Guidance
          </Link>
          <Link
            href="/blog"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-ink hover:bg-mint/60"
          >
            Blog
          </Link>

          {isAuthenticated && isStudent && (
            <div className="pt-2 border-t border-sage/20 space-y-1">
              <span className="block px-3 py-1 text-xs font-semibold text-forest uppercase tracking-wider">
                Student Portal
              </span>
              <Link
                href="/student/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                Dashboard
              </Link>
              <Link
                href="/profile/edit"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                My Profile
              </Link>
              <Link
                href="/faculty"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                Faculty
              </Link>
              <Link
                href="/student/openings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                Browse Openings
              </Link>
              <Link
                href="/student/applications"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                My Applications
              </Link>
              <Link
                href="/student/papers"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                My Papers
              </Link>
              <Link
                href="/student/conference"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                Conference Submission
              </Link>
            </div>
          )}

          {isAuthenticated && isFaculty && (
            <div className="pt-2 border-t border-sage/20 space-y-1">
              <span className="block px-3 py-1 text-xs font-semibold text-forest uppercase tracking-wider">
                Faculty Portal
              </span>
              <Link
                href="/faculty/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                Dashboard
              </Link>
              <Link
                href="/profile/edit"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                My Profile
              </Link>
              <Link
                href="/students"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                Students
              </Link>
              <Link
                href="/faculty/post-opening"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                Post Opening
              </Link>
              <Link
                href="/faculty/applicants"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                View Applicants
              </Link>
              <Link
                href="/faculty/reviews"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-ink hover:bg-mint/60"
              >
                Conference Reviews
              </Link>
            </div>
          )}

          <div className="pt-4 border-t border-sage/20">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="px-3 py-2 text-sm text-ink/70">
                  Signed in as <b className="text-ink">{user?.name}</b> ({user?.role})
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-rose-600 font-medium hover:bg-rose-50 rounded-md"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary w-full text-center py-2 text-sm"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary w-full text-center py-2 text-sm shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
