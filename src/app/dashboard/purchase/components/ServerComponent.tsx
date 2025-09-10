import ClientComponent from "./ClientComponent";

export default function ServerComponent({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const deal = {
    name: typeof searchParams?.name === "string" ? searchParams.name : undefined,
    description: typeof searchParams?.description === "string" ? searchParams.description : undefined,
    price: typeof searchParams?.price === "string" ? searchParams.price : undefined,
    coins: typeof searchParams?.coins === "string" ? searchParams.coins : undefined,
  };

  const missing = Object.entries(deal).filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white border border-red-200 rounded-xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-700 mb-2">Invalid Purchase Link</h2>
          <p className="text-red-600 mb-4">Missing required parameter(s): <b>{missing.join(", ")}</b></p>
          <p className="text-gray-700">Please return to the <a href="/dashboard/billing" className="text-blue-600 underline">Billing page</a> and try again.</p>
        </div>
      </div>
    );
  }

  return <ClientComponent deal={deal as { name: string; description: string; price: string; coins: string }} />;
}
