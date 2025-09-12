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
    label: "Bank Payment",
    value: "stripe",
    logos: ["/visa.svg", "/mastercard.svg"],
    badge: "BANK PAYMENT"
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
  const [currencyInput, setCurrencyInput] = useState("");
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
                    className={`relative p-3 rounded-2xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-lg bg-white/90 backdrop-blur-md ${
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
                        {method.value === "stripe" ? (
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-14 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100">
                              <Image src="/visa.svg" alt="Visa" width={70} height={44} className="object-contain" />
                            </div>
                            <div className="w-20 h-14 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100">
                              <Image src="/mastercard.svg" alt="Mastercard" width={70} height={44} className="object-contain" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center bg-black p-3 rounded-xl-6xl shadow-sm border border-gray-100">
                            <Image src={typeof method.logo === 'string' ? method.logo : '' } alt={typeof method.label === 'string' ? method.label : ''} width={200} height={104} className="object-contain" />
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm ${
                        method.value === 'stripe'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {method.value === 'stripe' ? 'Bank Payment' : method.badge}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ...removed terms and privacy policy checkbox... */}

              {/* Stripe Payment Form */}
              {selectedMethod === "stripe" && clientSecret && (
                <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Payment</h3>
                  <div className="mb-4 flex gap-6 items-center">
                    <span className="text-xl font-bold text-black">Amount: ${deal.price}</span>
                    <span className="text-lg font-semibold text-black">Coins: {deal.coins}</span>
                  </div>
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
                  
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Select Crypto to Pay With</label>
                  <div className="w-full max-w-md flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative w-full">
                      <input
                        type="text"
                        placeholder="Type or select currency (e.g. usdt)"
                        className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 bg-white text-gray-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-150"
                        value={currencyInput}
                        onChange={e => {
                          setCurrencyInput(e.target.value);
                          setShowCurrencyDropdown(true);
                          // If user types a valid ticker, auto-select it
                          const match = currencies.find(c => c.ticker.toLowerCase() === e.target.value.toLowerCase());
                          if (match) setPayCurrency(match.ticker);
                          else setPayCurrency(e.target.value);
                        }}
                        onFocus={() => setShowCurrencyDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCurrencyDropdown(false), 150)}
                        autoComplete="off"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {showCurrencyDropdown && currencies.length > 0 && (
                        <ul className="absolute z-20 left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border-2 border-blue-200 rounded-lg shadow-lg text-gray-900 font-medium">
                          {currencies
                            .filter(c => {
                              if (!currencyInput) return true;
                              const f = currencyInput.toLowerCase();
                              return c.ticker.toLowerCase().includes(f) || c.name.toLowerCase().includes(f);
                            })
                            .slice(0, 30)
                            .map(c => (
                              <li
                                key={c.ticker}
                                className="px-4 py-2 cursor-pointer hover:bg-blue-100"
                                onMouseDown={() => {
                                  setCurrencyInput(c.ticker);
                                  setPayCurrency(c.ticker);
                                  setShowCurrencyDropdown(false);
                                }}
                              >
                                {c.name} ({c.ticker.toUpperCase()})
                              </li>
                            ))}
                          <li className="px-4 py-2 text-xs text-gray-400 select-none">Type to enter a custom ticker</li>
                        </ul>
                      )}
                    </div>
                    {payCurrency === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Enter currency ticker (e.g. usdt)"
                        className="w-full sm:w-48 px-4 py-3 rounded-lg border-2 border-blue-200 bg-white text-gray-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-150"
                        onChange={e => setPayCurrency(e.target.value.toLowerCase())}
                        value={payCurrency !== '__custom__' ? payCurrency : ''}
                        style={{ minWidth: 120 }}
                      />
                    )}
                  </div>

                  <div className="mb-4 mt-10 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#2563eb" opacity=".1"/><path d="M12 7v5l3 3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-blue-800 text-sm font-medium">
                      You’ll be redirected to a secure payment page. If you’re on a device with a crypto wallet (like MetaMask, Trust Wallet, or Coinbase Wallet), you can copy the payment address and pay directly—no need to scan the QR code. If you’re on a different device, simply scan the QR code with your wallet app.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!(selectedMethod === "stripe" && clientSecret) && (
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={handleProceedToPayment}
                    disabled={loading}
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
