"use client";
import Script from "next/script";
import PurchaseClient from "./PurchaseClient";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function PurchasePage({ searchParams }: { searchParams?: SearchParams }) {
  const deal = {
    name: typeof searchParams?.name === "string" ? searchParams.name : "",
    price: typeof searchParams?.price === "string" ? searchParams.price : "",
    coins: typeof searchParams?.coins === "string" ? searchParams.coins : "",
  };
  return <PurchaseClient deal={deal} />;
}
      <Script src={`https://js.crypto.com/sdk?publishable-key=${process.env.NEXT_PUBLIC_CRYPTO_PUBLISHABLE_KEY}`} strategy="afterInteractive" />
