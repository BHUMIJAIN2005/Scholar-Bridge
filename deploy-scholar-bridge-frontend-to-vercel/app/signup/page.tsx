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
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-6 bg-white p-8 sm:p-10 rounded-2xl border border-neutral-200/80 shadow-xl shadow-neutral-100">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 items-center justify-center mb-3">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Create your ScholarBridge Account
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Join the research collaboration network at MITS DU
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2 text-center">
            Select Your Role
          </label>
          <div className="grid grid-cols-2 gap-3 p-1 bg-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => setRole('STUDENT')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition ${
                role === 'STUDENT'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <BookOpen size={16} />
              <span>Student</span>
              {role === 'STUDENT' && <CheckCircle2 size={15} className="text-emerald-600" />}
            </button>

            <button
              type="button"
              onClick={() => setRole('FACULTY')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition ${
                role === 'FACULTY'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Briefcase size={16} />
              <span>Faculty</span>
              {role === 'FACULTY' && <CheckCircle2 size={15} className="text-indigo-600" />}
            </button>
          </div>
        </div>

        {(formError || authError) && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Registration Notice</p>
              <p>{formError || authError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'STUDENT' ? 'e.g. Priya Sharma' : 'e.g. Dr. Rajesh Verma'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50/50"
              />
            </div>
          </div>

          {/* Role specific profile fields */}
          {role === 'STUDENT' ? (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-3">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Student Academic Profile
              </span>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Skills & Technical Interests (comma-separated)
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Python, NLP, PyTorch, React, Java"
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Academic Program & Year
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 3rd Year B.Tech CSE"
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-indigo-50/50 border border-indigo-200/70 rounded-xl space-y-3">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">
                Faculty Academic Profile
              </span>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Department of Computer Science & Engineering"
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Research Domains & Topics
                </label>
                <input
                  type="text"
                  value={researchDomains}
                  onChange={(e) => setResearchDomains(e.target.value)}
                  placeholder="e.g. Natural Language Processing, Computer Vision, Distributed Systems"
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm bg-white"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 ${
              role === 'STUDENT'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating Account & Issuing JWT...</span>
              </>
            ) : (
              <>
                <UserCheck size={16} />
                <span>Register as {role === 'STUDENT' ? 'Student' : 'Faculty'}</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-100 text-center">
          <p className="text-xs text-neutral-600">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
              Sign in with existing credentials
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
