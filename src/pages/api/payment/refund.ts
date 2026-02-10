import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { paymentIntentId, amount } = req.body;

    if (!paymentIntentId || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // In production, process Stripe refund here
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const refund = await stripe.refunds.create({
    //   payment_intent: paymentIntentId,
    //   amount
    // });

    // For MVP, return mock success
    res.status(200).json({ 
      success: true,
      refundId: `re_${Date.now()}`,
      amount
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Refund failed" 
    });
  }
}