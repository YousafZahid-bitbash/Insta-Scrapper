import ClientComponent from "./ClientComponent";

export default function ServerComponent({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const deal = {
    name: typeof searchParams?.name === "string" ? searchParams.name : "Item",
    price: typeof searchParams?.price === "string" ? searchParams.price : "0.00",
    coins: typeof searchParams?.coins === "string" ? searchParams.coins : "0",
  };
  return <ClientComponent deal={deal} />;
}
