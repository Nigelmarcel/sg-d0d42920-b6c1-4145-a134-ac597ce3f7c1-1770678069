import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check what environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Test direct fetch to Supabase
    const healthCheck = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey || "",
        Authorization: `Bearer ${supabaseKey || ""}`,
      },
    });

    const isHealthy = healthCheck.ok;

    return res.status(200).json({
      status: "success",
      environment: {
        supabaseUrl: supabaseUrl || "MISSING",
        hasAnonKey: !!supabaseKey,
        keyPrefix: supabaseKey?.substring(0, 20) + "...",
      },
      healthCheck: {
        url: `${supabaseUrl}/rest/v1/`,
        status: healthCheck.status,
        ok: isHealthy,
        statusText: healthCheck.statusText,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING",
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    });
  }
}