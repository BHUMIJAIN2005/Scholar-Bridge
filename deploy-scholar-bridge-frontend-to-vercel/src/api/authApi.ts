import axiosClient from './axiosClient';

export type UserRole = 'STUDENT' | 'FACULTY';

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  researchDomains?: string;
  skills?: string;
  year?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

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

// Fallback demo mock users for offline/prototype verification
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'student@scholarbridge.edu': {
    password: 'password123',
    user: {
      id: 101,
      name: 'Priya Sharma',
      email: 'student@scholarbridge.edu',
      role: 'STUDENT',
      skills: 'Python, PyTorch, React, NLP',
      year: '3rd Year B.Tech CSE',
      createdAt: '2026-09-01T10:00:00Z',
    },
  },
  'faculty@scholarbridge.edu': {
    password: 'password123',
    user: {
      id: 202,
      name: 'Dr. Rajesh Verma',
      email: 'faculty@scholarbridge.edu',
      role: 'FACULTY',
      department: 'Computer Science & Engineering',
      researchDomains: 'Deep Learning, NLP, Distributed Systems',
      createdAt: '2026-08-15T09:00:00Z',
    },
  },
};

export const authApi = {
  /**
   * Log in user with email & password.
   * Calls POST /api/auth/login.
   * If the backend is unreachable (offline mode), falls back to demo accounts.
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await axiosClient.post<AuthResponse>('/api/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      // If network error (backend not running yet), allow demo credentials
      if (!error.response || error.code === 'ERR_NETWORK') {
        const demo = DEMO_USERS[credentials.email.toLowerCase()];
        if (demo && demo.password === credentials.password) {
          const fakeToken = `mock-jwt-token.${btoa(JSON.stringify(demo.user))}.${Date.now()}`;
          return {
            token: fakeToken,
            user: demo.user,
            message: 'Logged in via prototype demo mode (backend offline)',
          };
        }
      }
      throw error;
    }
  },

  /**
   * Register a new user as Student or Faculty.
   * Calls POST /api/auth/signup.
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    try {
      const response = await axiosClient.post<AuthResponse>('/api/auth/signup', data);
      return response.data;
    } catch (error: any) {
      if (!error.response || error.code === 'ERR_NETWORK') {
        const newUser: User = {
          id: Math.floor(Math.random() * 1000) + 300,
          name: data.name,
          email: data.email,
          role: data.role,
          department: data.department,
          researchDomains: data.researchDomains,
          skills: data.skills,
          year: data.year,
          createdAt: new Date().toISOString(),
        };
        const fakeToken = `mock-jwt-token.${btoa(JSON.stringify(newUser))}.${Date.now()}`;
        return {
          token: fakeToken,
          user: newUser,
          message: 'Account created via prototype demo mode (backend offline)',
        };
      }
      throw error;
    }
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
