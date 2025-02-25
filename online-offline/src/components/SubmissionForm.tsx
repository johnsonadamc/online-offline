'use client';
import React, { useState, useEffect } from 'react';
import { saveContent, getCurrentPeriod } from '@/lib/supabase/content';
import { uploadMedia } from '@/lib/supabase/storage';
import { Upload, X, LayoutPanelTop, Camera, Maximize2, Plus, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Entry {
  id: number;
  title: string;
  caption: string;
  selectedTags: string[];
  imageUrl: string | null;
  isFeature: boolean;
  isFullSpread: boolean;
  isUploading?: boolean;
}

interface ContentTag {
  tag: string;
  tag_type: string;
}

interface ContentEntry {
  id: number;
  title: string;
  caption: string;
  media_url: string | null;
  is_feature: boolean;
  is_full_spread: boolean;
  content_tags: ContentTag[];
}

export default function SubmissionForm() {
  const supabase = createClientComponentClient();
  const [submissionType, setSubmissionType] = useState<'regular' | 'fullSpread'>('regular');
  const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | ''>('');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0 });
  const [currentPeriod, setCurrentPeriod] = useState({
    month: '',
    quarter: '',
    season: ''
  });
  const [entries, setEntries] = useState<Entry[]>([{
    id: 1,
    title: '',
    caption: '',
    selectedTags: [],
    imageUrl: null,
    isFeature: false,
    isFullSpread: false
  }]);

  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  const themes = [
    'Photography', 'Music', 'Art', 'Family', 'Nature', 'Travel', 'Food', 'Sports',
    'Architecture', 'Fashion', 'Technology', 'Literature', 'Dance', 'Film',
    'Street Life', 'Wildlife', 'Abstract', 'Portrait', 'Landscape', 'Urban'
  ];

  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId) return;
  
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
        // Add this line to set the status correctly
        setStatus(data.status);
        setEntries(data.content_entries.map((entry: ContentEntry) => ({
          id: entry.id,
          title: entry.title || '',
          caption: entry.caption || '',
          selectedTags: entry.content_tags?.map(tag => tag.tag) || [],
          imageUrl: entry.media_url,
          isFeature: entry.is_feature || false,
          isFullSpread: entry.is_full_spread || false
        })));
      }
    };
  
    loadDraft();
  }, [draftId, supabase]);

  useEffect(() => {
    const loadPeriod = async () => {
      const { period, error } = await getCurrentPeriod();
      if (period) {
        // Create formatter for Pacific Time
        const pstFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });

        // Get current PST date and time
        const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const formattedPstDate = pstFormatter.format(pstNow);
        
        // Get period end date in PST
        const pstEndDate = new Date(period.end_date);
        pstEndDate.setTime(pstEndDate.getTime() + pstEndDate.getTimezoneOffset() * 60 * 1000);
        const pstEndDateTime = new Date(pstEndDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

        // Calculate difference
        const difference = pstEndDateTime.getTime() - pstNow.getTime();
        const daysLeft = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        setCurrentPeriod({
          month: formattedPstDate,
          quarter: `${period.season} ${period.year}`,
          season: period.season.toLowerCase()
        });
  
        setTimeLeft({ days: daysLeft, hours });
      }
    };
    
    loadPeriod();
    const timer = setInterval(loadPeriod, 1000 * 60 * 60);
    return () => clearInterval(timer);
}, []);

  const handleImageChange = async (entryId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const previewUrl = URL.createObjectURL(file);
      setEntries(entries.map(entry => 
        entry.id === entryId ? { ...entry, imageUrl: previewUrl, isUploading: true } : entry
      ));

      const { url } = await uploadMedia(file);

      setEntries(entries.map(entry => 
        entry.id === entryId ? { 
          ...entry, 
          imageUrl: url, 
          isUploading: false 
        } : entry
      ));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
      setEntries(entries.map(entry => 
        entry.id === entryId ? { ...entry, imageUrl: null, isUploading: false } : entry
      ));
    }
  };

  const handleRemoveImage = (entryId: number) => {
    setEntries(entries.map(entry => 
      entry.id === entryId ? { ...entry, imageUrl: null } : entry
    ));
  };

