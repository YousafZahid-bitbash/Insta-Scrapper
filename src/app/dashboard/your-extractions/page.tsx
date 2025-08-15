"use client"
import { useEffect, useState } from "react";
import React from "react";
import { supabase } from "../../../supabaseClient";
import Shimmer from "../../../components/Shimmer";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";

export default function YourExtractionsPage() {
  type Extraction = {
    id: string;
    extraction_type: string;
    target_username: string | null;
    target_user_id: string;
    requested_at: string;
    completed_at: string;
    status: string;
    page_count: number;
    next_page_id: string | null;
    error_message: string | null;
  };
  type ExtractedUser = {
    id: string;
    extraction_id: string;
    pk: string;
    username: string;
    full_name: string;
    is_private: boolean;
    is_verified: boolean;
  };
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [selectedExtraction, setSelectedExtraction] = useState<Extraction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [extractedUsers, setExtractedUsers] = useState<ExtractedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState<number>(0);

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    if (!userId) return;
    setLoading(true);
    supabase
      .from("extractions")
      .select("*")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (!error && data) setExtractions(data);
      });
  }, []);

  useEffect(() => {
	async function fetchCoins() {
		const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
		console.log("[NewExtractions] userId from localStorage:", userId);
		if (userId) {
			try {
				const { data, error } = await supabase
					.from("users")
					.select("coins")
					.eq("id", userId)
					.single();
				console.log("[NewExtractions] Supabase coins query result:", { data, error });
				if (data && data.coins !== undefined) {
					setCoins(data.coins);
					console.log(`[NewExtractions] Coins set in state:`, data.coins);
				} else {
					console.log("[NewExtractions] No coins found for user");
				}
			} catch (err) {
				console.error("[NewExtractions] Error fetching coins:", err);
			}
		} else {
			console.log("[NewExtractions] No user_id in localStorage");
		}
	}
	fetchCoins();
}, []);


  const handleShowDetails = async (extraction: Extraction) => {
    setSelectedExtraction(extraction);
    setShowModal(true);
    setLoading(true);
    const { data, error } = await supabase
      .from("extracted_users")
      .select("*")
      .eq("extraction_id", extraction.id);
    setLoading(false);
    if (!error && data) setExtractedUsers(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar coins={coins} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 max-w-4xl mx-auto py-12 px-4 md:px-0">
          <h1 className="text-4xl font-serif font-extrabold mb-10 text-center tracking-tight text-gray-900">Your Extractions</h1>
          {loading && (
            <div className="space-y-4 mb-6">
              <Shimmer className="h-20 w-full" />
              <Shimmer className="h-20 w-full" />
              <Shimmer className="h-20 w-full" />
            </div>
          )}
          <ul className="space-y-6">
            {!loading && extractions.length === 0 && (
              <div className="text-center text-gray-400 text-lg">No extractions found.</div>
            )}
            {!loading && extractions.map((extraction) => (
              <li key={extraction.id} className="bg-white shadow-lg rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between border border-gray-200 hover:border-blue-400 transition-all">
                <div>
                  <div className="font-serif text-xl font-bold text-blue-900 mb-1 capitalize">{extraction.extraction_type}</div>
                  <div className="text-md text-gray-700 mb-1">Target: <span className="font-mono text-blue-700">{extraction.target_username || extraction.target_user_id}</span></div>
                  <div className="text-xs text-gray-400 mb-1">Requested: {new Date(extraction.requested_at).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Status: <span className={extraction.status === 'completed' ? 'text-green-600' : 'text-red-600'}>{extraction.status}</span></div>
                </div>
                <button
                  className="mt-4 md:mt-0 md:ml-6 px-6 py-2 font-semibold font-serif bg-gradient-to-r from-blue-700 to-blue-400 text-white rounded-lg shadow hover:from-blue-800 hover:to-blue-500 transition-all"
                  onClick={() => handleShowDetails(extraction)}
                >
                  Extracted Data
                </button>
              </li>
            ))}
          </ul>
          {showModal && selectedExtraction && (
            <>
              <div className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center" onClick={() => setShowModal(false)} />
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="w-full max-w-7xl h-[70vh] bg-white rounded-2xl shadow-2xl p-8 border border-blue-200 relative flex flex-col gap-6">
                  <button
                    className="absolute top-2 right-3  text-gray-500 hover:text-blue-700 text-3xl font-bold z-10"
                    onClick={() => setShowModal(false)}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Extraction Details Container */}
                    <div className="flex-0.6 bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <h2 className="text-xl font-serif font-bold mb-4 text-blue-900">Extraction Details</h2>
                      
                      <div className="mb-2 grid grid-cols-1 gap-2">
                        <h3 className="font-serif font-semibold text-gray-700">Extracted Data ({extractedUsers.length})</h3>
                        <div><span className="font-semibold text-gray-700">Type:</span> <span className="font-serif text-blue-800">{selectedExtraction.extraction_type}</span></div>
                        <div><span className="font-semibold text-gray-700">Target:</span> <span className="font-mono text-blue-700">{selectedExtraction.target_username || selectedExtraction.target_user_id}</span></div>
                        <div className="text-gray-700"><span className="font-semibold">Requested At:</span> {new Date(selectedExtraction.requested_at).toLocaleString()}</div>
                        <div><span className="font-semibold text-gray-700">Status:</span> <span className={selectedExtraction.status === 'completed' ? 'text-green-600' : 'text-red-600'}>{selectedExtraction.status}</span></div>
                        <div className="text-gray-700"><span className="font-semibold">Page Count:</span> {selectedExtraction.page_count}</div>
                        
                        {selectedExtraction.error_message && (
                          <div className="text-red-500"><span className="font-semibold">Error:</span> {selectedExtraction.error_message}</div>
                        )}
                      </div>
                    </div>
                    {/* Data Table Container */}
                    <div className="flex-1 bg-white rounded-xl p-4 border border-gray-200 overflow-x-auto overflow-y-auto h-[60vh]">
                      
                      {loading ? (
                        <div className="space-y-2 mb-4">
                          <Shimmer className="h-10 w-full" />
                          <Shimmer className="h-10 w-full" />
                          <Shimmer className="h-10 w-full" />
                          <Shimmer className="h-10 w-full" />
                          <Shimmer className="h-10 w-full" />
                          <Shimmer className="h-10 w-full" />
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-blue-100">
                                {extractedUsers.length > 0 && Object.keys(extractedUsers[0])
                                  .filter((key) => key !== "profile_pic_url" && key !== "extraction_id" && key !== "id" && key !== "pk")
                                  .map((key) => (
                                    <th key={key} className="p-3 font-serif text-black capitalize">{key.replace(/_/g, ' ')}</th>
                                  ))}
                              </tr>
                            </thead>
                            <tbody>
                              {extractedUsers.map((u) => (
                                <tr key={u.id} className="border-t">
                                  {Object.keys(u)
                                    .filter((key) => key !== "profile_pic_url" && key !== "extraction_id" && key !== "id" && key !== "pk")
                                    .map((key) => (
                                      <td key={key} className="p-3 text-black text-center">{String(u[key as keyof typeof u])}</td>
                                    ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                  // ...existing code...
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
