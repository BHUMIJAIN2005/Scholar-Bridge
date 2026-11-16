import axiosClient from './axiosClient';

export interface ResearchProfile {
  research_interests: string[];
  research_domains: string[];
  technical_skills: string[];
  research_experience: string[];
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

export const facultyResearchProfileApi = {
  /**
   * Upload and analyze professor documents (CV and research papers).
   * Routes through the authenticated Spring Boot backend.
   */
  async analyzeDocuments(files: File[], documentTypes: string[]): Promise<AnalysisResult> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    documentTypes.forEach((type) => formData.append('document_types', type));

    const response = await axiosClient.post<AnalysisResult>(
      '/api/faculty/research-profile/analyze',
      formData,
      { timeout: 180000 }
    );
    return response.data;
  },

  /**
   * Confirm research profile, generate final 384-dim embedding, and persist to database.
   */
  async confirmProfile(payload: ProfileConfirmRequest): Promise<unknown> {
    const response = await axiosClient.put(
      '/api/faculty/research-profile/confirm',
      payload
    );
    return response.data;
  },

  /**
   * Retrieve confirmed research profile.
   */
  async getConfirmedProfile(): Promise<ProfileStatusResponse> {
    const response = await axiosClient.get<ProfileStatusResponse>(
      '/api/faculty/research-profile'
    );
    return response.data;
  },

  /**
   * Retrieve ranked student research collaborator matches.
   */
  async getStudentMatches(topK = 20): Promise<{ matches: StudentMatch[]; count: number }> {
    const response = await axiosClient.get<{ matches: StudentMatch[]; count: number }>(
      '/api/faculty/research-profile/matches',
      { params: { top_k: topK } }
    );
    return response.data;
  },
};
