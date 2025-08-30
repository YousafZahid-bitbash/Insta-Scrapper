
import PurchaseClient from "./PurchaseClient";

export default async function PurchasePage({ searchParams }: { searchParams: Promise<any> }) {
  const params = await searchParams;
  const deal = {
    name: typeof params?.name === "string" ? params.name : "",
    price: typeof params?.price === "string" ? params.price : "",
    coins: typeof params?.coins === "string" ? params.coins : "",
  };
  return <PurchaseClient deal={deal} />;
}
