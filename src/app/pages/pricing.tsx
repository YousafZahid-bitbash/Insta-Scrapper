import Navbar from "../../components/Navbar";
import '../globals.css';

export default function PricingPage() {
	return (
		<>
			<Navbar />
			<main className="min-h-screen bg-gray-50 p-8 text-gray-900">
				<h1 className="text-3xl font-bold text-center mb-8 text-gray-900">Pricing</h1>
				{/* Pricing content will go here */}
			</main>
		</>
	);
}
