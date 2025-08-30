
import PurchaseClient from "./PurchaseClient";

export default function PurchasePage({ searchParams }: { searchParams: { name?: string; price?: string; coins?: string } }) {
  const deal = {
    name: searchParams.name || "",
    price: searchParams.price || "",
    coins: searchParams.coins || "",
  };
  return <PurchaseClient deal={deal} />;
}
