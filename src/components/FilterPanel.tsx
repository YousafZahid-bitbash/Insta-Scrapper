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
      className={`fixed right-0 z-40 bg-gradient-to-br from-white via-gray-50 to-gray-100 text-black md:w-[420px] w-screen h-screen shadow-2xl transition-all duration-300 backdrop-blur-sm ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      <div style={{ maxHeight: '100vh', overflowY: 'auto' }} className="px-6 py-4">
        {/* Header */}
        <div className="relative pb-6 mb-6 bg-gradient-to-r from-white via-gray-50 to-gray-100 rounded-xl shadow-sm border border-gray-200/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">Advanced Filters</h2>
                <p className="text-gray-600 text-sm font-medium">Refine your extraction with precision</p>
              </div>
            </div>
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200 group"
              aria-label="Close"
              onClick={onClose}
            >
              <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* Accordion Sections */}
        <div className="flex flex-col gap-6 pb-8">
          {/* Show user filters only if not posts */}
          {!isPosts && !isCommenters && !isHashtags && <>
            {/* Contact & Links */}
          <AccordionSection
            title="Contact & Links"
            open={openSections.includes("contact")}
             onToggle={() => setOpenSections(os => os.includes("contact") ? os.filter(k => k !== "contact") : [...os, "contact"])}
          >
            <div className="grid gap-5 pt-2">
              <label htmlFor="extractPhone" className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    id="extractPhone" 
                    checked={value.extractPhone} 
                    onChange={e => onChange({ ...value, extractPhone: e.target.checked })} 
                    className="sr-only" 
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${value.extractPhone ? 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-400' : 'border-gray-300 group-hover:border-amber-300'}`}>
                    {value.extractPhone && (
                      <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Extract Phone Numbers</span>
              </label>
              <label htmlFor="extractEmail" className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    id="extractEmail" 
                    checked={value.extractEmail} 
                    onChange={e => onChange({ ...value, extractEmail: e.target.checked })} 
                    className="sr-only" 
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${value.extractEmail ? 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-400' : 'border-gray-300 group-hover:border-amber-300'}`}>
                    {value.extractEmail && (
                      <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Extract Emails</span>
              </label>
              <label htmlFor="extractLinkInBio" className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    id="extractLinkInBio" 
                    checked={value.extractLinkInBio} 
                    onChange={e => onChange({ ...value, extractLinkInBio: e.target.checked })} 
                    className="sr-only" 
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${value.extractLinkInBio ? 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-400' : 'border-gray-300 group-hover:border-amber-300'}`}>
                    {value.extractLinkInBio && (
                      <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Extract Link in Bios</span>
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
            <div className="grid gap-6 pt-2">
              {[
                { key: "privacy", label: "Privacy On" },
                { key: "profilePicture", label: "Profile Picture" },
                { key: "verifiedAccount", label: "Verified Account" },
                { key: "businessAccount", label: "Business Account" },
              ].map(flag => (
                <div key={flag.key} className="flex flex-col gap-3">
                  <span className="text-sm font-semibold text-gray-700">{flag.label}</span>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="radio"
                          name={flag.key}
                          value="yes"
                          checked={value[flag.key as keyof FiltersState] === "yes"}
                          onChange={() => onChange({ ...value, [flag.key]: "yes" })}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${value[flag.key as keyof FiltersState] === "yes" ? 'border-amber-400 bg-gradient-to-r from-amber-400 to-yellow-500' : 'border-gray-300 group-hover:border-amber-300'}`}>
                          {value[flag.key as keyof FiltersState] === "yes" && (
                            <div className="w-2 h-2 rounded-full bg-white absolute top-0.5 left-0.5"></div>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 group-hover:text-gray-800">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="radio"
                          name={flag.key}
                          value="no"
                          checked={value[flag.key as keyof FiltersState] === "no"}
                          onChange={() => onChange({ ...value, [flag.key]: "no" })}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${value[flag.key as keyof FiltersState] === "no" ? 'border-amber-400 bg-gradient-to-r from-amber-400 to-yellow-500' : 'border-gray-300 group-hover:border-amber-300'}`}>
                          {value[flag.key as keyof FiltersState] === "no" && (
                            <div className="w-2 h-2 rounded-full bg-white absolute top-0.5 left-0.5"></div>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 group-hover:text-gray-800">No</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="radio"
                          name={flag.key}
                          value="doesn&apos;t matter"
                          checked={value[flag.key as keyof FiltersState] === "doesn't matter"}
                          onChange={() => onChange({ ...value, [flag.key]: "doesn't matter" })}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${value[flag.key as keyof FiltersState] === "doesn't matter" ? 'border-amber-400 bg-gradient-to-r from-amber-400 to-yellow-500' : 'border-gray-300 group-hover:border-amber-300'}`}>
                          {value[flag.key as keyof FiltersState] === "doesn't matter" && (
                            <div className="w-2 h-2 rounded-full bg-white absolute top-0.5 left-0.5"></div>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 group-hover:text-gray-800">Doesn&apos;t matter</span>
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
            <div className="grid gap-6 pt-2">
              <div className="flex flex-col gap-3">
                <label htmlFor="followersMin" className="text-sm font-semibold text-gray-700">Number of Followers Between</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input 
                      type="number" 
                      id="followersMin" 
                      placeholder="Min" 
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400" 
                      value={value.followersMin} 
                      onChange={e => onChange({ ...value, followersMin: e.target.value })} 
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="number" 
                      id="followersMax" 
                      placeholder="Max" 
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400" 
                      value={value.followersMax} 
                      onChange={e => onChange({ ...value, followersMax: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="followingsMin" className="text-sm font-semibold text-gray-700">Number of Followings Between</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input 
                      type="number" 
                      id="followingsMin" 
                      placeholder="Min" 
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400" 
                      value={value.followingsMin} 
                      onChange={e => onChange({ ...value, followingsMin: e.target.value })} 
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="number" 
                      id="followingsMax" 
                      placeholder="Max" 
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400" 
                      value={value.followingsMax} 
                      onChange={e => onChange({ ...value, followingsMax: e.target.value })} 
                    />
                  </div>
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
            <div className="grid gap-6 pt-2">
              <div className="flex flex-col gap-3">
                <label htmlFor="filterByName" className="text-sm font-semibold text-gray-700">Filter By Name (Insert List)</label>
                <textarea 
                  id="filterByName" 
                  className="min-h-[100px] px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400 resize-none" 
                  rows={3} 
                  placeholder="Enter names, one per line" 
                  value={value.filterByName} 
                  onChange={e => onChange({ ...value, filterByName: e.target.value })} 
                />
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="filterByNameInBioContains" className="text-sm font-semibold text-gray-700">Filter By Name in bio-Contains Only</label>
                <textarea 
                  id="filterByNameInBioContains" 
                  className="min-h-[100px] px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400 resize-none" 
                  rows={3} 
                  placeholder="Words to match in name/bio" 
                  value={value.filterByNameInBioContains} 
                  onChange={e => onChange({ ...value, filterByNameInBioContains: e.target.value })} 
                />
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="filterByNameInBioStop" className="text-sm font-semibold text-gray-700">Filter By Name in Bio-Stop if</label>
                <textarea 
                  id="filterByNameInBioStop" 
                  className="min-h-[100px] px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400 resize-none" 
                  rows={3} 
                  placeholder="Stop words in name/bio" 
                  value={value.filterByNameInBioStop} 
                  onChange={e => onChange({ ...value, filterByNameInBioStop: e.target.value })} 
                />
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
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-700 mb-3">Likes</span>
                  <div className="flex gap-4 items-end">
                    <div className="flex flex-col flex-1">
                      <label htmlFor="postLikesMin" className="text-xs text-gray-600 mb-2">Min</label>
                      <input 
                        type="number" 
                        id="postLikesMin" 
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm" 
                        value={value.postLikesMin || ''} 
                        onChange={e => onChange({ ...value, postLikesMin: e.target.value })} 
                        min={0} 
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label htmlFor="postLikesMax" className="text-xs text-gray-600 mb-2">Max</label>
                      <input 
                        type="number" 
                        id="postLikesMax" 
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm" 
                        value={value.postLikesMax || ''} 
                        onChange={e => onChange({ ...value, postLikesMax: e.target.value })} 
                        min={0} 
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-700 mb-3">Comments</span>
                  <div className="flex gap-4 items-end">
                    <div className="flex flex-col flex-1">
                      <label htmlFor="postCommentsMin" className="text-xs text-gray-600 mb-2">Min</label>
                      <input 
                        type="number" 
                        id="postCommentsMin" 
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm" 
                        value={value.postCommentsMin || ''} 
                        onChange={e => onChange({ ...value, postCommentsMin: e.target.value })} 
                        min={0} 
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label htmlFor="postCommentsMax" className="text-xs text-gray-600 mb-2">Max</label>
                      <input 
                        type="number" 
                        id="postCommentsMax" 
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm" 
                        value={value.postCommentsMax || ''} 
                        onChange={e => onChange({ ...value, postCommentsMax: e.target.value })} 
                        min={0} 
                      />
                    </div>
                  </div>
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
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <label htmlFor="postCaptionContains" className="text-sm font-semibold text-gray-700">Contains one word in Description</label>
                  <input 
                    type="text" 
                    id="postCaptionContains" 
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400" 
                    value={value.postCaptionContains || ''} 
                    onChange={e => onChange({ ...value, postCaptionContains: e.target.value })} 
                    placeholder="Enter words to search for"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label htmlFor="postCaptionStopWords" className="text-sm font-semibold text-gray-700">Stop Words in Description</label>
                  <input 
                    type="text" 
                    id="postCaptionStopWords" 
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400" 
                    value={value.postCaptionStopWords || ''} 
                    onChange={e => onChange({ ...value, postCaptionStopWords: e.target.value })} 
                    placeholder="Enter words to exclude"
                  />
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
                <div className="grid gap-6 pt-2">
                  <div className="flex flex-col gap-3">
                    <label htmlFor="commentExcludeWords" className="text-sm font-semibold text-gray-700">Exclude Comments Containing (one word per line)</label>
                    <textarea 
                      id="commentExcludeWords" 
                      className="min-h-[100px] px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400 resize-none" 
                      rows={3} 
                      placeholder="Words to exclude from comments" 
                      value={value.commentExcludeWords || ''} 
                      onChange={e => onChange({ ...value, commentExcludeWords: e.target.value })} 
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label htmlFor="commentStopWords" className="text-sm font-semibold text-gray-700">Stop Extraction if Comment Contains (one word per line)</label>
                    <textarea 
                      id="commentStopWords" 
                      className="min-h-[100px] px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400 resize-none" 
                      rows={3} 
                      placeholder="Stop words in comments" 
                      value={value.commentStopWords || ''} 
                      onChange={e => onChange({ ...value, commentStopWords: e.target.value })} 
                    />
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
                <div className="grid gap-6 pt-2">
                  <div className="flex flex-col gap-3">
                    <label htmlFor="hashtagLimit" className="text-sm font-semibold text-gray-700">Hashtag Limit</label>
                    <input
                      type="number"
                      id="hashtagLimit"
                      placeholder="Enter hashtag limit"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400"
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
          <div className="mt-8 flex flex-row gap-4 justify-center pb-8">
            <button
              type="button"
              className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white px-8 py-3 rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
              onClick={onClose}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Apply Filters
            </button>
            <button
              type="button"
              className="px-8 py-3 rounded-lg font-semibold text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2"
              onClick={reset}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
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
  <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden transition-all duration-200 hover:shadow-md">
    <button
      type="button"
      className="w-full flex justify-between items-center px-6 py-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 font-semibold text-gray-800 focus:outline-none transition-all duration-200"
      onClick={onToggle}
    >
      <span className="text-sm font-semibold text-gray-700">{title}</span>
      <div className={`w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
    </button>
    {open && (
      <div className="px-6 pb-6 pt-2 bg-gradient-to-b from-white to-gray-50/30">
        {children}
      </div>
    )}
  </div>
);

const Separator: React.FC = () => <div className="my-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />;
