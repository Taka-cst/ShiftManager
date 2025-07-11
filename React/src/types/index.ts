// API Response Types
export interface User {
  id: number;
  username: string;
  DisplayName: string;
  admin: boolean;
}

export interface UserCreate {
  username: string;
  DisplayName: string;
  password: string;
  admin_code?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface ShiftRequest {
  id: number;
  date: string;
  canwork: boolean;
  description?: string;
  start_time?: string;
  end_time?: string;
  user_id: number;
  user_display_name?: string;
}

export interface ShiftRequestCreate {
  date: string;
  canwork: boolean;
  description?: string;
  start_time?: string;
  end_time?: string;
}

export interface ConfirmedShift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  user_id: number;
  user_display_name?: string;
  user?: User;
}

export interface ConfirmedShiftCreate {
  date: string;
  start_time: string;
  end_time: string;
  user_id: number;
}

export interface MessageResponse {
  message: string;
}

export interface DayOfWeekSettings {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

// Form Types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  DisplayName: string;
  password: string;
  admin_code?: string;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export interface ErrorContextType {
  error: string | null;
  showError: (message: string) => void;
  clearError: () => void;
}
