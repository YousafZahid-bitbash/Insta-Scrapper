
import PurchaseClient from "./PurchaseClient";

type PageProps = {
  searchParams?: { [key: string]: string | undefined }
};

export default function PurchasePage({ searchParams }: PageProps) {
  const deal = {
    name: searchParams?.name || "",
    price: searchParams?.price || "",
    coins: searchParams?.coins || "",
  };
  return <PurchaseClient deal={deal} />;
}
