// "use client";
// import React, { useState } from "react";



// export type FiltersState = {
//   // User filters
//   extractPhone: boolean;
//   extractEmail: boolean;
//   extractLinkInBio: boolean;
//   privacy: "yes" | "no" | "doesn't matter";
//   profilePicture: "yes" | "no" | "doesn't matter";
//   verifiedAccount: "yes" | "no" | "doesn't matter";
//   businessAccount: "yes" | "no" | "doesn't matter";
//   followersMin: string;
//   followersMax: string;
//   followingsMin: string;
//   followingsMax: string;
//   filterByName: string;
//   filterByNameInBioContains: string;
//   filterByNameInBioStop: string;
//   coinLimit: string;
//   // Commenters filters
//   commentExcludeWords?: string;
//   commentStopWords?: string;
//   // Posts filters
//   postDateFrom?: string;
//   postDateTo?: string;
//   postType?: "image" | "video" | "carousel" | "any";
//   postLikesMin?: string;
//   postLikesMax?: string;
//   postCommentsMin?: string;
//   postCommentsMax?: string;
//   postCaptionContains?: string;
//   postCaptionStopWords?: string;
//   postHashtagsContains?: string;
//   postLocation?: string;
// };

// interface FilterPanelProps {
//   open: boolean;
//   value: FiltersState;
//   onChange: (next: FiltersState) => void;
//   onClose: () => void;
//   reset: () => void;
//   selectedType?: string; // 'followers', 'posts', etc.
// }

// interface FilterPanelProps {
//   open: boolean;
//   value: FiltersState;
//   onChange: (next: FiltersState) => void;
//   onClose: () => void;
//   reset: () => void;
// }

// export const FilterPanel: React.FC<FilterPanelProps> = ({ open, value, onChange, onClose, reset, selectedType }) => {
//   // Accordion open state
//   const [openSections, setOpenSections] = useState<string[]>(["contact", "profile", "ranges", "namebio"]);

//   if (!open) return null;

//   // Helper: is posts extraction selected?
//   const isPosts = selectedType === "posts";
//   const isCommenters = selectedType === "commenters";

//   return (
//     <div
//       className={`fixed right-0 z-40 bg-white text-black md:w-[420px] w-screen h-screen shadow-2xl transition-all duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
//     >
//       <div style={{ maxHeight: '100vh', overflowY: 'auto', paddingLeft: 16, paddingRight: 20 }}>
//         <Separator />
//         {/* Header */}
//         <div className="relative pb-2 mb-2 border-b border-gray-200">
//           <div className="flex items-center justify-between">
//             <div>
//               <h2 className="text-2xl font-bold text-[#bfa233] font-serif">Advanced Filters</h2>
//               <p className="text-gray-600 text-sm">Refine your extraction with advanced options below.</p>
//             </div>
//             <button
//               type="button"
//               className="text-gray-400 hover:text-[#bfa233] text-2xl font-bold"
//               aria-label="Close"
//               onClick={onClose}
//             >
//               ×
//             </button>
//           </div>
//         </div>
//         {/* Accordion Sections */}
//         <div className="mt-2 flex flex-col gap-4">
//           {/* Show only comment filters for commenters extraction */}
//           {isCommenters ? (
//             <>
//               <AccordionSection
//                 title="Comment Text Filters"
//                 open={openSections.includes("commentText")}
//                 onToggle={() => setOpenSections(os => os.includes("commentText") ? os.filter(k => k !== "commentText") : [...os, "commentText"])}
//               >
//                 <div className="grid gap-4 pt-2">
//                   <div className="flex flex-col gap-2">
//                     <label htmlFor="commentExcludeWords" className="text-base font-semibold text-gray-700 mb-1">Exclude Comments Containing (one word per line)</label>
//                     <textarea id="commentExcludeWords" className="min-h-[80px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none" rows={2} placeholder="Words to exclude from comments" value={value.commentExcludeWords || ''} onChange={e => onChange({ ...value, commentExcludeWords: e.target.value })} />
//                   </div>
//                   <div className="flex flex-col gap-2">
//                     <label htmlFor="commentStopWords" className="text-base font-semibold text-gray-700 mb-1">Stop Extraction if Comment Contains (one word per line)</label>
//                     <textarea id="commentStopWords" className="min-h-[80px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none" rows={2} placeholder="Stop words in comments" value={value.commentStopWords || ''} onChange={e => onChange({ ...value, commentStopWords: e.target.value })} />
//                   </div>
//                 </div>
//               </AccordionSection>
//             </>
//           ) : null}
//           {/* Show user filters only if not posts or commenters */}
//           {!isPosts && !isCommenters && <>
//             {/* ...existing code... */}
//           </>}
//           {/* Posts filters section */}
//           {isPosts && <>
//             {/* ...existing code... */}
//           </>}
//           {/* Footer */}
//           <div className="mt-6 flex flex-row gap-4 justify-center mb-8">
//             <button
//               type="button"
//               className="bg-[#d4af37] hover:bg-[#bfa233] text-white px-6 py-2 rounded-xl font-bold"
//               onClick={onClose}
//             >
//               Apply Filters
//             </button>
//             <button
//               type="button"
//               className="px-6 py-2 rounded-xl font-bold border border-[#d4af37]/40 bg-transparent text-[#bfa233] hover:bg-[#f7f9fc]"
//               onClick={reset}
//             >
//               Reset
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // AccordionSection and Separator components
// const AccordionSection: React.FC<{ title: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, open, onToggle, children }) => (
//   <div className="border rounded-xl overflow-hidden">
//     <button
//       type="button"
//       className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800 focus:outline-none"
//       onClick={onToggle}
//     >
//       <span>{title}</span>
//       <span className="text-lg">{open ? "−" : "+"}</span>
//     </button>
//     {open && <div className="px-4 pb-4 pt-2">{children}</div>}
//   </div>
// );

