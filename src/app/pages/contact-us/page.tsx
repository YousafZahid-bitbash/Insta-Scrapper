import Navbar from "../../../components/Navbar";
import '../globals.css';

export default function ContactUsPage() {
	return (
		<>
			<Navbar />
			<main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-gray-900">
				<div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
					<h1 className="text-3xl font-bold text-center mb-6 text-gray-900">Contact Us</h1>
					  <p className="text-center text-gray-600 mb-8">We&apos;d love to hear from you! Fill out the form below or reach us directly at <a href="mailto:support@givemedata.co" className="text-blue-600 hover:underline">support@givemedata.co</a>.</p>
					<form className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
							<input type="text" className="w-full px-4 py-2 border rounded bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Your Name" required />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
							<input type="email" className="w-full px-4 py-2 border rounded bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="you@email.com" required />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
							<textarea className="w-full px-4 py-2 border rounded bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" rows={5} placeholder="How can we help you?" required />
						</div>
						<button type="submit" className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold text-lg shadow hover:bg-blue-600 transition">Send Message</button>
					</form>
					<div className="mt-8 text-center text-gray-500 text-sm">
						<div className="mb-2">Or reach us at:</div>
						<div className="mb-1">Email: <a href="mailto:support@givemedata.co" className="text-blue-600 hover:underline">support@givemedata.co</a></div>
						<div>Phone: <a href="tel:+1234567890" className="text-blue-600 hover:underline">+1 (234) 567-890</a></div>
					</div>
				</div>
			</main>
		</>
	);
}
