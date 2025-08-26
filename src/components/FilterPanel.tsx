"use client";
import React, { useState } from "react";



export type FiltersState = {
  // User filters
  extractPhone: boolean;
  extractEmail: boolean;
  extractLinkInBio: boolean;
  privacy: "yes" | "no" | "doesn't matter";
  profilePicture: "yes" | "no" | "doesn't matter";
  verifiedAccount: "yes" | "no" | "doesn't matter";
  businessAccount: "yes" | "no" | "doesn't matter";
  followersMin: string;
  followersMax: string;
  followingsMin: string;
  followingsMax: string;
  filterByName: string;
  filterByNameInBioContains: string;
  filterByNameInBioStop: string;
  coinLimit: string;
  // Commenters filters
  commentExcludeWords?: string;
  commentStopWords?: string;
  // Posts filters
  postDateFrom?: string;
  postDateTo?: string;
  postType?: "image" | "video" | "carousel" | "any";
  postLikesMin?: string;
  postLikesMax?: string;
  postCommentsMin?: string;
  postCommentsMax?: string;
  postCaptionContains?: string;
  postCaptionStopWords?: string;
  postHashtagsContains?: string;
  postLocation?: string;
};

interface FilterPanelProps {
  open: boolean;
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  onClose: () => void;
  reset: () => void;
  selectedType?: string; // 'followers', 'posts', etc.
}

interface FilterPanelProps {
  open: boolean;
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  onClose: () => void;
  reset: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ open, value, onChange, onClose, reset, selectedType }) => {
  // Accordion open state
  const [openSections, setOpenSections] = useState<string[]>(["contact", "profile", "ranges", "namebio"]);

  if (!open) return null;

  // Helper: is posts extraction selected?
  const isPosts = selectedType === "posts";
  const isCommenters = selectedType === "commenters";

  return (
    <div
      className={`fixed right-0 z-40 bg-white text-black md:w-[420px] w-screen h-screen shadow-2xl transition-all duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      <div style={{ maxHeight: '100vh', overflowY: 'auto', paddingLeft: 16, paddingRight: 20 }}>
        <Separator />
        {/* Header */}
        <div className="relative pb-2 mb-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#bfa233] font-serif">Advanced Filters</h2>
              <p className="text-gray-600 text-sm">Refine your extraction with advanced options below.</p>
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-[#bfa233] text-2xl font-bold"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>
        {/* Accordion Sections */}
        <div className="mt-2 flex flex-col gap-4">
          {/* Show only comment filters for commenters extraction */}
          {isCommenters ? (
            <>
              <AccordionSection
                title="Comment Text Filters"
                open={openSections.includes("commentText")}
                onToggle={() => setOpenSections(os => os.includes("commentText") ? os.filter(k => k !== "commentText") : [...os, "commentText"])}
              >
                <div className="grid gap-4 pt-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="commentExcludeWords" className="text-base font-semibold text-gray-700 mb-1">Exclude Comments Containing (one word per line)</label>
                    <textarea id="commentExcludeWords" className="min-h-[80px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none" rows={2} placeholder="Words to exclude from comments" value={value.commentExcludeWords || ''} onChange={e => onChange({ ...value, commentExcludeWords: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="commentStopWords" className="text-base font-semibold text-gray-700 mb-1">Stop Extraction if Comment Contains (one word per line)</label>
                    <textarea id="commentStopWords" className="min-h-[80px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none" rows={2} placeholder="Stop words in comments" value={value.commentStopWords || ''} onChange={e => onChange({ ...value, commentStopWords: e.target.value })} />
                  </div>
                </div>
              </AccordionSection>
            </>
          ) : null}
          {/* Show user filters only if not posts or commenters */}
          {!isPosts && !isCommenters && <>
            {/* ...existing code... */}
          </>}
          {/* Posts filters section */}
          {isPosts && <>
            {/* ...existing code... */}
          </>}
          {/* Footer */}
          <div className="mt-6 flex flex-row gap-4 justify-center mb-8">
            <button
              type="button"
              className="bg-[#d4af37] hover:bg-[#bfa233] text-white px-6 py-2 rounded-xl font-bold"
              onClick={onClose}
            >
              Apply Filters
            </button>
            <button
              type="button"
              className="px-6 py-2 rounded-xl font-bold border border-[#d4af37]/40 bg-transparent text-[#bfa233] hover:bg-[#f7f9fc]"
              onClick={reset}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// AccordionSection and Separator components
const AccordionSection: React.FC<{ title: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, open, onToggle, children }) => (
  <div className="border rounded-xl overflow-hidden">
    <button
      type="button"
      className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800 focus:outline-none"
      onClick={onToggle}
    >
      <span>{title}</span>
      <span className="text-lg">{open ? "−" : "+"}</span>
    </button>
    {open && <div className="px-4 pb-4 pt-2">{children}</div>}
  </div>
);

const Separator: React.FC = () => <div className="my-2 h-px bg-gray-200" />;
