'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, PenLine, Trash2 } from 'lucide-react';
import { blogApi } from '@/api/blogApi';
import type { BlogPostStatus, BlogPostSummary } from '@/api/blogApi';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RoleBadge } from '@/components/blog/BlogComponents';

function MyBlogPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [tab, setTab] = useState<BlogPostStatus>('DRAFT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPosts(await blogApi.getMyPosts());
    } catch {
      setError('Could not load your posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const remove = async (post: BlogPostSummary) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(post.id);
    setError('');
    try {
      await blogApi.deletePost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
    } catch {
      setError('Could not delete this post. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const visible = posts.filter((post) => post.status === tab);
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Research Blog</p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-900">My posts</h1>
          <p className="mt-2 text-sm text-neutral-600">{user?.name} · manage drafts and published posts</p>
        </div>
        <Link href="/blog/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><PenLine size={16} /> New post</Link>
      </header>
      <div className="mb-5 flex border-b border-neutral-200">
        {(['DRAFT', 'PUBLISHED'] as const).map((value) => (
          <button key={value} type="button" onClick={() => setTab(value)} aria-pressed={tab === value} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === value ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
            {value === 'DRAFT' ? 'Drafts' : 'Published'} <span className="ml-1 text-xs">({posts.filter((post) => post.status === value).length})</span>
          </button>
        ))}
      </div>
      {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={17} />{error}<button onClick={() => void loadPosts()} className="ml-auto underline">Retry</button></div>}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-neutral-500"><Loader2 className="animate-spin text-emerald-600" /> Loading your posts...</div>
      ) : visible.length ? (
        <div className="space-y-3">
          {visible.map((post) => (
            <article key={post.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <RoleBadge role={post.authorRole} />
                  <time dateTime={post.updatedAt}>Updated {new Date(post.updatedAt).toLocaleDateString()}</time>
                </div>
                <Link href={`/blog/${post.id}`} className="text-lg font-bold text-neutral-900 hover:text-emerald-700">{post.title}</Link>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{post.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{post.tags.map((tag) => <span key={tag} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">#{tag}</span>)}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/blog/${post.id}/edit`} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Edit</Link>
                <button type="button" onClick={() => void remove(post)} disabled={deleting === post.id} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15} /> Delete</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        !error && <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-neutral-800">No {tab === 'DRAFT' ? 'drafts' : 'published posts'} yet</h2>
          <p className="mt-2 text-sm text-neutral-500">Create a post to share your research with the community.</p>
          <Link href="/blog/new" className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Write a post</Link>
        </div>
      )}
    </main>
  );
}

export default function MyBlogPostsPage() {
  return <ProtectedRoute><MyBlogPosts /></ProtectedRoute>;
}
