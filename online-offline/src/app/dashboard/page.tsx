'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { fetchCurrentPeriodDraft, getPastContributions, getCurrentPeriod } from '@/lib/supabase/content';
import { getSubscriptionStats } from '@/lib/supabase/subscriptions';
import { getUserCollabs, leaveCollab } from '@/lib/supabase/collabs';
import { 
  getDraftCommunications, 
  getSubmittedCommunications, 
  withdrawCommunication,
  getReceivedCommunications
} from '@/lib/supabase/communications';
import { 
  Users, Link2, X, Plus, Clock, Globe, MapPin, Lock, User, History, 
  ChevronDown, ChevronUp, MessageCircle, Edit, Star, RotateCcw 
} from 'lucide-react';

interface ContentEntry {
  id: string;
  title: string;
  caption: string;
}

interface Draft {
  id: string;
  type: string;
  status: string;
  updated_at: string;
  content_entries: ContentEntry[];
}

interface SubscriptionData {
  currentPeriodStats: {
    subscriberCount: number;
    contentId: string;
  } | null;
  historicalStats: {
    period: string;
    season: string;
    year: number;
    subscriberCount: number;
    contentId: string;
  }[];
}

interface CollabData {
  id: string;
  title: string;
  type: 'chain' | 'theme' | 'narrative';
  is_private: boolean | string | number;
  participation_mode?: 'community' | 'local' | 'private';
  location?: string | null;
  participants: {
    name: string;
    role: string;
  }[];
  current_phase: number | null;
  total_phases: number | null;
  last_active: string;
  participantCount: number;
}

interface PastContribution {
  id: string;
  status: string;
  updated_at: string;
  periods: {
    id: string;
    name: string;
    season: string;
    year: number;
    end_date: string;
  };
  content_entries: ContentEntry[];
}

interface CurrentPeriod {
  id: string;
  name: string;
  season: string;
  year: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface CommunicationDraft {
  id: string;
  subject: string;
  status: string;
  updated_at: string;
  recipient_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface CommunicationSubmission {
  id: string;
  subject: string;
  status: string;
  is_selected: boolean;
  recipient_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
  periods: {
    season: string;
    year: number;
  };
}

interface ReceivedCommunication {
  id: string;
  subject: string;
  sender_id: string;
  is_selected: boolean;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

// Countdown timer component - Redesigned to be more compact and horizontal
const CountdownTimer = ({ endDate }: { endDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const endDateTime = new Date(endDate).getTime();
      const now = new Date().getTime();
      const difference = endDateTime - now;
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    
    calculateTimeLeft();
    const timerId = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timerId);
  }, [endDate]);
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-sm text-blue-600 font-medium mr-2">Submission Deadline:</span>
      <div className="flex items-center mr-1">
        <Clock size={14} className="text-blue-600 mr-1" />
      </div>
      <div className="flex space-x-2">
        <div className="flex items-center">
          <span className="font-bold text-blue-700">{timeLeft.days}</span>
          <span className="font-bold text-blue-700">d</span>
        </div>
        <div className="flex items-center">
          <span className="font-bold text-blue-700">{timeLeft.hours}</span>
          <span className="font-bold text-blue-700">h</span>
        </div>
      </div>
    </div>
  );
};

