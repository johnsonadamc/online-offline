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
import { Users, Link2, X, Plus, Clock } from 'lucide-react';

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
  is_private: boolean | string | number; // Updated to allow multiple types
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

// Countdown timer component
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
      <div className="flex items-center mr-2">
        <Clock size={14} className="text-blue-600 mr-1" />
      </div>
      <div className="flex space-x-1">
        <div className="flex flex-col items-center">
          <span className="font-bold text-blue-700">{timeLeft.days}</span>
          <span className="text-xs text-blue-600">d</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-blue-700">{timeLeft.hours}</span>
          <span className="text-xs text-blue-600">h</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-blue-700">{timeLeft.minutes}</span>
          <span className="text-xs text-blue-600">m</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-blue-700">{timeLeft.seconds}</span>
          <span className="text-xs text-blue-600">s</span>
        </div>
      </div>
    </div>
  );
};

const ActiveCollabCard = ({ collab, onLeave }: { collab: CollabData; onLeave: (id: string) => void }) => {
  const [showParticipants, setShowParticipants] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleLeaveClick = () => {
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = () => {
    onLeave(collab.id);
    setShowLeaveConfirm(false);
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirm(false);
  };

  // Type-safe version to determine if a collab is private
  let isPrivate = false;
  
  if (typeof collab.is_private === 'boolean') {
    isPrivate = collab.is_private;
  } else if (typeof collab.is_private === 'string') {
    isPrivate = collab.is_private === 'true' || collab.is_private === 't';
  } else if (typeof collab.is_private === 'number') {
    isPrivate = collab.is_private === 1;
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${isPrivate ? 'bg-indigo-50/50 border-indigo-100' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isPrivate ? (
            <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Private</span>
          ) : (
            <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Community</span>
          )}
          <h3 className="font-medium">{collab.title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer relative"
            onMouseEnter={() => isPrivate && setShowParticipants(true)}
            onMouseLeave={() => setShowParticipants(false)}
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
          
          {/* Leave button */}
          <button 
            onClick={handleLeaveClick}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Leave collab"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 mt-1">
        Last active: {collab.last_active}
      </div>
      
      {/* Leave confirmation dialog */}
      {showLeaveConfirm && (
        <div className="mt-3 border-t pt-3">
          <p className="text-sm text-gray-700 mb-2">Are you sure you want to leave this collab?</p>
          <div className="flex gap-2 justify-end">
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
      )}
    </div>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState('contribute');
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    currentPeriodStats: null,
    historicalStats: []
  });
  const [collabs, setCollabs] = useState<{
    private: CollabData[];
    community: CollabData[];
  }>({ private: [], community: [] });
  const [pastContributions, setPastContributions] = useState<PastContribution[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Function to handle leaving a collab
  const handleLeaveCollab = async (collabId: string) => {
    try {
      const result = await leaveCollab(collabId);
      if (result.success) {
        // Update the UI by removing the collab
        setCollabs(prev => {
          return {
            private: prev.private.filter(collab => collab.id !== collabId),
            community: prev.community.filter(collab => collab.id !== collabId)
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

  useEffect(() => {
    const loadData = async () => {
      try {
        // Using getCurrentPeriod from your content.ts file
        const periodResult = await getCurrentPeriod();
        
        const [draftResult, statsResult, collabsResult, pastResult] = await Promise.all([
          fetchCurrentPeriodDraft(),
          getSubscriptionStats(),
          getUserCollabs(),
          getPastContributions()
        ]);

        if (draftResult.success && draftResult.draft) {
          setCurrentDraft(draftResult.draft);
        }
        
        if (periodResult && periodResult.success && periodResult.period) {
          setCurrentPeriod(periodResult.period as CurrentPeriod);
        }
        
        setSubscriptionData(statsResult);
        setCollabs(collabsResult);
        
        if (pastResult.success) {
          setPastContributions(pastResult.pastContent as unknown as PastContribution[]);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };
    loadData();
  }, []);
  
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
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
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
            <div className="space-y-8">
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
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium">Current Draft</h3>
                        {currentPeriod?.end_date && (
                          <div className="flex items-center bg-blue-50 rounded-full px-3 py-1">
                            <span className="text-xs text-blue-600 mr-1">Deadline:</span>
                            <CountdownTimer endDate={currentPeriod.end_date} />
                          </div>
                        )}
                      </div>
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
                    <div className="flex items-center justify-between">
                      <Link 
                        href="/submit"
                        className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        New Submission
                      </Link>
                      
                      {currentPeriod?.end_date && (
                        <div className="flex items-center bg-blue-50 rounded-full px-3 py-1">
                          <span className="text-xs text-blue-600 mr-1">Deadline:</span>
                          <CountdownTimer endDate={currentPeriod.end_date} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Historical Stats */}
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

                  {/* Past Contributions */}
                  {pastContributions.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-medium mb-3">Past Contributions</h3>
                      <div className="space-y-3">
                        {pastContributions.map((content, index) => (
                          <div 
                            key={index}
                            className="bg-white border rounded-lg p-4"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">
                                  {content.content_entries?.[0]?.title || 'Untitled'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {content.periods?.season} {content.periods?.year}
                                </p>
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs ${
                                content.status === 'submitted' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {content.status === 'submitted' 
                                  ? 'Submitted'
                                  : 'Published'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Collabs Section - Now at the same level as Contribute */}
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Collabs</h2>
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
                
                <div className="mb-6">
                  <h3 className="text-base font-medium uppercase text-gray-500 mb-3">Private Collabs</h3>
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
                
                <div>
                  <h3 className="text-base font-medium uppercase text-gray-500 mb-3">Community Collabs</h3>
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