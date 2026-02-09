import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
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