// Updated ActiveCollabCard component to handle new participation modes
const ActiveCollabCard = ({ collab, onLeave }: { collab: CollabData; onLeave: (id: string) => void }) => {
  const [showParticipants, setShowParticipants] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubmissionStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('collab_submissions')
          .select('status')
          .eq('collab_id', collab.id)
          .eq('contributor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (data) {
          setSubmissionStatus(data.status);
        }
      } catch (error) {
        console.error("Error fetching submission status:", error);
      }
    }
    
    fetchSubmissionStatus();
  }, [collab.id, supabase]);

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the click from navigating to the collab
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = () => {
    onLeave(collab.id);
    setShowLeaveConfirm(false);
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirm(false);
  };

  const handleCardClick = () => {
    router.push(`/collabs/${collab.id}/submit`);
  };

  // Type-safe version to determine if a collab is private (still needed for bg color)
  let isPrivate = false;
  let participationMode = collab.participation_mode || 'community';
  
  // First check explicit participation_mode
  if (collab.participation_mode === 'private') {
    isPrivate = true;
  }
  // Fall back to legacy is_private check if participation_mode not set
  else if (typeof collab.is_private === 'boolean') {
    isPrivate = collab.is_private;
  } else if (typeof collab.is_private === 'string') {
    isPrivate = collab.is_private === 'true' || collab.is_private === 't';
  } else if (typeof collab.is_private === 'number') {
    isPrivate = collab.is_private === 1;
  }

  // Get the appropriate background color and icon based on participation mode
  const getCardStyle = () => {
    if (collab.participation_mode === 'local') {
      return 'bg-amber-50/50 border-amber-100';
    } else if (isPrivate) {
      return 'bg-indigo-50/50 border-indigo-100';
    } else {
      return 'bg-green-50/50 border-green-100';
    }
  };

  const getModeIcon = () => {
    if (collab.participation_mode === 'local') {
      return <MapPin size={14} className="text-amber-500 mr-1" />;
    } else if (isPrivate) {
      return <Lock size={14} className="text-indigo-500 mr-1" />;
    } else {
      return <Globe size={14} className="text-green-500 mr-1" />;
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-4 ${getCardStyle()} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getModeIcon()}
          <h3 className="font-medium">{collab.title}</h3>
        </div>
        
        {/* Status badge */}
        {submissionStatus && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            submissionStatus === 'submitted' 
              ? 'bg-green-100 text-green-700' 
              : submissionStatus === 'published'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-yellow-100 text-yellow-700'
          }`}>
            {submissionStatus === 'submitted' 
              ? 'Submitted' 
              : submissionStatus === 'published'
                ? 'Published'
                : 'Draft'}
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Last active: {collab.last_active}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Show location for local collabs */}
          {collab.participation_mode === 'local' && (
            <div className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              {collab.location || "New York"}
            </div>
          )}
        
          <div 
            className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer relative"
            onClick={(e) => {
              e.stopPropagation(); // Prevent the click from navigating to the collab
              setShowParticipants(!showParticipants);
            }}
          >
            <Users size={14} className="text-gray-500" />
            {isPrivate ? (collab.participants ? collab.participants.length : 0) : collab.participantCount}
            
            {showParticipants && isPrivate && collab.participants && (
              <div className="absolute top-full mt-2 right-0 bg-white shadow-lg rounded-lg py-2 px-3 z-10 w-48">
                {collab.participants.map((p, i) => (
                  <div key={i} className="text-sm py-1 flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className="text-xs text-gray-500">{p.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Leave button - with stopPropagation to prevent navigation */}
          <button 
            onClick={handleLeaveClick}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Leave collab"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Leave confirmation dialog */}
      {showLeaveConfirm && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()} // Prevent clicks from reaching the card underneath
        >
          <div className="bg-white rounded-lg p-4 max-w-sm w-full shadow-lg">
            <h4 className="font-medium mb-2">Leave Collab</h4>
            <p className="text-sm text-gray-700 mb-4">Are you sure you want to leave this collab?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelLeave}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                No
              </button>
              <button
                onClick={handleConfirmLeave}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState('contribute');
  const [showPastContent, setShowPastContent] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    currentPeriodStats: null,
    historicalStats: []
  });
  const [collabs, setCollabs] = useState<{
    private: CollabData[];
    community: CollabData[];
    local: CollabData[];
  }>({ private: [], community: [], local: [] });
  const [pastContributions, setPastContributions] = useState<PastContribution[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [draftCommunications, setDraftCommunications] = useState<CommunicationDraft[]>([]);
  const [submittedCommunications, setSubmittedCommunications] = useState<CommunicationSubmission[]>([]);
  const [receivedCommunications, setReceivedCommunications] = useState<ReceivedCommunication[]>([]);
  const [loadingCommunications, setLoadingCommunications] = useState(false);

  // Function to handle leaving a collab
  const handleLeaveCollab = async (collabId: string) => {
    try {
      const result = await leaveCollab(collabId);
      if (result.success) {
        // Update the UI by removing the collab from all categories
        setCollabs(prev => {
          return {
            private: prev.private.filter(collab => collab.id !== collabId),
            community: prev.community.filter(collab => collab.id !== collabId),
            local: prev.local.filter(collab => collab.id !== collabId)
          };
        });
      } else {
        console.error("Error leaving collab:", result.error);
        // Optionally add error notification here
      }
    } catch (error) {
      console.error("Unexpected error leaving collab:", error);
      // Optionally add error notification here
    }
  };

  // Handle withdrawing a communication
  const handleWithdrawCommunication = async (commId: string) => {
    try {
      const result = await withdrawCommunication(commId);
      
      if (result.success) {
        // Remove the communication from submitted list
        setSubmittedCommunications(prev => 
          prev.filter(comm => comm.id !== commId)
        );
        
        // Add it back to drafts list
        if (result.communication) {
          const comm = result.communication;
          setDraftCommunications(prev => [
            {
              id: comm.id,
              subject: comm.subject,
              status: comm.status,
              updated_at: comm.updated_at,
              recipient_id: comm.recipient_id,
              profiles: comm.profiles
            },
            ...prev
          ]);
        }
        
        // Show success message (optional)
        alert("Communication successfully withdrawn");
      } else {
        alert(`Error withdrawing communication: ${result.error}`);
      }
    } catch (error) {
      console.error("Error withdrawing communication:", error);
      alert("An unexpected error occurred");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Using getCurrentPeriod from your content.ts file
        const periodResult = await getCurrentPeriod();
        
        setLoadingCommunications(true);
        
        // Load all data in parallel
        const [
          draftResult, 
          statsResult, 
          collabsResult, 
          pastResult,
          draftCommsResult,
          submittedCommsResult
        ] = await Promise.all([
          fetchCurrentPeriodDraft(),
          getSubscriptionStats(),
          getUserCollabs(),
          getPastContributions(),
          getDraftCommunications(),
          getSubmittedCommunications()
        ]);

        if (draftResult.success && draftResult.draft) {
          setCurrentDraft(draftResult.draft);
        }
        
        if (periodResult && periodResult.success && periodResult.period) {
          setCurrentPeriod(periodResult.period as CurrentPeriod);
        }
        
        setSubscriptionData(statsResult);
        
        // Handle the collabs result
        if (collabsResult) {
          // Ensure the collabsResult has all required properties
          const fullResult = {
            private: collabsResult.private || [],
            community: collabsResult.community || [],
            local: collabsResult.local || []
          };
          setCollabs(fullResult);
        }
        
        if (pastResult.success) {
          setPastContributions(pastResult.pastContent as unknown as PastContribution[]);
        }
        
        // Handle communications data
if (draftCommsResult.success && draftCommsResult.drafts) {
  // Convert data to match expected interface
  const typedDrafts = draftCommsResult.drafts.map(draft => ({
    id: draft.id,
    subject: draft.subject,
    status: draft.status,
    updated_at: draft.updated_at,
    recipient_id: draft.recipient_id,
    profiles: {
      first_name: draft.profiles && draft.profiles[0]?.first_name || '',
      last_name: draft.profiles && draft.profiles[0]?.last_name || ''
    }
  }));
  setDraftCommunications(typedDrafts);
}

if (submittedCommsResult.success && submittedCommsResult.submissions) {
  // Convert data to match expected interface
  const typedSubmissions = submittedCommsResult.submissions.map(submission => ({
    id: submission.id,
    subject: submission.subject,
    status: submission.status,
    is_selected: submission.is_selected || false,
    recipient_id: submission.recipient_id,
    profiles: {
      first_name: submission.profiles && submission.profiles[0]?.first_name || '',
      last_name: submission.profiles && submission.profiles[0]?.last_name || ''
    },
    periods: {
      season: submission.periods && submission.periods[0]?.season || '',
      year: submission.periods && submission.periods[0]?.year || 0
    }
  }));
  setSubmittedCommunications(typedSubmissions);
}
        
        setLoadingCommunications(false);
        
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setLoadingCommunications(false);
      }
    };
    
    loadData();
  }, []);
  
  useEffect(() => {
    // Add a condition here that will be false to disable loading
    const enableCuratorComms = false; // This disables loading without removing code
    if (activeTab === 'curate' && currentPeriod && enableCuratorComms) {
      const loadCuratorData = async () => {
        try {
          const receivedResult = await getReceivedCommunications(currentPeriod.id);
          if (receivedResult.success && receivedResult.received) {
            // Convert data to match expected interface
            const typedReceived = receivedResult.received.map(comm => ({
              id: comm.id,
              subject: comm.subject,
              sender_id: comm.sender_id,
              is_selected: comm.is_selected || false,
              profiles: {
                first_name: comm.profiles && comm.profiles[0]?.first_name || '',
                last_name: comm.profiles && comm.profiles[0]?.last_name || ''
              }
            }));
            setReceivedCommunications(typedReceived);
          }
        } catch (error) {
          console.error("Error loading curator communications data:", error);
        }
      };
      
      loadCuratorData();
    }
  }, [activeTab, currentPeriod]);  
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe && activeTab === 'contribute') {
      setActiveTab('curate');
    } else if (isRightSwipe && activeTab === 'curate') {
      setActiveTab('contribute');
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">online//offline</h1>
          
          {/* User menu with avatar */}
          <div className="relative group">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors">
              <User size={20} />
            </div>
            
            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <Link
                href="/profile"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <User size={16} />
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('contribute')}
              className={`pb-4 relative ${
                activeTab === 'contribute' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              Contribute
              {activeTab === 'contribute' && (
                <motion.div
                  layoutId="underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('curate')}
              className={`pb-4 relative ${
                activeTab === 'curate' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              Curate
              {activeTab === 'curate' && (
                <motion.div
                  layoutId="underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                />
              )}
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative overflow-hidden"
        >
          <motion.div
            animate={{ x: activeTab === 'contribute' ? 0 : '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`${activeTab === 'contribute' ? 'block' : 'hidden'}`}
          >
            {/* Contribute Tab Content */}
            <div className="space-y-6">
              {/* Current period view - always visible */}
              <div>
                {/* Countdown Timer - at the top of current view */}
                {currentPeriod?.end_date && (
                  <div className="flex justify-end mb-4">
                    <div className="bg-blue-50 rounded-full px-3 py-1">
                      <CountdownTimer endDate={currentPeriod.end_date} />
                    </div>
                  </div>
                )}
                
                {/* Contribute Section */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Contribute</h2>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
                      <span className="text-sm text-blue-600 font-medium">
                        {subscriptionData.currentPeriodStats?.subscriberCount || 0} Curators
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">
                      Share your creative work with the community. Submit photos, artwork, or full page spreads.
                    </p>
                    
                    {currentDraft ? (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-3">Current Draft</h3>
                        <Link 
                          href={`/submit?draft=${currentDraft.id}`}
                          className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">
                                {currentDraft.content_entries[0]?.title || 'Untitled Draft'}
                              </div>
                              <div className="text-sm text-gray-500">
                                Last edited: {new Date(currentDraft.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              currentDraft.status === 'submitted' 
                                ? 'bg-green-100 text-green-700' 
                                : currentDraft.status === 'published'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {currentDraft.status === 'submitted' 
                                ? 'Submitted for Publication' 
                                : currentDraft.status === 'published'
                                  ? 'Published'
                                  : 'Draft'}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-blue-600">
                            Continue editing
                          </div>
                        </Link>
                      </div>
                    ) : (
                      <Link 
                        href="/submit"
                        className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        New Submission
                      </Link>
                    )}

                    {/* Historical Stats - kept in the current view */}
                    {subscriptionData.historicalStats.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-lg font-medium mb-3">Submission History</h3>
                        <div className="space-y-3">
                          {subscriptionData.historicalStats.map((stat, index) => (
                            <div 
                              key={index}
                              className="bg-white border rounded-lg p-4"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{stat.period}</p>
                                  <p className="text-sm text-gray-500">
                                    Subscribers: {stat.subscriberCount}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Subtle History toggle */}
                    {pastContributions.length > 0 && (
                      <div className="mt-8 border-t pt-6">
                        <button
                          onClick={() => setShowPastContent(!showPastContent)}
                          className="flex items-center text-gray-500 hover:text-gray-700 text-sm group"
                        >
                          {showPastContent ? (
                            <ChevronUp size={16} className="mr-1 group-hover:text-blue-500 transition-colors" />
                          ) : (
                            <ChevronDown size={16} className="mr-1 group-hover:text-blue-500 transition-colors" />
                          )}
                          <History size={14} className="mr-1.5 text-gray-400" />
                          {showPastContent ? "Hide past contributions" : "View past contributions"}
                        </button>
                        
                        {/* Past Contributions - shown when toggled */}
                        {showPastContent && (
                          <div className="space-y-3 mt-4">
                            {pastContributions.map((content, index) => (
                              <div 
                                key={index}
                                className="bg-gray-50 border rounded-lg p-4 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">
                                      {content.content_entries?.[0]?.title || 'Untitled'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {content.periods?.season} {content.periods?.year}
                                    </p>
                                    {content.content_entries?.[0]?.caption && (
                                      <p className="text-sm text-gray-600 mt-2">
                                      {content.content_entries[0].caption}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <div className={`px-2 py-1 rounded-full text-xs ${
                                    content.status === 'submitted' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {content.status === 'submitted' 
                                      ? 'Submitted'
                                      : 'Published'}
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    Last updated: {new Date(content.updated_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            
              {/* Collab Section */}
              <Card className="p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Collaborate</h2>
                  <Link 
                    href="/collabs"
                    className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-800"
                  >
                    <Plus size={14} />
                    Browse Collabs
                  </Link>
                </div>
                
                <p className="text-gray-600 mb-6">
                  Participate in collaborative projects with other creators across various themes and formats.
                </p>
                
                {/* Private Collabs */}
                <div className="mb-6">
                  <h3 className="text-base font-medium uppercase text-gray-500 mb-3">Private</h3>
                  <div className="space-y-3">
                    {collabs.private?.length > 0 ? (
                      collabs.private.map(collab => (
                        <ActiveCollabCard 
                          key={collab.id} 
                          collab={collab} 
                          onLeave={handleLeaveCollab} 
                        />
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No private collabs yet</p>
                    )}
                  </div>
                </div>

                {/* Local Collabs */}
                {collabs.local?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base font-medium uppercase text-gray-500 mb-3">Local</h3>
                    <div className="space-y-3">
                      {collabs.local.map(collab => (
                        <ActiveCollabCard 
                          key={collab.id} 
                          collab={collab} 
                          onLeave={handleLeaveCollab} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Collabs */}
                <div>
                  <h3 className="text-base font-medium uppercase text-gray-500 mb-3">Community</h3>
                  <div className="space-y-3">
                    {collabs.community?.length > 0 ? (
                      collabs.community.map(collab => (
                        <ActiveCollabCard 
                          key={collab.id} 
                          collab={collab} 
                          onLeave={handleLeaveCollab} 
                        />
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No community collabs yet</p>
                    )}
                  </div>
                </div>
              </Card>
              
              {/* Communicate Card - Added as a card within the Contribute tab */}
              <Card className="p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Communications</h2>
                  <Link 
                    href="/communicate/new"
                    className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-800"
                  >
                    <Plus size={14} />
                    New Communication
                  </Link>
                </div>
                
                <p className="text-gray-600 mb-6">
                  Send private messages directly to curators. Selected messages may appear in their printed magazine.
                </p>
                
                {/* Draft Communications */}
                <div className="mb-6">
                  <h3 className="text-base font-medium mb-3">Drafts</h3>
                  <div className="space-y-3">
                    {loadingCommunications ? (
                      <p className="text-sm text-gray-500 py-4">Loading drafts...</p>
                    ) : draftCommunications.length > 0 ? (
                      draftCommunications.map(comm => (
                        <div 
                          key={comm.id}
                          className="bg-white border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/communicate/${comm.id}`)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{comm.subject}</p>
                              <p className="text-sm text-gray-500">
                                To: {comm.profiles.first_name} {comm.profiles.last_name}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Last edited: {new Date(comm.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                                Draft
                              </span>
                              <Edit size={14} className="text-gray-400" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-4">No draft communications</p>
                    )}
                  </div>
                </div>
                
                {/* Submitted Communications */}
                <div>
                  <h3 className="text-base font-medium mb-3">Submitted</h3>
                  <div className="space-y-3">
                    {loadingCommunications ? (
                      <p className="text-sm text-gray-500 py-4">Loading submissions...</p>
                    ) : submittedCommunications.length > 0 ? (
                      submittedCommunications.map(comm => (
                        <div 
                          key={comm.id}
                          className="bg-white border rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{comm.subject}</p>
                                {comm.is_selected && (
                                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                To: {comm.profiles.first_name} {comm.profiles.last_name}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {comm.periods.season} {comm.periods.year}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                Submitted
                              </span>
                              
                              {/* Withdraw button - only show if period is still active */}
                              {currentPeriod && new Date(currentPeriod.end_date) > new Date() && (
                                <button 
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleWithdrawCommunication(comm.id);
                                  }}
                                >
                                  <RotateCcw size={12} />
                                  Withdraw
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-4">No submitted communications</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>

        <motion.div
          animate={{ x: activeTab === 'curate' ? 0 : '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`${activeTab === 'curate' ? 'block' : 'hidden'}`}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Curate</h2>
            <p className="text-gray-600 mb-4">
              Create your personalized magazine by selecting content from our community of contributors.
            </p>
            <Link 
              href="/curate"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Start Curating
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  </div>
);
}