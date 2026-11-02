import axiosClient from './axiosClient';
import type { UserRole } from './authApi';

export type BlogPostStatus = 'DRAFT' | 'PUBLISHED';
export type BlogReactionType = 'LIKE' | 'INSIGHTFUL' | 'HELPFUL' | 'INSPIRING';

export interface BlogPaper {
  id: number;
  title: string;
  category?: string | null;
}

export interface BlogAttachment {
  id: number;
  originalFileName: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface BlogPostSummary {
  id: number;
  authorName: string;
  authorRole: UserRole;
  title: string;
  summary: string;
  status: BlogPostStatus;
  linkedPaper: BlogPaper | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost extends BlogPostSummary {
  authorId: number;
  content: string;
  attachments: BlogAttachment[];
  reactionCounts: Partial<Record<BlogReactionType, number>>;
  currentUserReaction: BlogReactionType | null;
}

export interface BlogComment {
  id: number;
  authorId: number;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  replies: BlogComment[];
}

export interface BlogTag {
  name: string;
  postCount: number;
}

export interface BlogPostRequest {
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  status: BlogPostStatus;
  linkedPaperId?: number | null;
}

export interface BlogPage {
  content: BlogPostSummary[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export const blogApi = {
  async getFeed(params: {
    page?: number;
    tag?: string;
    authorRole?: UserRole;
    q?: string;
  } = {}): Promise<BlogPage> {
    const response = await axiosClient.get<BlogPage>('/api/blogs', { params });
    return response.data;
  },

  async getMyPosts(): Promise<BlogPostSummary[]> {
    const response = await axiosClient.get<BlogPostSummary[]>('/api/blogs/my');
    return response.data;
  },

  async getTags(): Promise<BlogTag[]> {
    const response = await axiosClient.get<BlogTag[]>('/api/blogs/tags');
    return response.data;
  },

  async getPost(id: number): Promise<BlogPost> {
    const response = await axiosClient.get<BlogPost>(`/api/blogs/${id}`);
    return response.data;
  },

  async createPost(request: BlogPostRequest): Promise<BlogPost> {
    const response = await axiosClient.post<BlogPost>('/api/blogs', request);
    return response.data;
  },

  async updatePost(id: number, request: BlogPostRequest): Promise<BlogPost> {
    const response = await axiosClient.put<BlogPost>(`/api/blogs/${id}`, request);
    return response.data;
  },

  async deletePost(id: number): Promise<void> {
    await axiosClient.delete(`/api/blogs/${id}`);
  },

  async uploadAttachment(postId: number, file: File): Promise<BlogAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post<BlogAttachment>(
      `/api/blogs/${postId}/attachments`,
      formData
    );
    return response.data;
  },

  async downloadAttachment(id: number): Promise<Blob> {
    const response = await axiosClient.get<Blob>(`/api/blogs/attachments/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async deleteAttachment(id: number): Promise<void> {
    await axiosClient.delete(`/api/blogs/attachments/${id}`);
  },

  async setReaction(id: number, type: BlogReactionType | null): Promise<BlogPost> {
    const response = await axiosClient.put<BlogPost>(`/api/blogs/${id}/reaction`, { type });
    return response.data;
  },

  async getComments(id: number): Promise<BlogComment[]> {
    const response = await axiosClient.get<BlogComment[]>(`/api/blogs/${id}/comments`);
    return response.data;
  },

  async createComment(
    postId: number,
    content: string,
    parentCommentId?: number
  ): Promise<BlogComment> {
    const response = await axiosClient.post<BlogComment>(`/api/blogs/${postId}/comments`, {
      content,
      parentCommentId,
    });
    return response.data;
  },

  async updateComment(id: number, content: string): Promise<BlogComment> {
    const response = await axiosClient.put<BlogComment>(`/api/blogs/comments/${id}`, { content });
    return response.data;
  },

  async deleteComment(id: number): Promise<void> {
    await axiosClient.delete(`/api/blogs/comments/${id}`);
  },

  async toggleCommentLike(id: number): Promise<{ liked: boolean }> {
    const response = await axiosClient.put<{ liked: boolean }>(
      `/api/blogs/comments/${id}/like`
    );
    return response.data;
  },
};

export default blogApi;
