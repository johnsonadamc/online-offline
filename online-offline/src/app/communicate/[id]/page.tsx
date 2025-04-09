'use client';

import React from 'react';
import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  AlertCircle, 
  Search, 
  X, 
  User, 
  Save,
  Send,
  Edit,
  Clock
} from 'lucide-react';
import { saveCommunication } from '@/lib/supabase/communications';
import { canCommunicateWith } from '@/lib/supabase/profiles';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export default function CommunicateEditorPage() {
  // Use useParams hook instead of React.use
  const params = useParams();
  const id = params?.id as string;
  const communicationId = id !== 'new' ? id : null;
  
  const router = useRouter();
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  
  // Core state
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // UI state
  const [hasPermission, setHasPermission] = useState(true);
  const [permissionCheckComplete, setPermissionCheckComplete] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [currentStage, setCurrentStage] = useState<'recipient' | 'compose'>('recipient');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Constants
  const WORD_LIMIT = 250;
  
  // Load communication data
  useEffect(() => {
    const fetchCommunication = async () => {
      if (!communicationId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('communications')
          .select(`
            *,
            profiles:recipient_id (
              id,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('id', communicationId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          // Check if the communication is in draft status
          if (data.status !== 'draft') {
            setError('This communication cannot be edited anymore');
            router.push('/dashboard');
            return;
          }
          
          setSubject(data.subject || '');
          setContent(data.content || '');
          
          // Handle potential null/undefined profiles
          if (data.profiles) {
            const profileData: Profile = {
              id: data.profiles.id || '',
              first_name: data.profiles.first_name || '',
              last_name: data.profiles.last_name || '',
              avatar_url: data.profiles.avatar_url
            };
            setSelectedRecipient(profileData);
            
            // Check permission for the loaded recipient
            const result = await canCommunicateWith(profileData.id);
            setHasPermission(result.allowed);
            setPermissionCheckComplete(true);
          }
          
          calculateWordCount(data.content || '');
          
          // Set current stage based on loaded data
          if (data.profiles) {
            setCurrentStage('compose');
          }
        }
      } catch (err) {
        console.error('Error fetching communication:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load communication';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCommunication();
  }, [communicationId, router, supabase]);
  
  // Calculate word count when content changes
  useEffect(() => {
    calculateWordCount(content);
  }, [content]);
  
  // Focus the textarea when in focus mode
  useEffect(() => {
    if (focusMode && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [focusMode]);
  
  const calculateWordCount = (text: string) => {
    if (!text || text.trim() === '') {
      setWordCount(0);
      return;
    }
    
    const words = text.trim().split(/\s+/);
    setWordCount(words.length);
  };
  
  const searchContributors = async (term: string) => {
    if (!term || term.length < 1) { 
      setSearchResults([]);
      return;
    }
    
    const searchTerm = term.trim(); 
    
    try {
      // Use a direct Supabase query with the exact term
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, is_public')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10);
      
      if (error) {
        console.error("Supabase query error:", error);
        setError('Database query failed: ' + error.message);
        return;
      }
      
      // Filter for public profiles only
      if (data && data.length > 0) {
        const publicProfiles = data.filter(profile => profile.is_public === true);
        setSearchResults(publicProfiles);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    }
  };
  
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchContributors(term);
    setShowSearchResults(true);
  };
  
  const selectRecipient = async (recipient: Profile) => {
    setSelectedRecipient(recipient);
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
    
    // Check permission for the selected recipient
    if (recipient) {
      const result = await canCommunicateWith(recipient.id);
      setHasPermission(result.allowed);
      setPermissionCheckComplete(true);
      
      // Move to compose stage after selecting recipient
      setCurrentStage('compose');
    }
  };
  
  const handleSaveDraft = async () => {
    if (!selectedRecipient) {
      setError('Please select a recipient');
      return;
    }
    
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    
    // Check permission before saving
    if (!hasPermission) {
      setError('You do not have permission to send communications to this user');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const communicationData = {
        id: communicationId || undefined,
        recipient_id: selectedRecipient.id,
        subject: subject.trim(),
        content: content.trim(),
        image_url: null // No image uploads
      };
      
      const result = await saveCommunication(communicationData);
      
      if (!result.success) {
        throw new Error(result.error ? String(result.error) : 'Failed to save draft');
      }
      
      // Redirect to dashboard after successful save
      router.push('/dashboard');
    } catch (err) {
      console.error('Error saving draft:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save draft';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!selectedRecipient) {
      setError('Please select a recipient');
      return;
    }
    
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    
    if (wordCount > WORD_LIMIT) {
      setError(`Content exceeds the ${WORD_LIMIT} word limit`);
      return;
    }
    
    // Check permission before submitting
    if (!hasPermission) {
      setError('You do not have permission to send communications to this user');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // First save as draft to ensure all data is updated
      const communicationData = {
        id: communicationId || undefined,
        recipient_id: selectedRecipient.id,
        subject: subject.trim(),
        content: content.trim(),
        image_url: null // No image uploads
      };
      
      const saveResult = await saveCommunication(communicationData);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error ? String(saveResult.error) : 'Failed to save communication');
      }
      
      // Then submit the saved draft
      const commId = communicationId || (saveResult.communication && saveResult.communication.id);
      if (!commId) {
        throw new Error('Failed to get communication ID');
      }
      
      // Use the backend function to submit the communication
      const { error } = await supabase
        .from('communications')
        .update({
          status: 'submitted',
          updated_at: new Date().toISOString(),
          word_count: wordCount // Store word count in the database
        })
        .eq('id', commId)
        .eq('status', 'draft');
        
      if (error) throw error;
      
      // Create notification for recipient
      await supabase
        .from('communication_notifications')
        .insert({
          communication_id: commId,
          recipient_id: selectedRecipient.id
        });
      
      // Redirect to dashboard after successful submission
      router.push('/dashboard');
    } catch (err) {
      console.error('Error submitting communication:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit communication';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Toggle focus mode
  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };
  
  // Go back to recipient selection
  const goBackToRecipient = () => {
    setCurrentStage('recipient');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="p-6 text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className={`sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 ${
        focusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-200' : ''
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStage === 'recipient' || !selectedRecipient ? (
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} />
              </Link>
            ) : (
              <button 
                onClick={goBackToRecipient}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="text-lg font-medium text-gray-900">
                {communicationId ? 'Edit Message' : 'Message'}
              </h1>
              <div className="text-xs flex items-center text-gray-600">
                <div className="w-2 h-2 rounded-full mr-1 bg-gray-500"></div>
                Draft
              </div>
            </div>
          </div>
          
          {currentStage === 'compose' && (
            <button 
              className={`w-8 h-8 flex items-center justify-center rounded-full ${
                focusMode ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
              }`}
              onClick={toggleFocusMode}
              title={focusMode ? "Exit focus mode" : "Enter focus mode"}
            >
              <Edit size={16} />
            </button>
          )}
        </div>
      </header>
      
      {/* Error Display */}
      {error && (
        <div className="m-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {/* Permission Warning */}
      {permissionCheckComplete && !hasPermission && selectedRecipient && (
        <div className="m-4 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Permission Required</p>
            <p className="text-xs text-amber-700">
              You need to request access to {selectedRecipient.first_name}&apos;s profile before sending communications.
            </p>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Recipient Selection */}
        {currentStage === 'recipient' && (
          <div className={`px-4 py-5 flex-1 ${focusMode ? 'hidden' : ''}`}>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {selectedRecipient ? (
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {selectedRecipient.avatar_url ? (
                      <Image 
                        src={selectedRecipient.avatar_url} 
                        alt={`${selectedRecipient.first_name} ${selectedRecipient.last_name}`}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User size={18} className="text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedRecipient.first_name} {selectedRecipient.last_name}</p>
                      <p className="text-xs text-gray-500">Curator</p>
                    </div>
                  </div>
                  <div className="flex">
                    <button 
                      type="button"
                      onClick={() => setSelectedRecipient(null)}
                      className="text-gray-400 hover:text-gray-600 p-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search size={16} className="text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search for a curator..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onFocus={() => setShowSearchResults(true)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Search results */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="mt-2 max-h-72 overflow-y-auto">
                      {searchResults.map(profile => (
                        <div 
                          key={profile.id}
                          className="p-3 hover:bg-gray-50 rounded-md cursor-pointer flex items-center gap-3"
                          onClick={() => selectRecipient(profile)}
                        >
                          {profile.avatar_url ? (
                            <Image 
                              src={profile.avatar_url} 
                              alt={`${profile.first_name} ${profile.last_name}`}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User size={16} className="text-blue-600" />
                            </div>
                          )}
                          <span className="text-sm">{profile.first_name} {profile.last_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showSearchResults && searchTerm && searchResults.length === 0 && (
                    <div className="mt-4 py-6 text-center bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-500">No results found</p>
                    </div>
                  )}
                </div>
              )}
              
              {selectedRecipient && (
                <div className="p-4 border-t border-gray-100">
                  <Button
                    onClick={() => setCurrentStage('compose')}
                    disabled={!hasPermission}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    Continue
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Message Composition */}
        {currentStage === 'compose' && (
          <div className={`flex-1 flex flex-col ${
            focusMode ? 'bg-gray-50' : 'p-4'
          }`}>
            <div className={`bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col ${
              focusMode ? 'border-0 shadow-none rounded-none flex-1' : 'mb-4'
            }`}>
              {/* Selected recipient banner */}
              <div className={`flex items-center p-3 border-b border-gray-100 ${
                focusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-200' : ''
              }`}>
                <div className="flex items-center gap-2 flex-1">
                  {selectedRecipient && (
                    <div className="flex items-center gap-2">
                      {selectedRecipient.avatar_url ? (
                        <Image 
                          src={selectedRecipient.avatar_url} 
                          alt={`${selectedRecipient.first_name} ${selectedRecipient.last_name}`}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <User size={12} className="text-blue-600" />
                        </div>
                      )}
                      <span className="text-sm font-medium">{selectedRecipient.first_name} {selectedRecipient.last_name}</span>
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  wordCount > WORD_LIMIT 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  <Clock size={12} />
                  {wordCount}/{WORD_LIMIT}
                </span>
              </div>
              
              {/* Subject field */}
              <div className={`p-4 ${focusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-200' : ''}`}>
                <Input
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-lg font-medium border-none p-0 focus:outline-none focus:ring-0 placeholder:text-gray-400"
                />
              </div>
              
              {/* Message content */}
              <div className="flex-1 border-t border-gray-100">
                <Textarea
                  ref={textareaRef}
                  placeholder="Write your message here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`h-full min-h-[200px] w-full resize-none border-none focus:ring-0 ${
                    focusMode ? 'p-8 text-lg' : 'p-4'
                  }`}
                />
                
                {/* Empty state inspiration - only show when empty and not in focus mode */}
                {!content && !focusMode && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center p-6 max-w-xs opacity-80">
                      <p className="text-gray-400 text-sm">
                        Your message may appear in print. Make it meaningful.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      {currentStage === 'compose' && (
        <div className={`sticky bottom-0 bg-white border-t border-gray-200 p-4 grid grid-cols-2 gap-3 ${
          focusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-200' : ''
        }`}>
          <Button
            onClick={handleSaveDraft}
            disabled={!selectedRecipient || !subject || saving || submitting || !hasPermission}
            className={`bg-white border border-gray-300 hover:bg-gray-50 transition-colors rounded-md py-3 flex items-center justify-center gap-2 shadow-sm ${
              (!selectedRecipient || !subject || !hasPermission) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? (
              <span style={{ color: "#374151" }}>Saving...</span>
            ) : (
              <>
                <Save size={16} className="text-gray-600" />
                <span style={{ color: "#374151" }} className="font-medium">Save Draft</span>
              </>
            )}
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={!selectedRecipient || !subject || !content.trim() || saving || submitting || wordCount > WORD_LIMIT || !hasPermission}
            className={`bg-blue-600 hover:bg-blue-700 text-white rounded-md py-3 flex items-center justify-center gap-2 ${
              (!selectedRecipient || !subject || !content.trim() || !hasPermission) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? 'Submitting...' : (
              <>
                <Send size={16} />
                <span>Submit</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}