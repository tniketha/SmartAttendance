export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN';

export interface StudentProfile {
  id: string;
  studentNumber: string;
  programme: string;
  academicYear: string;
  batch: string;
  department: string;
}

export interface LecturerProfile {
  id: string;
  employeeNumber: string;
  title: string | null;
  department: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  student?: StudentProfile | null;
  lecturer?: LecturerProfile | null;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
