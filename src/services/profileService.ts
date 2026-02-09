import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  role?: "consumer" | "transporter" | "admin" | null;
  phone?: string | null;
  language?: string | null;
  is_online?: boolean;
  created_at?: string;
  updated_at?: string;
}

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export const profileService = {
  // Get user profile
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data;
  },

  // Create or update profile with role
  async upsertProfile(userId: string, updates: {
    role?: "consumer" | "transporter" | "admin";
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    language?: string;
  }) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error upserting profile:", error);
      return null;
    }

    return data;
  },

  async createProfile(profile: ProfileInsert): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .insert(profile)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error creating profile:", error);
      return null;
    }

    return data;
  },

  async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error updating profile:", error);
      return null;
    }

    return data;
  },

  async updateRole(userId: string, role: "consumer" | "transporter" | "admin"): Promise<boolean> {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) {
      console.error("Error updating role:", error);
      return false;
    }

    return true;
  },

  async setLanguage(userId: string, language: string): Promise<boolean> {
    const { error } = await supabase
      .from("profiles")
      .update({ language })
      .eq("id", userId);

    if (error) {
      console.error("Error setting language:", error);
      return false;
    }

    return true;
  },

  async updateOnlineStatus(userId: string, isOnline: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_online: isOnline } as any) // Type assertion until DB types are fully regenerated
      .eq("id", userId);
    
    return !error;
  }
};

// Standalone exported functions for convenience
export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile | null> {
  return profileService.updateProfile(userId, updates);
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return profileService.getProfile(userId);
}

export async function upsertProfile(
  userId: string, 
  updates: {
    role?: "consumer" | "transporter" | "admin";
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    language?: string;
  }
): Promise<Profile | null> {
  return profileService.upsertProfile(userId, updates);
}