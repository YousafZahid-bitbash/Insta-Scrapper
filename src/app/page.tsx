import HomeNavbar from "@/components/HomeNavbar";
import Footer from "@/components/Footer";
import "./globals.css";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HomeNavbar />
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16 bg-gradient-to-b from-gray-50 to-white">
        <h1 className="text-3xl sm:text-6xl font-extrabold text-black text-center mb-4 sm:mb-6">Instant Instagram Data Extraction</h1>
        <p className="text-base sm:text-2xl text-center text-gray-600 max-w-xs sm:max-w-2xl mb-6 sm:mb-8">Easily extract Instagram profile, post, and hashtag data in seconds. No coding required. Start for free!</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full max-w-xs sm:max-w-none">
          <a href="/auth/signup" className="px-6 py-3 sm:px-8 sm:py-3 rounded bg-black text-white font-semibold text-base sm:text-lg hover:bg-gray-800 text-center">Get Started Free</a>
          <a href="/pages/pricing" className="px-6 py-3 sm:px-8 sm:py-3 rounded border text-black border-gray-300 text-base sm:text-lg font-semibold hover:bg-gray-100 text-center">See Pricing</a>
        </div>
      </main>
  <Footer />
    </div>
  );
}