'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  MessageCircle, 
  Check, 
  AlertCircle, 
  Info, 
  User,
  Files
} from 'lucide-react';
import { getReceivedCommunications, selectCommunications } from '@/lib/supabase/communications';

interface ProfileData {
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface ReceivedCommunication {
  id: string;
  subject: string;
  sender_id: string;
  is_selected: boolean;
  profiles: ProfileData;
}

interface Period {
  id: string;
  name: string;
  season: string;
  year: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

// Type for communication data with arrays
interface ApiResponseData {
  [key: string]: unknown;
}

type SelectionMethod = 'all' | 'random' | 'select';

// Helper function to safely extract profile data
function extractProfileData(profiles: unknown): ProfileData {
  // Default empty profile
  const defaultProfile: ProfileData = {
    first_name: '',
    last_name: ''
  };
  
  if (!profiles) return defaultProfile;
  
  // Handle array of profiles
  if (Array.isArray(profiles)) {
    if (profiles.length === 0) return defaultProfile;
    
    const firstProfile = profiles[0];
    return {
      first_name: typeof firstProfile.first_name === 'string' ? firstProfile.first_name : '',
      last_name: typeof firstProfile.last_name === 'string' ? firstProfile.last_name : '',
      avatar_url: typeof firstProfile.avatar_url === 'string' ? firstProfile.avatar_url : undefined
    };
  }
  
  // Handle object profile
  if (typeof profiles === 'object' && profiles !== null) {
    const profileObj = profiles as Record<string, unknown>;
    return {
      first_name: typeof profileObj.first_name === 'string' ? profileObj.first_name : '',
      last_name: typeof profileObj.last_name === 'string' ? profileObj.last_name : '',
      avatar_url: typeof profileObj.avatar_url === 'string' ? profileObj.avatar_url : undefined
    };
  }
  
  return defaultProfile;
}

export default function CuratorCommunicationsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [receivedComms, setReceivedComms] = useState<ReceivedCommunication[]>([]);
  const [selectedComms, setSelectedComms] = useState<string[]>([]);
  const [selectionMethod, setSelectionMethod] = useState<SelectionMethod>('all');
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  
  // Maximum communications per page
  const MAX_COMMUNICATIONS_PER_PAGE = 10;
  
  // Calculate number of pages required for all communications
  const calculatePageCount = (commCount: number) => {
    return Math.ceil(commCount / MAX_COMMUNICATIONS_PER_PAGE);
  };
  
  // Get data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get current period
        const { data: periodData, error: periodError } = await supabase
          .from('periods')
          .select('*')
          .eq('is_active', true)
          .single();
          
        if (periodError) throw periodError;
        setCurrentPeriod(periodData);
        
        // Get received communications for this period
        const result = await getReceivedCommunications(periodData.id);
        
        if (!result.success) {
          throw new Error(result.error ? String(result.error) : 'Failed to load communications');
        }
        
        // Process received communications with proper handling for profiles
        const typedReceivedComms: ReceivedCommunication[] = [];
        
        // Safely process each item
        if (result.received && Array.isArray(result.received)) {
          result.received.forEach((item: ApiResponseData) => {
            if (item && typeof item === 'object') {
              const profiles = extractProfileData(item.profiles);
              
              typedReceivedComms.push({
                id: typeof item.id === 'string' ? item.id : String(item.id || ''),
                subject: typeof item.subject === 'string' ? item.subject : '',
                sender_id: typeof item.sender_id === 'string' ? item.sender_id : '',
                is_selected: Boolean(item.is_selected),
                profiles
              });
            }
          });
        }
        
        setReceivedComms(typedReceivedComms);
        
        // Calculate initial page count
        const initialPageCount = calculatePageCount(typedReceivedComms.length);
        setPageCount(initialPageCount);
        
