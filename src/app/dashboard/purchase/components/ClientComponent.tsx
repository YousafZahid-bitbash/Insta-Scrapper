"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StripeProvider from "@/components/StripeProvider";
import StripePaymentForm from "@/components/StripePaymentForm";
import { FaLock, FaShieldAlt, FaCheckCircle, FaCoins, FaCreditCard, FaBolt } from "react-icons/fa";

const paymentMethods = [
  { 
    label: "Zerocryptopay", 
    value: "zerocryptopay", 
    logo: "/zerocryptopay.svg", 
    description: "Secure cryptocurrency payments",
    badge: "CRYPTO"
  },
  { 
    label: "Stripe (Card)", 
    value: "stripe", 
    logo: "/stripe.svg", 
    description: "Visa, Mastercard, American Express",
    badge: "POPULAR"
  },
];

function PaymentSummary({ deal }: { deal: { name: string; price: string; coins: string } }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FaCoins className="text-blue-600 text-xl" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{deal.name}</h3>
          <p className="text-sm text-gray-600">Digital Credits Package</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Credits Amount</span>
          <span className="font-semibold text-gray-900">{deal.coins} coins</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Platform Fee</span>
          <span className="font-semibold text-gray-900">$0.00</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Processing Fee</span>
          <span className="font-semibold text-gray-900">$0.00</span>
        </div>
        <hr className="border-gray-200 my-3" />
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total Amount</span>
          <span className="text-2xl font-bold text-blue-600">${deal.price}</span>
        </div>
      </div>

      <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <FaCheckCircle className="text-green-600" />
          <span className="font-semibold text-green-800">What you get:</span>
        </div>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• {deal.coins} InstaScrapper credits</li>
          <li>• Instant account activation</li>
          <li>• 24/7 customer support</li>
          <li>• No expiration date</li>
        </ul>
      </div>
    </div>
  );
}

function SecurityBadges() {
  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      <div className="flex flex-col items-center text-center p-3">
        <FaLock className="text-gray-400 text-lg mb-2" />
        <span className="text-xs text-gray-600 font-medium">SSL Protected</span>
      </div>
      <div className="flex flex-col items-center text-center p-3">
        <FaShieldAlt className="text-gray-400 text-lg mb-2" />
        <span className="text-xs text-gray-600 font-medium">Secure Payment</span>
      </div>
      <div className="flex flex-col items-center text-center p-3">
        <FaBolt className="text-gray-400 text-lg mb-2" />
        <span className="text-xs text-gray-600 font-medium">Instant Delivery</span>
      </div>
    </div>
  );
}

export default function ClientComponent({ deal }: { deal: { name: string; price: string; coins: string } }) {
  const [selectedMethod, setSelectedMethod] = useState("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

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
    } catch (err) {
      setError('Failed to initialize payment');
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

  const handleProceedToPayment = () => {
    if (selectedMethod === "stripe") {
      handleStripePayment();
    } else if (selectedMethod === "zerocryptopay") {
      handleZerocryptopayPayment();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <div className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <Navbar />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
          <p className="text-gray-600 text-lg">Secure payment powered by industry-leading encryption</p>
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
              
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.value}
                    className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                      selectedMethod === method.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMethod(method.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={selectedMethod === method.value}
                          onChange={() => setSelectedMethod(method.value)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <Image src={method.logo} alt={method.label} width={40} height={40} className="rounded" />
                        <div>
                          <h3 className="font-semibold text-gray-900">{method.label}</h3>
                          <p className="text-sm text-gray-600">{method.description}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        method.badge === 'POPULAR' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
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
                    <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>,{' '}
                    <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                    {selectedMethod === "zerocryptopay" && (
                      <>
                        {' '}and{' '}
                        <a href="https://zerocryptopay.com/page/agreement" target="_blank" className="text-blue-600 hover:underline">
                          Zerocryptopay User Agreement
                        </a>
                      </>
                    )}
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
              <SecurityBadges />
              
              {/* Support */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Need help?</p>
                <Link href="/support" className="text-blue-600 hover:underline text-sm font-medium">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
