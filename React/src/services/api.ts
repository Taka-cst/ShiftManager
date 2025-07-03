import axios from 'axios';
import {
  User,
  UserCreate,
  Token,
  ShiftRequest,
  ShiftRequestCreate,
  ConfirmedShift,
  ConfirmedShiftCreate,
  MessageResponse,
  DayOfWeekSettings
} from '../types';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4567/api/v1';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (userData: UserCreate): Promise<User> => {
    const response = await api.post<User>('/auth/register', userData);
    return response.data;
  },

  login: async (username: string, password: string): Promise<Token> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post<Token>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

// Shift Requests API
export const shiftRequestAPI = {
  // シフト希望作成
  createShiftRequest: async (data: {
    date: string;
    canwork: boolean;
    start_time?: string;
    end_time?: string;
    description?: string;
  }) => {
    const response = await api.post('/shift-requests/', data);
    return response.data;
  },

  // 自分のシフト希望一覧取得（メソッド名追加）
  getMyShiftRequests: async (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    
    const response = await api.get(`/shift-requests/my?${params.toString()}`);
    return response.data;
  },

  // 全員のシフト希望一覧取得（管理者用）
  getShiftRequests: async (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    
    const response = await api.get(`/shift-requests/?${params.toString()}`);
    return response.data;
  },

  // 特定のシフト希望取得
  getShiftRequest: async (id: number) => {
    const response = await api.get(`/shift-requests/${id}`);
    return response.data;
  },

  // シフト希望更新
  updateShiftRequest: async (id: number, data: {
    date: string;
    canwork: boolean;
    start_time?: string;
    end_time?: string;
    description?: string;
  }) => {
    const response = await api.put(`/shift-requests/${id}`, data);
    return response.data;
  },

  // シフト希望削除
  deleteShiftRequest: async (id: number) => {
    const response = await api.delete(`/shift-requests/${id}`);
    return response.data;
  },
};

// Confirmed Shifts API
export const confirmedShiftAPI = {
  getConfirmedShifts: async (year?: number, month?: number): Promise<ConfirmedShift[]> => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    
    const response = await api.get<ConfirmedShift[]>(`/confirmed-shifts/?${params}`);
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  // 既存のAPIはそのまま
  getAllShiftRequests: async (): Promise<ShiftRequest[]> => {
    const response = await api.get<ShiftRequest[]>('/admin/shift-requests');
    return response.data;
  },

  // 確定シフト管理API
  createConfirmedShift: async (shift: ConfirmedShiftCreate): Promise<ConfirmedShift> => {
    const response = await api.post<ConfirmedShift>('/admin/confirmed-shifts', shift);
    return response.data;
  },

  // 確定シフト更新API（追加）
  updateConfirmedShift: async (id: number, shift: Partial<ConfirmedShiftCreate>): Promise<ConfirmedShift> => {
    const response = await api.put<ConfirmedShift>(`/admin/confirmed-shifts/${id}`, shift);
    return response.data;
  },

  // 確定シフト削除API（追加）
  deleteConfirmedShift: async (id: number): Promise<void> => {
    await api.delete(`/admin/confirmed-shifts/${id}`);
  },
  // ユーザー管理API
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/admin/users');
    return response.data;
  },

  deleteUser: async (id: number): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/admin/users/${id}`);
    return response.data;
  },

  // 授業曜日設定API
  getDayOfWeekSettings: async (): Promise<DayOfWeekSettings> => {
    const response = await api.get<DayOfWeekSettings>('/admin/settings/dow');
    return response.data;
  },

  updateDayOfWeekSettings: async (settings: DayOfWeekSettings): Promise<DayOfWeekSettings> => {
    const response = await api.put<DayOfWeekSettings>('/admin/settings/dow', settings);
    return response.data;
  },
};

export default api;
