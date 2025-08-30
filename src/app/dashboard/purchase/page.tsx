
"use client";
export const dynamic = "force-dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Script from "next/script";
import { Suspense } from "react";

const paymentOptions = [
  { label: "Crypto Pay", value: "cryptopay" },
  { label: "Visa (Coming Soon)", value: "visa", disabled: true },
  { label: "PayPal (Coming Soon)", value: "paypal", disabled: true },
  { label: "Mastercard (Coming Soon)", value: "mastercard", disabled: true },
];

export default function PurchasePage() {
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPayment, setSelectedPayment] = useState("eth");
  const [deal, setDeal] = useState<{ name: string; price: string; coins: string } | null>(null);
  const [startPayment, setStartPayment] = useState(false);

  // Get deal info from query params (run once)
  useEffect(() => {
    const name = searchParams.get("name") || "";
    const price = searchParams.get("price") || "";
    const coins = searchParams.get("coins") || "";
    if (name && price && coins) {
      setDeal({ name, price, coins });
    }
  }, [searchParams]);

  // Render Crypto.com Pay button when paymentId is available and payment started
  useEffect(() => {
    if (selectedPayment !== 'cryptopay' || !paymentId || !startPayment) return;
    if (typeof window !== 'undefined' && (window as { cryptopay?: {
      Button: (config: {
        createPayment: (actions: { payment: { fetch: (id: string) => unknown } }) => unknown;
        onApprove: (data: unknown, actions: unknown) => void;
        defaultLang: string;
      }) => { render: (selector: string) => void };
    }}).cryptopay) {
      (window as { cryptopay?: {
        Button: (config: {
          createPayment: (actions: { payment: { fetch: (id: string) => unknown } }) => unknown;
          onApprove: (data: unknown, actions: unknown) => void;
          defaultLang: string;
        }) => { render: (selector: string) => void };
      }}).cryptopay!.Button({
        createPayment: function(actions: { payment: { fetch: (id: string) => unknown } }) {
          return actions.payment.fetch(paymentId);
        },
        onApprove: function() {
          // TODO: Optionally notify backend or update UI
        },
        defaultLang: 'en-US'
      }).render('#pay-button');
    }
  }, [selectedPayment, paymentId, startPayment, deal, searchParams]);

  useEffect(() => {
    // Get deal info from query params
    if (!searchParams) return;
    const name = searchParams.get("name") || "";
    const price = searchParams.get("price") || "";
    const coins = searchParams.get("coins") || "";
    if (name && price && coins) {
      setDeal({ name, price, coins });
    }
  }, [searchParams]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* Use Next.js Script for async loading */}
      <Script src={`https://js.crypto.com/sdk?publishable-key=${process.env.NEXT_PUBLIC_CRYPTO_PUBLISHABLE_KEY}`} strategy="afterInteractive" />
      <Navbar />
      <div className="min-h-screen w-full bg-[#fafafa] px-4 py-12 flex flex-col">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left Side: Payment Method & ETH Info */}
          <div className="flex flex-col items-center">
          <div className="bg-white border border-black shadow-lg p-10 w-full max-w-lg flex flex-col justify-center items-center">
            <h1 className="text-2xl font-bold mb-8 text-black font-serif">How would you like to pay?</h1>
              <div className="w-full flex flex-col gap-6 items-center mb-10">
              {paymentOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`flex flex-col items-center justify-center w-80 h-15 border-2  rounded-xl bg-white cursor-pointer transition-all ${selectedPayment === opt.value ? "ring-2 ring-black" : "hover:bg-gray-100"} ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => !opt.disabled && setSelectedPayment(opt.value)}
                >
                  <div className="flex items-center justify-center gap-2">
                    {/* Payment logos only */}
                    {opt.value === "cryptopay" && (
                      <Image src="/cryptocom.svg" alt="Crypto" width={160} height={160} />
                    )}
                    {opt.value === "visa" && (
                      <Image src="/visa.svg" alt="Visa" width={100} height={50} />
                    )}
                    {opt.value === "paypal" && (
                      <Image src="/paypal.svg" alt="PayPal" width={100} height={50} />
                    )}
                    {opt.value === "mastercard" && (
                      <Image src="/mastercard.svg" alt="MasterCard" width={120} height={60} />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Crypto.com Pay Button shown when selected and payment started */}
            {selectedPayment === 'cryptopay' && paymentId && startPayment && (
              <div className="w-full flex flex-col items-center mt-8">
                <div id="pay-button" data-payment-id={paymentId}></div>
              </div>
            )}
            {/* ETH Payment Info shown below payment options */}
            {selectedPayment === "eth" && (
              <div className="w-full mt-8 p-6 rounded-xl bg-gray-50 border border-black text-center">
                <div className="text-base text-black mb-2">Send ETH to the address below:</div>
                <div className="font-mono text-lg bg-white rounded-xl p-4 border-2 border-black inline-block select-all">0xYourEthereumAddressHere</div>
                <div className="text-xs text-gray-500 mt-2">After payment, your coins will be credited automatically.</div>
              </div>
            )}
          </div>
        </div>
        {/* Right Side: Order Summary */}
        <div className="bg-white border border-black shadow-lg p-10 flex flex-col justify-center items-center">
          <h2 className="text-2xl font-bold text-black mb-8 font-serif">Order Summary</h2>
          {deal ? (
            <>
              <div className="w-full max-w-lg flex flex-col gap-2 mb-6">
                <div className="flex justify-between text-lg font-semibold text-black">
                  <span>{deal.name}</span>
                  <span>${deal.price}</span>
                </div>
                <div className="flex justify-between text-base text-gray-700">
                  <span>Coins</span>
                  <span>{deal.coins}</span>
                </div>
              </div>
              <div className="w-full flex justify-between text-lg font-bold text-black border-t border-gray-300 pt-4 mb-8">
                <span>Total</span>
                <span>${deal.price}</span>
              </div>
              {/* Action Buttons Centered Below in Order Summary */}
              <div className="w-full flex flex-col items-center justify-center">
                <button
                  className={`w-80 px-8 py-4 rounded-xl font-extrabold text-lg shadow-lg font-serif border-2 border-black transition-all ${selectedPayment ? "bg-black text-white hover:scale-105" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                  disabled={!selectedPayment}
                  onClick={async () => {
                    if (!selectedPayment) return;
                    setStartPayment(true);
                    if (selectedPayment === "cryptopay" && deal) {
                      const res = await fetch('/app/api/create-crypto-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          amount: deal.price,
                          currency: 'USD',
                          description: deal.name,
                        }),
                      });
                      const data = await res.json();
                      setPaymentId(data.id);
                    } else {
                      alert(`Payment method ${selectedPayment} not implemented yet.`);
                    }
                  }}
                >
                  Make Payment
                </button>
                <button
                  className="mt-4 w-80 px-8 py-4 rounded-xl bg-white text-black font-extrabold text-lg shadow-lg hover:bg-gray-100 transition-all font-serif border-2 border-black"
                  onClick={() => router.push("/dashboard")}
                >
                  Back to Dashboard
                </button>
              </div>
            </>
          ) : (
            <div className="text-gray-400">No deal selected.</div>
          )}
        </div>
      </div>
        
    </div>
    </Suspense>
  );
}
