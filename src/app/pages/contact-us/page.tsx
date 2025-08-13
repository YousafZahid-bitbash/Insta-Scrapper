import HomeNavbar from "@/components/HomeNavbar";
import '@/app/globals.css';

export default function ContactUsPage() {
	return (
		<>
			<HomeNavbar />
			<main className="min-h-screen w-full flex items-center justify-center bg-[#f9f6f2] text-gray-900" style={{background: 'linear-gradient(135deg, #f9f6f2 0%, #fffbe6 100%)'}}>
				<div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-12 border border-[#d4af37] relative">
					<div className="absolute -top-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-[#d4af37] flex items-center justify-center shadow-lg border-4 border-white">
						<svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 12.713l11.985-7.713A1 1 0 0023 4H1a1 1 0 00-.985 1.001L12 12.713z"/><path fill="#fff" d="M12 14.713l-12-7.713V20a1 1 0 001 1h22a1 1 0 001-1V7l-12 7.713z"/></svg>
					</div>
					<h1 className="text-4xl font-serif font-bold text-center mb-6 text-gray-900 tracking-tight" style={{fontFamily:'Georgia,serif'}}>Contact Us</h1>
					<p className="text-center text-gray-700 mb-8 text-lg font-light">We&apos;d love to hear from you! Fill out the form below or reach us directly at <a href="mailto:support@givemedata.co" className="text-[#d4af37] hover:underline font-semibold">support@givemedata.co</a>.</p>
					<form className="space-y-8">
						<div>
							<label className="block text-base font-medium text-gray-700 mb-2 font-serif">Name</label>
							<input type="text" className="w-full px-5 py-3 border border-[#d4af37] rounded-lg bg-[#f9f6f2] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4af37] font-serif" placeholder="Your Name" required />
						</div>
						<div>
							<label className="block text-base font-medium text-gray-700 mb-2 font-serif">Email</label>
							<input type="email" className="w-full px-5 py-3 border border-[#d4af37] rounded-lg bg-[#f9f6f2] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4af37] font-serif" placeholder="you@email.com" required />
						</div>
						<div>
							<label className="block text-base font-medium text-gray-700 mb-2 font-serif">Message</label>
							<textarea className="w-full px-5 py-3 border border-[#d4af37] rounded-lg bg-[#f9f6f2] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4af37] font-serif" rows={5} placeholder="How can we help you?" required />
						</div>
						<button type="submit" className="w-full bg-[#d4af37] text-white py-3 rounded-lg font-semibold text-lg shadow hover:bg-[#bfa233] transition font-serif">Send Message</button>
					</form>
					<div className="mt-10 text-center text-gray-700 text-base font-serif">
						<div className="mb-2">Or reach us at:</div>
						<div className="mb-1">Email: <a href="mailto:support@givemedata.co" className="text-[#d4af37] hover:underline font-semibold">support@givemedata.co</a></div>
						<div>Phone: <a href="tel:+1234567890" className="text-[#d4af37] hover:underline font-semibold">+1 (234) 567-890</a></div>
					</div>
				</div>
			</main>
		</>
	);
}
