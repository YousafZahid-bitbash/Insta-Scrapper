
import ServerComponent from "./components/ServerComponent";

export default function PurchasePage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  return <ServerComponent searchParams={searchParams} />;
}
