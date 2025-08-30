
import PurchaseClient from "./PurchaseClient";

export default async function PurchasePage(props: any) {
  const { searchParams } = await props;
  const deal = {
    name: typeof searchParams?.name === "string" ? searchParams.name : "",
    price: typeof searchParams?.price === "string" ? searchParams.price : "",
    coins: typeof searchParams?.coins === "string" ? searchParams.coins : "",
  };
  return <PurchaseClient deal={deal} />;
}
