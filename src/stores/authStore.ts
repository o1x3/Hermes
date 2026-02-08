import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/team";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  initializeAuth: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, "username" | "displayName" | "avatarUrl">>) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: false,
  initialized: false,

  initializeAuth: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        set({ user: data.session.user, session: data.session });
        await get().fetchProfile(data.session.user.id);
      }
    } catch (err) {
      console.error("Failed to initialize auth:", err);
    } finally {
      set({ initialized: true });
    }
  },

  signInWithEmail: async (email: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  verifyOtp: async (email: string, token: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      if (data.session) {
        set({ user: data.session.user, session: data.session });
        await get().fetchProfile(data.session.user.id);
      }
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
  },

  updateProfile: async (updates) => {
    const userId = get().user?.id;
    if (!userId) return;

    const payload: Record<string, string | null> = {};
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.displayName !== undefined) payload.display_name = updates.displayName;
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);
    if (error) throw error;

    set((s) => ({
      profile: s.profile ? { ...s.profile, ...updates } : null,
    }));
  },

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("Failed to fetch profile:", error);
      return;
    }
    set({
      profile: {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  },
}));