// const Separator: React.FC = () => <div className="my-2 h-px bg-gray-200" />;




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
  // Hashtag filters
  hashtagLimit?: number;
  

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
  const isHashtags = selectedType === "hashtags";

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
          {/* Show user filters only if not posts */}
          {!isPosts && !isCommenters && !isHashtags && <>
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
              {[
                { key: "privacy", label: "Privacy On" },
                { key: "profilePicture", label: "Profile Picture" },
                { key: "verifiedAccount", label: "Verified Account" },
                { key: "businessAccount", label: "Business Account" },
              ].map(flag => (
                <div key={flag.key} className="flex flex-col gap-1">
                  <span className="font-semibold text-gray-700 mb-1">{flag.label}</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={flag.key}
                        value="yes"
                        checked={value[flag.key as keyof FiltersState] === "yes"}
                        onChange={() => onChange({ ...value, [flag.key]: "yes" })}
                        className="accent-[#d4af37] w-5 h-5"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={flag.key}
                        value="no"
                        checked={value[flag.key as keyof FiltersState] === "no"}
                        onChange={() => onChange({ ...value, [flag.key]: "no" })}
                        className="accent-[#d4af37] w-5 h-5"
                      />
                      <span>No</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={flag.key}
                        value="doesn&apos;t matter"
                        checked={value[flag.key as keyof FiltersState] === "doesn't matter"}
                        onChange={() => onChange({ ...value, [flag.key]: "doesn't matter" })}
                        className="accent-[#d4af37] w-5 h-5"
                      />
                      <span>Doesn&apos;t matter</span>
                    </label>
                  </div>
                </div>
              ))}
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
                <label htmlFor="coinLimit" className="text-base font-semibold text-gray-700 mb-1">Coin Limit</label>
                <input
                  type="number"
                  id="coinLimit"
                  placeholder="Enter coin limit"
                  className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-full"
                  value={value.coinLimit}
                  onChange={e => onChange({ ...value, coinLimit: e.target.value })}
                  min={0}
                />
              </div>
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
        </>}
          {/* Posts filters section */}
          {isPosts && <>
            <AccordionSection
              title="Likes & Comments"
              open={openSections.includes("postLikesComments")}
              onToggle={() => setOpenSections(os => os.includes("postLikesComments") ? os.filter(k => k !== "postLikesComments") : [...os, "postLikesComments"])}
            >
              <div className="w-full flex flex-col gap-6">
                <div className="flex flex-col flex-2">
                  <span className="font-semibold text-gray-700 mb-2">Likes</span>
                  <div className="flex gap-3 items-end">
                    <div className="flex flex-col flex-1">
                      <label htmlFor="postLikesMin" className="text-sm text-gray-600 mb-1">Min</label>
                      <input type="number" id="postLikesMin" className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-full" value={value.postLikesMin || ''} onChange={e => onChange({ ...value, postLikesMin: e.target.value })} min={0} />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label htmlFor="postLikesMax" className="text-sm text-gray-600 mb-1">Max</label>
                      <input type="number" id="postLikesMax" className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-full" value={value.postLikesMax || ''} onChange={e => onChange({ ...value, postLikesMax: e.target.value })} min={0} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col flex-2">
                  <span className="font-semibold text-gray-700 mb-2">Comments</span>
                  <div className="flex gap-3 items-end">
                    <div className="flex flex-col flex-1">
                      <label htmlFor="postCommentsMin" className="text-sm text-gray-600 mb-1">Min</label>
                      <input type="number" id="postCommentsMin" className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-full" value={value.postCommentsMin || ''} onChange={e => onChange({ ...value, postCommentsMin: e.target.value })} min={0} />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label htmlFor="postCommentsMax" className="text-sm text-gray-600 mb-1">Max</label>
                      <input type="number" id="postCommentsMax" className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-full" value={value.postCommentsMax || ''} onChange={e => onChange({ ...value, postCommentsMax: e.target.value })} min={0} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="coinLimit" className="text-base font-semibold text-gray-700 mb-1">Coin Limit</label>
                  <input
                    type="number"
                    id="coinLimit"
                    placeholder="Enter coin limit"
                    className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-full"
                    value={value.coinLimit}
                    onChange={e => onChange({ ...value, coinLimit: e.target.value })}
                    min={0}
                  />
                </div>
              </div>
                
              {/* </div> */}
            </AccordionSection>
            <Separator />
            <AccordionSection
              title="Description Contains / Stop Words"
              open={openSections.includes("postDescWords")}
              onToggle={() => setOpenSections(os => os.includes("postDescWords") ? os.filter(k => k !== "postDescWords") : [...os, "postDescWords"])}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="postCaptionContains" className="text-base font-semibold text-gray-700 mb-1">Contains one word in Description</label>
                  <input type="text" id="postCaptionContains" className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-full" value={value.postCaptionContains || ''} onChange={e => onChange({ ...value, postCaptionContains: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="postCaptionStopWords" className="text-base font-semibold text-gray-700 mb-1">Stop Words in Description</label>
                  <input type="text" id="postCaptionStopWords" className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-full" value={value.postCaptionStopWords || ''} onChange={e => onChange({ ...value, postCaptionStopWords: e.target.value })} />
                </div>
              </div>
            </AccordionSection>
          </>}
          {isCommenters && 
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
          }
          {isHashtags && 
            <>
              <AccordionSection
                title="Hashtag Filters"
                open={openSections.includes("hashtag")}
                onToggle={() => setOpenSections(os => os.includes("hashtag") ? os.filter(k => k !== "hashtag") : [...os, "hashtag"])}
              >
                <div className="grid gap-4 pt-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="hashtagLimit" className="text-base font-semibold text-gray-700 mb-1">hashtag limit</label>
                    <input
                      type="number"
                      id="hashtagLimit"
                      placeholder="Enter hashtag limit"
                      className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:outline-none w-full"
                      value={value.hashtagLimit ?? ''}
                      onChange={e => onChange({ ...value, hashtagLimit: e.target.value === '' ? undefined : Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                  
                </div>
              </AccordionSection>
            </>
          }

             
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
