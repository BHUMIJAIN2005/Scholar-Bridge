import axiosClient from './axiosClient';

export type UserRole = 'STUDENT' | 'FACULTY';

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  profileCompleteness?: number;
  photoUrl?: string;
  approvalStatus?: 'PENDING' | 'APPROVED';
  department?: string;
  designation?: string;
  qualifications?: string;
  bio?: string;
  researchDomains?: string;
  researchInterests?: string[];
  officeRoom?: string;
  officeHours?: string;
  scholarUrl?: string;
  orcidUrl?: string;
  researchGateUrl?: string;
  facultyLinkedinUrl?: string;
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
  interests?: string[];
  studentProjects?: StudentProjectItem[];
  githubUrl?: string;
  linkedinUrl?: string;
  visibility?: 'ALL_FACULTY' | 'APPLIED_FACULTY_ONLY';
  year?: string;
  createdAt?: string;
}

export interface EducationItem {
  degree?: string;
  institution?: string;
  year?: string;
}

export interface FacultyProjectItem {
  title?: string;
  fundingAgency?: string;
  years?: string;
  role?: string;
}

export interface StudentProjectItem {
  title?: string;
  description?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export type GoogleLoginResponse = AuthResponse | { needsRole: true };

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  researchDomains?: string;
  skills?: string;
  year?: string;
}

export const authApi = {
  /**
   * Log in user with email & password.
   * Calls POST /api/auth/login.
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await axiosClient.post<AuthResponse>('/api/auth/login', credentials);
    return response.data;
  },

  async loginWithGoogle(idToken: string, role?: UserRole): Promise<GoogleLoginResponse> {
    const response = await axiosClient.post<GoogleLoginResponse>('/api/auth/google', { idToken, role });
    return response.data;
  },

  /**
   * Register a new user as Student or Faculty.
   * Calls POST /api/auth/signup.
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await axiosClient.post<AuthResponse>('/api/auth/signup', data);
    return response.data;
  },

  /**
   * Fetch current authenticated user's profile.
   * Calls GET /api/profile/me.
   */
  async getMe(): Promise<User> {
    const response = await axiosClient.get<User>('/api/profile/me');
    return response.data;
  },

  /**
   * Update profile.
   * Calls PUT /api/profile/me.
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await axiosClient.put<User>('/api/profile/me', data);
    return response.data;
  },
};

export default authApi;
