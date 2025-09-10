"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StripeProvider from "@/components/StripeProvider";
import StripePaymentForm from "@/components/StripePaymentForm";
import { FaLock, FaShieldAlt, FaCheckCircle, FaCoins, FaCreditCard, FaBolt } from "react-icons/fa";

const paymentMethods = [
  { 
    label: "Visa / Mastercard", 
    value: "stripe", 
    logo: "/stripe.svg", 
    description: "Visa, Mastercard",
    badge: "POPULAR"
  },
  { 
    label: "NOWPayments (Crypto)", 
    value: "nowpayments", 
    logo: "https://nowpayments.io/images/logo/logo.svg", 
    description: "Bitcoin, Ethereum, USDT, and 300+ cryptocurrencies",
    badge: "CRYPTO"
  },
];



function PaymentSummary({ deal }: { deal: { name: string; description: string; price: string; coins: string } }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-blue-100 shadow-xl transition-shadow hover:shadow-2xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-blue-50 rounded-xl shadow-sm flex items-center justify-center">
          <FaCoins className="text-blue-600 text-2xl" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{deal.name}</h3>
          <p className="text-sm text-gray-500 font-medium">{deal.description || 'Digital Credits Package'}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium">Credits Amount</span>
          <span className="font-semibold text-blue-700">{deal.coins} coins</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium">Platform Fee</span>
          <span className="font-semibold text-green-600">$0.00</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium">Processing Fee</span>
          <span className="font-semibold text-green-600">$0.00</span>
        </div>
        <hr className="border-gray-200 my-4" />
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-extrabold text-blue-600">${deal.price}</span>
        </div>
      </div>

      <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <FaCheckCircle className="text-green-600 text-lg" />
          <span className="font-semibold text-green-800">What you get:</span>
        </div>
        <ul className="text-sm text-green-700 space-y-1 pl-1">
          <li>• <span className="font-semibold">{deal.coins} InstaScrapper credits</span></li>
          <li>• Instant account activation</li>
          <li>• 24/7 customer support</li>
          <li>• No expiration date</li>
        </ul>
      </div>
    </div>
  );
}



