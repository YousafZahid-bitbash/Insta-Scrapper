"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="text-3xl font-bold text-center mb-2">Total: ${deal.price}</div>
      <ul className="bg-white rounded-xl shadow p-4 mb-4">
        {breakdown.map((item) => (
          <li key={item.label} className="flex justify-between py-1 text-lg">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-blue-600" />
        <span className="text-sm font-semibold">Step 1: Payment Details</span>
        <div className="w-2 h-2 rounded-full bg-gray-300" />
        <span className="text-sm">Step 2: Confirm</span>
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
        <label className="block text-sm font-semibold mb-1">Card Number</label>
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
          <label className="block text-sm font-semibold mb-1">Expiry Date</label>
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
          <label className="block text-sm font-semibold mb-1">CVV</label>
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 px-4 py-8">
      <header className="w-full max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-extrabold mb-4 text-gray-900 tracking-tight">Secure Payment</h1>
        <div className="flex justify-center gap-8 mb-2">
          {paymentMethods.map(method => (
            <div key={method.value} className="transition-transform hover:scale-110">
              <Image src={method.logo} alt={method.label} width={48} height={48} />
            </div>
          ))}
        </div>
      </header>
      <PaymentDetails deal={deal} />
      <div className="w-full max-w-md mx-auto mb-8 bg-white rounded-xl shadow p-6">
        <div className="mb-4 text-lg font-semibold">Select Payment Method</div>
        <div className="flex gap-6 justify-center mb-4">
          {paymentMethods.map(method => (
            <label key={method.value} className="flex flex-col items-center cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value={method.value}
                checked={selectedMethod === method.value}
                onChange={() => setSelectedMethod(method.value)}
                className="accent-blue-600 w-5 h-5 mb-1"
              />
              <Image src={method.logo} alt={method.label} width={32} height={32} />
              <span className="text-xs mt-1">{method.label}</span>
            </label>
          ))}
        </div>
        {(selectedMethod === "paypal" || selectedMethod === "zerocryptopay") && (
          <button className="w-full py-3 mt-2 rounded-lg bg-blue-600 text-white font-bold text-lg shadow hover:bg-blue-700 transition">Login / Authorize with {selectedMethod === "paypal" ? "PayPal" : "Zerocryptopay"}</button>
        )}
        {(selectedMethod === "visa" || selectedMethod === "mastercard") && (
          <CardInputs onChange={handleCardChange} errors={cardErrors} />
        )}
      </div>
      <div className="w-full max-w-md mx-auto flex gap-4 mb-8">
        <button
          className="flex-1 py-4 rounded-xl bg-green-600 text-white font-bold text-lg shadow hover:bg-green-700 transition"
          disabled={selectedMethod === "visa" || selectedMethod === "mastercard" ? Object.keys(cardErrors).length > 0 : false}
        >
          Make Payment
        </button>
        <button
          className="flex-1 py-4 rounded-xl bg-gray-300 text-gray-700 font-bold text-lg shadow hover:bg-gray-400 transition"
        >
          Cancel Payment
        </button>
      </div>
      <footer className="w-full max-w-md mx-auto text-center text-sm text-gray-500 mt-8">
        <Link href="/terms" className="underline hover:text-blue-600">Terms of Service</Link> &nbsp;|&nbsp;
        <Link href="/privacy" className="underline hover:text-blue-600">Privacy Policy</Link>
      </footer>
    </div>
  );
}
