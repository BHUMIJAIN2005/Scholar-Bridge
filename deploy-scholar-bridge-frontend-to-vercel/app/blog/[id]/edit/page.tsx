'use client';

import { useParams } from 'next/navigation';
import BlogEditor from '@/components/blog/BlogEditor';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);
  return <ProtectedRoute><BlogEditor postId={postId} /></ProtectedRoute>;
}
