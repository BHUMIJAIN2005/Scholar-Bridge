import axiosClient from './axiosClient';
import axios from 'axios';

export interface ResearchProfile {
  research_interests: string[];
  research_domains: string[];
  methods: string[];
  publications: string[];
  contributions: string[];
  embedding_text: string;
}

export interface LaymanSummary {
  tldr: string;
  why_it_matters: string;
  key_insight: string;
  analogy: string;
  glossary: Array<{ term: string; definition: string }>;
}

export interface StatedRequirements {
  preferred_skills: string[];
  preferred_years: string[];
  notes?: string | null;
}

export interface DocumentMetadata {
  filename: string;
  document_type: string;
  extraction_method: string;
  extracted_char_count: number;
  status: string;
  warnings: string[];
}

export interface AnalysisResult {
  draft_id: string;
  status: string;
  no_research_content: boolean;
  research_profile: ResearchProfile | null;
  stated_requirements: StatedRequirements | null;
  layman_summary: LaymanSummary | null;
  reason?: string | null;
  extraction_metadata: DocumentMetadata[];
  warnings: string[];
}

export interface ProfileConfirmRequest {
  research_profile: ResearchProfile;
  stated_requirements: StatedRequirements | null;
  layman_summary: LaymanSummary | null;
  draft_id?: string | null;
}

export interface ProfileStatusResponse {
  faculty_id?: number | string;
  professor_id?: string;
  is_confirmed: boolean;
  confirmed_at?: string | null;
  research_profile?: ResearchProfile | null;
  stated_requirements?: StatedRequirements | null;
  layman_summary?: LaymanSummary | null;
}

export interface StudentMatch {
  student_id: string | number;
  student_name: string;
  department: string;
  academic_year: string;
  research_interests: string[];
  relevant_technical_skills: string[];
  match_score: number;
  research_similarity_score: number;
  skill_match_score?: number | null;
  experience_match_score?: number | null;
  preference_match_score?: number | null;
  shared_research_interests?: string[];
  why_matched: string;
}

const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000';

export const facultyResearchProfileApi = {
  /**
   * Upload and analyze professor documents (CV and research papers).
   * Primary route: Spring Boot backend (/api/faculty/research-profile/analyze).
   * Fallback: FastAPI ML microservice (/professor/analyze-documents).
   */
  async analyzeDocuments(files: File[], documentTypes: string[]): Promise<AnalysisResult> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    documentTypes.forEach((type) => formData.append('document_types', type));

    try {
      // Primary: Route via Spring Boot backend
      const response = await axiosClient.post<AnalysisResult>(
        '/api/faculty/research-profile/analyze',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90000,
        }
      );
      return response.data;
    } catch (error: any) {
      // Fallback directly to ML service if Spring Boot is offline or unrouted
      if (
        !error.response ||
        error.code === 'ECONNREFUSED' ||
        error.response?.status === 404 ||
        error.response?.status === 502
      ) {
        console.warn('Spring Boot endpoint unavailable, falling back to ML service:', ML_SERVICE_URL);
        const fallbackRes = await axios.post<AnalysisResult>(
          `${ML_SERVICE_URL}/professor/analyze-documents`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 90000,
          }
        );
        return fallbackRes.data;
      }
      throw error;
    }
  },

  /**
   * Confirm research profile, generate final 384-dim embedding, and persist to database.
   */
  async confirmProfile(
    payload: ProfileConfirmRequest,
    professorId: string | number = 'me'
  ): Promise<any> {
    try {
      const response = await axiosClient.put(
        '/api/faculty/research-profile/confirm',
        payload
      );
      return response.data;
    } catch (error: any) {
      if (
        !error.response ||
        error.code === 'ECONNREFUSED' ||
        error.response?.status === 404 ||
        error.response?.status === 502
      ) {
        console.warn('Falling back to ML service for confirmation');
        const fallbackRes = await axios.put(
          `${ML_SERVICE_URL}/professor/${professorId}/research-profile/confirm`,
          payload
        );
        return fallbackRes.data;
      }
      throw error;
    }
  },

  /**
   * Retrieve confirmed research profile.
   */
  async getConfirmedProfile(professorId: string | number = 'me'): Promise<ProfileStatusResponse> {
    try {
      const response = await axiosClient.get<ProfileStatusResponse>(
        '/api/faculty/research-profile'
      );
      return response.data;
    } catch (error: any) {
      if (
        !error.response ||
        error.code === 'ECONNREFUSED' ||
        error.response?.status === 404 ||
        error.response?.status === 502
      ) {
        try {
          const fallbackRes = await axios.get<any>(
            `${ML_SERVICE_URL}/professor/${professorId}/research-profile`
          );
          return {
            is_confirmed: true,
            research_profile: fallbackRes.data.research_profile,
            stated_requirements: fallbackRes.data.stated_requirements,
            layman_summary: fallbackRes.data.layman_summary,
            confirmed_at: fallbackRes.data.confirmed_at,
          };
        } catch {
          return { is_confirmed: false };
        }
      }
      return { is_confirmed: false };
    }
  },

  /**
   * Retrieve ranked student research collaborator matches.
   */
  async getStudentMatches(
    professorId: string | number = 'me',
    topK = 20
  ): Promise<{ matches: StudentMatch[]; count: number }> {
    try {
      const response = await axiosClient.get<{ matches: StudentMatch[]; count: number }>(
        `/api/faculty/research-profile/matches?top_k=${topK}`
      );
      return response.data;
    } catch (error: any) {
      if (
        !error.response ||
        error.code === 'ECONNREFUSED' ||
        error.response?.status === 404 ||
        error.response?.status === 502
      ) {
        const fallbackRes = await axios.post<{ matches: StudentMatch[]; count: number }>(
          `${ML_SERVICE_URL}/professor/${professorId}/match-students`,
          { top_k: topK }
        );
        return fallbackRes.data;
      }
      throw error;
    }
  },
};
