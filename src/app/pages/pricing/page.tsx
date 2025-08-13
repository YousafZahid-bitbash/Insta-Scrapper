import HomeNavbar from "@/components/HomeNavbar";
import '@/app/globals.css';

const deals = [
	{ coins: 10000, price: 100 },
	{ coins: 20000, price: 200 },
	{ coins: 30000, price: 290 },
	{ coins: 40000, price: 380 },
];

export default function PricingPage() {
	return (
		<>
			<HomeNavbar />
			<main className="min-h-screen bg-gray-50 p-8 text-gray-900 flex flex-col items-center">
				<h1 className="text-3xl font-bold text-center mb-8 text-gray-900">Pricing</h1>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-4xl">
					{deals.map(deal => (
						<div key={deal.coins} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-yellow-400 hover:border-yellow-600 transition-all hover:scale-105">
							<span className="text-3xl font-extrabold text-yellow-500 mb-2">{deal.coins.toLocaleString()} Coins</span>
							<span className="text-lg text-gray-700 mb-4">Perfect for {deal.coins / 1000}k+ extractions</span>
							<span className="text-2xl font-bold text-gray-900 mb-6">${deal.price}</span>
							<button className="w-full px-6 py-3 rounded bg-yellow-500 text-white font-semibold text-lg shadow hover:bg-yellow-600 transition">Buy Now</button>
						</div>
					))}
				</div>
			</main>
		</>
	);
}
