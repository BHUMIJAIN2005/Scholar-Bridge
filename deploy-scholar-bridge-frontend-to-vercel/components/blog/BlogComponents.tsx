'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen,
  Download,
  Heart,
  Lightbulb,
  Loader2,
  MessageCircle,
  Sparkles,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { blogApi } from '@/api/blogApi';
import type {
  BlogAttachment,
  BlogComment,
  BlogPost,
  BlogPostSummary,
  BlogReactionType,
} from '@/api/blogApi';
import type { User } from '@/api/authApi';

const roleStyles = {
  STUDENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FACULTY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
} as const;

export function RoleBadge({ role }: { role: User['role'] }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleStyles[role]}`}>
      {role === 'FACULTY' ? 'Faculty' : 'Student'}
    </span>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="max-w-none break-words [&_a]:font-medium [&_a]:text-emerald-700 [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-200 [&_blockquote]:pl-4 [&_blockquote]:text-neutral-600 [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_hr]:my-6 [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-neutral-900 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-white [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export function BlogCard({ post }: { post: BlogPostSummary }) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
        <span className="font-medium text-neutral-800">{post.authorName}</span>
        <RoleBadge role={post.authorRole} />
        <span aria-hidden="true">·</span>
        <time dateTime={post.createdAt}>
          {new Date(post.createdAt).toLocaleDateString()}
        </time>
      </div>
      <Link href={`/blog/${post.id}`} className="group">
        <h2 className="text-xl font-bold text-neutral-900 group-hover:text-emerald-700">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">{post.summary}</p>
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {post.tags.map((tag) => (
          <Link
            key={tag}
            href={`/blog?tag=${encodeURIComponent(tag)}`}
            className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700"
          >
            #{tag}
          </Link>
        ))}
        {post.linkedPaper && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-neutral-500">
            <BookOpen size={14} /> {post.linkedPaper.title}
          </span>
        )}
      </div>
    </article>
  );
}

export function MarkdownEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300">
      <div className="flex border-b border-neutral-200 bg-neutral-50">
        <button type="button" onClick={() => setPreview(false)} className={`px-4 py-2 text-sm font-medium ${!preview ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-neutral-500'}`}>
          Write
        </button>
        <button type="button" onClick={() => setPreview(true)} className={`px-4 py-2 text-sm font-medium ${preview ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-neutral-500'}`}>
          Preview
        </button>
      </div>
      {preview ? (
        <div className="min-h-64 p-4">
          {value ? <MarkdownRenderer content={value} /> : <p className="text-sm text-neutral-400">Nothing to preview yet.</p>}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={14}
          required
          aria-label="Post content in Markdown"
          placeholder="Write your research story in Markdown..."
          className="block min-h-64 w-full resize-y p-4 font-mono text-sm leading-6 outline-none"
        />
      )}
    </div>
  );
}

const reactionOptions: { type: BlogReactionType; label: string; icon: typeof Heart }[] = [
  { type: 'LIKE', label: 'Like', icon: Heart },
  { type: 'INSIGHTFUL', label: 'Insightful', icon: Lightbulb },
  { type: 'HELPFUL', label: 'Helpful', icon: ThumbsUp },
  { type: 'INSPIRING', label: 'Inspiring', icon: Sparkles },
];

