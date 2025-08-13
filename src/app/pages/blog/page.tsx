import Navbar from "@/components/Navbar";
import '@/app/globals.css';

export default function BlogPage() {
	return (
		<>
			<Navbar />
			<main className="min-h-screen bg-gray-50 p-8 text-gray-900">
				<h1 className="text-3xl font-bold text-center mb-8 text-gray-900">Blog</h1>
				{/* Blog content will go here */}
			</main>
		</>
	);
}
