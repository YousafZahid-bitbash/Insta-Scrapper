import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white border-r flex flex-col p-6">
      <div className="mb-8">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</span>
        <nav className="mt-3 flex flex-col gap-2">
          {/* Dashboard nav item removed */}
          <Link href="/dashboard/new-extractions" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium">New Extractions</Link>
          <Link href="/dashboard/your-extractions" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium">Your extractions</Link>
          <Link href="#" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium">Support</Link>
          <Link href="#" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium">Affiliates</Link>
        </nav>
      </div>
      <div className="mt-auto">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</span>
        <nav className="mt-3 flex flex-col gap-2">
          <Link href="/dashboard/billing" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium">Billing</Link>
            <Link href="/dashboard/settings" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium">Settings</Link>
          <button className="px-3 py-2 rounded hover:bg-gray-100 text-left text-gray-900 font-medium">Logout</button>
        </nav>
      </div>
    </aside>
  );
}
