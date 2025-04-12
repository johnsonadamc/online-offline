'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { saveContent, getCurrentPeriod } from '@/lib/supabase/content';
import { uploadMedia } from '@/lib/supabase/storage';
import { 
  Upload, X, Camera, Maximize2, Plus, ArrowLeft,
  ChevronDown, ChevronUp, Tag, Info, Save, Send
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';

interface Entry {
  id: string | number; // Allow both string and number IDs
  title: string;
  caption: string;
  selectedTags: string[];
  imageUrl: string | null;
  isFeature: boolean;
  isFullSpread: boolean;
  isUploading?: boolean;
  fileType?: string | null;
}

interface ContentTag {
  tag: string;
  tag_type: string;
}

interface ContentEntry {
  id: string | number; // Allow both string and number IDs
  title: string;
  caption: string;
  media_url: string | null;
  is_feature: boolean;
  is_full_spread: boolean;
  content_tags: ContentTag[];
}

// Helper function to generate a unique ID (a simple implementation)
const generateUniqueId = (): string => {
  return `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export default function SubmissionForm() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');
  
  // Core state variables from original implementation
  const [submissionType, setSubmissionType] = useState<'regular' | 'fullSpread'>('regular');
  const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | ''>('');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0 });
  const [currentPeriod, setCurrentPeriod] = useState({
    quarter: '',
    season: ''
  });
  const [entries, setEntries] = useState<Entry[]>([{
    id: generateUniqueId(), // Use our generator for initial entry
    title: '',
    caption: '',
    selectedTags: [],
    imageUrl: null,
    isFeature: false,
    isFullSpread: false
  }]);
  
  // New state variables for enhanced UI
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [showImageControls, setShowImageControls] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  
  // Maximum number of entries allowed (increased to 8)
  const MAX_ENTRIES = 8;

  // Available themes/tags
  const themes = [
    'Photography', 'Music', 'Art', 'Family', 'Nature', 'Travel', 'Food', 'Sports',
    'Architecture', 'Fashion', 'Technology', 'Literature', 'Dance', 'Film',
    'Street Life', 'Wildlife', 'Abstract', 'Portrait', 'Landscape', 'Urban'
  ];

  // Cleanup blob URLs when component unmounts or entries change
  useEffect(() => {
    // Keep track of blob URLs to clean up
    const blobUrls: string[] = [];
    
    entries.forEach(entry => {
      if (entry.imageUrl && entry.imageUrl.startsWith('blob:')) {
        blobUrls.push(entry.imageUrl);
      }
    });
    
    // Clean up function to revoke object URLs
    return () => {
      blobUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [entries]);

  // Load draft from database (maintaining original functionality)
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId) return;
  
      try {
        const { data, error } = await supabase
          .from('content')
          .select(`
            *,
            content_entries (
              *,
              content_tags (
                *
              )
            )
          `)
          .eq('id', draftId)
          .single();
  
        if (error) {
          console.error('Error loading draft:', error);
          return;
        }
  
        if (data) {
          setSubmissionType(data.type);
          setStatus(data.status);
          
          // Add support for page title from database
          if (data.page_title) {
            setPageTitle(data.page_title);
          }
          
          // Map database entries to our state format
          if (data.content_entries && data.content_entries.length > 0) {
            // Keep the original ID from the database
            setEntries(data.content_entries.map((entry: ContentEntry) => ({
              id: entry.id, // Keep original ID, whether string or number
              title: entry.title || '',
              caption: entry.caption || '',
              selectedTags: entry.content_tags?.map(tag => tag.tag) || [],
              imageUrl: entry.media_url,
              isFeature: entry.is_feature || false,
              isFullSpread: entry.is_full_spread || false,
              fileType: 'stored' // Mark as stored URL (not blob)
            })));
            
            // Set current slide to the first entry
            setCurrentSlide(0);
          }
        }
      } catch (loadError) {
        console.error('Unexpected error loading draft:', loadError);
      }
    };
  
    loadDraft();
  }, [draftId, supabase]);

  // Load period data (maintaining original functionality)
  useEffect(() => {
    const loadPeriod = async () => {
      try {
        const { period, error } = await getCurrentPeriod();
        if (error) {
          console.error('Error fetching current period:', error);
          return;
        }
        
        if (period) {
          // Get current PST date and time
          const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
          
          // Get period end date in PST
          const pstEndDate = new Date(period.end_date);
          pstEndDate.setTime(pstEndDate.getTime() + pstEndDate.getTimezoneOffset() * 60 * 1000);
          const pstEndDateTime = new Date(pstEndDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

          // Calculate difference
          const difference = pstEndDateTime.getTime() - pstNow.getTime();
          const daysLeft = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          
          setCurrentPeriod({
            quarter: `${period.season} ${period.year}`,
            season: period.season.toLowerCase()
          });
    
          setTimeLeft({ days: daysLeft, hours });
        }
      } catch (periodError) {
        console.error('Unexpected error loading period:', periodError);
      }
    };
    
    loadPeriod();
    const timer = setInterval(loadPeriod, 1000 * 60 * 60);
    return () => clearInterval(timer);
  }, []);

  // Image upload functionality - improved with better state management
  const handleImageChange = async (entryId: string | number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Create a blob URL for immediate preview
      const previewUrl = URL.createObjectURL(file);
      
      // Update the entry with the preview URL and mark as uploading
      setEntries(prevEntries => prevEntries.map(entry => 
        entry.id === entryId 
          ? { ...entry, imageUrl: previewUrl, isUploading: true, fileType: 'blob' } 
          : entry
      ));

      // Upload the file
      const { url } = await uploadMedia(file);

      // Update the entry with the final URL and mark as not uploading
      setEntries(prevEntries => prevEntries.map(entry => 
        entry.id === entryId 
          ? { ...entry, imageUrl: url, isUploading: false, fileType: 'stored' } 
          : entry
      ));
      
      // Revoke the blob URL since we no longer need it
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
      
      // Reset the entry to no image and not uploading
      setEntries(prevEntries => prevEntries.map(entry => 
        entry.id === entryId 
          ? { ...entry, imageUrl: null, isUploading: false, fileType: null } 
          : entry
      ));
    }
  };

  // Image removal functionality - now completely removes the entry
  const handleRemoveImage = (entryId: string | number) => {
    setEntries(prevEntries => {
      // First, find the index of the entry to be removed
      const entryIndex = prevEntries.findIndex(entry => entry.id === entryId);
      
      // If entry not found, return unchanged
      if (entryIndex === -1) return prevEntries;
      
      // Get the entry to clean up any blob URLs
      const entryToRemove = prevEntries[entryIndex];
      
      // If it's a blob URL, revoke it to prevent memory leaks
      if (entryToRemove.imageUrl && entryToRemove.fileType === 'blob' && 
          entryToRemove.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(entryToRemove.imageUrl);
      }
      
      // Create a new array without the removed entry (actually removing it)
      const filteredEntries = prevEntries.filter(entry => entry.id !== entryId);
      
      // If this would leave us with no entries, add one empty entry
      if (filteredEntries.length === 0) {
        filteredEntries.push({
          id: generateUniqueId(),
          title: '',
          caption: '',
          selectedTags: [],
          imageUrl: null,
          isFeature: false,
          isFullSpread: false
        });
      }
      
      // If we removed the current slide, adjust the current slide index
      if (entryIndex <= currentSlide && currentSlide > 0) {
        // We need to set this outside the state update function for immediate effect
        setTimeout(() => setCurrentSlide(current => Math.max(0, current - 1)), 0);
      }
      
      // Return the filtered array
      return filteredEntries;
    });
  };

  // Save draft functionality, now including pageTitle
  const handleSaveDraft = async () => {
    console.log('Saving draft with ID, status, and page title:', draftId, status, pageTitle);
    setSaveStatus('saving');
    
    try {
      // Modified to include page_title in save parameters
      const result = await saveContent(submissionType, status, entries, draftId || undefined, pageTitle);
      
      if (result.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('error');
        alert('Error saving draft: ' + (result.error || 'Unknown error'));
      }
    } catch (saveError) {
      console.error('Unexpected error saving draft:', saveError);
      setSaveStatus('error');
      alert('Error saving draft');
    }
  };

  // Submit functionality, now including pageTitle
  const handleSubmit = async () => {
    try {
      // Modified to include page_title in save parameters
      const result = await saveContent(submissionType, 'submitted', entries, draftId || undefined, pageTitle);
      
      if (result.success) {
        setStatus('submitted');
      } else {
        alert('Error submitting content: ' + (result.error || 'Unknown error'));
      }
    } catch (submitError) {
      console.error('Unexpected error submitting content:', submitError);
      alert('Error submitting content');
    }
  };

  // Navigation functions
  const handleNextSlide = () => {
    if (currentSlide < entries.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Add a new entry with a unique ID
  const handleAddEntry = useCallback(() => {
    if (entries.length >= MAX_ENTRIES) {
      alert(`You can only have up to ${MAX_ENTRIES} images per submission.`);
      return;
    }
    
    // Generate a new unique ID using our helper function
    const newId = generateUniqueId();
    
    setEntries(prevEntries => [
      ...prevEntries,
      {
        id: newId,
        title: '',
        caption: '',
        selectedTags: [],
        imageUrl: null,
        isFeature: false,
        isFullSpread: false
      }
    ]);
    
    // Automatically navigate to the new entry
    setCurrentSlide(entries.length);
  }, [entries, MAX_ENTRIES]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white text-gray-900 md:border-x md:border-gray-200 md:min-h-0">
      {/* Fixed Header */}
      <div className="px-4 py-3 flex items-center justify-between z-20 bg-white border-b border-gray-200 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-medium text-gray-900">{currentPeriod.quarter}</h1>
            <div className={`text-xs flex items-center ${
              status === 'draft'
                ? 'text-gray-600'
                : 'text-green-600'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-1 ${
                status === 'draft' ? 'bg-gray-500' : 'bg-green-500'
              }`}></div>
              {status === 'draft' ? 'Draft' : 'Submitted'} • {timeLeft.days}d {timeLeft.hours}h left
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Slot counter */}
          <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
            {entries.length}/{MAX_ENTRIES}
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label={showDetails ? "Hide details" : "Show details"}
          >
            {showDetails ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
      
      {/* Collection Title & Type Selector - Fixed Panel */}
      {showDetails && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 z-10">
          <input
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className="text-lg font-medium bg-transparent border-none p-0 w-full focus:outline-none focus:ring-0 placeholder:text-gray-400 text-gray-900 mb-3"
            placeholder="Add collection title (optional)"
            disabled={status === 'submitted'}
          />
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Submission Type:</div>
            <div className="relative z-30">
              <button 
                className="flex items-center gap-2 py-1 px-3 rounded-md bg-gray-100 hover:bg-gray-200 cursor-pointer text-gray-800"
                onClick={() => status !== 'submitted' && setShowTypeSelector(!showTypeSelector)}
                disabled={status === 'submitted'}
              >
                <span className="text-sm">
                  {submissionType === 'regular' ? 'Regular' : 'Full Page Spread'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {/* Type selector dropdown */}
              {showTypeSelector && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-md shadow-lg overflow-hidden border border-gray-200 min-w-[180px]">
                  <button
                    className={`w-full text-left px-3 py-2 text-sm ${
                      submissionType === 'regular' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSubmissionType('regular');
                      setShowTypeSelector(false);
                    }}
                  >
                    Regular (Multiple Images)
                  </button>
                  <button
                    className={`w-full text-left px-3 py-2 text-sm ${
                      submissionType === 'fullSpread' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSubmissionType('fullSpread');
                      setShowTypeSelector(false);
                    }}
                  >
                    Full Page Spread
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      {submissionType === 'fullSpread' ? (
        // FullSpread view with single image
        <div className="flex-1 flex flex-col relative bg-gray-100 overflow-hidden">
          <div className="h-full flex-1 flex items-center justify-center p-4">
            {entries.length > 0 && entries[0]?.imageUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="relative max-w-full max-h-full">
                  {/* Handle Image display based on URL type */}
                  {entries[0].imageUrl.startsWith('blob:') ? (
                    <img
                      src={entries[0].imageUrl}
                      alt={entries[0].title || "Full page spread"}
                      className="object-contain rounded-lg shadow-md max-w-full max-h-full"
                    />
                  ) : (
                    <Image
                      src={entries[0].imageUrl}
                      alt={entries[0].title || "Full page spread"}
                      width={400}
                      height={400}
                      className="object-contain rounded-lg shadow-md"
                      style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}
                      unoptimized={entries[0].fileType === 'blob'}
                    />
                  )}
                </div>
                
                {/* Remove button */}
                {status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(entries[0].id)}
                    className="absolute top-2 right-2 p-1.5 bg-white shadow rounded-full hover:bg-gray-100 transition-colors"
                    disabled={entries[0].isUploading}
                  >
                    <X className="h-4 w-4 text-gray-600" />
                  </button>
                )}
                
                {/* Upload progress indicator */}
                {entries[0].isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 w-full h-full p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mb-3" />
                <div className="text-sm text-gray-600 mb-3">
                  <label className="block cursor-pointer font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload full page image</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => handleImageChange(entries[0]?.id || 1, e)}
                      disabled={status === 'submitted'}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Supported formats: JPG, PNG, GIF, WebP up to 10MB
                </p>
              </div>
            )}
          </div>
          
          {/* Full page content inputs */}
          <div className="bg-white border-t border-gray-200">
            {/* Title and Caption */}
            <div className="p-4 border-b border-gray-100">
              <input
                value={entries[0]?.title || ''}
                onChange={(e) => {
                  setEntries(prevEntries => prevEntries.map((entry, i) => 
                    i === 0 ? { ...entry, title: e.target.value } : entry
                  ));
                }}
                className="w-full text-xl font-medium bg-transparent border-none p-0 mb-2 focus:outline-none focus:ring-0 placeholder:text-gray-400 text-gray-900"
                placeholder="Add title"
                disabled={status === 'submitted'}
              />
              
              <textarea
                value={entries[0]?.caption || ''}
                onChange={(e) => {
                  setEntries(prevEntries => prevEntries.map((entry, i) => 
                    i === 0 ? { ...entry, caption: e.target.value } : entry
                  ));
                }}
                className="w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0 placeholder:text-gray-400 text-gray-600 resize-none"
                placeholder="Add caption"
                rows={3}
                disabled={status === 'submitted'}
              />
            </div>
            
            {/* Tags Section */}
            <div>
              <div 
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setShowTagsPanel(!showTagsPanel)}
              >
                <div className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  Themes
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Tag count */}
                  {entries[0]?.selectedTags && entries[0].selectedTags.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {entries[0].selectedTags.length}
                    </span>
                  )}
                  
                  {showTagsPanel ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
              
              {/* Expandable tags section */}
              {showTagsPanel && (
                <div className="px-4 pb-4">
                  {/* Show currently selected tags */}
                  {entries[0]?.selectedTags && entries[0].selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {entries[0].selectedTags.map((tag) => (
                        <span 
                          key={tag}
                          className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1"
                        >
                          {tag}
                          {status === 'draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEntries(prevEntries => prevEntries.map((entry, i) => {
                                  if (i !== 0) return entry;
                                  return { 
                                    ...entry, 
                                    selectedTags: entry.selectedTags.filter(t => t !== tag) 
                                  };
                                }));
                              }}
                              className="text-blue-400 hover:text-blue-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* All available tags */}
                  {status === 'draft' && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">
                        Select themes for this image:
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto py-1">
                        {themes.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={`text-xs px-2 py-1.5 rounded-md ${
                              entries[0]?.selectedTags?.includes(tag)
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                            }`}
                            onClick={() => {
                              setEntries(prevEntries => prevEntries.map((entry, i) => {
                                if (i !== 0) return entry;
                                
                                const selectedTags = entry.selectedTags.includes(tag)
                                  ? entry.selectedTags.filter(t => t !== tag)
                                  : [...entry.selectedTags, tag];
                                  
                                return { ...entry, selectedTags };
                              }));
                            }}
                            disabled={status !== 'draft'}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Regular submission - multiple images with immersive viewing
        <div className="flex-1 flex flex-col">
          {/* Image tabs - thumbnail navigation */}
          <div className="border-b overflow-x-auto">
            <div className="h-12 px-4 bg-transparent flex items-center">
              {entries.map((entry, index) => (
                <button
                  key={`tab-${entry.id}`} // This will now be unique regardless of ID type
                  onClick={() => setCurrentSlide(index)}
                  className={`px-4 py-2 mr-1 flex items-center ${
                    currentSlide === index 
                      ? 'border-b-2 border-blue-500 text-blue-700' 
                      : 'text-gray-500'
                  }`}
                >
                  {entry.imageUrl ? (
                    <div className="relative w-6 h-6 rounded-full overflow-hidden">
                      {entry.imageUrl.startsWith('blob:') ? (
                        <div className="w-full h-full bg-gray-200">
                          <img 
                            src={entry.imageUrl} 
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0">
                          <Image 
                            src={entry.imageUrl} 
                            alt={`Thumbnail ${index + 1}`}
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                            unoptimized={entry.fileType === 'blob'}
                          />
                        </div>
                      )}
                      {entry.isFeature && (
                        <div className="absolute inset-0 bg-amber-500/20 border border-amber-500 rounded-full"></div>
                      )}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-600">{index + 1}</span>
                    </div>
                  )}
                  <span className="ml-2 font-medium text-xs">
                    {index + 1}
                  </span>
                </button>
              ))}
              
              {/* Add new image button */}
              {status === 'draft' && entries.length < MAX_ENTRIES && (
                <button
                  onClick={handleAddEntry}
                  className="h-8 w-8 rounded-full flex items-center justify-center p-0 mx-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Add new image"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Main Image Viewer */}
          {entries.map((entry, index) => (
            <div 
              key={`slide-${entry.id}`} // This will now be unique regardless of ID type
              className={`flex-1 flex flex-col ${currentSlide === index ? 'block' : 'hidden'}`}
            >
              {/* Image Area */}
              <div className="flex-1 flex flex-col relative bg-gray-100 overflow-hidden">
                <div className="h-full flex-1 flex items-center justify-center p-4">
                  {entry.imageUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div className="relative max-w-full max-h-full">
                        {/* Handle both blob URLs and stored URLs */}
                        {entry.imageUrl.startsWith('blob:') ? (
                          <img
                            src={entry.imageUrl}
                            alt={entry.title || `Image ${index + 1}`}
                            className="object-contain rounded-lg shadow-md max-w-full max-h-full"
                          />
                        ) : (
                          <Image
                            src={entry.imageUrl}
                            alt={entry.title || `Image ${index + 1}`}
                            width={400}
                            height={400}
                            className="object-contain rounded-lg shadow-md"
                            style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}
                            unoptimized={entry.fileType === 'blob'}
                          />
                        )}
                      </div>
                      
                      {/* Remove button */}
                      {status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(entry.id)}
                          className="absolute top-2 right-2 p-1.5 bg-white shadow rounded-full hover:bg-gray-100 transition-colors"
                          disabled={entry.isUploading}
                        >
                          <X className="h-4 w-4 text-gray-600" />
                        </button>
                      )}
                      
                      {/* Upload progress indicator */}
                      {entry.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 w-full h-full p-6 text-center">
                      <Upload className="h-12 w-12 text-gray-400 mb-3" />
                      <div className="text-sm text-gray-600 mb-3">
                        <label className="block cursor-pointer font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload image</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={(e) => handleImageChange(entry.id, e)}
                            disabled={status === 'submitted'}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Supported formats: JPG, PNG, GIF, WebP up to 10MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Navigation arrows - only shown when we have multiple entries */}
                {entries.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center justify-between w-full px-4">
                      {currentSlide > 0 && (
                        <button 
                          onClick={handlePrevSlide}
                          className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center pointer-events-auto"
                        >
                          <ChevronDown className="h-5 w-5 text-gray-700 rotate-90" />
                        </button>
                      )}
                      
                      {currentSlide < entries.length - 1 && (
                        <button 
                          onClick={handleNextSlide}
                          className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center ml-auto pointer-events-auto"
                        >
                          <ChevronDown className="h-5 w-5 text-gray-700 -rotate-90" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Slide indicators */}
                {entries.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                    <div className="py-1 px-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center gap-2">
                      {entries.map((entry, idx) => (
                        <button
                          key={`indicator-${entry.id}`} // This will now be unique regardless of ID type
                          onClick={() => setCurrentSlide(idx)}
                          className={`w-2.5 h-2.5 rounded-full ${
                            idx === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          aria-label={`Go to image ${idx + 1}`}
                        ></button>
                      ))}
                      
                      {/* Add new image button in indicator bar */}
                      {status === 'draft' && entries.length < MAX_ENTRIES && (
                        <button
                          onClick={handleAddEntry}
                          className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center ml-1"
                          aria-label="Add new image"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Details Panel with collapsible sections */}
              <div className="bg-white border-t border-gray-200">
                {/* Title and Caption - Always visible */}
                <div className="p-4 border-b border-gray-100">
                  <input
                    value={entry.title}
                    onChange={(e) => {
                      setEntries(prevEntries => prevEntries.map((ent, i) => 
                        i === index ? { ...ent, title: e.target.value } : ent
                      ));
                    }}
                    className="w-full text-xl font-medium bg-transparent border-none p-0 mb-2 focus:outline-none focus:ring-0 placeholder:text-gray-400 text-gray-900"
                    placeholder="Add title"
                    disabled={status === 'submitted'}
                  />
                  
                  <textarea
                    value={entry.caption}
                    onChange={(e) => {
                      setEntries(prevEntries => prevEntries.map((ent, i) => 
                        i === index ? { ...ent, caption: e.target.value } : ent
                      ));
                    }}
                    className="w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0 placeholder:text-gray-400 text-gray-600 resize-none"
                    placeholder="Add caption"
                    rows={2}
                    disabled={status === 'submitted'}
                  />
                </div>
                
                {/* Feature Controls Section - Collapsible */}
                <div className="border-b border-gray-100">
                  <div 
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setShowImageControls(!showImageControls)}
                  >
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Camera className="h-4 w-4 text-gray-500" />
                      Image Options
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Feature and Full Page badges as pills - visible even when collapsed */}
                      {entry.isFeature && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                          Feature
                        </span>
                      )}
                      
                      {entry.isFullSpread && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                          Full Page
                        </span>
                      )}
                      
                      {showImageControls ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expandable section */}
                  {showImageControls && entry.imageUrl && status === 'draft' && (
                    <div className="px-4 pb-4">
                      <div className="flex gap-2">
                        <button
                          className={`py-2 px-3 rounded-md text-sm font-medium flex-1 ${
                            entry.isFeature 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                          onClick={() => setEntries(prevEntries => prevEntries.map((e, i) => 
                            i === index ? { ...e, isFeature: !e.isFeature } : 
                            i !== index && e.isFeature && !entry.isFeature ? { ...e, isFeature: false } : e
                          ))}
                        >
                          <div className="flex items-center justify-center">
                            <Camera className="h-4 w-4 mr-2" />
                            Feature Image
                          </div>
                        </button>
                        
                        <button
                          className={`py-2 px-3 rounded-md text-sm font-medium flex-1 ${
                            entry.isFullSpread 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                          onClick={() => setEntries(prevEntries => prevEntries.map((e, i) => 
                            i === index ? { ...e, isFullSpread: !e.isFullSpread } : e
                          ))}
                          disabled={!entry.isFeature}
                        >
                          <div className="flex items-center justify-center">
                            <Maximize2 className="h-4 w-4 mr-2" />
                            Full Page
                          </div>
                        </button>
                      </div>
                      
                      {!entry.isFeature && entry.isFullSpread && (
                        <p className="text-xs text-amber-600 mt-2">
                          Note: Only feature images can be set as full page spreads
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Tags Section - Collapsible */}
                <div>
                  <div 
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setShowTagsPanel(!showTagsPanel)}
                  >
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-500" />
                      Themes
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Tag count */}
                      {entry.selectedTags && entry.selectedTags.length > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {entry.selectedTags.length}
                        </span>
                      )}
                      
                      {showTagsPanel ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expandable tags section */}
                  {showTagsPanel && (
                    <div className="px-4 pb-4">
                      {/* Show currently selected tags */}
                      {entry.selectedTags && entry.selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {entry.selectedTags.map((tag) => (
                            <span 
                              key={tag}
                              className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1"
                            >
                              {tag}
                              {status === 'draft' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEntries(prevEntries => prevEntries.map((ent, i) => {
                                      if (i !== index) return ent;
                                      return { 
                                        ...ent, 
                                        selectedTags: ent.selectedTags.filter(t => t !== tag) 
                                      };
                                    }));
                                  }}
                                  className="text-blue-400 hover:text-blue-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* All available tags */}
                      {status === 'draft' && (
                        <div>
                          <div className="text-xs text-gray-500 mb-2">
                            Select themes for this image:
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto py-1">
                            {themes.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                className={`text-xs px-2 py-1.5 rounded-md ${
                                  entry.selectedTags.includes(tag)
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                                }`}
                                onClick={() => {
                                  setEntries(prevEntries => prevEntries.map((ent, i) => {
                                    if (i !== index) return ent;
                                    const selectedTags = ent.selectedTags.includes(tag)
                                      ? ent.selectedTags.filter(t => t !== tag)
                                      : [...ent.selectedTags, tag];
                                    return { ...ent, selectedTags };
                                  }));
                                }}
                                disabled={status !== 'draft'}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-3 sticky bottom-0 shadow-md">
        <button
          type="button"
          className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          onClick={handleSaveDraft}
          disabled={status !== 'draft'}
        >
          <Save className="h-4 w-4" />
          {saveStatus === 'saving' 
            ? 'Saving...' 
            : saveStatus === 'saved' 
              ? 'Saved!' 
              : saveStatus === 'error'
                ? 'Error!'
                : 'Save Draft'
          }
        </button>
        
        {status === 'draft' ? (
          <button
            type="button"
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            onClick={handleSubmit}
          >
            <Send className="h-4 w-4" />
            Submit
          </button>
        ) : (
          <button
            type="button"
            className="flex-1 py-2.5 px-4 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
            onClick={() => setStatus('draft')}
          >
            <Info className="h-4 w-4" />
            Revert to Draft
          </button>
        )}
      </div>
    </div>
  );
}