import axiosClient from './axiosClient';

export interface Publication {
  id: number;
  title: string;
  authors: string;
  venue?: string;
  year?: number;
  doi?: string;
  url?: string;
}

export interface PublicationRequest {
  title: string;
  authors: string;
  venue?: string;
  year?: number;
  doi?: string;
  url?: string;
}

export const publicationsApi = {
  async getMine(): Promise<Publication[]> {
    const response = await axiosClient.get<Publication[]>('/api/faculty/me/publications');
    return response.data;
  },

  async create(publication: PublicationRequest): Promise<Publication> {
    const response = await axiosClient.post<Publication>('/api/faculty/me/publications', publication);
    return response.data;
  },

  async update(id: number, publication: PublicationRequest): Promise<Publication> {
    const response = await axiosClient.put<Publication>(`/api/faculty/me/publications/${id}`, publication);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await axiosClient.delete(`/api/faculty/me/publications/${id}`);
  },
};

export default publicationsApi;
