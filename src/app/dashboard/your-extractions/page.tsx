

"use client";
import { useEffect, useState } from "react";
import React from "react";
import { supabase } from "../../../supabaseClient";
import Shimmer from "../../../components/Shimmer";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";

export default function YourExtractionsPage() {
  // ...existing code...
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const handleDeleteExtraction = async (extractionId: string) => {
    setDeleteId(extractionId);
    setShowDeleteModal(true);
  };
  const confirmDeleteExtraction = async () => {
    if (!deleteId) return;
    setLoading(true);
    await supabase
      .from('extracted_users')
      .delete()
      .eq('extraction_id', deleteId);
    const { error } = await supabase
      .from('extractions')
      .delete()
      .eq('id', deleteId);
    setLoading(false);
    setShowDeleteModal(false);
    setDeleteId(null);
    if (!error) {
      setExtractions(prev => prev.filter(e => e.id !== deleteId));
      if (selectedExtraction && selectedExtraction.id === deleteId) {
        setShowModal(false);
        setSelectedExtraction(null);
        setExtractedUsers([]);
      }
    } else {
      alert('Failed to delete extraction.');
    }
  };
  
  type Extraction = {
    id: string;
    extraction_type: string;
    target_usernames: string | null;
    target_user_id: string;
    requested_at: string;
    completed_at: string;
    status: string;
    page_count: number;
    next_page_id: string | null;
    error_message: string | null;
    progress: number | null;
    current_step: string | null;
  filters: Record<string, unknown> | null;
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

  // Download handler

  // --- Dynamic title ---
  // Place this at the top of your return statement:
  // <Head><title>Your Extractions | Scrapper Glass</title></Head>
  const handleDownload = (format: 'json' | 'csv' | 'txt') => {
    setShowDownloadDropdown(false);
    if (!extractedUsers || extractedUsers.length === 0) return;
    let dataStr = '';
  const filename = `extracted_${selectedExtraction?.extraction_type || 'data'}.${format}`;
    if (format === 'json') {
      dataStr = JSON.stringify(extractedUsers, null, 2);
    } else if (format === 'csv') {
      const keys = Object.keys(extractedUsers[0]).filter(k => k !== 'id' && k !== 'extraction_id' && k !== 'pk');
      const header = keys.join(';');
      const rows = extractedUsers.map(u => keys.map(k => String(u[k as keyof typeof u] ?? '')).join(';'));
      dataStr = header + '\n' + rows.join('\n');
    } else if (format === 'txt') {
      const keys = Object.keys(extractedUsers[0]).filter(k => k !== 'id' && k !== 'extraction_id' && k !== 'pk');
      const rows = extractedUsers.map(u => keys.map(k => String(u[k as keyof typeof u] ?? '')).join(',')).join('\n');
      dataStr = rows;
    }
    const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  useEffect(() => {
    // Set page title
    document.title = "Your Extractions | Scrapper Glass";
  }, []);

  useEffect(() => {
    async function fetchExtractions() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("Not authenticated");
        const user = await res.json();
        if (!user?.id) return;
        setLoading(true);
        // Replace with your own API or fetch logic for extractions
        const extractionsRes = await fetch(`/api/extractions?user_id=${user.id}`);
        if (extractionsRes.ok) {
          const data = await extractionsRes.json();
          setExtractions(data);
        }
      } catch {}
      setLoading(false);
    }
    fetchExtractions();
  }, []);

  useEffect(() => {
    async function fetchCoins() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("Not authenticated");
        const user = await res.json();
        if (user && typeof user.coins === "number") setCoins(user.coins);
      } catch {
        setCoins(0);
      }
    }
    fetchCoins();
  }, []);


  const handleShowDetails = async (extraction: Extraction) => {
    setSelectedExtraction(extraction);
    setShowModal(true);
    setLoading(true);
    let table = "extracted_users";
    if (extraction.extraction_type === "posts") {
      table = "extracted_posts";
    } else if (extraction.extraction_type === "commenters") {
      table = "extracted_commenters";
    } else if (extraction.extraction_type === "hashtags") {
      table = "extracted_hashtag_posts";
    }
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("extraction_id", extraction.id);
    setLoading(false);
    if (!error && data) setExtractedUsers(data);
  };

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        <Navbar coins={coins} />
        {/* Fixed Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 p-6 lg:p-8 md:ml-64">
          <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent mb-4">
              Your Extractions
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Manage and view all your Instagram data extractions
            </p>
          </div>

          {/* Main Content Container */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="p-8">
              {loading && (
                <div className="space-y-4 mb-6">
                  <Shimmer className="h-20 w-full" />
                  <Shimmer className="h-20 w-full" />
                  <Shimmer className="h-20 w-full" />
                </div>
              )}
              
              {!loading && extractions.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No extractions found</h3>
                  <p className="text-gray-500 mb-6">You haven&apos;t created any extractions yet. Start by creating your first extraction.</p>
                  <a 
                    href="/dashboard/new-extractions" 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Extraction
                  </a>
                </div>
              )}

              <ul className="space-y-6">
                {!loading && extractions.map((extraction) => (
                  <li key={extraction.id} className="group bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                            {extraction.extraction_type === 'followers' && (
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            )}
                            {extraction.extraction_type === 'followings' && (
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                              </svg>
                            )}
                            {extraction.extraction_type === 'posts' && (
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                            {!['followers', 'followings', 'posts'].includes(extraction.extraction_type) && (
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 capitalize">{extraction.extraction_type}</h3>
                            <p className="text-sm text-gray-500">Extraction #{String(extraction.id).slice(0, 8)}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Target:</span>
                            <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
                              {extraction.target_usernames || extraction.target_user_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Status:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              extraction.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : extraction.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {extraction.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Requested:</span>
                            <span className="text-gray-700">{new Date(extraction.requested_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Pages:</span>
                            <span className="text-gray-700">{extraction.page_count || 1}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                          onClick={() => handleShowDetails(extraction)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Data
                        </button>
                        <button
                          className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                          onClick={() => handleDeleteExtraction(extraction.id)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Elegant Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-red-200">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Delete Extraction?</h2>
              <p className="text-gray-600 mb-8">
                Are you sure you want to delete this extraction? This action cannot be undone and all associated data will be permanently removed.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-all"
                  onClick={() => { setShowDeleteModal(false); setDeleteId(null); }}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all"
                  onClick={confirmDeleteExtraction}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data View Modal */}
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
                    <div className="basis-[320px] min-w-[260px] max-w-[380px] bg-blue-50 rounded-xl p-4 border border-blue-100 flex-shrink-0 break-words overflow-auto">
                      <h2 className="text-xl font-serif font-bold mb-4 text-blue-900">Extraction Details</h2>
                      
                      <div className="mb-2 grid grid-cols-1 gap-2">
                        <h3 className="font-serif font-semibold text-gray-700">Extracted Data ({extractedUsers.length})</h3>
                        <div><span className="font-semibold text-gray-700">Type:</span> <span className="font-serif text-blue-800">{selectedExtraction.extraction_type}</span></div>
                        <div><span className="font-semibold text-gray-700">Target:</span> <span className="font-mono text-blue-700">{selectedExtraction.target_usernames || selectedExtraction.target_user_id}</span></div>
                        <div className="text-gray-700"><span className="font-semibold">Requested At:</span> {new Date(selectedExtraction.requested_at).toLocaleString()}</div>
                        <div><span className="font-semibold text-gray-700">Status:</span> <span className={selectedExtraction.status === 'completed' ? 'text-green-600' : 'text-red-600'}>{selectedExtraction.status}</span></div>
                        <div className="text-gray-700"><span className="font-semibold">Page Count:</span> {selectedExtraction.page_count}</div>
                        
                        {selectedExtraction.error_message && (
                          <div className="text-red-500"><span className="font-semibold">Error:</span> {selectedExtraction.error_message}</div>
                        )}
                        {/* Download Button and Dropdown */}
                        <div className="relative mt-2">
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-serif font-semibold shadow hover:bg-blue-700 transition-all"
                            onClick={() => setShowDownloadDropdown((prev) => !prev)}
                          >
                            Download File
                          </button>
                          {showDownloadDropdown && (
                            <div className="absolute left-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <button className="block w-full px-4 py-2 text-black text-left hover:bg-blue-50" onClick={() => handleDownload('json')}>Download as JSON</button>
                              <button className="block w-full px-4 py-2 text-black text-left hover:bg-blue-50" onClick={() => handleDownload('csv')}>Download as CSV</button>
                              <button className="block w-full px-4 py-2 text-black text-left hover:bg-blue-50" onClick={() => handleDownload('txt')}>Download as TXT</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Data Table Container */}
                    <div className="flex-1 min-w-0 bg-white rounded-xl p-4 border border-gray-200 overflow-x-auto overflow-y-auto h-[60vh]">
                      
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
                                  .filter((key) => {
                                    // Hide technical columns for both tables
                                    if (["id", "extraction_id", "pk"].includes(key)) return false;
                                    // Hide columns specific to extracted_users
                                    if (selectedExtraction.extraction_type !== "posts" && ["profile_pic_url"].includes(key)) return false;
                                    // Hide columns specific to extracted_posts
                                    if (selectedExtraction.extraction_type === "posts" && ["thumbnail_url", "user_id"].includes(key)) return false;
                                    return true;
                                  })
                                  .map((key) => (
                                    <th key={key} className="p-3 font-serif text-black capitalize">{key.replace(/_/g, ' ')}</th>
                                  ))}
                              </tr>
                            </thead>
                            <tbody>
                              {extractedUsers.map((u) => (
                                <tr key={u.id} className="border-t">
                                  {Object.keys(u)
                                    .filter((key) => {
                                      if (["id", "extraction_id", "pk"].includes(key)) return false;
                                      if (selectedExtraction.extraction_type !== "posts" && ["profile_pic_url"].includes(key)) return false;
                                      if (selectedExtraction.extraction_type === "posts" && ["thumbnail_url", "user_id"].includes(key)) return false;
                                      return true;
                                    })
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
                  {/* ...existing code... */}
                </div>
              </div>
            </>
          )}
    </div>
    </>
  );
}