export function ReactionBar({
  post,
  onChange,
}: {
  post: BlogPost;
  onChange: (updated: BlogPost) => void;
}) {
  const [busy, setBusy] = useState<BlogReactionType | null>(null);
  const [error, setError] = useState('');
  const react = async (type: BlogReactionType) => {
    if (busy) return;
    const next = post.currentUserReaction === type ? null : type;
    const previous = post;
    setBusy(type);
    setError('');
    const counts = { ...post.reactionCounts };
    if (post.currentUserReaction) {
      counts[post.currentUserReaction] = Math.max(0, (counts[post.currentUserReaction] ?? 0) - 1);
    }
    if (next) counts[next] = (counts[next] ?? 0) + 1;
    onChange({ ...post, reactionCounts: counts, currentUserReaction: next });
    try {
      onChange(await blogApi.setReaction(post.id, next));
    } catch {
      onChange(previous);
      setError('Could not update your reaction. Please try again.');
    } finally {
      setBusy(null);
    }
  };
  return (
    <section aria-label="Reactions">
      <div className="flex flex-wrap gap-2">
        {reactionOptions.map(({ type, label, icon: Icon }) => {
          const active = post.currentUserReaction === type;
          return (
            <button key={type} type="button" onClick={() => void react(type)} disabled={!!busy} aria-pressed={active} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm disabled:opacity-60 ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
              {busy === type ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
              {label} <span>{post.reactionCounts[type] ?? 0}</span>
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
    </section>
  );
}

export function AttachmentList({
  attachments,
  onDelete,
  canDelete = false,
}: {
  attachments: BlogAttachment[];
  onDelete?: (id: number) => void;
  canDelete?: boolean;
}) {
  const [downloading, setDownloading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const download = async (attachment: BlogAttachment) => {
    setDownloading(attachment.id);
    setError('');
    try {
      const blob = await blogApi.downloadAttachment(attachment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.originalFileName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Could not download this attachment. Please try again.');
    } finally {
      setDownloading(null);
    }
  };
  if (!attachments.length) return null;
  return (
    <div>
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="flex items-center justify-between gap-3 p-3">
            <span className="min-w-0 truncate text-sm text-neutral-700">{attachment.originalFileName}</span>
            <span className="shrink-0 text-xs text-neutral-400">{(attachment.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
            <button type="button" onClick={() => void download(attachment)} disabled={downloading === attachment.id} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50">
              {downloading === attachment.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Download
            </button>
            {canDelete && onDelete && (
              <button type="button" onClick={() => onDelete(attachment.id)} aria-label={`Remove ${attachment.originalFileName}`} className="rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  user,
  isPostAuthor,
  isReply = false,
  onChange,
}: {
  comment: BlogComment;
  postId: number;
  user: User;
  isPostAuthor: boolean;
  isReply?: boolean;
  onChange: () => Promise<void>;
}) {
  const [reply, setReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isAuthor = String(comment.authorId) === String(user.id);
  const mayDelete = isAuthor || isPostAuthor;

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await blogApi.createComment(postId, replyText.trim(), comment.id);
      setReplyText('');
      setReply(false);
      await onChange();
    } catch {
      setError('Could not post your reply. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = async () => {
    setBusy(true);
    setError('');
    try {
      await blogApi.toggleCommentLike(comment.id);
      await onChange();
    } catch {
      setError('Could not update your like. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await blogApi.updateComment(comment.id, editText.trim());
      setEditing(false);
      await onChange();
    } catch {
      setError('Could not update this comment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const deleteComment = async () => {
    if (!window.confirm('Delete this comment?')) return;
    setBusy(true);
    setError('');
    try {
      await blogApi.deleteComment(comment.id);
      await onChange();
    } catch {
      setError('Could not delete this comment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-neutral-800">{comment.authorName}</span>
        <RoleBadge role={comment.authorRole} />
        <time className="text-xs text-neutral-400" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
      </div>
      {editing ? (
        <form onSubmit={(event) => void saveEdit(event)} className="mt-3 space-y-2">
          <textarea value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={1000} required className="w-full rounded-lg border border-neutral-300 p-2 text-sm" />
          <button disabled={busy || !editText.trim()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="ml-2 text-sm text-neutral-500">Cancel</button>
        </form>
      ) : (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">{comment.content}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="button" disabled={busy} onClick={() => void toggleLike()} aria-pressed={comment.likedByCurrentUser} className={`inline-flex items-center gap-1 text-xs ${comment.likedByCurrentUser ? 'text-rose-600' : 'text-neutral-500'} disabled:opacity-50`}>
          <Heart size={14} fill={comment.likedByCurrentUser ? 'currentColor' : 'none'} /> {comment.likeCount}
        </button>
        {!isReply && (
          <button type="button" onClick={() => setReply((value) => !value)} className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-emerald-700">
            <MessageCircle size={14} /> Reply
          </button>
        )}
        {isAuthor && !editing && <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-500 hover:text-emerald-700">Edit</button>}
        {mayDelete && <button type="button" onClick={() => void deleteComment()} disabled={busy} className="text-xs text-rose-600 hover:text-rose-800">Delete</button>}
      </div>
      {reply && (
        <form onSubmit={(event) => void submitReply(event)} className="mt-3 flex gap-2">
          <input value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={1000} required placeholder="Write a reply..." className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <button disabled={busy || !replyText.trim()} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Reply</button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
      {comment.replies.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-neutral-100 pl-4">
          {comment.replies.map((child) => (
            <CommentItem key={child.id} comment={child} postId={postId} user={user} isPostAuthor={isPostAuthor} isReply onChange={onChange} />
          ))}
        </div>
      )}
    </article>
  );
}

export function CommentSection({
  postId,
  user,
  postAuthorId,
}: {
  postId: number;
  user: User;
  postAuthorId: number;
}) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    try {
      setComments(await blogApi.getComments(postId));
      setError('');
    } catch {
      setError('Could not load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => {
    void loadComments();
  }, [postId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await blogApi.createComment(postId, content.trim());
      setContent('');
      await loadComments();
    } catch {
      setError('Could not post your comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-5">
      <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-900"><MessageCircle size={20} /> Discussion</h2>
      <form onSubmit={(event) => void submit(event)} className="space-y-2">
        <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={1000} required rows={3} placeholder="Share a thoughtful comment..." className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:border-emerald-500 focus:outline-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">{content.length}/1000</span>
          <button disabled={submitting || !content.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{submitting ? 'Posting...' : 'Post comment'}</button>
        </div>
      </form>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={17} className="animate-spin" /> Loading comments...</div>
      ) : comments.length ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={postId} user={user} isPostAuthor={String(postAuthorId) === String(user.id)} onChange={loadComments} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">No comments yet. Start the discussion.</p>
      )}
    </section>
  );
}
