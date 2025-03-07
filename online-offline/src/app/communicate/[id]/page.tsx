'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  AlertCircle, 
  Search, 
  X, 
  Upload, 
  User, 
  Save,
  Send
} from 'lucide-react';
import { saveCommunication } from '@/lib/supabase/communications';

interface PageParams {
  id: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export default function CommunicateEditorPage({ params }: { params: PageParams }) {
  const communicationId = params.id !== 'new' ? params.id : null;
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Word limit constant
  const WORD_LIMIT = 250;

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
          setExistingImageUrl(data.image_url || null);
          setSelectedRecipient(data.profiles || null);
          calculateWordCount(data.content || '');
        }
      } catch (err) {
        console.error('Error fetching communication:', err);
        setError('Failed to load communication');
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
  
  const calculateWordCount = (text: string) => {
    if (!text || text.trim() === '') {
      setWordCount(0);
      return;
    }
    
    const words = text.trim().split(/\s+/);
    setWordCount(words.length);
  };
  
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or GIF)');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit');
      return;
    }
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
    
    // Clear any existing error
    setError(null);
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  };
  
  const searchContributors = async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      // First get profile IDs that are contributors
      const { data: profileTypes, error: typeError } = await supabase
        .from('profile_types')
        .select('profile_id')
        .eq('type', 'contributor');
        
      if (typeError) throw typeError;
      
      if (profileTypes && profileTypes.length > 0) {
        const profileIds = profileTypes.map(pt => pt.profile_id);
        
        // Then search public profiles with those IDs
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', profileIds)
          .eq('is_public', true)
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
          .limit(5);
          
        if (error) throw error;
        setSearchResults(data || []);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching contributors:', err);
      setError('Failed to search for contributors');
    }
  };
  
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchContributors(term);
    setShowSearchResults(true);
  };
  
  const selectRecipient = (recipient: Profile) => {
    setSelectedRecipient(recipient);
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };
  
  const uploadImage = async () => {
    if (!imageFile) return existingImageUrl;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const filename = `${user.id}/${Date.now()}-${imageFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('communications')
        .upload(filename, imageFile);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('communications')
        .getPublicUrl(filename);
        
      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw err;
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
    
    setSaving(true);
    setError(null);
    
    try {
      // Upload image if any
      let imageUrl = existingImageUrl;
      if (imageFile) {
        imageUrl = await uploadImage();
      }
      
      const communicationData = {
        id: communicationId || undefined,
        recipient_id: selectedRecipient.id,
        subject: subject.trim(),
        content: content.trim(),
        image_url: imageUrl
      };
      
      const result = await saveCommunication(communicationData);
      
      if (!result.success) {
        throw new Error(result.error ? String(result.error) : 'Failed to save draft');
      }
      
      // Redirect to dashboard after successful save
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setError(err.message || 'Failed to save draft');
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
    
    setSubmitting(true);
    setError(null);
    
    try {
      // First save as draft to ensure all data is updated
      let imageUrl = existingImageUrl;
      if (imageFile) {
        imageUrl = await uploadImage();
      }
      
      const communicationData = {
        id: communicationId || undefined,
        recipient_id: selectedRecipient.id,
        subject: subject.trim(),
        content: content.trim(),
        image_url: imageUrl || undefined // Convert null to undefined if needed
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
          updated_at: new Date().toISOString()
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
    } catch (err: any) {
      console.error('Error submitting communication:', err);
      setError(err.message || 'Failed to submit communication');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto text-center py-12">
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-semibold">
              {communicationId ? 'Edit Communication' : 'New Communication'}
            </h1>
          </div>
          
          <p className="text-gray-600">
            Send a private message to a curator. It may appear in their printed magazine.
          </p>
        </header>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="space-y-6">
            {/* Recipient Selection */}
            <div>
              <Label htmlFor="recipient" className="block mb-2">Recipient</Label>
              
              {selectedRecipient ? (
                <div className="flex items-center justify-between p-3 border rounded-md bg-blue-50">
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
                      <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                        <User size={20} className="text-blue-700" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedRecipient.first_name} {selectedRecipient.last_name}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedRecipient(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search size={18} className="text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    id="recipient"
                    placeholder="Search for a curator..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSearchResults(true)}
                  />
                  
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map(curator => (
                        <div
                          key={curator.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                          onClick={() => selectRecipient(curator)}
                        >
                          {curator.avatar_url ? (
                            <Image 
                              src={curator.avatar_url} 
                              alt={`${curator.first_name} ${curator.last_name}`}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                              <User size={16} className="text-blue-700" />
                            </div>
                          )}
                          <span>{curator.first_name} {curator.last_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showSearchResults && searchTerm.length > 0 && searchResults.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg p-3 text-center text-gray-500">
                      No curators found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Subject */}
            <div>
              <Label htmlFor="subject" className="block mb-2">Subject</Label>
              <Input
                type="text"
                id="subject"
                placeholder="Enter a subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={100}
              />
            </div>
            
            {/* Content */}
            <div>
              <div className="flex justify-between mb-2">
                <Label htmlFor="content">Message</Label>
                <span className={`text-sm ${wordCount > WORD_LIMIT ? 'text-red-500' : 'text-gray-500'}`}>
                  {wordCount}/{WORD_LIMIT} words
                </span>
              </div>
              <Textarea
                id="content"
                placeholder="Write your message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
            
            {/* Image Upload */}
            <div>
              <Label className="block mb-2">Image (Optional)</Label>
              
              {(imagePreview || existingImageUrl) ? (
                <div className="relative mb-4">
                  <Image 
                    src={imagePreview || existingImageUrl || ''}
                    alt="Preview"
                    width={300}
                    height={200}
                    className="rounded-md max-w-full h-auto max-h-[300px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                    aria-label="Remove image"
                  >
                    <X size={16} className="text-red-500" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center relative">
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-2">Drag and drop an image, or click to select</p>
                  <p className="text-xs text-gray-400">Max file size: 5MB</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button
            onClick={() => router.push('/dashboard')}
            disabled={saving || submitting}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Cancel
          </Button>
          
          <div className="flex gap-3">
            <Button
              onClick={handleSaveDraft}
              disabled={saving || submitting}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center gap-2"
            >
              {saving ? 'Saving...' : (
                <>
                  <Save size={16} />
                  Save Draft
                </>
              )}
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={saving || submitting || wordCount > WORD_LIMIT}
              className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
            >
              {submitting ? 'Submitting...' : (
                <>
                  <Send size={16} />
                  Submit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}