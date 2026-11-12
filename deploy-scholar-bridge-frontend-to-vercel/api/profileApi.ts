import axiosClient from './axiosClient';
import type { EducationItem, FacultyProjectItem, StudentProjectItem, User } from './authApi';

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
  visibility?: 'ALL_FACULTY' | 'APPLIED_FACULTY_ONLY';
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
