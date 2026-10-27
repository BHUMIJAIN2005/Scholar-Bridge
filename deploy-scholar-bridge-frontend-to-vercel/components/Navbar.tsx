'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
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

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:bg-emerald-700 transition">
                <GraduationCap size={20} strokeWidth={2.4} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-neutral-900">
                  Scholar<span className="text-emerald-600">Bridge</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-medium tracking-wide uppercase">
                  Research Platform
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {/* Public links */}
              <Link
                href="/showcase"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isActive('/showcase')
                    ? 'bg-neutral-100 text-neutral-900 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                Conference Showcase
              </Link>
              <Link
                href="/guidance"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isActive('/guidance')
                    ? 'bg-neutral-100 text-neutral-900 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                Research Guidance
              </Link>

              {/* Student specific links */}
              {isAuthenticated && isStudent && (
                <>
                  <div className="h-4 w-px bg-neutral-200 mx-2" />
                  <Link
                    href="/student/dashboard"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/dashboard')
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/student/openings"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/openings')
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    Browse Openings
                  </Link>
                  <Link
                    href="/student/applications"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/applications')
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    My Applications
                  </Link>
                  <Link
                    href="/student/papers"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/papers')
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    My Papers
                  </Link>
                  <Link
                    href="/student/conference"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/student/conference')
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    Conference Submission
                  </Link>
                </>
              )}

              {/* Faculty specific links */}
              {isAuthenticated && isFaculty && (
                <>
                  <div className="h-4 w-px bg-neutral-200 mx-2" />
                  <Link
                    href="/faculty/dashboard"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/faculty/dashboard')
                        ? 'bg-indigo-50 text-indigo-800 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/faculty/post-opening"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/faculty/post-opening')
                        ? 'bg-indigo-50 text-indigo-800 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    Post Opening
                  </Link>
                  <Link
                    href="/faculty/applicants"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/faculty/applicants')
                        ? 'bg-indigo-50 text-indigo-800 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    Applicants
                  </Link>
                  <Link
                    href="/faculty/reviews"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/faculty/reviews')
                        ? 'bg-indigo-50 text-indigo-800 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    Submissions
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Right Action Menu: Auth or Profile */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-100/90 border border-neutral-200">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      isFaculty ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}
                  >
                    {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-neutral-800 leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-neutral-600 hover:bg-neutral-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg">
          <Link
            href="/showcase"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Conference Showcase
          </Link>
          <Link
            href="/guidance"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Research Guidance
          </Link>

          {isAuthenticated && isStudent && (
            <div className="pt-2 border-t border-neutral-100 space-y-1">
              <span className="block px-3 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Student Portal
              </span>
              <Link
                href="/student/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-neutral-700 hover:bg-emerald-50"
              >
                Dashboard
              </Link>
              <Link
                href="/student/openings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-neutral-700 hover:bg-emerald-50"
              >
                Browse Openings
              </Link>
              <Link
                href="/student/applications"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-neutral-700 hover:bg-emerald-50"
              >
                My Applications
              </Link>
              <Link
                href="/student/papers"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-neutral-700 hover:bg-emerald-50"
              >
                My Papers
              </Link>
              <Link
                href="/student/conference"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-neutral-700 hover:bg-emerald-50"
              >
                Conference Submission
              </Link>
            </div>
          )}

          {isAuthenticated && isFaculty && (
            <div className="pt-2 border-t border-neutral-100 space-y-1">
              <span className="block px-3 py-1 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                Faculty Portal
              </span>
              <Link
                href="/faculty/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-neutral-700 hover:bg-indigo-50"
              >
                Dashboard
              </Link>
              <Link
                href="/faculty/post-opening"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-neutral-700 hover:bg-indigo-50"
              >
                Post Opening
              </Link>
              <Link
                href="/faculty/applicants"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-neutral-700 hover:bg-indigo-50"
              >
                View Applicants
              </Link>
              <Link
                href="/faculty/reviews"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base text-neutral-700 hover:bg-indigo-50"
              >
                Conference Reviews
              </Link>
            </div>
          )}

          <div className="pt-4 border-t border-neutral-200">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="px-3 py-2 text-sm text-neutral-600">
                  Signed in as <b className="text-neutral-900">{user?.name}</b> ({user?.role})
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
                  className="w-full text-center px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 bg-emerald-600 rounded-lg text-white font-medium shadow-sm"
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
