import Link from "next/link";
import Image from "next/image";

export default function HomeNavbar() {
  return (
  <header className="w-full flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 sm:py-6 shadow-sm gap-3 sm:gap-0 text-gray-900 bg-white">
      <Link href="/pages/home" className="flex items-center gap-2">
        <Image src="/file.svg" alt="Logo" width={32} height={32} />
    <span className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">Insta Scrapper</span>
      </Link>
  <nav className="flex gap-4 sm:gap-6 text-sm sm:text-base font-medium flex-wrap justify-center text-gray-900">
        <Link href="/">Home</Link>
        <Link href="/pages/pricing">Pricing</Link>
        <Link href="/pages/blog">Blog</Link>
        <Link href="/pages/affiliates">Affiliates</Link>
        <Link href="/pages/contact-us">Contact Us</Link>
      </nav>
      <div className="flex gap-2 sm:gap-4">
  <Link href="/auth/login" className="px-3 sm:px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 text-sm sm:text-base text-gray-900">Login</Link>
  <Link href="/auth/signup" className="px-3 sm:px-4 py-2 rounded bg-black text-white hover:bg-gray-800 text-sm sm:text-base">Sign Up</Link>
      </div>
    </header>
  );
}
