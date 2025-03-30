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
  Send,
  Trash2
} from 'lucide-react';
import { saveCommunication } from '@/lib/supabase/communications';
import { canCommunicateWith } from '@/lib/supabase/profiles';
import React from 'react';

// Helper function to get ID safely
function getParamId(params: any): string {
  // @ts-ignore - Next.js params warnings
  return params.id;
}

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
  // Use the helper function instead of direct destructuring
  const id = getParamId(params);
  const communicationId = id !== 'new' ? id : null;
  
  const router = useRouter();
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  
  const [hasPermission, setHasPermission] = useState(true);
  const [permissionCheckComplete, setPermissionCheckComplete] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const [deleting, setDeleting] = useState(false);
  
  
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
          
          // Check permission for the loaded recipient
          if (data.profiles) {
            const result = await canCommunicateWith(data.profiles.id);
            setHasPermission(result.allowed);
            setPermissionCheckComplete(true);
          }
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
    if (!term || term.length < 1) { 
      setSearchResults([]);
      return;
    }
    
    const searchTerm = term.trim(); 
    console.log("Searching for exact term:", searchTerm);
    
    try {
      // Use a direct Supabase query with the exact term
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, is_public')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10);
      
      console.log("Search results:", data);
      
      if (error) {
        console.error("Supabase query error:", error);
        setError('Database query failed: ' + error.message);
        return;
      }
      
      // Filter for public profiles only
      if (data && data.length > 0) {
        const publicProfiles = data.filter(profile => profile.is_public === true);
        console.log("Public profiles only:", publicProfiles);
        setSearchResults(publicProfiles);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
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
    }
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
    
    // Check permission before saving
    if (!hasPermission) {
      setError('You do not have permission to send communications to this user');
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
    
    // Check permission before submitting
    if (!hasPermission) {
      setError('You do not have permission to send communications to this user');
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
  
  const handleDelete = async () => {
    if (!communicationId) {
      router.push('/dashboard');
      return;
    }
    
    setDeleting(true);
    setError(null);
    
    try {
      // First, delete any related notifications
      const { error: notificationError } = await supabase
        .from('communication_notifications')
        .delete()
        .eq('communication_id', communicationId);
      
      if (notificationError) {
        console.error('Error deleting notifications:', notificationError);
        throw notificationError;
      }
      
      // Then delete the communication itself
      const { error } = await supabase
        .from('communications')
        .delete()
        .eq('id', communicationId);
        
      if (error) throw error;
      
      // Redirect to dashboard after successful deletion
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error deleting communication:', err);
      setError(err.message || 'Failed to delete communication');
      setDeleting(false);
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
        
        {/* Add permission warning message */}
        {permissionCheckComplete && !hasPermission && selectedRecipient && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">Permission Required</p>
              <p className="text-red-600">
                You need to request access to {selectedRecipient.first_name}'s profile before sending communications.
              </p>
            </div>
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
        
        {/* Improved mobile-friendly button section with 3 buttons */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  {communicationId && (
    <Button
      onClick={() => setShowDeleteConfirm(true)}
      disabled={saving || submitting || deleting}
      className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2 h-12 sm:h-10 px-4 col-span-1"
    >
      <Trash2 size={16} />
      Delete
    </Button>
  )}
  
  <Button
    onClick={handleSaveDraft}
    disabled={saving || submitting || deleting || !hasPermission}
    className={`bg-blue-400 hover:bg-blue-500 text-white flex items-center justify-center gap-2 h-12 sm:h-10 px-4 ${
      communicationId ? 'col-span-1' : 'col-span-1 sm:col-span-2'
    } ${!hasPermission ? 'opacity-50 cursor-not-allowed' : ''}`}
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
    disabled={saving || submitting || deleting || wordCount > WORD_LIMIT || !hasPermission}
    className={`bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 h-12 sm:h-10 px-4 ${
      communicationId ? 'col-span-1' : 'col-span-1'
    } ${!hasPermission ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {submitting ? 'Submitting...' : (
      <>
        <Send size={16} />
        Submit
      </>
    )}
  </Button>
</div>
        
        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-medium mb-3">Delete Communication</h3>
              <p className="text-gray-600 mb-5">
                Are you sure you want to delete this communication? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-500 hover:bg-red-600 text-white order-1 sm:order-2"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}