'use client';

import BlogEditor from '@/components/blog/BlogEditor';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function NewBlogPostPage() {
  return <ProtectedRoute><BlogEditor /></ProtectedRoute>;
}
