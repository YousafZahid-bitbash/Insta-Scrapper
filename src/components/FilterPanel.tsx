"use client";
import React, { useState } from "react";


interface FilterPanelProps {
  open: boolean;
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  onClose: () => void;
  reset: () => void;
}

const sections = [
  { key: "contact", title: "Contact & Links" },
  { key: "profile", title: "Profile Flags" },
  { key: "ranges", title: "Follower/Following Ranges" },
  { key: "namebio", title: "Name/Bio Rules" },
];

export type FiltersState = {
  extractPhone: boolean;
  extractEmail: boolean;
  extractLinkInBio: boolean;
  privacy: boolean;
  profilePicture: boolean;
  verifiedAccount: boolean;
  businessAccount: boolean;
  followersMin: string;
  followersMax: string;
  followingsMin: string;
  followingsMax: string;
  filterByName: string;
  filterByNameInBioContains: string;
  filterByNameInBioStop: string;
};

interface FilterPanelProps {
  open: boolean;
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  onClose: () => void;
  reset: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ open, value, onChange, onClose, reset }) => {
  // Accordion open state
  const [openSections, setOpenSections] = useState<string[]>(sections.map(s => s.key));
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (!open) return null;

  // Adjust top offset to match Navbar height (e.g., 64px)
  return (
    <div
      className={`fixed right-0 z-40 bg-white text-black md:w-[420px] w-screen h-screen shadow-2xl transition-all duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      style={{ top: '64px', padding: "1.5rem", overflowY: "auto" }}
    >
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
        {/* Contact & Links */}
        <AccordionSection
          title="Contact & Links"
          open={openSections.includes("contact")}
          onToggle={() => setOpenSections(os => os.includes("contact") ? os.filter(k => k !== "contact") : [...os, "contact"])}
        >
          <div className="grid gap-4 pt-2">
            <label htmlFor="extractPhone" className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="extractPhone" checked={value.extractPhone} onChange={e => onChange({ ...value, extractPhone: e.target.checked })} className="accent-[#d4af37] w-5 h-5" />
              <span>Extract Phone Numbers</span>
            </label>
            <label htmlFor="extractEmail" className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="extractEmail" checked={value.extractEmail} onChange={e => onChange({ ...value, extractEmail: e.target.checked })} className="accent-[#d4af37] w-5 h-5" />
              <span>Extract Emails</span>
            </label>
            <label htmlFor="extractLinkInBio" className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="extractLinkInBio" checked={value.extractLinkInBio} onChange={e => onChange({ ...value, extractLinkInBio: e.target.checked })} className="accent-[#d4af37] w-5 h-5" />
              <span>Extract Link in Bios</span>
            </label>
          </div>
        </AccordionSection>
        <Separator />
        {/* Profile Flags */}
        <AccordionSection
          title="Profile Flags"
          open={openSections.includes("profile")}
          onToggle={() => setOpenSections(os => os.includes("profile") ? os.filter(k => k !== "profile") : [...os, "profile"])}
        >
          <div className="grid gap-4 pt-2">
            <label htmlFor="privacy" className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="privacy" checked={value.privacy} onChange={e => onChange({ ...value, privacy: e.target.checked })} className="accent-[#d4af37] w-5 h-5" />
              <span>Privacy On</span>
            </label>
            <label htmlFor="profilePicture" className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="profilePicture" checked={value.profilePicture} onChange={e => onChange({ ...value, profilePicture: e.target.checked })} className="accent-[#d4af37] w-5 h-5" />
              <span>Profile Picture</span>
            </label>
            <label htmlFor="verifiedAccount" className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="verifiedAccount" checked={value.verifiedAccount} onChange={e => onChange({ ...value, verifiedAccount: e.target.checked })} className="accent-[#d4af37] w-5 h-5" />
              <span>Verified Account</span>
            </label>
            <label htmlFor="businessAccount" className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="businessAccount" checked={value.businessAccount} onChange={e => onChange({ ...value, businessAccount: e.target.checked })} className="accent-[#d4af37] w-5 h-5" />
              <span>Business Account</span>
            </label>
          </div>
        </AccordionSection>
        <Separator />
        {/* Follower/Following Ranges */}
        <AccordionSection
          title="Follower/Following Ranges"
          open={openSections.includes("ranges")}
          onToggle={() => setOpenSections(os => os.includes("ranges") ? os.filter(k => k !== "ranges") : [...os, "ranges"])}
        >
          <div className="grid gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="followersMin" className="text-base font-semibold text-gray-700 mb-1">Number of Followers Between</label>
              <div className="flex gap-3">
                <input type="number" id="followersMin" placeholder="Min" className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-1/2" value={value.followersMin} onChange={e => onChange({ ...value, followersMin: e.target.value })} />
                <input type="number" id="followersMax" placeholder="Max" className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-1/2" value={value.followersMax} onChange={e => onChange({ ...value, followersMax: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="followingsMin" className="text-base font-semibold text-gray-700 mb-1">Number of Followings Between</label>
              <div className="flex gap-3">
                <input type="number" id="followingsMin" placeholder="Min" className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-1/2" value={value.followingsMin} onChange={e => onChange({ ...value, followingsMin: e.target.value })} />
                <input type="number" id="followingsMax" placeholder="Max" className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-1/2" value={value.followingsMax} onChange={e => onChange({ ...value, followingsMax: e.target.value })} />
              </div>
            </div>
          </div>
        </AccordionSection>
        <Separator />
        {/* Name/Bio Rules */}
        <AccordionSection
          title="Name/Bio Rules"
          open={openSections.includes("namebio")}
          onToggle={() => setOpenSections(os => os.includes("namebio") ? os.filter(k => k !== "namebio") : [...os, "namebio"])}
        >
          <div className="grid gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="filterByName" className="text-base font-semibold text-gray-700 mb-1">Filter By Name (Insert List)</label>
              <textarea id="filterByName" className="min-h-[80px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none" rows={2} placeholder="Enter names, one per line" value={value.filterByName} onChange={e => onChange({ ...value, filterByName: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="filterByNameInBioContains" className="text-base font-semibold text-gray-700 mb-1">Filter By Name in bio-Contains Only</label>
              <textarea id="filterByNameInBioContains" className="min-h-[80px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none" rows={2} placeholder="Words to match in name/bio" value={value.filterByNameInBioContains} onChange={e => onChange({ ...value, filterByNameInBioContains: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="filterByNameInBioStop" className="text-base font-semibold text-gray-700 mb-1">Filter By Name in Bio-Stop if</label>
              <textarea id="filterByNameInBioStop" className="min-h-[80px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none" rows={2} placeholder="Stop words in name/bio" value={value.filterByNameInBioStop} onChange={e => onChange({ ...value, filterByNameInBioStop: e.target.value })} />
            </div>
          </div>
        </AccordionSection>
      </div>
      {/* Footer */}
      <div className="mt-6 flex flex-row gap-4 justify-end">
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
