'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/api/authApi';
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  AlertCircle,
  UserCheck,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signup, clearError, error: authError } = useAuth();

  const [role, setRole] = useState<UserRole>('STUDENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Student specific
  const [skills, setSkills] = useState('');
  const [year, setYear] = useState('');

  // Faculty specific
  const [department, setDepartment] = useState('');
  const [researchDomains, setResearchDomains] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!name.trim() || !email.trim() || !password) {
      setFormError('Please fill in all mandatory fields.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newUser = await signup({
        name,
        email,
        password,
        role,
        skills: role === 'STUDENT' ? skills : undefined,
        year: role === 'STUDENT' ? year : undefined,
        department: role === 'FACULTY' ? department : undefined,
        researchDomains: role === 'FACULTY' ? researchDomains : undefined,
      });

      if (newUser.role === 'STUDENT') {
        router.push('/student/dashboard');
      } else {
        router.push('/faculty/dashboard');
      }
    } catch (err: any) {
      setFormError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gradient-hero min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-6 glass-card p-8 sm:p-10">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 rounded-xl bg-white/20 text-white items-center justify-center mb-3 shadow-inner">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create your ScholarBridge Account
          </h1>
          <p className="text-sm text-white/80 mt-1">
            Join the research collaboration network at MITS DU
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div>
          <label className="block text-xs font-semibold text-white/90 uppercase tracking-wider mb-2 text-center">
            Select Your Role
          </label>
          <div className="grid grid-cols-2 gap-3 p-1 bg-white/10 rounded-xl border border-white/20">
            <button
              type="button"
              onClick={() => setRole('STUDENT')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition ${
                role === 'STUDENT'
                  ? 'bg-white text-forest shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <BookOpen size={16} />
              <span>Student</span>
              {role === 'STUDENT' && <CheckCircle2 size={15} className="text-leaf" />}
            </button>

            <button
              type="button"
              onClick={() => setRole('FACULTY')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition ${
                role === 'FACULTY'
                  ? 'bg-white text-forest shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Briefcase size={16} />
              <span>Faculty</span>
              {role === 'FACULTY' && <CheckCircle2 size={15} className="text-leaf" />}
            </button>
          </div>
        </div>

        {(formError || authError) && (
          <div className="p-3.5 bg-rose-500/20 border border-rose-300 rounded-lg flex items-start gap-2.5 text-xs text-white">
            <AlertCircle size={16} className="shrink-0 text-rose-300 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Registration Notice</p>
              <p className="text-white/90">{formError || authError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/90 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'STUDENT' ? 'e.g. Priya Sharma' : 'e.g. Dr. Rajesh Verma'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-white/30 bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-3 focus:ring-leaf/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/90 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-white/30 bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-3 focus:ring-leaf/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/90 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-lg border border-white/30 bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-3 focus:ring-leaf/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/90 uppercase tracking-wider mb-1.5">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-white/30 bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-3 focus:ring-leaf/40"
              />
            </div>
          </div>

          {/* Role specific profile fields */}
          {role === 'STUDENT' ? (
            <div className="p-4 bg-white/10 border border-white/20 rounded-xl space-y-3">
              <span className="text-xs font-bold text-mint uppercase tracking-wider block">
                Student Academic Profile
              </span>
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">
                  Skills & Research Interests (comma-separated)
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. data analysis, programming, research writing"
                  className="w-full px-3.5 py-2 rounded-lg border border-white/30 bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-3 focus:ring-leaf/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">
                  Academic Program & Year
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 3rd Year B.Tech CSE"
                  className="w-full px-3.5 py-2 rounded-lg border border-white/30 bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-3 focus:ring-leaf/40"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white/10 border border-white/20 rounded-xl space-y-3">
              <span className="text-xs font-bold text-mint uppercase tracking-wider block">
                Faculty Academic Profile
              </span>
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Department of Computer Science & Engineering"
                  className="w-full px-3.5 py-2 rounded-lg border border-white/30 bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-3 focus:ring-leaf/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">
                  Research Domains & Topics
                </label>
                <input
                  type="text"
                  value={researchDomains}
                  onChange={(e) => setResearchDomains(e.target.value)}
                  placeholder="e.g. Natural Language Processing, Computer Vision, Distributed Systems"
                  className="w-full px-3.5 py-2 rounded-lg border border-white/30 bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-3 focus:ring-leaf/40"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-[12px] font-semibold text-sm bg-mint text-forest hover:bg-mint/90 flex items-center justify-center gap-2 shadow-md transition hover:-translate-y-0.5 active:scale-98 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-forest" />
                <span>Creating your account...</span>
              </>
            ) : (
              <>
                <UserCheck size={16} />
                <span>Register as {role === 'STUDENT' ? 'Student' : 'Faculty'}</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-white/15 text-center">
          <p className="text-xs text-white/80">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-mint hover:text-white underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
