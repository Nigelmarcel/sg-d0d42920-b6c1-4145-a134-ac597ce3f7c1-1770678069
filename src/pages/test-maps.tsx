import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function TestMapsPage() {
  const [address, setAddress] = useState("Mannerheimintie 1, Helsinki");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testGeocode = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setError("❌ API Key not found in environment variables");
        setLoading(false);
        return;
      }

      console.log("🔑 API Key (first 20 chars):", apiKey.substring(0, 20) + "...");
      console.log("🔍 Testing address:", address);

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      console.log("🌐 Full URL:", url.replace(apiKey, "HIDDEN"));

      const response = await fetch(url);
      const data = await response.json();

      console.log("📍 API Response:", data);

      setResult(data);

      if (data.status === "OK" && data.results.length > 0) {
        console.log("✅ Success! Location:", data.results[0].geometry.location);
      } else {
        console.log("❌ Failed. Status:", data.status);
        setError(`API returned status: ${data.status}`);
      }
    } catch (err: any) {
      console.error("❌ Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4">Google Maps API Test</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Test Address
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address to test"
              />
            </div>

            <Button 
              onClick={testGeocode}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "Test Geocoding"}
            </Button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">Error:</p>
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-medium mb-2">API Status:</p>
                  <p className="font-mono text-sm">{result.status}</p>
                </div>

                {result.status === "OK" && result.results.length > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium mb-2">✅ Success!</p>
                    <div className="space-y-2 text-sm">
                      <p><strong>Formatted Address:</strong></p>
                      <p className="font-mono">{result.results[0].formatted_address}</p>
                      
                      <p><strong>Coordinates:</strong></p>
                      <p className="font-mono">
                        Lat: {result.results[0].geometry.location.lat}<br/>
                        Lng: {result.results[0].geometry.location.lng}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-800 font-medium mb-2">Full API Response:</p>
                  <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded border">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <h2 className="font-bold mb-2">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open browser console (F12 → Console tab)</li>
            <li>Enter an address above</li>
            <li>Click "Test Geocoding"</li>
            <li>Check the console for detailed logs</li>
            <li>Review the API response below</li>
          </ol>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold mb-2">Common Test Addresses:</h2>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setAddress("Mannerheimintie 1, Helsinki")}
            >
              Mannerheimintie 1, Helsinki
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-start" 
              onClick={() => setAddress("Kamppi, Helsinki")}
            >
              Kamppi, Helsinki
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-start" 
              onClick={() => setAddress("Kallio, Helsinki")}
            >
              Kallio, Helsinki
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-start" 
              onClick={() => setAddress("Helsinki")}
            >
              Helsinki
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <h2 className="font-bold mb-2">API Key Info:</h2>
          <p className="text-sm">
            <strong>Environment Variable:</strong> NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </p>
          <p className="text-sm">
            <strong>Status:</strong> {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "✅ Found" : "❌ Not Found"}
          </p>
          {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <p className="text-sm font-mono mt-2">
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 20)}...
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}