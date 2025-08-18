import Image from "next/image";
import { FaCoins } from "react-icons/fa";
import Link from "next/link";

type NavbarProps = {
  coins?: number;
};

export default function Navbar({ coins = 0 }: NavbarProps) {
  return (
    <header className="h-16 bg-white border-b flex items-center px-8 justify-between sticky top-0 left-0 z-40">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/file.svg" alt="Logo" width={32} height={32} />
        <span className="text-xl font-bold tracking-tight text-gray-900">Insta Scrapper</span>
      </Link>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-yellow-500 font-semibold">
          <FaCoins size={20} />
          <span>{coins}</span>
        </div>
        <Image src="/window.svg" alt="User" width={32} height={32} className="rounded-full bg-gray-200" />
      </div>
    </header>
  );
}
