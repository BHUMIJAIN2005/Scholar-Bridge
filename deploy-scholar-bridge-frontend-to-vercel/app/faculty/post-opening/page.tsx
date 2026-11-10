'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { openingsApi } from '@/api/openingsApi';
import { PlusCircle, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PostOpeningPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [seats, setSeats] = useState(2);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await openingsApi.create({
        title,
        description,
        requiredSkills,
        seats: Number(seats),
      });
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/faculty/dashboard');
      }, 1500);
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not publish the opportunity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          href="/faculty/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70 hover:text-forest transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Faculty Dashboard</span>
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-ink">Post a Research Opening</h1>
          <p className="text-xs text-ink/70 mt-1">
            Create an undergraduate research opportunity for students at MITS DU.
          </p>
        </div>

        {isSuccess && (
          <div className="p-4 bg-mint/40 border border-sage/40 rounded-xl flex items-center gap-2 text-xs text-forest font-semibold">
            <CheckCircle2 size={16} className="text-leaf shrink-0" />
            <span>Research opening published successfully! Redirecting to dashboard...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="solid-card p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1.5">
              Opening Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scalable Graph Neural Networks for Social Network Analysis"
              className="w-full px-3.5 py-2.5 rounded-lg border border-sage/40 bg-white text-ink text-sm focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1.5">
              Project Description &amp; Responsibilities *
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the lab's problem statement, student expectations, and anticipated research deliverables..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-sage/40 bg-white text-ink text-sm focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1.5">
                Required Technical Skills (comma-separated) *
              </label>
              <input
                type="text"
                required
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                placeholder="e.g. Python, PyTorch, Graph Theory"
                className="w-full px-3.5 py-2.5 rounded-lg border border-sage/40 bg-white text-ink text-sm focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1.5">
                Available Student Seats *
              </label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-sage/40 bg-white text-ink text-sm focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-sage/20 flex items-center justify-end gap-3">
            <Link
              href="/faculty/dashboard"
              className="btn-secondary px-4 py-2 text-xs"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-5 py-2.5 text-xs flex items-center gap-2 disabled:opacity-50"
            >
              <PlusCircle size={15} />
              <span>Publish Opening</span>
            </button>
          </div>
        </form>
      </main>
    </ProtectedRoute>
  );
}
