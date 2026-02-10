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

    // In production, initialize MobilePay here
    // const mobilepay = require('mobilepay-sdk');
    // const payment = await mobilepay.createPayment({
    //   amount,
    //   currency: currency || 'EUR',
    //   reference: bookingId,
    //   redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/callback`
    // });

    // For MVP, return mock MobilePay payment
    const mockMobilePayPayment = {
      paymentId: `mp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      redirectUrl: `https://mobilepay.fi/payment-mock?amount=${amount / 100}&ref=${bookingId}`,
      amount,
    };

    res.status(200).json(mockMobilePayPayment);
  } catch (error) {
    console.error("Error creating MobilePay payment:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "MobilePay initialization failed" 
    });
  }
}