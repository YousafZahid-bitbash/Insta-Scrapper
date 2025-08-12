import HomeNavbar from "@/components/HomeNavbar";
import Footer from "@/components/Footer";
import "../../globals.css";

export default function PricingPage() {
		return (
			<div className="min-h-screen bg-gray-50 flex flex-col">
				<HomeNavbar />
				<main className="flex-1 px-4 py-8 sm:p-8 text-gray-900">
					<h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-900">Pricing</h1>
					{/* Pricing content will go here */}
				</main>
					<Footer />
				</div>
		);
}
