
import PurchaseClient from "./PurchaseClient";

export default function PurchasePage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const deal = {
    name: typeof searchParams?.name === "string" ? searchParams.name : "",
    price: typeof searchParams?.price === "string" ? searchParams.price : "",
    coins: typeof searchParams?.coins === "string" ? searchParams.coins : "",
  };
  return <PurchaseClient deal={deal} />;
}
