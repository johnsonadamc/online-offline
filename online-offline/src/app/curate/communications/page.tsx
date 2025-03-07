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
  User
} from 'lucide-react';
import { getReceivedCommunications, selectCommunications } from '@/lib/supabase/communications';

interface ReceivedCommunication {
  id: string;
  subject: string;
  sender_id: string;
  is_selected: boolean;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
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

type SelectionMethod = 'all' | 'random' | 'select';

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
  
  // Maximum communications to include
  const MAX_COMMUNICATIONS = 10;
  
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
        
        // Fix for type issue - ensure the profiles object matches the expected structure
        const typedReceivedComms: ReceivedCommunication[] = (result.received || []).map((comm: any) => ({
          id: comm.id,
          subject: comm.subject,
          sender_id: comm.sender_id,
          is_selected: comm.is_selected,
          profiles: {
            first_name: comm.profiles.first_name,
            last_name: comm.profiles.last_name,
            avatar_url: comm.profiles.avatar_url
          }
        }));
        
        setReceivedComms(typedReceivedComms);
        
        // Set default selection method based on count
        if (typedReceivedComms.length > MAX_COMMUNICATIONS) {
          setSelectionMethod('random');
        } else {
          setSelectionMethod('all');
        }
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message || 'Failed to load data');
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
        // Only allow selecting up to MAX_COMMUNICATIONS
        if (prev.length >= MAX_COMMUNICATIONS) {
          return prev;
        }
        return [...prev, commId];
      }
    });
  };
  
  const handleSelectionMethodChange = (value: SelectionMethod) => {
    setSelectionMethod(value);
    
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
      
      if (selectionMethod === 'all') {
        // If "all" is selected and there are <= MAX_COMMUNICATIONS messages, select all
        if (receivedComms.length <= MAX_COMMUNICATIONS) {
          commIds = receivedComms.map(comm => comm.id);
        } else {
          setError(`Cannot select all - you have more than ${MAX_COMMUNICATIONS} communications`);
          setSaving(false);
          return;
        }
      } else if (selectionMethod === 'select') {
        // For manual selection, use selected IDs
        commIds = selectedComms;
        
        if (commIds.length === 0) {
          setError('Please select at least one communication');
          setSaving(false);
          return;
        }
      }
      // For random selection, pass empty array - backend will handle random selection
      
      const result = await selectCommunications(
        commIds, 
        selectionMethod, 
        currentPeriod.id
      );
      
      if (!result.success) {
        throw new Error(result.error ? String(result.error) : 'Failed to save selection');
      }
      
      setSuccess(true);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/curate');
      }, 2000);
    } catch (err: any) {
      console.error('Error saving selection:', err);
      setError(err.message || 'Failed to save selection');
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
            Select which private communications you'd like to include in your printed magazine.
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
                <p className="text-gray-500">You haven't received any communications for this period yet.</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                  <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-700 text-sm">
                      You can include up to {MAX_COMMUNICATIONS} communications in your printed magazine.
                      {receivedComms.length > MAX_COMMUNICATIONS && (
                        <span className="font-medium"> Since you've received more than {MAX_COMMUNICATIONS}, you'll need to choose how to select them.</span>
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
                        disabled={receivedComms.length > MAX_COMMUNICATIONS}
                      />
                      <Label 
                        htmlFor="all" 
                        className={`flex-1 ${receivedComms.length > MAX_COMMUNICATIONS ? 'text-gray-400' : ''}`}
                      >
                        <span className="font-medium block mb-1">Include All</span>
                        <span className="text-sm text-gray-500 block">
                          Include all communications. Only available if you have {MAX_COMMUNICATIONS} or fewer.
                        </span>
                      </Label>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem 
                        value="random" 
                        id="random" 
                      />
                      <Label htmlFor="random" className="flex-1">
                        <span className="font-medium block mb-1">Random Selection</span>
                        <span className="text-sm text-gray-500 block">
                          Randomly select {MAX_COMMUNICATIONS} communications from all those received.
                        </span>
                      </Label>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem 
                        value="select" 
                        id="select" 
                      />
                      <Label htmlFor="select" className="flex-1">
                        <span className="font-medium block mb-1">Manual Selection</span>
                        <span className="text-sm text-gray-500 block">
                          Choose up to {MAX_COMMUNICATIONS} specific communications to include.
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {selectionMethod === 'select' && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Select Communications</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Selected: {selectedComms.length}/{Math.min(MAX_COMMUNICATIONS, receivedComms.length)}
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
                                  if (selectedComms.includes(comm.id) || selectedComms.length < MAX_COMMUNICATIONS) {
                                    handleCheckboxChange(comm.id);
                                  }
                                }}
                                disabled={selectedComms.length >= MAX_COMMUNICATIONS && !selectedComms.includes(comm.id)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
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