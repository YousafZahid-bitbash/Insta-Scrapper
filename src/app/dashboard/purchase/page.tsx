
import PurchaseClient from "./PurchaseClient";

interface PurchasePageProps {
  searchParams?: Record<string, string | string[]>;
}

export default function PurchasePage({ searchParams }: PurchasePageProps) {
  const deal = {
    name: typeof searchParams?.name === "string" ? searchParams.name : "",
    price: typeof searchParams?.price === "string" ? searchParams.price : "",
    coins: typeof searchParams?.coins === "string" ? searchParams.coins : "",
  };
  return <PurchaseClient deal={deal} />;
}
