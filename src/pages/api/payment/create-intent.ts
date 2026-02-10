import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { bookingId, amount, currency } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // In production, initialize Stripe here
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount,
    //   currency: currency || 'eur',
    //   metadata: { bookingId }
    // });

    // For MVP, return mock payment intent
    const mockPaymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      clientSecret: `pi_secret_${Math.random().toString(36).substring(7)}`,
      amount,
      currency: currency || "eur",
      status: "requires_payment_method",
    };

    res.status(200).json(mockPaymentIntent);
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Payment initialization failed" 
    });
  }
}