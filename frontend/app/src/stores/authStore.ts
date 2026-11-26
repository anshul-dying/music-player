import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authClient } from '../lib/auth-client';
import { migrateGuestData } from './library/guestMigration';
import { useLibraryStore } from './libraryStore';
import { useYouTubeAuthStore } from './youtubeAuthStore';
import { useSpotifyImportStore } from './spotifyImportStore';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  isGuest?: boolean;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  initializeSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
  loginWithProvider: (provider: 'google' | 'github' | 'apple' | 'discord') => Promise<any>;
  logout: () => Promise<void>;
  loginAsGuest: (name?: string) => void;
}

/** Scopes user caches, migrates guest data, and reloads the user's library. */
function syncUserSession(userId: string): void {
  useYouTubeAuthStore.getState().setUserScope(userId);
  migrateGuestData()
    .then(() => useLibraryStore.getState().fetchLibrary())
    .catch((err) => {
      console.warn('Failed to migrate guest data:', err);
      useLibraryStore.getState().fetchLibrary().catch(() => {});
    });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: Boolean(user && !user.isGuest) }),

      initializeSession: async () => {
        set({ isLoading: true });
        try {
          const session = await authClient.getSession();
          if (session?.data?.user) {
            const u = session.data.user;
            set({
              user: {
                id: u.id,
                name: u.name,
                email: u.email,
                image: u.image ?? null,
                isGuest: false,
              },
              isAuthenticated: true,
            });
            syncUserSession(u.id);
          } else {
            const current = get().user;
            if (current && !current.isGuest) {
              set({ user: null, isAuthenticated: false });
            }
          }
        } catch (err) {
          console.warn('Failed to restore auth session:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email: string, password: string): Promise<AuthResponse> => {
        try {
          const res = await authClient.signIn.email({
            email,
            password,
          });

          if (res?.error) {
            return {
              success: false,
              error: res.error.message || 'Invalid email or password.',
            };
          }

          if (res?.data?.user) {
            const u = res.data.user;
            set({
              user: {
                id: u.id,
                name: u.name,
                email: u.email,
                image: u.image ?? null,
                isGuest: false,
              },
              isAuthenticated: true,
            });
            syncUserSession(u.id);
          }

          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err?.message || 'An unexpected error occurred during sign in.',
          };
        }
      },

      register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
        try {
          const res = await authClient.signUp.email({
            name,
            email,
            password,
          });

          if (res?.error) {
            return {
              success: false,
              error: res.error.message || 'Failed to create account.',
            };
          }

          if (res?.data?.user) {
            const u = res.data.user;
            set({
              user: {
                id: u.id,
                name: u.name,
                email: u.email,
                image: u.image ?? null,
                isGuest: false,
              },
              isAuthenticated: true,
            });
            syncUserSession(u.id);
          }

          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err?.message || 'An unexpected error occurred during registration.',
          };
        }
      },

      loginWithProvider: async (provider: 'google' | 'github' | 'apple' | 'discord') => {
        return authClient.signIn.social({
          provider,
          callbackURL: typeof window !== 'undefined' ? window.location.origin : '/',
        });
      },

      logout: async () => {
        try {
          await authClient.signOut();
        } catch (err) {
          console.warn('Sign out error:', err);
        }
        useLibraryStore.getState().resetLibrary();
        useYouTubeAuthStore.getState().setUserScope(null);
        useYouTubeAuthStore.getState().resetSync();
        useSpotifyImportStore.getState().reset();
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      loginAsGuest: (name = 'Guest User') =>
        set({
          user: {
            id: `guest-${Date.now()}`,
            name,
            email: 'guest@ganegan.local',
            isGuest: true,
          },
          isAuthenticated: false,
        }),
    }),
    {
      name: 'ganegan-auth-session',
    }
  )
);

if (typeof window !== 'undefined') {
  void useAuthStore.getState().initializeSession();
}
