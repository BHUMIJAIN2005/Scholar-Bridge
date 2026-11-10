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
          <p className="text-sm font-semibold uppercase tracking-wide text-forest">Research Blog</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">My posts</h1>
          <p className="mt-2 text-sm text-ink/70">{user?.name} · manage drafts and published posts</p>
        </div>
        <Link href="/blog/new" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"><PenLine size={16} /> New post</Link>
      </header>
      <div className="mb-5 flex border-b border-forest/10">
        {(['DRAFT', 'PUBLISHED'] as const).map((value) => (
          <button key={value} type="button" onClick={() => setTab(value)} aria-pressed={tab === value} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === value ? 'border-forest text-forest' : 'border-transparent text-ink/60 hover:text-ink'}`}>
            {value === 'DRAFT' ? 'Drafts' : 'Published'} <span className="ml-1 text-xs">({posts.filter((post) => post.status === value).length})</span>
          </button>
        ))}
      </div>
      {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700"><AlertCircle size={17} />{error}<button onClick={() => void loadPosts()} className="ml-auto underline">Retry</button></div>}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-ink/70"><Loader2 className="animate-spin text-forest" /> Loading your posts...</div>
      ) : visible.length ? (
        <div className="space-y-3">
          {visible.map((post) => (
            <article key={post.id} className="solid-card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                  <RoleBadge role={post.authorRole} />
                  <time dateTime={post.updatedAt}>Updated {new Date(post.updatedAt).toLocaleDateString()}</time>
                </div>
                <Link href={`/blog/${post.id}`} className="text-lg font-bold text-ink hover:text-forest">{post.title}</Link>
                <p className="mt-1 line-clamp-2 text-sm text-ink/80">{post.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{post.tags.map((tag) => <span key={tag} className="rounded-full bg-mint/50 border border-sage/20 px-2 py-0.5 text-xs font-semibold text-forest">#{tag}</span>)}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/blog/${post.id}/edit`} className="btn-secondary px-3 py-1.5 text-xs font-semibold">Edit</Link>
                <button type="button" onClick={() => void remove(post)} disabled={deleting === post.id} className="inline-flex items-center gap-1 rounded-[12px] border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition"><Trash2 size={15} /> Delete</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        !error && <div className="solid-card border-dashed border-sage/40 px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-ink">No {tab === 'DRAFT' ? 'drafts' : 'published posts'} yet</h2>
          <p className="mt-2 text-sm text-ink/70">Create a post to share your research with the community.</p>
          <Link href="/blog/new" className="mt-4 btn-primary inline-flex px-4 py-2 text-sm font-semibold">Write a post</Link>
        </div>
      )}
    </main>
  );
}

export default function MyBlogPostsPage() {
  return <ProtectedRoute><MyBlogPosts /></ProtectedRoute>;
}
