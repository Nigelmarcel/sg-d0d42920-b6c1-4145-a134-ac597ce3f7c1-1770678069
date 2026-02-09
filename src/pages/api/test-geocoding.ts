import type { NextApiRequest, NextApiResponse } from "next";
import { geocodingService } from "@/services/geocodingService";

interface TestResult {
  address: string;
  success: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  formatted_address?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Test addresses in Helsinki area
  const testAddresses = [
    "Mannerheimintie 1, Helsinki",
    "Kamppi, Helsinki",
    "Pasila, Helsinki",
    "Tikkurila, Vantaa",
    "Espoo Center, Espoo",
    "Kallio, Helsinki",
    "Hakaniemi, Helsinki",
    "IsoRoobertinkatu 6, Helsinki",
  ];

  const results: TestResult[] = [];

  console.log("🧪 Starting Google Maps API Validation...\n");

  for (const address of testAddresses) {
    try {
      console.log(`Testing: ${address}`);
      const coordinates = await geocodingService.geocodeAddress(address);

      if (coordinates) {
        results.push({
          address,
          success: true,
          coordinates: {
            lat: coordinates.lat,
            lng: coordinates.lng,
          },
          formatted_address: coordinates.formatted_address || address,
        });

        console.log(`✅ Success: ${coordinates.lat}, ${coordinates.lng}`);
      } else {
        results.push({
          address,
          success: false,
          error: "No coordinates returned (Address not found or API error)",
        });
        console.log(`❌ Failed: No coordinates returned`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results.push({
        address,
        success: false,
        error: errorMessage,
      });
      console.log(`❌ Error: ${errorMessage}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Calculate distance between two points to verify accuracy
  let distanceTest;
  if (results[0].success && results[3].success && results[0].coordinates && results[3].coordinates) {
    const distance = geocodingService.calculateDistance(
      results[0].coordinates.lat,
      results[0].coordinates.lng,
      results[3].coordinates.lat,
      results[3].coordinates.lng
    );

    distanceTest = {
      from: results[0].address,
      to: results[3].address,
      distance: `${distance.toFixed(2)} km`,
      expected: "~15-18 km",
    };

    console.log(`\n📏 Distance Test: ${distanceTest.from} → ${distanceTest.to}`);
    console.log(`   Calculated: ${distanceTest.distance}`);
  }

  // Summary
  const successCount = results.filter(r => r.success).length;
  const apiKeyConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  console.log("\n📊 Validation Summary:");
  console.log(`   API Key Configured: ${apiKeyConfigured ? "✅ Yes" : "❌ No"}`);
  console.log(`   Total Tests: ${testAddresses.length}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${testAddresses.length - successCount}`);

  return res.status(200).json({
    apiKeyConfigured,
    summary: {
      total: testAddresses.length,
      successful: successCount,
      failed: testAddresses.length - successCount,
    },
    results,
    distanceTest,
    message: successCount > 0 
      ? "✅ Google Maps API is working correctly!"
      : "❌ Geocoding failed",
  });
}