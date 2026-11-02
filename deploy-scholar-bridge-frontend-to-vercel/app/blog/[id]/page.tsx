'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import { blogApi } from '@/api/blogApi';
import type { BlogPost } from '@/api/blogApi';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  AttachmentList,
  CommentSection,
  MarkdownRenderer,
  ReactionBar,
  RoleBadge,
} from '@/components/blog/BlogComponents';

function BlogDetail() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPost = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPost(await blogApi.getPost(postId));
    } catch {
      setError('This post could not be found or you do not have permission to view it.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!Number.isFinite(postId) || postId < 1) {
      setError('Invalid post address.');
      setLoading(false);
      return;
    }
    void loadPost();
  }, [loadPost, postId]);

  const deletePost = async () => {
    if (!post || !window.confirm('Delete this post and its attachments? This cannot be undone.')) return;
    try {
      await blogApi.deletePost(post.id);
      router.push('/blog/my');
    } catch {
      setError('Could not delete this post. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-neutral-500"><Loader2 className="animate-spin text-emerald-600" /> Loading post...</div>;
  }
  if (error || !post) {
    return <main className="mx-auto max-w-3xl px-4 py-12"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700"><AlertCircle className="mx-auto mb-2" />{error || 'Post unavailable'}<div><Link href="/blog" className="mt-4 inline-block font-semibold underline">Back to blog</Link></div></div></main>;
  }

  const isAuthor = String(user?.id) === String(post.authorId);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/blog" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"><ArrowLeft size={16} /> All posts</Link>
      <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span className="font-semibold text-neutral-800">{post.authorName}</span>
          <RoleBadge role={post.authorRole} />
          <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString()}</time>
          {post.status === 'DRAFT' && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Draft</span>}
          {isAuthor && (
            <div className="ml-auto flex gap-2">
              <Link href={`/blog/${post.id}/edit`} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"><Pencil size={14} /> Edit</Link>
              <button type="button" onClick={() => void deletePost()} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={14} /> Delete</button>
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">{post.title}</h1>
        <p className="mt-4 text-lg leading-7 text-neutral-600">{post.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700">#{tag}</Link>)}
        </div>
        {post.linkedPaper && <div className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Linked research paper:</strong> {post.linkedPaper.title}</div>}
        <div className="my-8 border-t border-neutral-100" />
        <MarkdownRenderer content={post.content} />
        {post.attachments.length > 0 && <section className="mt-10 space-y-3"><h2 className="text-lg font-bold text-neutral-900">Attachments</h2><AttachmentList attachments={post.attachments} /></section>}
        {post.status === 'PUBLISHED' && (
          <>
            <div className="my-8 border-t border-neutral-100" />
            <ReactionBar post={post} onChange={setPost} />
          </>
        )}
      </article>
      {post.status === 'PUBLISHED' ? (
        <div className="mt-8"><CommentSection postId={post.id} user={user!} postAuthorId={post.authorId} /></div>
      ) : (
        <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Comments and reactions are available after this post is published.</p>
      )}
    </main>
  );
}

export default function BlogDetailPage() {
  return <ProtectedRoute><BlogDetail /></ProtectedRoute>;
}
