import Navbar from "../../components/Navbar";
import Link from "next/link";
import "../globals.css";

export default function Home() {
	return (
		<div className="min-h-screen bg-white flex flex-col">
			<Navbar />
			{/* Hero Section */}
			<main className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-gray-50 to-white">
				<h1 className="text-4xl sm:text-6xl font-extrabold text-center mb-6">Instant Instagram Data Extraction</h1>
				<p className="text-lg sm:text-2xl text-center text-gray-600 max-w-2xl mb-8">Easily extract Instagram profile, post, and hashtag data in seconds. No coding required. Start for free!</p>
				<div className="flex gap-4 justify-center">
					<Link href="/signup" className="px-8 py-3 rounded bg-black text-white font-semibold text-lg hover:bg-gray-800">Get Started Free</Link>
					<Link href="/pricing" className="px-8 py-3 rounded border border-gray-300 text-lg font-semibold hover:bg-gray-100">See Pricing</Link>
				</div>
			</main>
			{/* Footer */}
			<footer className="w-full text-center text-gray-400 py-6 border-t mt-8 text-sm">
				&copy; {new Date().getFullYear()} GiveMeData. All rights reserved.
			</footer>
		</div>
	);
}
