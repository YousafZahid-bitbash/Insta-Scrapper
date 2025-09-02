import crypto from "crypto";
const LOGIN = process.env.ZEROCRYPTOPAY_LOGIN || "";
const SECRET_KEY = process.env.ZEROCRYPTOPAY_SECRET_KEY || "";
const TOKEN = process.env.ZEROCRYPTOPAY_TOKEN || "";

export async function POST(req: Request) {
	// Log incoming request for debugging
	let body;
	try {
		body = await req.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
	}
	console.log("Incoming request to /api/zerocryptopay/process", { method: "POST", body });

		// Log environment variables and incoming payment request
		console.log("ZEROCRYPTOPAY ENV:", {
			LOGIN,
			SECRET_KEY,
			TOKEN
		});
		console.log("Incoming payment request:", { amount: body.amount, order_id: body.order_id });
	if (
		body &&
		body.id_track &&
		body.amount_for_pay &&
		body.hash_trans &&
		body.method_pay &&
		body.signature &&
		body.order_id &&
		body.status
	) {
		// Webhook signature verification
		const webhookSignString = `${TOKEN}${body.amount_for_pay}${SECRET_KEY}${body.hash_trans}${body.method_pay}${LOGIN}`;
		const expectedSignature = crypto.createHash("sha256").update(webhookSignString).digest("hex");
		if (expectedSignature === body.signature && body.status === "paid") {
			// Payment verified
			return new Response(JSON.stringify({ id_track: body.id_track }), { status: 200 });
		} else {
			return new Response(JSON.stringify({ error: "Invalid signature or payment not successful" }), { status: 400 });
		}
	}

	// Otherwise, treat as payment creation
	const { amount, order_id } = body;
	if (!amount || !order_id) {
		return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
	}

		// Calculate signature for payment creation
		const signString = `${amount}${SECRET_KEY}${order_id}${LOGIN}`;
		const signature = crypto.createHash("sha256").update(signString).digest("hex");
		console.log("Signature calculation:", {
			signString,
			signature,
			amount,
			order_id,
			LOGIN,
			SECRET_KEY,
			TOKEN
		});

		// Prepare request to Zerocryptopay
		const formData = new URLSearchParams({
			amount: String(amount),
			token: TOKEN,
			sign: signature,
			login: LOGIN,
			order_id: String(order_id),
		});
		console.log("Form data sent to Zerocryptopay:", Object.fromEntries(formData.entries()));

	try {
		const response = await fetch("https://zerocryptopay.com/pay/newtrack", {
			method: "POST",
			headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData.toString(),
		});
		const text = await response.text();
		let data;
		try {
			data = JSON.parse(text);
		} catch {
			console.error("Zerocryptopay returned non-JSON response:", text);
			return new Response(JSON.stringify({ error: "Invalid response from Zerocryptopay", details: text }), { status: 500 });
		}
		console.log("Zerocryptopay response:", data);
		return new Response(JSON.stringify(data), { status: response.ok ? 200 : 400 });
		} catch (error) {
			console.error("Error in /api/zerocryptopay/process:", error);
			let errorMessage = "Unknown error";
			if (typeof error === "object" && error !== null && "message" in error) {
				errorMessage = (error as { message: string }).message;
			} else {
				errorMessage = String(error);
			}
			return new Response(JSON.stringify({ error: "Payment creation failed", details: errorMessage }), { status: 500 });
	}
}
