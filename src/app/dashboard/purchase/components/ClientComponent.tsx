"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
const paymentMethods = [
  { label: "Zerocryptopay", value: "zerocryptopay", logo: "/zerocryptopay.svg" },
  { label: "PayPal", value: "paypal", logo: "/paypal.svg" },
  { label: "Visa", value: "visa", logo: "/visa.svg" },
  { label: "Mastercard", value: "mastercard", logo: "/mastercard.svg" },
];

function PaymentDetails({ deal }: { deal: { name: string; price: string; coins: string } }) {
  const breakdown = [
    { label: "Item Price", value: `$${deal.price}` },
    { label: "Shipping", value: "$0.00" },
    { label: "Taxes", value: "$0.00" },
  ];
  return (
    <div>
      <div className="w-full max-w-md mx-auto mb-8">
        <div className="text-3xl font-bold text-center mb-2 text-black">Total: ${deal.price}</div>
        <ul className="bg-white rounded-xl shadow p-4 mb-4">
          {breakdown.map((item) => (
            <li key={item.label} className="flex justify-between py-1 text-lg text-black">
              <span className="text-black">{item.label}</span>
              <span className="text-black">{item.value}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="text-sm font-semibold text-black">Step 1: Payment Details</span>
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="text-sm text-black">Step 2: Confirm</span>
        </div>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-blue-600 rounded-full" style={{ width: "50%" }} />
      </div>
    </div>
  );
}

function CardInputs({ onChange, errors }: { onChange: (field: string, value: string) => void; errors: Record<string, string> }) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const formatCardNumber = (value: string) => value.replace(/[^\d]/g, "").replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="space-y-4">
      <div>
  <label className="block text-sm font-semibold mb-1 text-black">Card Number</label>
        <input
          type="text"
          maxLength={19}
          value={cardNumber}
          onChange={e => {
            const val = formatCardNumber(e.target.value);
            setCardNumber(val);
            onChange("cardNumber", val.replace(/\s/g, ""));
          }}
          className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg ${errors.cardNumber ? "border-red-500" : "border-gray-300"}`}
          placeholder="1234 5678 9012 3456"
        />
  {errors.cardNumber && <span className="text-red-500 text-xs">{errors.cardNumber}</span>}
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1 text-black">Expiry Date</label>
          <input
            type="text"
            maxLength={5}
            value={expiry}
            onChange={e => {
              let val = e.target.value.replace(/[^\d]/g, "");
              if (val.length > 2) val = val.slice(0,2) + "/" + val.slice(2,4);
              setExpiry(val);
              onChange("expiry", val);
            }}
            className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg ${errors.expiry ? "border-red-500" : "border-gray-300"}`}
            placeholder="MM/YY"
          />
          {errors.expiry && <span className="text-red-500 text-xs">{errors.expiry}</span>}
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1 text-black">CVV</label>
          <input
            type="password"
            maxLength={3}
            value={cvv}
            onChange={e => {
              const val = e.target.value.replace(/[^\d]/g, "").slice(0,3);
              setCvv(val);
              onChange("cvv", val);
            }}
            className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg ${errors.cvv ? "border-red-500" : "border-gray-300"}`}
            placeholder="123"
          />
          {errors.cvv && <span className="text-red-500 text-xs">{errors.cvv}</span>}
        </div>
      </div>
    </div>
  );
}

export default function ClientComponent({ deal }: { deal: { name: string; price: string; coins: string } }) {
  const [selectedMethod, setSelectedMethod] = useState("paypal");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [cardFields, setCardFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);

  const validateCard = (fields: Record<string, string>) => {
    const errors: Record<string, string> = {};
    if (selectedMethod === "visa" || selectedMethod === "mastercard") {
      if (!/^\d{16}$/.test(fields.cardNumber || "")) errors.cardNumber = "Invalid card number";
      if (!/^\d{2}\/\d{2}$/.test(fields.expiry || "")) errors.expiry = "Invalid expiry";
      if (fields.expiry) {
        const [mm, yy] = fields.expiry.split("/");
        const now = new Date();
        const expYear = Number(yy) + 2000;
        const expMonth = Number(mm);
        if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
          errors.expiry = "Expired card";
        }
      }
      if (!/^\d{3}$/.test(fields.cvv || "")) errors.cvv = "Invalid CVV";
    }
    return errors;
  };

  const handleCardChange = (field: string, value: string) => {
    setCardFields(prev => ({ ...prev, [field]: value }));
    setCardErrors(validateCard({ ...cardFields, [field]: value }));
  };

  // Zerocryptopay payment handler
  const handleZerocryptopayPayment = async () => {
    setLoading(true);
    setError(null);
    try {
  const response = await fetch("/api/zerocryptopay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: deal.price,
          order_id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        }),
      });
      const data = await response.json();
      if (data.status && data.url_to_pay) {
        window.location.href = data.url_to_pay;
      } else {
        setError(data.message || "Payment initiation failed.");
      }
    } catch (err) {
      setError("Payment initiation failed.");
    } finally {
      setLoading(false);
    }
  };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 px-0 py-0">
        {/* Navbar fixed at the very top */}
        <div className="w-full sticky top-0 z-50 bg-white shadow">
          <Navbar />
        </div>
        <div className="px-4 py-8">
          {/* Progress bar at the top with 3 points */}
          <div className="w-full flex flex-col items-center mb-8">
          <div className="relative w-1/2 h-2 bg-gray-200 rounded-full">
            <div className="absolute top-0 left-0 h-2 bg-blue-600 rounded-full" style={{ width: "33%" }} />
            {/* Step points */}
            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white" />
            <div className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-gray-400 rounded-full border-2 border-white" />
            <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-gray-400 rounded-full border-2 border-white" />
          </div>
          <div className="flex justify-between w-1/2 mt-2">
            <span className="text-sm text-black font-semibold">Step 1</span>
            <span className="text-sm text-black font-semibold">Step 2</span>
            <span className="text-sm text-black font-semibold">Step 3</span>
          </div>
        </div>
        <div className="flex flex-row w-full max-w-4xl mx-auto gap-8">
          {/* Payment Method Box */}
          <div className="w-1/2 bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <div className="mb-4 text-2xl font-bold text-black">Select Payment Method</div>
            <div className="flex flex-col gap-6 w-full">
              {paymentMethods.map(method => (
                <label key={method.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={selectedMethod === method.value}
                    onChange={() => setSelectedMethod(method.value)}
                    className="accent-blue-600 w-5 h-5"
                  />
                  <Image src={method.logo} alt={method.label} width={32} height={32} />
                  <span className="text-lg text-black">{method.label}</span>
                </label>
              ))}
            </div>
            {selectedMethod === "paypal" && (
              <button className="w-full py-3 mt-6 rounded-lg bg-blue-600 text-white font-bold text-lg shadow hover:bg-blue-700 transition">Login / Authorize with PayPal</button>
            )}
            {selectedMethod === "zerocryptopay" && (
              <>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsChecked}
                    onChange={e => setTermsChecked(e.target.checked)}
                  />
                  <label htmlFor="terms" className="text-sm text-black">
                    I agree to the <a href="/terms" target="_blank" className="underline hover:text-blue-600">Terms of Service</a> and <a href="/privacy" target="_blank" className="underline hover:text-blue-600">Privacy Policy</a> and <a href="https://zerocryptopay.com/page/agreement" target="_blank" className="underline hover:text-blue-600">Zerocryptopay User Agreement</a>
                  </label>
                </div>
                <button
                  className="w-full py-3 mt-6 rounded-lg bg-blue-600 text-white font-bold text-lg shadow hover:bg-blue-700 transition disabled:opacity-50"
                  onClick={handleZerocryptopayPayment}
                  disabled={loading || !termsChecked}
                >
                  {loading ? "Redirecting..." : "Pay with Zerocryptopay"}
                </button>
              </>
            )}
            {(selectedMethod === "visa" || selectedMethod === "mastercard") && (
              <CardInputs onChange={handleCardChange} errors={cardErrors} />
            )}
          </div>
          {/* Payment Details Box */}
          <div className="w-1/2 flex flex-col items-center">
            <h1 className="text-3xl font-extrabold mb-4 text-black tracking-tight">Secure Payment</h1>
            <PaymentDetails deal={deal} />
            <div className="w-full flex gap-4 mt-8">
              <button
                className="flex-1 py-4 rounded-xl bg-green-600 text-white font-bold text-lg shadow hover:bg-green-700 transition"
                disabled={selectedMethod === "visa" || selectedMethod === "mastercard" ? Object.keys(cardErrors).length > 0 : false}
                onClick={selectedMethod === "zerocryptopay" ? handleZerocryptopayPayment : undefined}
              >
                Make Payment
              </button>
              <button
                className="flex-1 py-4 rounded-xl bg-gray-300 text-black font-bold text-lg shadow hover:bg-gray-400 transition"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
        {error && <div className="text-red-600 text-center mt-4">{error}</div>}
        <footer className="w-full max-w-4xl mx-auto text-center text-sm text-black mt-8">
          <Link href="/terms" className="underline hover:text-blue-600">Terms of Service</Link> &nbsp;|&nbsp;
          <Link href="/privacy" className="underline hover:text-blue-600">Privacy Policy</Link>
        </footer>
      </div>
      </div>
    );
}
