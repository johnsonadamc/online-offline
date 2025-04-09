"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Upload, X, Save, Send, 
  CheckCircle, AlertCircle, Info, FileText, 
  Eye, Maximize2
} from 'lucide-react';
import { getCollabById } from '@/lib/supabase/collabs';

interface CollabDetails {
  id: string;
  title: string;
  type?: 'chain' | 'theme' | 'narrative';
  description: string;
  prompt_text: string;
  instructions?: string;
  is_private: boolean;
  metadata?: Record<string, unknown>;
  participant_count?: number;
  participation_mode?: 'community' | 'local' | 'private';
  location?: string | null;
}

interface CollabSubmission {
  id?: string;
  collab_id: string;
  contributor_id: string;
  title: string;
  caption: string;
  media_url?: string;
  status: 'draft' | 'submitted' | 'published';
  created_at?: string;
  updated_at?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
}

export default function CollabSubmissionPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Loading and UI state
  const [loading, setLoading] = useState(true);
  const [showInstructionsPanel, setShowInstructionsPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Time left
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0 });
  
  // Collaboration data
  const [collabDetails, setCollabDetails] = useState<CollabDetails>({
    id: params.id as string,
    title: '',
    description: '',
    prompt_text: '',
    is_private: false
  });
  
  // Submission data
  const [submission, setSubmission] = useState<CollabSubmission>({
    collab_id: params.id as string,
    contributor_id: '',
    title: '',
    caption: '',
    status: 'draft'
  });
  
  // Media handling
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const collabId = params.id as string;
        
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/signin');
          return;
        }

        // Set the contributor ID
        setSubmission(prev => ({ ...prev, contributor_id: user.id }));
        
        // Fetch collab details using the existing getCollabById function
        const collabResult = await getCollabById(collabId);
        
        if (!collabResult.success || !collabResult.collab) {
          setError(`Failed to load collaboration details: ${collabResult.error}`);
          return;
        }
        
        // If the collab has a template_id in metadata, try to fetch the template
        let instructionsText = collabResult.collab.prompt_text || "";
        
        if (collabResult.collab.metadata?.template_id) {
          // Try to get template details with instructions
          const { data: templateData } = await supabase
            .from('collab_templates')
            .select('*')
            .eq('id', collabResult.collab.metadata.template_id)
            .single();
            
          if (templateData?.instructions) {
            instructionsText = templateData.instructions;
          }
        }
        
        // Get current period
        const { data: periodData } = await supabase
          .from('periods')
          .select('*')
          .eq('is_active', true)
          .single();
          
        // Calculate time left
        if (periodData) {
          const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
          const pstEndDate = new Date(periodData.end_date);
          pstEndDate.setTime(pstEndDate.getTime() + pstEndDate.getTimezoneOffset() * 60 * 1000);
          const pstEndDateTime = new Date(pstEndDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

          const difference = pstEndDateTime.getTime() - pstNow.getTime();
          const daysLeft = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          
          setTimeLeft({ days: daysLeft, hours });
        }
        
        // Get participant count
        const { count: participantCount } = await supabase
          .from('collab_participants')
          .select('*', { count: 'exact', head: true })
          .eq('collab_id', collabId)
          .eq('status', 'active');
        
        // Set collab details with instructions from any available source
        setCollabDetails({
          id: collabResult.collab.id,
          title: collabResult.collab.title,
          type: collabResult.collab.type,
          description: collabResult.collab.description || "Collaborate with other creators on this project.",
          prompt_text: collabResult.collab.prompt_text || "",
          instructions: instructionsText,
          is_private: Boolean(collabResult.collab.is_private),
          metadata: collabResult.collab.metadata,
          participant_count: participantCount || 0,
          participation_mode: collabResult.collab.metadata?.participation_mode || 'community',
          location: collabResult.collab.metadata?.location
        });
        
        // Check for existing submission for this user and collab
        const { data: existingSubmissionData, error: submissionError } = await supabase
          .from('collab_submissions')
          .select('*')
          .eq('collab_id', collabId)
          .eq('contributor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (submissionError) {
          console.error("Error fetching existing submissions:", submissionError);
        }
        
        const existingSubmission = existingSubmissionData?.[0];
          
        if (existingSubmission) {
          // Update the submission state with the saved data
          setSubmission({
            id: existingSubmission.id,
            collab_id: existingSubmission.collab_id,
            contributor_id: existingSubmission.contributor_id,
            title: existingSubmission.title || '',
            caption: existingSubmission.caption || '', // Using caption field from database
            media_url: existingSubmission.media_url || '',
            status: existingSubmission.status || 'draft',
            created_at: existingSubmission.created_at,
            updated_at: existingSubmission.updated_at
          });
          
          // Make sure to set the preview URL for the image
          if (existingSubmission.media_url) {
            setPreviewUrl(existingSubmission.media_url);
          }
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [params.id, router, supabase]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setMediaFile(file);
    
    // Create a preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSubmission(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (shouldSubmit: boolean) => {
    try {
      const newStatus = shouldSubmit ? 'submitted' : 'draft';
      setSaving(true);
      setSubmitting(shouldSubmit);
      setError(null);
      
      // Basic validation
      if (!submission.title.trim()) {
        setError("Please provide a title for your submission");
        setSaving(false);
        setSubmitting(false);
        return;
      }
      
      // Create the submission data with field names matching your database schema
      const submissionData = {
        collab_id: submission.collab_id,
        contributor_id: submission.contributor_id,
        title: submission.title,
        caption: submission.caption, // Using the correct field name
        media_url: submission.media_url || '', 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // Handle file upload if there's a new file
      if (mediaFile) {
        try {
          const fileExt = mediaFile.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${submission.collab_id}/${submission.contributor_id}/${fileName}`;
          
          // Attempt to upload the file
          const { error: uploadError } = await supabase.storage
            .from('collab-media')
            .upload(filePath, mediaFile, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
          
          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('collab-media')
            .getPublicUrl(filePath);
            
          submissionData.media_url = publicUrl; // Update here
        } catch (uploadError) {
          setError(`File upload error: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          setSaving(false);
          setSubmitting(false);
          return;
        }
      }
      
      // Save to the database
      let result;
      if (submission.id) {
        // Update existing record
        // Use the field names exactly as they appear in your database schema
        const { error } = await supabase
          .from('collab_submissions')
          .update({
            title: submissionData.title,
            media_url: submissionData.media_url,
            status: submissionData.status,
            contributor_id: submissionData.contributor_id,
            collab_id: submissionData.collab_id,
            updated_at: submissionData.updated_at,
            // Use "caption" field based on your schema
            caption: submissionData.caption
          })
          .eq('id', submission.id);
          
        result = { error, data: null };
      } else {
        // Create new record
        const { error, data } = await supabase
          .from('collab_submissions')
          .insert({
            title: submissionData.title,
            media_url: submissionData.media_url,
            status: submissionData.status,
            contributor_id: submissionData.contributor_id,
            collab_id: submissionData.collab_id,
            created_at: new Date().toISOString(),
            updated_at: submissionData.updated_at,
            // Use "caption" field based on your schema
            caption: submissionData.caption
          })
          .select();
          
        result = { error, data };
      }
      
      if (result.error) {
        throw new Error(`Failed to save submission: ${result.error.message}`);
      }
      
      // If this was a new submission, update the local ID
      // Explicitly handle the case where result.data might be null
      const resultData = result.data || [];
      if (!submission.id && resultData.length > 0 && resultData[0]?.id) {
        setSubmission(prev => ({ 
          ...prev, 
          id: resultData[0].id,
          status: newStatus,
          media_url: submissionData.media_url
        }));
      } else {
        setSubmission(prev => ({ 
          ...prev, 
          status: newStatus,
          media_url: submissionData.media_url
        }));
      }
      
      setSuccessMessage(shouldSubmit 
        ? 'Your submission has been sent for publication!' 
        : 'Your draft has been saved.');
        
      // Navigate back to dashboard after successful submission
      if (shouldSubmit) {
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };
  
  const handleRevertToEdit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const { error } = await supabase
        .from('collab_submissions')
        .update({ 
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', submission.id);
        
      if (error) {
        throw new Error(`Failed to revert submission: ${error.message}`);
      }
      
      setSubmission(prev => ({ ...prev, status: 'draft' }));
      setSuccessMessage('Your submission has been reverted to draft.');
    } catch (error) {
      console.error('Error reverting:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };
  
  // Determine participation mode badge color
  const getModeColor = (mode?: string) => {
    switch (mode) {
      case 'community':
        return 'bg-green-100 text-green-600';
      case 'local':
        return 'bg-amber-100 text-amber-600';
      case 'private':
        return 'bg-indigo-100 text-indigo-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading collaboration details...</p>
        </div>
      </div>
    );
  }
  
  if (!collabDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-center mb-4">Collaboration Not Found</h2>
            <p className="text-gray-600 mb-6">
              We could not find the collaboration you are looking for. It may have been removed or you may not have access.
            </p>
            <Link href="/dashboard">
              <Button className="w-full">Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white text-gray-900 md:border-x md:border-gray-200 md:min-h-0">
      {/* Fixed Header */}
      <div className="px-4 py-3 flex items-center justify-between z-20 bg-white border-b border-gray-200 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-md font-semibold text-gray-900 truncate max-w-[170px]">
              {collabDetails.title}
            </h1>
            <div className={`text-xs flex items-center ${
              submission.status === 'draft'
                ? 'text-gray-600'
                : 'text-green-600'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-1 ${
                submission.status === 'draft' ? 'bg-gray-500' : 'bg-green-500'
              }`}></div>
              {submission.status === 'draft' ? 'Draft' : 'Submitted'} • {timeLeft.days}d {timeLeft.hours}h left
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {collabDetails.participation_mode && (
            <div className="flex items-center">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getModeColor(collabDetails.participation_mode)}`}>
                {collabDetails.participation_mode.charAt(0).toUpperCase() + collabDetails.participation_mode.slice(1)}
              </span>
              
              {/* Display city right after the "Local" tag if available */}
              {collabDetails.participation_mode === 'local' && collabDetails.location && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full ml-1">
                  {collabDetails.location}
                </span>
              )}
            </div>
          )}
          
          <button
            onClick={() => setShowInstructionsPanel(!showInstructionsPanel)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 relative"
            aria-label="View instructions"
          >
            <FileText className="h-5 w-5 text-gray-600" />
            {!showInstructionsPanel && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>
      
      {/* Instructions Panel - Expandable */}
      {showInstructionsPanel && (
        <div className="bg-white border-b border-gray-200 px-4 py-4 animate-in slide-in-from-top duration-300">
          {/* Collaboration Description */}
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              {collabDetails.description}
            </h2>
          </div>
          
          {/* Instructions - Prominently Displayed */}
          <div className="mb-2">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center text-base">
                <FileText className="h-5 w-5 mr-1.5" />
                INSTRUCTIONS
              </h3>
              <div className="text-sm text-gray-700 whitespace-pre-line">
                {collabDetails.instructions || collabDetails.prompt_text || "No specific instructions provided for this collaboration."}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Prompt Instructions Floating Button - Only visible when panel is closed */}
      {!showInstructionsPanel && (
        <button 
          className="fixed bottom-20 right-4 z-10 bg-blue-600 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
          onClick={() => setShowInstructionsPanel(true)}
        >
          <Eye className="h-5 w-5" />
        </button>
      )}
      
      {/* Main Image Area */}
      <div className={`flex-1 flex flex-col relative bg-gray-100 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        <div className="h-full flex-1 flex items-center justify-center p-4">
          {/* Image display */}
          {(previewUrl || submission.media_url) ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <div
                className="max-w-full max-h-full rounded-lg shadow-md bg-cover bg-center bg-no-repeat"
                style={{ 
                  backgroundImage: `url(${previewUrl || submission.media_url})`,
                  width: '100%',
                  height: '100%',
                  backgroundSize: 'contain'
                }}
                aria-label={submission.title || "Submission preview"}
              />
              
              {/* Fullscreen toggle button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="absolute bottom-2 right-2 p-1.5 bg-black/20 backdrop-blur-sm shadow rounded-full hover:bg-black/30 transition-colors"
              >
                <Maximize2 className="h-5 w-5 text-white" />
              </button>
              
              {/* Remove button - only when not submitted */}
              {submission.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl(null);
                    setMediaFile(null);
                    setSubmission(prev => ({ ...prev, media_url: '' }));
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 shadow rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 w-full h-full p-6 text-center cursor-pointer"
              onClick={submission.status !== 'submitted' ? triggerFileInput : undefined}
            >
              <input
                ref={fileInputRef}
                id="media"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={submission.status === 'submitted'}
              />
              <Upload className="h-12 w-12 text-gray-400 mb-3" />
              <div className="text-sm text-gray-600 mb-3 font-medium">
                {submission.status === 'submitted' 
                  ? 'No image uploaded with this submission'
                  : 'Click to upload an image'
                }
              </div>
              {submission.status !== 'submitted' && (
                <p className="text-xs text-gray-500">
                  Supported formats: JPG, PNG, GIF, WebP up to 10MB
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Form Inputs */}
      <div className="bg-white border-t border-gray-200 animate-in slide-in-from-bottom duration-200">
        {/* Title and Caption - Always Visible */}
        <div className="p-4">
          <input
            name="title"
            value={submission.title}
            onChange={handleInputChange}
            className="w-full text-xl font-medium bg-transparent border-none p-0 mb-2 focus:outline-none focus:ring-0 placeholder:text-gray-400 text-gray-900"
            placeholder="Add title"
            disabled={submission.status === 'submitted'}
          />
          
          <textarea
            name="caption"
            value={submission.caption}
            onChange={handleInputChange}
            className="w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0 placeholder:text-gray-400 text-gray-600 resize-none"
            placeholder="Add caption"
            rows={3}
            disabled={submission.status === 'submitted'}
          />
        </div>
      </div>
      
      {/* Status Messages */}
      {(error || successMessage) && (
        <div className={`px-4 py-3 ${
          error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
        } rounded relative mb-2 mx-4 flex items-center`}>
          <div className="flex items-center">
            {error ? (
              <AlertCircle size={20} className="mr-2" />
            ) : (
              <CheckCircle size={20} className="mr-2" />
            )}
            <span>{error || successMessage}</span>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-3 sticky bottom-0 shadow-md">
        {submission.status === 'submitted' ? (
          <button
            type="button"
            className="w-full py-2.5 px-4 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
            onClick={handleRevertToEdit}
            disabled={saving}
          >
            <Info className="h-4 w-4" />
            Revert to Draft
          </button>
        ) : (
          <>
            <button
              type="button"
              className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              onClick={() => handleSubmit(false)}
              disabled={saving || submitting}
            >
              <Save className="h-4 w-4" />
              {saving && !submitting 
                ? 'Saving...' 
                : 'Save Draft'
              }
            </button>
            
            <button
              type="button"
              className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              onClick={() => handleSubmit(true)}
              disabled={saving || submitting || !submission.title || (!previewUrl && !submission.media_url)}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
