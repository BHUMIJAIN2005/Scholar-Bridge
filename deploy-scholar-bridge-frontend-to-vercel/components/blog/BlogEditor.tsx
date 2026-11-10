'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import { blogApi } from '@/api/blogApi';
import type { BlogAttachment, BlogPost } from '@/api/blogApi';
import type { PaperSubmission } from '@/api/papersApi';
import { papersApi } from '@/api/papersApi';
import type { User } from '@/api/authApi';
import { useAuth } from '@/context/AuthContext';
import {
  AttachmentList,
  MarkdownEditor,
  RoleBadge,
} from '@/components/blog/BlogComponents';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function BlogEditor({ postId }: { postId?: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [linkedPaperId, setLinkedPaperId] = useState('');
  const [papers, setPapers] = useState<PaperSubmission[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<BlogAttachment[]>([]);
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const requests: Promise<unknown>[] = [];
      if (postId) requests.push(blogApi.getPost(postId));
      if (user?.role === 'STUDENT') requests.push(papersApi.getMyPapers());
      try {
        const [postData, papersData] = await Promise.all(requests);
        if (!active) return;
        if (postId) {
          const post = postData as BlogPost;
          if (post.authorName !== user?.name) {
            setError('Only the author can edit this post.');
            return;
          }
          setTitle(post.title);
          setContent(post.content);
          setTags(post.tags);
          setStatus(post.status);
          setLinkedPaperId(post.linkedPaper ? String(post.linkedPaper.id) : '');
          setAttachments(post.attachments);
        }
        if (user?.role === 'STUDENT') setPapers((papersData as PaperSubmission[]) ?? []);
      } catch {
        if (active) setError('Could not load the post or your papers. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [postId, user?.name, user?.role]);

  const addTags = (raw: string) => {
    const incoming = raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    const next = [...tags];
    for (const tag of incoming) {
      if (next.includes(tag)) continue;
      if (next.length >= 5) break;
      next.push(tag);
    }
    setTags(next);
    setTagInput('');
  };

  const selectFiles = (selected: FileList | null) => {
    if (!selected) return;
    const next = Array.from(selected);
    const invalid = next.find((file) => file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf'));
    if (invalid) {
      setError(`${invalid.name} is not a PDF file.`);
      return;
    }
    const tooLarge = next.find((file) => file.size > MAX_FILE_SIZE);
    if (tooLarge) {
      setError(`${tooLarge.name} exceeds the 10 MB limit.`);
      return;
    }
    if (attachments.length + files.length + next.length > 3) {
      setError('A post can have at most 3 PDF attachments.');
      return;
    }
    setError('');
    setFiles((current) => [...current, ...next]);
  };

  const removeAttachment = async (id: number) => {
    if (!window.confirm('Remove this attachment?')) return;
    setError('');
    try {
      await blogApi.deleteAttachment(id);
      setAttachments((current) => current.filter((attachment) => attachment.id !== id));
    } catch {
      setError('Could not remove this attachment. Please try again.');
    }
  };

  const save = async (nextStatus: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim() || !content.trim()) {
      setError('Add a title and post content before saving.');
      return;
    }
    if (tags.length > 5) {
      setError('Use no more than 5 tags.');
      return;
    }
    setSaving(true);
    setError('');
    let savedPost: BlogPost | null = null;
    try {
      const request = {
        title: title.trim(),
        content,
        tags,
        status: nextStatus,
        linkedPaperId: linkedPaperId ? Number(linkedPaperId) : null,
      };
      savedPost = postId
        ? await blogApi.updatePost(postId, request)
        : await blogApi.createPost(request);
      for (const file of files) {
        await blogApi.uploadAttachment(savedPost.id, file);
      }
      router.push(`/blog/${savedPost.id}`);
    } catch {
      setError(savedPost
        ? 'The post was saved, but an attachment could not be uploaded. You can retry from the edit page.'
        : 'Could not save your post. Please check the fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-ink/70"><Loader2 className="animate-spin text-leaf" /> Loading editor...</div>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href={postId ? `/blog/${postId}` : '/blog'} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink/70 hover:text-forest"><ArrowLeft size={16} /> Back</Link>
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-forest">Research Blog</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">{postId ? 'Edit your post' : 'Write a post'}</h1>
        {user && <div className="mt-2 flex items-center gap-2 text-sm text-ink/70">Posting as {user.name}<RoleBadge role={user.role} /></div>}
      </header>
      {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
      <div className="space-y-6 solid-card p-5 sm:p-8">
        <div>
          <label htmlFor="post-title" className="mb-2 block text-sm font-semibold text-ink">Title</label>
          <input id="post-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} required placeholder="A clear, descriptive title" className="w-full rounded-lg border border-sage/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40" />
          <p className="mt-1 text-right text-xs text-ink/50">{title.length}/150</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Content</label>
          <MarkdownEditor value={content} onChange={setContent} />
        </div>
        <div>
          <label htmlFor="blog-tags" className="mb-2 block text-sm font-semibold text-ink">Tags <span className="font-normal text-ink/60">(up to 5; lowercase)</span></label>
          <div className="flex gap-2">
            <input id="blog-tags" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTags(tagInput); } }} placeholder="Add a tag and press Enter" className="min-w-0 flex-1 rounded-lg border border-sage/40 bg-white px-3 py-2 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40" />
            <button type="button" onClick={() => addTags(tagInput)} disabled={!tagInput.trim() || tags.length >= 5} className="btn-secondary px-3 text-sm disabled:opacity-40">Add</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => <button key={tag} type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} aria-label={`Remove tag ${tag}`} className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-forest border border-sage/30">#{tag} ×</button>)}
          </div>
        </div>
        <div>
          <label htmlFor="blog-files" className="mb-2 block text-sm font-semibold text-ink">PDF attachments <span className="font-normal text-ink/60">(up to 3 files, 10 MB each)</span></label>
          {attachments.length > 0 && <AttachmentList attachments={attachments} canDelete onDelete={(id) => void removeAttachment(id)} />}
          <input id="blog-files" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => { selectFiles(event.target.files); event.target.value = ''; }} disabled={attachments.length + files.length >= 3} className="mt-3 block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-mint file:px-3 file:py-2 file:text-sm file:font-semibold file:text-forest hover:file:bg-mint/80 disabled:opacity-50" />
          {files.length > 0 && <ul className="mt-2 space-y-1">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex justify-between text-xs text-ink/70"><span>{file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</span><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-rose-600">Remove</button></li>)}</ul>}
        </div>
        {user?.role === 'STUDENT' && (
          <div>
            <label htmlFor="linked-paper" className="mb-2 block text-sm font-semibold text-ink">Link one of my papers <span className="font-normal text-ink/60">(optional)</span></label>
            <select id="linked-paper" value={linkedPaperId} onChange={(event) => setLinkedPaperId(event.target.value)} className="w-full rounded-lg border border-sage/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-3 focus:ring-leaf/40">
              <option value="">No linked paper</option>
              {papers.map((paper) => <option key={paper.id} value={paper.id}>{paper.title}</option>)}
            </select>
            {!papers.length && <p className="mt-1 text-xs text-ink/50">No papers are available to link.</p>}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-sage/20 pt-5">
          <button type="button" disabled={saving} onClick={() => void save('DRAFT')} className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button type="button" disabled={saving} onClick={() => void save('PUBLISHED')} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </main>
  );
}
