import { useEffect, useState } from "react";

export default function TestEnv() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    setEnvVars({
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING",
      SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` 
        : "MISSING",
      SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "MISSING",
      GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
        ? `${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 15)}...` 
        : "MISSING",
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Environment Variables Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Browser Environment Variables:</h2>
          
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="border-b pb-2">
              <span className="font-mono text-sm text-gray-600">{key}:</span>
              <p className="font-mono text-sm mt-1 break-all">
                {value === "MISSING" ? (
                  <span className="text-red-600 font-bold">❌ MISSING</span>
                ) : (
                  <span className="text-green-600">✅ {value}</span>
                )}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">How to Fix Missing Variables:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Stop the development server</li>
            <li>Check .env.local file exists and has NEXT_PUBLIC_ prefix</li>
            <li>Run: rm -rf .next</li>
            <li>Run: npm run dev</li>
            <li>Hard refresh browser (Ctrl+Shift+R)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}