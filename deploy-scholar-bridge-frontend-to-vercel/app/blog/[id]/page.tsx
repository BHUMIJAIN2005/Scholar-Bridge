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
    return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-ink/70"><Loader2 className="animate-spin text-forest" /> Loading post...</div>;
  }
  if (error || !post) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div role="alert" className="solid-card border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <AlertCircle className="mx-auto mb-2 text-rose-500" />
          {error || 'Post unavailable'}
          <div>
            <Link href="/blog" className="mt-4 btn-secondary inline-block px-4 py-2 text-xs font-semibold">Back to blog</Link>
          </div>
        </div>
      </main>
    );
  }

  const isAuthor = String(user?.id) === String(post.authorId);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/blog" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink/70 hover:text-forest"><ArrowLeft size={16} /> All posts</Link>
      <article className="solid-card p-6 sm:p-10">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-ink/70">
          <span className="font-semibold text-ink">{post.authorName}</span>
          <RoleBadge role={post.authorRole} />
          <time dateTime={post.createdAt} className="text-xs text-ink/60">{new Date(post.createdAt).toLocaleDateString()}</time>
          {post.status === 'DRAFT' && <span className="rounded-full bg-mint text-forest border border-sage/30 px-2.5 py-0.5 text-xs font-semibold">Draft</span>}
          {isAuthor && (
            <div className="ml-auto flex gap-2">
              <Link href={`/blog/${post.id}/edit`} className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"><Pencil size={14} /> Edit</Link>
              <button type="button" onClick={() => void deletePost()} className="inline-flex items-center gap-1 rounded-[12px] border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition"><Trash2 size={14} /> Delete</button>
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{post.title}</h1>
        <p className="mt-4 text-lg leading-7 text-ink/80">{post.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className="rounded-full bg-mint/50 border border-sage/20 px-3 py-1 text-xs font-semibold text-forest hover:bg-mint hover:text-mid-green">#{tag}</Link>)}
        </div>
        {post.linkedPaper && <div className="mt-5 rounded-xl bg-mist border border-sage/20 p-3 text-sm text-ink"><strong className="text-forest">Linked research paper:</strong> {post.linkedPaper.title}</div>}
        <div className="my-8 border-t border-forest/10" />
        <MarkdownRenderer content={post.content} />
        {post.attachments.length > 0 && <section className="mt-10 space-y-3"><h2 className="text-lg font-bold text-ink">Attachments</h2><AttachmentList attachments={post.attachments} /></section>}
        {post.status === 'PUBLISHED' && (
          <>
            <div className="my-8 border-t border-forest/10" />
            <ReactionBar post={post} onChange={setPost} />
          </>
        )}
      </article>
      {post.status === 'PUBLISHED' ? (
        <div className="mt-8"><CommentSection postId={post.id} user={user!} postAuthorId={post.authorId} /></div>
      ) : (
        <p className="mt-6 solid-card p-4 text-sm text-ink/80">Comments and reactions are available after this post is published.</p>
      )}
    </main>
  );
}

export default function BlogDetailPage() {
  return <ProtectedRoute><BlogDetail /></ProtectedRoute>;
}
