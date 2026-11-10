import axiosClient from './axiosClient';
import type { FacultyProjectItem, StudentProjectItem } from './authApi';
import type { ResearchOpening } from './openingsApi';
import type { Publication } from './publicationsApi';

export interface DirectoryPage<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface FacultyDirectoryItem {
  id: number;
  name: string;
  photoUrl?: string;
  department?: string;
  designation?: string;
  bio?: string;
  researchInterests?: string[];
  citationsCount?: number;
  hIndex?: number;
  i10Index?: number;
  acceptingStudents?: boolean;
  profileCompleteness: number;
}

export interface FacultyDetail extends FacultyDirectoryItem {
  qualifications?: string;
  officeRoom?: string;
  officeHours?: string;
  scholarUrl?: string;
  orcidUrl?: string;
  researchGateUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  statsAsOf?: string;
  education?: Array<{ degree?: string; institution?: string; year?: string }>;
  awards?: string[];
  projects?: FacultyProjectItem[];
  openOpenings?: ResearchOpening[];
  publishedBlogPosts?: Array<{ id: number; title: string; summary?: string; createdAt?: string }>;
  publications?: Publication[];
}

export interface StudentDirectoryItem {
  id: number;
  name: string;
  photoUrl?: string;
  year?: string;
  skills?: string;
  skillTags?: string[];
  interests?: string[];
  projects?: StudentProjectItem[];
  githubUrl?: string;
  linkedinUrl?: string;
  profileCompleteness: number;
}

export interface StudentDetail extends StudentDirectoryItem {
  papers?: Array<{ id: number; title: string; category?: string; confidenceScore?: number }>;
}

export const directoryApi = {
  async getFaculty(params: { page?: number; q?: string; acceptingStudents?: boolean } = {}) {
    const response = await axiosClient.get<DirectoryPage<FacultyDirectoryItem>>('/api/faculty', { params });
    return response.data;
  },

  async getFacultyById(id: number | string) {
    const response = await axiosClient.get<FacultyDetail>(`/api/faculty/${id}`);
    return response.data;
  },

  async getStudents(params: { page?: number; q?: string; skill?: string } = {}) {
    const response = await axiosClient.get<DirectoryPage<StudentDirectoryItem>>('/api/students', { params });
    return response.data;
  },

  async getStudentById(id: number | string) {
    const response = await axiosClient.get<StudentDetail>(`/api/students/${id}`);
    return response.data;
  },
};

export default directoryApi;
