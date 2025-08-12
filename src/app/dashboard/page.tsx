import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col">
        <Navbar />
        <div className="flex flex-1 w-full">
            <div className="hidden md:block">
                <Sidebar />
            </div>
        <main className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to your Dashboard</h1>
          {/* Dashboard content goes here */}
        </main>
      </div>
    </div>
  );
}
