import axiosClient from './axiosClient';
import type {
  EducationItem,
  FacultyProjectItem,
  StudentProjectItem,
  StudentResumeDetails,
  User,
} from './authApi';

export interface StudentResumeProfileDraft {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  academicYear?: string | null;
  education?: NonNullable<StudentResumeDetails['education']>;
  technicalSkills?: string[];
  skillTags?: string[];
  projects?: StudentProjectItem[];
  internships?: NonNullable<StudentResumeDetails['internships']>;
  workExperience?: NonNullable<StudentResumeDetails['workExperience']>;
  certifications?: string[];
  achievements?: string[];
  researchInterests?: string[];
  researchExperience?: NonNullable<StudentResumeDetails['researchExperience']>;
}

export interface StudentResumeAnalysisResponse {
  status: 'draft';
  profile: StudentResumeProfileDraft;
  extractionMetadata: {
    filename: string;
    documentType: string;
    extractionMethod: string;
    extractedCharCount: number;
    status: string;
    warnings: string[];
  };
  warnings: string[];
}

export interface ProfileUpdateRequest {
  name?: string;
  photoUrl?: string;
  department?: string;
  researchDomains?: string;
  designation?: string;
  qualifications?: string;
  bio?: string;
  researchInterests?: string[];
  officeRoom?: string;
  officeHours?: string;
  scholarUrl?: string;
  orcidUrl?: string;
  researchGateUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  citationsCount?: number;
  hIndex?: number;
  i10Index?: number;
  statsAsOf?: string;
  acceptingStudents?: boolean;
  education?: EducationItem[];
  awards?: string[];
  facultyProjects?: FacultyProjectItem[];
  skills?: string;
  skillTags?: string[];
  year?: string;
  interests?: string[];
  studentProjects?: StudentProjectItem[];
  githubUrl?: string;
  visibility?: 'ALL_USERS' | 'APPLIED_FACULTY_ONLY';
  studentResumeDetails?: StudentResumeDetails;
}

export const profileApi = {
  async getMyProfile(): Promise<User> {
    const response = await axiosClient.get<User>('/api/profile/me');
    return response.data;
  },

  async updateMyProfile(profile: ProfileUpdateRequest): Promise<User> {
    const response = await axiosClient.put<User>('/api/profile/me', profile);
    return response.data;
  },

  async analyzeResume(file: File): Promise<StudentResumeAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post<StudentResumeAnalysisResponse>(
      '/api/profile/analyze-resume',
      formData,
      { timeout: 95_000 },
    );
    return response.data;
  },

  async uploadPhoto(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post<User>('/api/profile/me/photo', formData);
    return response.data;
  },

  async removePhoto(): Promise<User> {
    const response = await axiosClient.delete<User>('/api/profile/me/photo');
    return response.data;
  },
};

export default profileApi;
