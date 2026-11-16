import axiosClient from './axiosClient';

export interface ResearchOpening {
  id: number;
  facultyId: number;
  facultyName?: string;
  department?: string;
  title: string;
  description: string;
  requiredSkills: string;
  preferredSkills: string[];
  preferredYears: string[];
  eligibilityCriteria: string[];
  seats: number;
  deadline?: string | null;
  status: 'OPEN' | 'CLOSED';
  recommendationSyncPending: boolean;
  createdAt?: string;
}

export interface CreateOpeningRequest {
  title: string;
  description: string;
  requiredSkills: string;
  seats: number;
  preferredSkills?: string[];
  preferredYears?: string[];
  eligibilityCriteria?: string[];
  deadline?: string | null;
  status?: 'OPEN' | 'CLOSED';
}

export interface RecommendedOpening {
  opening: ResearchOpening;
  matchScore: number;
  relevanceScore: number;
  matchingReasons: string[];
  eligibilityGaps: string[];
}

export interface ApplicantSummary {
  applicationId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  skills: string;
  year: string;
  statementOfInterest: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  appliedAt: string;
  papers?: Array<{
    id: number;
    title: string;
    category: string;
    confidenceScore: number;
  }>;
}

export const openingsApi = {
  /**
   * Fetch all openings with optional keyword/skill filter.
   * Calls GET /api/openings
   */
  async getAll(params?: { search?: string; skill?: string }): Promise<ResearchOpening[]> {
    const response = await axiosClient.get<ResearchOpening[]>('/api/openings', { params });
    return response.data;
  },

  async getRecommended(): Promise<RecommendedOpening[]> {
    const response = await axiosClient.get<RecommendedOpening[]>('/api/students/me/recommended-opportunities');
    return response.data;
  },

  /**
   * Fetch a single opening detail by ID.
   * Calls GET /api/openings/{id}
   */
  async getById(id: number | string): Promise<ResearchOpening> {
    const response = await axiosClient.get<ResearchOpening>(`/api/openings/${id}`);
    return response.data;
  },

  /**
   * Create a new research opening (Faculty only).
   * Calls POST /api/openings
   */
  async create(data: CreateOpeningRequest): Promise<ResearchOpening> {
    const response = await axiosClient.post<ResearchOpening>('/api/openings', data);
    return response.data;
  },

  async update(id: number | string, data: CreateOpeningRequest & { status: 'OPEN' | 'CLOSED' }): Promise<ResearchOpening> {
    const response = await axiosClient.put<ResearchOpening>(`/api/openings/${id}`, data);
    return response.data;
  },

  /**
   * Fetch applicants for an opening (Faculty only).
   * Calls GET /api/openings/{id}/applicants
   */
  async getApplicants(openingId: number | string): Promise<ApplicantSummary[]> {
    const response = await axiosClient.get<ApplicantSummary[]>(`/api/openings/${openingId}/applicants`);
    return response.data;
  },
};

export default openingsApi;
