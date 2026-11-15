import axiosClient from './axiosClient';

export interface RecommendedProfessor {
  id: number;
  name: string;
  department?: string;
  matchScore: number;
  researchInterests: string[];
  sharedInterests: string[];
  whyMatched: string;
  isDemo: boolean;
}

export async function getRecommendedProfessors(): Promise<RecommendedProfessor[]> {
  const response = await axiosClient.get<RecommendedProfessor[]>('/api/students/me/recommended');
  return response.data;
}