// In SubmissionForm.tsx - handleSaveDraft function
const handleSaveDraft = async () => {
  console.log('Saving draft with ID and status:', draftId, status); // Add this to verify
  setSaveStatus('saving');
  const result = await saveContent('regular', status, entries, draftId || undefined);
  if (result.success) {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(''), 2000);
  } else {
    setSaveStatus('error');
    alert('Error saving draft');
  }
};

  const handleSubmit = async () => {
    const result = await saveContent('regular', 'submitted', entries, draftId || undefined);
    if (result.success) {
      setStatus('submitted');
    } else {
      alert('Error submitting content');
    }
  };

  const getSeasonalAccentColor = (season: string) => {
    const colors = {
      winter: 'from-blue-400 to-indigo-600',
      spring: 'from-green-400 to-emerald-600',
      summer: 'from-orange-400 to-rose-600',
      fall: 'from-amber-400 to-red-600'
    };
    return colors[season as keyof typeof colors] || 'from-indigo-500 to-purple-500';
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <Link 
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
  
      {/* Time Header */}
      <div className={`mb-8 p-4 rounded-2xl bg-gradient-to-r ${getSeasonalAccentColor(currentPeriod.season)} text-white`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-2xl font-bold mb-0.5">{currentPeriod.month}</h2>
            <p className="text-base opacity-90">{currentPeriod.quarter}</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
          // Add a status indicator to the header of the submission form
<div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
  status === 'draft'
    ? 'bg-white/20 text-white'
    : 'bg-white text-emerald-600'
}`}>
  <div className={`w-2.5 h-2.5 rounded-full ${
    status === 'draft' ? 'bg-white' : 'bg-emerald-500'
  }`} />
  <span className="font-medium text-sm">
    {status === 'draft' ? 'Draft' : 'Submitted for Publication'}
  </span>
  {status === 'submitted' && timeLeft.days > 0 && (
// In SubmissionForm.tsx - update the onClick handler
<button
  onClick={() => {
    setStatus('draft');
    console.log("Status changed to:", 'draft'); // Add this to verify the change
  }}
  className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full hover:bg-emerald-200 transition-colors"
>
  Revert to Draft
</button>
  )}
</div>
            
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-xl px-3 py-2">
              <Clock className="h-4 w-4" />
              <div className="text-sm">
                <div>
                  <span className="font-medium">{timeLeft.days}d {timeLeft.hours}h</span>
                  <span className="opacity-75 ml-1">remaining</span>
                </div>
                <div className="text-xs opacity-75 mt-0.5">
                  *Only submitted content will be published
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
        <div 
          className="h-full bg-white rounded-full transition-all duration-500"
          style={{ 
           width: `${100 - ((timeLeft.days * 24 + timeLeft.hours) / (90 * 24) * 100)}%` 
          }}
          />
        </div>
      </div>

      {/* Type Selection */}
      <div className="mb-8">
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setSubmissionType('regular')}
            className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${
              submissionType === 'regular' 
                ? 'bg-indigo-500 text-white shadow-lg' 
                : 'bg-white text-slate-700 shadow border border-slate-200'
            }`}
          >
            <Camera className="h-8 w-8" />
            <span className="font-medium">Regular Submission</span>
            <span className="text-sm opacity-75">Upload up to 4 images with captions</span>
          </button>
          
          <button
            type="button"
            onClick={() => setSubmissionType('fullSpread')}
            className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${
              submissionType === 'fullSpread' 
                ? 'bg-indigo-500 text-white shadow-lg' 
                : 'bg-white text-slate-700 shadow border border-slate-200'
            }`}
          >
            <LayoutPanelTop className="h-8 w-8" />
            <span className="font-medium">Full Page Spread</span>
            <span className="text-sm opacity-75">Upload your own designed spread</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col gap-8">
        {submissionType === 'fullSpread' ? (
          <div className="bg-slate-50 rounded-2xl shadow-lg p-8">
            <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl bg-white hover:border-indigo-500 transition-colors">
              <div className="space-y-2 text-center">
                {entries[0]?.imageUrl ? (
                  <div className="relative">
                    <img
                      src={entries[0].imageUrl}
                      alt="Full page spread preview"
                      className="mx-auto max-h-96 w-auto object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(entries[0].id)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white transition-colors"
                      disabled={status === 'submitted'}
                    >
                      <X className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                  <Upload className="mx-auto h-12 w-12 text-slate-400" />
                  <div className="flex text-sm text-slate-600 mt-4">
                    <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                      <span>Upload media</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={(e) => handleImageChange(entries[0].id, e)}
                        disabled={status === 'submitted'}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Supported formats: JPG, PNG, GIF, WebP up to 10MB
                  </p>
                </div>
                )}
              </div>
            </div>
          </div>
        ) : (
            <div className="space-y-8">
            {entries.map((entry) => (
              <div 
                key={entry.id}
                className="bg-slate-50 rounded-2xl shadow-lg p-8 relative"
              >
                <div className="space-y-6" style={{ pointerEvents: status === 'submitted' ? 'none' : 'auto', opacity: status === 'submitted' ? 0.7 : 1 }}>
                  {/* Image Upload with Feature Toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Media Upload
                      </label>
                      {entry.imageUrl && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEntries(entries.map(e => ({
                                ...e,
                                isFeature: e.id === entry.id ? !e.isFeature : false
                              })));
                            }}
                            className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-all ${
                              entry.isFeature
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            disabled={status === 'submitted'}
                          >
                            <Camera className="h-3 w-3" />
                            Feature Image
                          </button>
                          {entry.isFeature && (
                            <button
                              type="button"
                              onClick={() => {
                                setEntries(entries.map(e => ({
                                  ...e,
                                  isFullSpread: e.id === entry.id && e.isFeature ? !e.isFullSpread : false
                                })));
                              }}
                              className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-all ${
                                entry.isFullSpread
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                              disabled={status === 'submitted'}
                            >
                              <Maximize2 className="h-3 w-3" />
                              Full Page
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl bg-white hover:border-indigo-500 transition-colors">
                      <div className="space-y-2 text-center">
                        {entry.imageUrl ? (
                          <div className="relative">
                            <img
                              src={entry.imageUrl}
                              alt="Preview"
                              className={`mx-auto h-72 w-auto object-cover rounded-lg ${
                                entry.isUploading ? 'opacity-50' : ''
                              }`}
                            />
                            {entry.isUploading && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(entry.id)}
                              className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white transition-colors"
                              disabled={status === 'submitted' || entry.isUploading}
                            >
                              <X className="h-4 w-4 text-slate-600" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
  <Upload className="mx-auto h-12 w-12 text-slate-400" />
  <div className="flex text-sm text-slate-600 mt-4">
    <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500">
      <span>Upload media</span>
      <input
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => handleImageChange(entry.id, e)}
        disabled={status === 'submitted'}
      />
    </label>
  </div>
  <p className="text-xs text-slate-500 mt-1">
    Supported formats: JPG, PNG, GIF, WebP up to 10MB
  </p>
</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={entry.title}
                      onChange={(e) => setEntries(entries.map(ent => 
                        ent.id === entry.id ? { ...ent, title: e.target.value } : ent
                      ))}
                      className="w-full px-4 py-3 bg-white border-0 rounded-xl shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="Give your creation a title"
                      disabled={status === 'submitted'}
                    />
                  </div>

                  {/* Caption Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Caption
                    </label>
                    <textarea
                      value={entry.caption}
                      onChange={(e) => setEntries(entries.map(ent => 
                        ent.id === entry.id ? { ...ent, caption: e.target.value } : ent
                      ))}
                      rows={4}
                      className="w-full px-4 py-3 bg-white border-0 rounded-xl shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="Tell the story behind this piece"
                      disabled={status === 'submitted'}
                    />
                  </div>

                  {/* Themes Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Themes
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {themes.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setEntries(entries.map(ent => {
                              if (ent.id !== entry.id) return ent;
                              const selectedTags = ent.selectedTags.includes(tag)
                                ? ent.selectedTags.filter(t => t !== tag)
                                : [...ent.selectedTags, tag];
                              return { ...ent, selectedTags };
                            }));
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            entry.selectedTags.includes(tag)
                              ? 'bg-indigo-500 text-white shadow-md'
                              : 'bg-white text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200'
                          }`}
                          disabled={status === 'submitted'}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Entry Button */}
            {status === 'draft' && entries.length < 4 && (
              <button
                type="button"
                onClick={() => {
                  const newId = Math.max(...entries.map(e => e.id)) + 1;
                  setEntries([...entries, {
                    id: newId,
                    title: '',
                    caption: '',
                    selectedTags: [],
                    imageUrl: null,
                    isFeature: false,
                    isFullSpread: false
                  }]);
                }}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-indigo-500 hover:border-indigo-500 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Add Another Image
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="flex-1 py-3 px-6 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
          disabled={status !== 'draft'}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Draft'}
        </button>

        <button
          type="submit"
          onClick={handleSubmit}
          className="flex-1 py-3 px-6 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-all"
          disabled={status !== 'draft'}
        >
          Submit for Publication
        </button>
      </div>
    </div>
  );
}