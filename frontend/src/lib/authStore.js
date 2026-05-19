import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from './api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,

      // Initialize auth state from stored token
      initialize: async () => {
        const token = localStorage.getItem('rfx_token');
        if (!token) {
          set({ isInitialized: true });
          return;
        }
        try {
          const { data } = await authApi.me();
          set({ user: data.user, token, isInitialized: true });
        } catch {
          localStorage.removeItem('rfx_token');
          set({ user: null, token: null, isInitialized: true });
        }
      },

      signup: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authApi.signup(data);
          const { user, token } = res.data;
          localStorage.setItem('rfx_token', token);
          set({ user, token, isLoading: false });
          return { success: true, message: res.data.message };
        } catch (err) {
          set({ isLoading: false });
          const message = err.response?.data?.error || 'Signup failed';
          const details = err.response?.data?.details;
          return { success: false, message, details };
        }
      },

      login: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(data);
          const { user, token } = res.data;
          localStorage.setItem('rfx_token', token);
          set({ user, token, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          const message = err.response?.data?.error || 'Login failed';
          return { success: false, message };
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {}
        localStorage.removeItem('rfx_token');
        set({ user: null, token: null });
      },

      updateProfile: async (data) => {
        try {
          const res = await authApi.updateProfile(data);
          set({ user: res.data.user });
          return { success: true };
        } catch (err) {
          return { success: false, message: err.response?.data?.error || 'Update failed' };
        }
      },

      changePassword: async (data) => {
        try {
          await authApi.changePassword(data);
          return { success: true };
        } catch (err) {
          return { success: false, message: err.response?.data?.error || 'Failed to change password' };
        }
      },

      // Getters
      isAuthenticated: () => !!get().user,
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'rfx-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

export default useAuthStore;
