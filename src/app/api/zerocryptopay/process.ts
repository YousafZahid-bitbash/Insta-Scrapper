
import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

const LOGIN = process.env.ZEROCRYPTOPAY_LOGIN || "";
const SECRET_KEY = process.env.ZEROCRYPTOPAY_SECRET_KEY || "";
const TOKEN = process.env.ZEROCRYPTOPAY_TOKEN || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log incoming request for debugging
  console.log("Incoming request to /api/zerocryptopay/process", { method: req.method, body: req.body });
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // If webhook notification (Zerocryptopay sends these fields)
  if (
  req.body &&
  req.body.id_track &&
  req.body.amount_for_pay &&
  req.body.hash_trans &&
  req.body.method_pay &&
  req.body.signature &&
  req.body.order_id &&
  req.body.status
  ) {
    // Webhook signature verification
    const webhookSignString = `${TOKEN}${req.body.amount_for_pay}${SECRET_KEY}${req.body.hash_trans}${req.body.method_pay}${LOGIN}`;
    const expectedSignature = crypto.createHash("sha256").update(webhookSignString).digest("hex");
    if (expectedSignature === req.body.signature && req.body.status === "paid") {
      // Payment verified
      return res.status(200).json({ id_track: req.body.id_track });
    } else {
      return res.status(400).json({ error: "Invalid signature or payment not successful" });
    }
  }

  // Otherwise, treat as payment creation
  const { amount, order_id } = req.body;
  if (!amount || !order_id) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // Calculate signature for payment creation
  const signString = `${amount}${SECRET_KEY}${order_id}${LOGIN}`;
  const signature = crypto.createHash("sha256").update(signString).digest("hex");

  // Prepare request to Zerocryptopay
  const formData = new URLSearchParams({
    amount: String(amount),
    token: TOKEN,
    sign: signature,
    login: LOGIN,
    order_id: String(order_id),
  });

  try {
    const response = await fetch("https://zerocryptopay.com/pay/newtrack", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    const data = await response.json();
    console.log("Zerocryptopay response:", data);
    return res.status(response.ok ? 200 : 400).json(data);
  } catch (error) {
    console.error("Error in /api/zerocryptopay/process:", error);
    let errorMessage = "Unknown error";
    if (typeof error === "object" && error !== null && "message" in error) {
      errorMessage = (error as { message: string }).message;
    } else {
      errorMessage = String(error);
    }
    return res.status(500).json({ error: "Payment creation failed", details: errorMessage });
  }
}
