"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Head from 'next/head';

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

  // Create payment when deal is loaded and Crypto Pay is selected
useEffect(() => {
    
    console.log("Deal:", deal);

    // Payment is now created only after clicking Make Payment
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
    if (typeof window !== 'undefined' && (window as any).cryptopay) {
      (window as any).cryptopay.Button({
        createPayment: function(actions: any) {
          return actions.payment.fetch(paymentId);
        },
        onApprove: function(_data: any, _actions: any) {
          // TODO: Optionally notify backend or update UI
        },
        defaultLang: 'en-US'
      }).render('#pay-button');
    }
  }, [selectedPayment, paymentId]);

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
    <>
      <Head>
        <script src={`https://js.crypto.com/sdk?publishable-key=${process.env.NEXT_PUBLIC_CRYPTO_PUBLISHABLE_KEY}`} />
      </Head>
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
                      <img src="/cryptocom.svg" alt="Crypto" className="w-40 h-40" />
                    )}
                    {opt.value === "visa" && (
                      <img src="/visa.svg" alt="Visa" className="w-25 h-25" />
                    )}
                    {opt.value === "paypal" && (
                      <img src="/paypal.svg" alt="PayPal" className="w-25 h-25" />
                    )}
                    {opt.value === "mastercard" && (
                      <img src="/mastercard.svg" alt="MasterCard" className="w-30 h-15" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Crypto.com Pay Button shown when selected */}
            {selectedPayment === 'cryptopay' && paymentId && (
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
    </>
  );
}