        // Set default selection method based on count
        if (typedReceivedComms.length > MAX_COMMUNICATIONS_PER_PAGE) {
          setSelectionMethod('random');
        } else {
          setSelectionMethod('all');
        }
      } catch (err: unknown) {
        console.error('Error loading data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [supabase]);
  
  const handleCheckboxChange = (commId: string) => {
    setSelectedComms(prev => {
      if (prev.includes(commId)) {
        return prev.filter(id => id !== commId);
      } else {
        // Only allow selecting up to MAX_COMMUNICATIONS_PER_PAGE
        if (prev.length >= MAX_COMMUNICATIONS_PER_PAGE) {
          return prev;
        }
        return [...prev, commId];
      }
    });
  };
  
  const handleSelectionMethodChange = (value: SelectionMethod) => {
    setSelectionMethod(value);
    
    // Update page count based on selection method
    if (value === 'all') {
      setPageCount(calculatePageCount(receivedComms.length));
    } else {
      // For random or manual selection, always 1 page
      setPageCount(1);
    }
    
    // Clear selected comms if switching to all or random
    if (value === 'all' || value === 'random') {
      setSelectedComms([]);
    }
  };
  
  const handleSaveSelection = async () => {
    if (!currentPeriod) {
      setError('No active period found');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      let commIds: string[] = [];
      let pagesRequired = 1;
      
      if (selectionMethod === 'all') {
        // For "all", include all communications
        commIds = receivedComms.map(comm => comm.id);
        pagesRequired = calculatePageCount(receivedComms.length);
      } else if (selectionMethod === 'select') {
        // For manual selection, use selected IDs
        commIds = selectedComms;
        
        if (commIds.length === 0) {
          setError('Please select at least one communication');
          setSaving(false);
          return;
        }
        
        pagesRequired = 1;
      } else {
        // For random selection, pass empty array - backend will handle random selection
        pagesRequired = 1;
      }
      
      // Save the selection to the database
      const result = await selectCommunications(
        commIds, 
        selectionMethod, 
        currentPeriod.id
      );
      
      if (!result.success) {
        throw new Error(result.error ? String(result.error) : 'Failed to save selection');
      }
      
      setSuccess(true);
      
      // Store the page count in localStorage to use on the curation page
      localStorage.setItem('communicationPageCount', pagesRequired.toString());
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/curate');
      }, 2000);
    } catch (err: unknown) {
      console.error('Error saving selection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save selection';
      setError(errorMessage);
    } finally {
      setSaving(false);
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
            <Link href="/curate" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-semibold">Communications</h1>
          </div>
          
          <p className="text-gray-600">
            Select which private communications you&apos;d like to include in your printed magazine.
          </p>
        </header>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6 flex items-start gap-3">
            <Check size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">Your selection has been saved successfully. Redirecting...</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle size={24} className="text-blue-500" />
              <h2 className="text-xl font-medium">
                {receivedComms.length} Private Communication{receivedComms.length !== 1 ? 's' : ''}
              </h2>
            </div>
            
            {receivedComms.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">You haven&apos;t received any communications for this period yet.</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                  <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-700 text-sm">
                      You can include up to {MAX_COMMUNICATIONS_PER_PAGE} communications per page in your printed magazine.
                      {receivedComms.length > MAX_COMMUNICATIONS_PER_PAGE && (
                        <span className="font-medium"> Since you&apos;ve received more than {MAX_COMMUNICATIONS_PER_PAGE}, you&apos;ll need to choose how to select them.</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium mb-4">Selection Method</h3>
                  
                  <RadioGroup 
                    value={selectionMethod} 
                    onValueChange={(value) => handleSelectionMethodChange(value as SelectionMethod)}
                    className="space-y-4"
                  >
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem 
                        value="all" 
                        id="all" 
                      />
                      <Label 
                        htmlFor="all" 
                        className="flex-1"
                      >
                        <div className="font-medium block mb-1 flex items-center gap-2">
                          Include All
                          {receivedComms.length > MAX_COMMUNICATIONS_PER_PAGE && (
                            <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              <Files size={12} className="mr-1" />
                              <span>{calculatePageCount(receivedComms.length)} pages</span>
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 block">
                          Include all {receivedComms.length} communications
                          {receivedComms.length > MAX_COMMUNICATIONS_PER_PAGE && (
                            <span> across {calculatePageCount(receivedComms.length)} pages (uses {calculatePageCount(receivedComms.length)} slots in your magazine)</span>
                          )}.
                        </span>
                      </Label>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem 
                        value="random" 
                        id="random" 
                      />
                      <Label htmlFor="random" className="flex-1">
                        <div className="font-medium block mb-1 flex items-center gap-2">
                          Random Selection
                          <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            <Files size={12} className="mr-1" />
                            <span>1 page</span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500 block">
                          Randomly select {MAX_COMMUNICATIONS_PER_PAGE} communications from all those received (uses 1 slot in your magazine).
                        </span>
                      </Label>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem 
                        value="select" 
                        id="select" 
                      />
                      <Label htmlFor="select" className="flex-1">
                        <div className="font-medium block mb-1 flex items-center gap-2">
                          Manual Selection
                          <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            <Files size={12} className="mr-1" />
                            <span>1 page</span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500 block">
                          Choose up to {MAX_COMMUNICATIONS_PER_PAGE} specific communications to include (uses 1 slot in your magazine).
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {selectionMethod === 'select' && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Select Communications</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Selected: {selectedComms.length}/{Math.min(MAX_COMMUNICATIONS_PER_PAGE, receivedComms.length)}
                    </p>
                    
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {receivedComms.map(comm => (
                        <div 
                          key={comm.id}
                          className={`p-4 border rounded-lg ${
                            selectedComms.includes(comm.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                {comm.profiles.avatar_url ? (
                                  <Image 
                                    src={comm.profiles.avatar_url} 
                                    alt={`${comm.profiles.first_name} ${comm.profiles.last_name}`}
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                                    <User size={14} className="text-blue-700" />
                                  </div>
                                )}
                                <span className="text-sm text-gray-600">
                                  From: {comm.profiles.first_name} {comm.profiles.last_name}
                                </span>
                              </div>
                              <h4 className="font-medium">{comm.subject}</h4>
                            </div>
                            <div className="ml-4">
                              <Checkbox 
                                id={`comm-${comm.id}`} 
                                checked={selectedComms.includes(comm.id)}
                                onCheckedChange={() => {
                                  if (selectedComms.includes(comm.id) || selectedComms.length < MAX_COMMUNICATIONS_PER_PAGE) {
                                    handleCheckboxChange(comm.id);
                                  }
                                }}
                                disabled={selectedComms.length >= MAX_COMMUNICATIONS_PER_PAGE && !selectedComms.includes(comm.id)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary of selection impact */}
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Magazine slots used:</span>
                    <span className="font-medium">{pageCount}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {pageCount === 1 ? (
                      'Your selection will use 1 slot in your magazine'
                    ) : (
                      `Your selection will use ${pageCount} slots in your magazine`
                    )}
                  </div>
                </div>
                
                <div className="mt-8 pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleSaveSelection}
                    disabled={saving || (selectionMethod === 'select' && selectedComms.length === 0)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {saving ? 'Saving...' : 'Save Selection'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
