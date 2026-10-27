import axiosClient from './axiosClient';

export interface Application {
  id: number;
  studentId: number;
  openingId: number;
  openingTitle?: string;
  facultyName?: string;
  statementOfInterest: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  appliedAt: string;
}

export interface ApplyRequest {
  openingId: number;
  statementOfInterest: string;
}

export const applicationsApi = {
  /**
   * Apply to a research opening (Student only).
   * Calls POST /api/applications
   */
  async apply(data: ApplyRequest): Promise<Application> {
    const response = await axiosClient.post<Application>('/api/applications', data);
    return response.data;
  },

  /**
   * Fetch current student's applications.
   * Calls GET /api/applications/my
   */
  async getMyApplications(): Promise<Application[]> {
    const response = await axiosClient.get<Application[]>('/api/applications/my');
    return response.data;
  },

  /**
   * Update applicant status (Faculty only).
   * Calls PUT /api/applications/{id}/status
   */
  async updateStatus(applicationId: number, status: 'ACCEPTED' | 'REJECTED'): Promise<Application> {
    const response = await axiosClient.put<Application>(`/api/applications/${applicationId}/status`, { status });
    return response.data;
  },
};

export default applicationsApi;
