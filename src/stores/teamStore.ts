import { create } from "zustand";
import type { Team, TeamMember, TeamInvitation } from "@/types/team";
import { supabase } from "@/lib/supabase";

interface TeamState {
  teams: Team[];
  activeTeamId: string | null;
  members: TeamMember[];
  invitations: TeamInvitation[];
  pendingInvitations: TeamInvitation[];
  loading: boolean;

  loadTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;
  setActiveTeam: (id: string | null) => void;
  loadMembers: (teamId: string) => Promise<void>;
  inviteMember: (teamId: string, email: string) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  acceptInvitation: (id: string) => Promise<void>;
  declineInvitation: (id: string) => Promise<void>;
  loadPendingInvitations: () => Promise<void>;
  revokeInvitation: (id: string) => Promise<void>;
  clearTeamData: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  activeTeamId: null,
  members: [],
  invitations: [],
  pendingInvitations: [],
  loading: false,

  loadTeams: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const teams: Team[] = (data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        createdBy: t.created_by,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
      set({ teams });
    } finally {
      set({ loading: false });
    }
  },

  createTeam: async (name: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("teams")
      .insert({ name, created_by: userId })
      .select()
      .single();
    if (error) throw error;

    const team: Team = {
      id: data.id,
      name: data.name,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    set((s) => ({ teams: [...s.teams, team] }));
    return team;
  },

  deleteTeam: async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) throw error;
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== id),
      activeTeamId: s.activeTeamId === id ? null : s.activeTeamId,
    }));
  },

  setActiveTeam: (id) => {
    set({ activeTeamId: id });
    if (id) {
      get().loadMembers(id);
    }
  },

  loadMembers: async (teamId: string) => {
    const { data, error } = await supabase
      .from("team_members")
      .select("team_id, user_id, role, joined_at, profiles(id, username, display_name, avatar_url, created_at, updated_at)")
      .eq("team_id", teamId);
    if (error) throw error;

    const members: TeamMember[] = (data ?? []).map((m) => {
      const p = m.profiles as unknown as {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
      } | null;

      return {
        teamId: m.team_id,
        userId: m.user_id,
        role: m.role as "owner" | "member",
        joinedAt: m.joined_at,
        profile: p
          ? {
              id: p.id,
              username: p.username,
              displayName: p.display_name,
              avatarUrl: p.avatar_url,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
            }
          : undefined,
      };
    });
    set({ members });

    // Also load invitations for this team
    const { data: invData, error: invError } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "pending");
    if (!invError && invData) {
      set({
        invitations: invData.map((i) => ({
          id: i.id,
          teamId: i.team_id,
          email: i.email,
          invitedBy: i.invited_by,
          status: i.status as "pending",
          createdAt: i.created_at,
          expiresAt: i.expires_at,
        })),
      });
    }
  },

  inviteMember: async (teamId: string, email: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("team_invitations")
      .insert({ team_id: teamId, email, invited_by: userId })
      .select()
      .single();
    if (error) throw error;

    set((s) => ({
      invitations: [
        ...s.invitations,
        {
          id: data.id,
          teamId: data.team_id,
          email: data.email,
          invitedBy: data.invited_by,
          status: data.status as "pending",
          createdAt: data.created_at,
          expiresAt: data.expires_at,
        },
      ],
    }));
  },

  removeMember: async (teamId: string, userId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);
    if (error) throw error;
    set((s) => ({
      members: s.members.filter((m) => !(m.teamId === teamId && m.userId === userId)),
    }));
  },

  acceptInvitation: async (id: string) => {
    const { error } = await supabase.rpc("accept_invitation", {
      p_invitation_id: id,
    });
    if (error) throw error;
    set((s) => ({
      pendingInvitations: s.pendingInvitations.filter((i) => i.id !== id),
    }));
    // Reload teams to include the new team
    await get().loadTeams();
  },

  declineInvitation: async (id: string) => {
    const { error } = await supabase
      .from("team_invitations")
      .update({ status: "declined" })
      .eq("id", id);
    if (error) throw error;
    set((s) => ({
      pendingInvitations: s.pendingInvitations.filter((i) => i.id !== id),
    }));
  },

  loadPendingInvitations: async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user?.email) return;

    const { data, error } = await supabase
      .from("team_invitations")
      .select("*, teams(name)")
      .eq("email", user.email)
      .eq("status", "pending");
    if (error) return;

    set({
      pendingInvitations: (data ?? []).map((i) => ({
        id: i.id,
        teamId: i.team_id,
        email: i.email,
        invitedBy: i.invited_by,
        status: i.status as "pending",
        createdAt: i.created_at,
        expiresAt: i.expires_at,
        teamName: (i.teams as unknown as { name: string } | null)?.name,
      })),
    });
  },

  revokeInvitation: async (id: string) => {
    const { error } = await supabase
      .from("team_invitations")
      .delete()
      .eq("id", id);
    if (error) throw error;
    set((s) => ({
      invitations: s.invitations.filter((i) => i.id !== id),
    }));
  },

  clearTeamData: () => {
    set({
      teams: [],
      activeTeamId: null,
      members: [],
      invitations: [],
      pendingInvitations: [],
    });
  },
}));
