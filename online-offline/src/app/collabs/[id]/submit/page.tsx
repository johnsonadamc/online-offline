"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Save, CheckCircle, AlertCircle, X } from 'lucide-react';
import { getCollabById } from '@/lib/supabase/collabs';

interface CollabDetails {
  id: string;
  title: string;
  type?: 'chain' | 'theme' | 'narrative';
  description: string;
  prompt_text: string;
  instructions?: string;
  is_private: boolean;
  metadata?: any;
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

export default function CollabSubmissionPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [collabDetails, setCollabDetails] = useState<CollabDetails | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [submission, setSubmission] = useState<CollabSubmission>({
    collab_id: params.id as string,
    contributor_id: '',
    title: '',
    caption: '',
    status: 'draft'
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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
        
        // Fetch collab details
        const collabResult = await getCollabById(collabId);
        
        if (!collabResult.success || !collabResult.collab) {
          setError(`Failed to load collaboration details: ${collabResult.error}`);
          return;
        }
        
        console.log("FULL COLLAB DETAILS:", JSON.stringify(collabResult.collab, null, 2));
        
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
            console.log("Found instructions in template:", instructionsText);
          }
        }
        
        // Get current period
        const { data: periodData } = await supabase
          .from('periods')
          .select('*')
          .eq('is_active', true)
          .single();
          
        setCurrentPeriod(periodData);
        
        // Set collab details with instructions from any available source
        setCollabDetails({
          id: collabResult.collab.id,
          title: collabResult.collab.title,
          type: collabResult.collab.type,
          description: collabResult.collab.description || "Collaborate with other creators on this project.",
          prompt_text: collabResult.collab.prompt_text || "",
          instructions: instructionsText, // Use instructions from template if available
          is_private: Boolean(collabResult.collab.is_private),
          metadata: collabResult.collab.metadata
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
            caption: existingSubmission.caption || '',
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
      
      // Create the submission data - include media_url property initially
      const submissionData = {
        collab_id: submission.collab_id,
        contributor_id: submission.contributor_id,
        title: submission.title,
        caption: submission.caption,
        media_url: submission.media_url || '', // Include this initially
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
          const { data: uploadData, error: uploadError } = await supabase.storage
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
        result = await supabase
          .from('collab_submissions')
          .update(submissionData)
          .eq('id', submission.id);
      } else {
        // Create new record
        result = await supabase
          .from('collab_submissions')
          .insert({
            ...submissionData,
            created_at: new Date().toISOString()
          })
          .select();
      }
      
      if (result.error) {
        throw new Error(`Failed to save submission: ${result.error.message}`);
      }
      
      // If this was a new submission, update the local ID
      if (!submission.id && result.data?.[0]?.id) {
        setSubmission(prev => ({ 
          ...prev, 
          id: result.data[0].id,
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
              We couldn't find the collaboration you're looking for. It may have been removed or you may not have access.
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back to Dashboard
          </Link>
        </div>
        
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6 flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-6 flex items-center">
            <CheckCircle size={20} className="mr-2" />
            <span>{successMessage}</span>
          </div>
        )}
        
        {/* Simplified Collab Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center gap-2 mb-2">
            {collabDetails.type && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                collabDetails.type === 'chain' 
                  ? 'bg-blue-100 text-blue-600' 
                  : collabDetails.type === 'theme'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-100 text-amber-600'
              }`}>
                {collabDetails.type.charAt(0).toUpperCase() + collabDetails.type.slice(1)}
              </span>
            )}
            {collabDetails.is_private && (
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                Private
              </span>
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-4">{collabDetails.title}</h1>
          
          {/* Description - Italicized first line */}
          <div className="prose max-w-none mb-8">
            <p className="text-lg text-gray-700 mb-6 italic">
              {collabDetails.description}
            </p>
            
            {/* Instructions - Enhanced styling */}
            {(collabDetails.instructions || collabDetails.prompt_text) && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2">Instructions:</h3>
                <div className="text-gray-700 whitespace-pre-line">
                  {collabDetails.instructions || collabDetails.prompt_text}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Your Submission</CardTitle>
              {submission.status === 'submitted' && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  Submitted for Publication
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title"
                name="title"
                value={submission.title}
                onChange={handleInputChange}
                placeholder="Give your submission a title"
                disabled={submission.status === 'submitted'}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Textarea 
                id="caption"
                name="caption"
                value={submission.caption}
                onChange={handleInputChange}
                placeholder="Add a caption to your submission"
                rows={3}
                disabled={submission.status === 'submitted'}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="media">Upload Media</Label>
              {(previewUrl || submission.media_url) ? (
                <div className="mt-2 relative">
                  <div className="border rounded-md p-4 bg-white">
                    <div className="flex items-center justify-center">
                      <img 
                        src={previewUrl || submission.media_url}
                        alt="Submission preview" 
                        className="max-w-full max-h-64 object-contain"
                        onLoad={() => console.log("Image loaded successfully")}
                        onError={(e) => {
                          console.error("Image failed to load");
                          // Use a placeholder instead of setting an error
                          const imgElement = e.currentTarget as HTMLImageElement;
                          if (imgElement) {
                            imgElement.style.display = 'none';
                          }
                          const placeholderElement = document.getElementById('image-placeholder');
                          if (placeholderElement) {
                            placeholderElement.style.display = 'block';
                          }
                        }}
                        id="submission-image"
                      />
                      <div 
                        id="image-placeholder" 
                        className="h-32 flex items-center justify-center text-gray-500" 
                        style={{display: 'none'}}
                      >
                        <div className="text-center">
                          <p>Media content available, but preview cannot be displayed.</p>
                          <p className="text-xs mt-1">Your submission data is saved correctly.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {submission.status !== 'submitted' && (
                    <button 
                      onClick={() => {
                        setPreviewUrl(null);
                        setMediaFile(null);
                        setSubmission(prev => ({ ...prev, media_url: '' }));
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    id="media"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={submission.status === 'submitted'}
                  />
                  <label 
                    htmlFor="media" 
                    className={`cursor-pointer flex flex-col items-center justify-center ${
                      submission.status === 'submitted' ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-900">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      SVG, PNG, JPG or GIF (max. 5MB)
                    </span>
                  </label>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              {submission.status === 'submitted' ? (
                // Always show revert button for submitted content
                <Button 
                  onClick={handleRevertToEdit}
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Revert to Draft
                </Button>
              ) : (
                // Show save/submit buttons for drafts
                <>
                  <Button 
                    onClick={() => handleSubmit(false)}
                    disabled={saving || submitting}
                    className="flex items-center gap-2 bg-gray-700 border border-gray-800 text-white hover:bg-gray-800 font-medium"
                  >
                    <Save size={16} className="mr-1" />
                    <span>Save as Draft</span>
                  </Button>
                  <Button 
                    onClick={() => handleSubmit(true)}
                    disabled={saving || submitting || !submission.title || (!previewUrl && !submission.media_url)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {submitting ? 'Submitting...' : 'Submit for Publication'}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}