export default function ClientComponent({ deal }: { deal: { name: string; description: string; price: string; coins: string } }) {
  const [selectedMethod, setSelectedMethod] = useState("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  // Removed unused cryptoPayment state
  const [payCurrency, setPayCurrency] = useState("eth");
  const [currencies, setCurrencies] = useState<{ ticker: string; name: string }[]>([]);

  useEffect(() => {
    async function fetchCurrencies() {
      try {
        // Use the actual deal price for filtering
        const priceAmount = typeof deal.price === 'number' ? deal.price : parseFloat(deal.price);
        const res = await fetch(`/api/nowpayments/currencies?price_amount=${priceAmount}`);
        const data = await res.json();
        console.log('[NOWPayments][Client] Fetched currencies:', data.currencies);
        // Log min/max amounts if available
        if (Array.isArray(data.currencies) && data.currencies.length > 0 && data.currencies[0].min_amount !== undefined) {
          data.currencies.forEach((c: { ticker?: string; currency?: string; min_amount?: number; max_amount?: number }) => {
            console.log(`[NOWPayments][Client] ${c.ticker || c.currency}: min=${c.min_amount}, max=${c.max_amount}`);
          });
        }
        if (data.currencies && Array.isArray(data.currencies)) {
          setCurrencies(data.currencies);
          // Always set payCurrency to the first valid option
          if (data.currencies.length > 0) {
            setPayCurrency(data.currencies[0].ticker);
          }
        } else {
          console.warn('[NOWPayments][Client] No currencies found or invalid format:', data);
        }
      } catch {}
    }
    if (selectedMethod === "nowpayments") {
      fetchCurrencies();
    }
  }, [selectedMethod, deal.price]);

  // Stripe payment handler
  const handleStripePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: deal.price,
          metadata: {
            coins: deal.coins,
            dealName: deal.name,
          },
        }),
      });

      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setCurrentStep(2);
      } else {
        setError('Failed to initialize payment');
      }
    } catch {
      setError('Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handleNOWPaymentsPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/nowpayments/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_amount: deal.price,
          price_currency: "usd",
          pay_currency: payCurrency,
          order_id: `${deal.name}-${Date.now()}`,
          order_description: `${deal.name} for ${deal.coins} coins`,
        }),
      });
      const data = await response.json();
      if (data.invoice_url) {
        window.location.href = data.invoice_url;
        return;
      } else {
        setError(data.error || "Failed to create crypto invoice");
      }
    } catch {
      setError("Failed to initialize crypto payment");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    window.location.href = '/dashboard/purchase/success';
  };

  const handlePaymentError = (errorMessage: string) => {
  setError(errorMessage);
  setClientSecret(null);
  setCurrentStep(1);
  };

  const handleProceedToPayment = () => {
    if (selectedMethod === "stripe") {
      handleStripePayment();
    } else if (selectedMethod === "nowpayments") {
      handleNOWPaymentsPayment();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overscroll-none">
      {/* Navbar */}
      <div className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <Navbar />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Complete Purchase</h1>
          {/* <p className="text-gray-600 text-lg">Secure payment powered by industry-leading encryption</p> */}
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-8">
            {[
              { step: 1, label: "Payment Method", icon: FaCreditCard },
              { step: 2, label: "Payment Details", icon: FaLock },
              { step: 3, label: "Confirmation", icon: FaCheckCircle }
            ].map(({ step, label, icon: Icon }) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors ${
                  currentStep >= step 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  <Icon className="text-lg" />
                </div>
                <span className={`ml-3 font-medium ${
                  currentStep >= step ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {label}
                </span>
                {step < 3 && (
                  <div className={`w-16 h-0.5 ml-8 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Methods */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Payment Method</h2>
              

              <div className="space-y-6">
                {paymentMethods.map((method) => (
                  <div
                    key={method.value}
                    className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-lg bg-white/90 backdrop-blur-md ${
                      selectedMethod === method.value
                        ? 'border-blue-600 ring-2 ring-blue-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMethod(method.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-5">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={selectedMethod === method.value}
                          onChange={() => setSelectedMethod(method.value)}
                          className="w-5 h-5 text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-400"
                        />
                        <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100">
                          <Image src={method.logo} alt={method.label} width={36} height={36} className="object-contain" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{method.label}</h3>
                          <p className="text-sm text-gray-500">{method.description}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm ${
                        method.badge === 'POPULAR' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {method.badge}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Terms and Conditions */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsChecked}
                    onChange={(e) => setTermsChecked(e.target.checked)}
                    className="w-5 h-5 text-blue-600 mt-0.5"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to the{' '}
                    <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and{' '}
                    <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                  </span>
                </label>
              </div>

              {/* Stripe Payment Form */}
              {selectedMethod === "stripe" && clientSecret && (
                <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Payment</h3>
                  <StripeProvider clientSecret={clientSecret}>
                    <StripePaymentForm 
                      amount={deal.price}
                      coins={deal.coins}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </StripeProvider>
                </div>
              )}

              {/* NOWPayments Crypto Payment */}
              {selectedMethod === "nowpayments" && (
                <div className="mt-10">
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#2563eb" opacity=".1"/><path d="M12 7v5l3 3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-blue-800 text-sm font-medium">
                      You’ll be redirected to a secure payment page. If you’re on a device with a crypto wallet (like MetaMask, Trust Wallet, or Coinbase Wallet), you can copy the payment address and pay directly—no need to scan the QR code. If you’re on a different device, simply scan the QR code with your wallet app.
                    </span>
                  </div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Select Crypto to Pay With</label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={currencies.some(c => c.ticker === payCurrency) ? payCurrency : ''}
                      onChange={e => setPayCurrency(e.target.value)}
                      className="flex-1 p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-900 font-medium shadow-sm"
                    >
                      {currencies.length === 0 ? (
                        <>
                          <option value="eth">No currencies found (default: Ethereum)</option>
                          <option disabled>Check console for debugging info.</option>
                        </>
                      ) : (
                        currencies
                          .filter(c => c && c.ticker && c.name)
                          .map(c => (
                            <option key={c.ticker} value={c.ticker}>
                              {c.name} ({c.ticker.toUpperCase()})
                            </option>
                          ))
                      )}
                      <option value="__custom__">Other (enter manually)</option>
                    </select>
                    {payCurrency === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Enter currency ticker (e.g. usdt)"
                        className="flex-1 p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-900 font-medium shadow-sm"
                        onChange={e => setPayCurrency(e.target.value.toLowerCase())}
                        value={payCurrency !== '__custom__' ? payCurrency : ''}
                        style={{ minWidth: 120 }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!(selectedMethod === "stripe" && clientSecret) && (
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={handleProceedToPayment}
                    disabled={!termsChecked || loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-8 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </div>
                    ) : (
                      `Proceed to Payment • $${deal.price}`
                    )}
                  </button>
                  <Link
                    href="/dashboard/new-extractions"
                    className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Link>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <PaymentSummary deal={deal} />
              {/* <SecurityBadges /> */}
              
              {/* Support */}
             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
