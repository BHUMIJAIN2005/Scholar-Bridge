'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, PenLine, Search } from 'lucide-react';
import { blogApi } from '@/api/blogApi';
import type { BlogPage as BlogPageResult, BlogTag } from '@/api/blogApi';
import type { UserRole } from '@/api/authApi';
import { BlogCard } from '@/components/blog/BlogComponents';
import ProtectedRoute from '@/components/ProtectedRoute';

function BlogFeed() {
  const [result, setResult] = useState<BlogPageResult | null>(null);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [role, setRole] = useState<'' | UserRole>('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialTag = params.get('tag')?.toLowerCase() ?? '';
    const initialSearch = params.get('q') ?? '';
    setTag(initialTag);
    setQuery(initialSearch);
    setSearch(initialSearch);
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [feed, availableTags] = await Promise.all([
        blogApi.getFeed({ page, tag: tag || undefined, authorRole: role || undefined, q: search || undefined }),
        blogApi.getTags(),
      ]);
      setResult(feed);
      setTags(availableTags);
    } catch {
      setError('Could not load the research blog. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [page, role, search, tag]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setSearch(query.trim());
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Research Blog</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900">Ideas worth sharing</h1>
          <p className="mt-2 text-neutral-600">Research notes, discoveries, and perspectives from our community.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/blog/my" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">My posts</Link>
          <Link href="/blog/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <PenLine size={16} /> Write a post
          </Link>
        </div>
      </header>

      <section className="mb-6 space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm" aria-label="Filter blog posts">
        <form onSubmit={submitSearch} className="flex gap-2">
          <label htmlFor="blog-search" className="sr-only">Search post titles</label>
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input id="blog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search post titles..." className="w-full rounded-lg border border-neutral-300 py-2.5 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none" />
          </div>
          <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">Search</button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase text-neutral-500">Author</span>
          {([
            ['', 'All'],
            ['STUDENT', 'Students'],
            ['FACULTY', 'Faculty'],
          ] as const).map(([value, label]) => (
            <button key={value || 'all'} type="button" onClick={() => { setRole(value); setPage(0); }} aria-pressed={role === value} className={`rounded-full border px-3 py-1 text-xs font-medium ${role === value ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
              {label}
            </button>
          ))}
          {tags.length > 0 && <span className="ml-3 mr-1 text-xs font-semibold uppercase text-neutral-500">Tags</span>}
          {tags.map((item) => (
            <button key={item.name} type="button" onClick={() => { setTag(tag === item.name ? '' : item.name); setPage(0); }} aria-pressed={tag === item.name} className={`rounded-full border px-3 py-1 text-xs font-medium ${tag === item.name ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
              #{item.name}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} /> {error}
          <button type="button" onClick={() => void loadFeed()} className="ml-auto font-semibold underline">Retry</button>
        </div>
      )}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-neutral-500"><Loader2 className="animate-spin text-emerald-600" /> Loading posts...</div>
      ) : result?.content.length ? (
        <>
          <div className="space-y-4">
            {result.content.map((post) => <BlogCard key={post.id} post={post} />)}
          </div>
          <nav aria-label="Blog pagination" className="mt-8 flex items-center justify-center gap-4">
            <button type="button" disabled={result.first} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-40">Previous</button>
            <span className="text-sm text-neutral-600">Page {result.number + 1} of {Math.max(result.totalPages, 1)}</span>
            <button type="button" disabled={result.last} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-40">Next</button>
          </nav>
        </>
      ) : (
        !error && <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-neutral-800">No posts found</h2>
          <p className="mt-2 text-sm text-neutral-500">Try another search or filter, or share your own research.</p>
          <Link href="/blog/new" className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Write a post</Link>
        </div>
      )}
    </main>
  );
}

export default function BlogPage() {
  return <ProtectedRoute><BlogFeed /></ProtectedRoute>;
}
