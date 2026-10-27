import axiosClient from './axiosClient';

export interface Conference {
  id: number;
  name: string;
  department: string;
  submissionDeadline: string;
  eventDate: string;
  tracks: string[];
}

export interface ConferenceSubmission {
  id: number;
  paperId: number;
  conferenceId: number;
  track: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
  reviewComments?: string;
  paperTitle?: string;
  studentName?: string;
}

export interface SubmitToConferenceRequest {
  paperId: number;
  track: string;
}

export const conferenceApi = {
  /**
   * List open conferences.
   * Calls GET /api/conferences
   */
  async getAll(): Promise<Conference[]> {
    const response = await axiosClient.get<Conference[]>('/api/conferences');
    return response.data;
  },

  /**
   * Submit a paper to a conference (Student only).
   * Calls POST /api/conferences/{id}/submit
   */
  async submit(conferenceId: number, data: SubmitToConferenceRequest): Promise<ConferenceSubmission> {
    const response = await axiosClient.post<ConferenceSubmission>(`/api/conferences/${conferenceId}/submit`, data);
    return response.data;
  },

  /**
   * Review submissions for conference (Faculty only).
   * Calls GET /api/conferences/{id}/submissions
   */
  async getSubmissions(conferenceId: number): Promise<ConferenceSubmission[]> {
    const response = await axiosClient.get<ConferenceSubmission[]>(`/api/conferences/${conferenceId}/submissions`);
    return response.data;
  },

  /**
   * Accept or reject submission with comments (Faculty only).
   * Calls PUT /api/submissions/{id}/status
   */
  async updateStatus(
    submissionId: number,
    status: 'ACCEPTED' | 'REJECTED',
    reviewComments?: string
  ): Promise<ConferenceSubmission> {
    const response = await axiosClient.put<ConferenceSubmission>(`/api/submissions/${submissionId}/status`, {
      status,
      reviewComments,
    });
    return response.data;
  },

  /**
   * Get showcase papers for conference (Public).
   * Calls GET /api/conferences/{id}/showcase
   */
  async getShowcase(conferenceId: number): Promise<ConferenceSubmission[]> {
    const response = await axiosClient.get<ConferenceSubmission[]>(`/api/conferences/${conferenceId}/showcase`);
    return response.data;
  },
};

export default conferenceApi;
