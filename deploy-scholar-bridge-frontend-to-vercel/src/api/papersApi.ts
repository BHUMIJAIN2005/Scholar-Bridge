import axiosClient from './axiosClient';

export interface PaperSubmission {
  id: number;
  studentId: number;
  title: string;
  fileUrl: string;
  category?: string;
  confidenceScore?: number;
  status: 'PROCESSING' | 'DONE' | 'FAILED';
  uploadedAt: string;
}

export const papersApi = {
  /**
   * Upload a research paper (PDF multipart) (Student only).
   * Calls POST /api/papers/upload
   */
  async upload(file: File, title: string): Promise<PaperSubmission> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    const response = await axiosClient.post<PaperSubmission>('/api/papers/upload', formData);
    return response.data;
  },

  /**
   * List student's own papers.
   * Calls GET /api/papers/my
   */
  async getMyPapers(): Promise<PaperSubmission[]> {
    const response = await axiosClient.get<PaperSubmission[]>('/api/papers/my');
    return response.data;
  },
};

export default papersApi;
