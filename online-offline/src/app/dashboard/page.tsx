"use client";

import React, { useState, useEffect, ReactElement } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Import all needed functions from your existing codebase
import { 
  fetchCurrentPeriodDraft, 
  getCurrentPeriod 
} from '@/lib/supabase/content';
import { 
  getUserCollabs, 
  leaveCollab, 
} from '@/lib/supabase/collabs';
import { 
  getDraftCommunications, 
  getSubmittedCommunications, 
  withdrawCommunication 
} from '@/lib/supabase/communications';

import { 
  Camera, BookOpen, UsersRound, MessageCircle, Clock, 
  Image, ChevronRight, Palette, Pen, Music, 
  User, CalendarDays, X, PlusCircle, RotateCcw, 
  MapPin, Globe, Lock,
  Edit
} from 'lucide-react';

// Define interfaces for our data types
interface ContentSubmission {
  id: string;
  title: string;
  status: string;
  period: string;
  date: string;
  type: string;
  imageCount: number;
}

interface ActiveCollab {
  id: string;
  title: string;
  mode: string;
  location?: string | null;
  participants: number;
  type: string;
  status?: string;
}

interface CollabData {
  id: string;
  title: string;
  type?: string;
  is_private?: boolean;
  participation_mode?: string;
  location?: string | null;
  participants?: { name: string; role: string }[];
  participantCount?: number;
  status?: string;
  metadata?: {
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown; // Add index signature for flexibility
}


interface Communication {
  id: string;
  subject: string;
  status: string;
  recipient: string;
  date: string;
}

interface Activity {
  id: string;
  type: string;
  user: string;
  action: string;
  time: string;
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

interface CommunicationProfile {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

interface ConfirmActionState {
  action: string;
  id: string;
}
export default function Dashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'contribute' | 'curate'>('contribute');
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>({ action: '', id: '' });
  
  // State to track which communication we might want to delete
  const [deleteCommId, setDeleteCommId] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  
  // State to track which content we might want to delete
  const [deleteContentId, setDeleteContentId] = useState<string>('');
  const [showDeleteContentConfirm, setShowDeleteContentConfirm] = useState<boolean>(false);
  
  // Data states
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [contentSubmission, setContentSubmission] = useState<ContentSubmission | null>(null);
  const [activeCollabs, setActiveCollabs] = useState<ActiveCollab[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // Handle confirmation actions
  const showConfirmDialog = (action: string, id: string) => {
    setConfirmAction({ action, id });
    setShowConfirm(true);
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmAction.action === 'leave') {
        // Call the leaveCollab function to handle leaving the collaboration
        const result = await leaveCollab(confirmAction.id);
        if (result.success) {
          // Update the UI by removing the collab
          setActiveCollabs(prev => prev.filter(collab => collab.id !== confirmAction.id));
        } else {
          console.error("Error leaving collab:", result.error);
        }
      } else if (confirmAction.action === 'withdraw') {
        // Handle withdraw communication logic
        const result = await withdrawCommunication(confirmAction.id);
        if (result.success) {
          // Update communications state
          setCommunications(prev => {
            return prev.map(c => c.id === confirmAction.id 
              ? { ...c, status: 'draft' } 
              : c
            );
          });
        }
      }
      
      setShowConfirm(false);
    } catch (error) {
      console.error("Error processing action:", error);
      setShowConfirm(false);
    }
  };
  
  // Add function to handle communication deletion
  const handleDeleteCommunication = async () => {
    try {
      // Here you would add your actual deletion logic
      // For example: await deleteCommunication(deleteCommId);
      
      // For now, we'll just update the UI by removing it from state
      setCommunications(prev => prev.filter(c => c.id !== deleteCommId));
      
      // Reset the delete confirmation state
      setShowDeleteConfirm(false);
      setDeleteCommId('');
      
    } catch (error) {
      console.error("Error deleting communication:", error);
      setShowDeleteConfirm(false);
    }
  };
  
  // Add function to handle content deletion
  const handleDeleteContent = async () => {
    try {
      // Here you would add your actual deletion logic
      // For example: await deleteContent(deleteContentId);
      // Using the variable to fix the linting error
      console.log(`Deleting content with ID: ${deleteContentId}`);
      
      // For now, we'll just update the UI
      setContentSubmission(null);
      
      // Reset the delete confirmation state
      setShowDeleteContentConfirm(false);
      setDeleteContentId('');
      
    } catch (error) {
      console.error("Error deleting content:", error);
      setShowDeleteContentConfirm(false);
    }
  };
  // Status badges - now only render for 'submitted' or 'published'
  const renderStatusBadge = (status: string) => {
    // If status is 'draft', don't render any badge
    if (status === 'draft') return null;
    
    const statusStyles: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-600 border border-blue-200',
      published: 'bg-green-100 text-green-600 border border-green-200'
    };
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded-sm ${statusStyles[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };
  
  // Content type icons
  const renderContentTypeIcon = (type: string): ReactElement => {
    const icons: Record<string, ReactElement> = {
      photo: <Camera size={16} />,
      art: <Palette size={16} />,
      poetry: <Pen size={16} />,
      essay: <BookOpen size={16} />,
      music: <Music size={16} />
    };
    
    const iconBgColors: Record<string, string> = {
      photo: 'bg-blue-50 text-blue-500',
      art: 'bg-indigo-50 text-indigo-500',
      poetry: 'bg-purple-50 text-purple-500',
      essay: 'bg-blue-50 text-blue-500',
      music: 'bg-blue-50 text-blue-500'
    };
    
    return (
      <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${iconBgColors[type] || 'bg-gray-100 text-gray-700'}`}>
        {icons[type] || (
          <Image size={16} />
        )}
      </div>
    );
  };

  // Helper to get the collaboration type
  const getCollabType = (type: string | undefined): string => {
    if (!type || type === 'regular' || type === 'fullSpread') return 'chain';
    return type;
  };
  
  // Helper to extract recipient name
  const getRecipientName = (profiles: CommunicationProfile | CommunicationProfile[] | undefined): string => {
    if (!profiles) return 'Unknown Recipient';
    
    if (Array.isArray(profiles)) {
      if (profiles.length > 0) {
        const profile = profiles[0];
        return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown';
      }
      return 'Unknown Recipient';
    }
    
    // Now TypeScript knows profiles is a CommunicationProfile object, not an array
    return `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim() || 'Unknown';
  };
  

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Get current period
        const periodResult = await getCurrentPeriod();
        if (periodResult && periodResult.success && periodResult.period) {
          setCurrentPeriod(periodResult.period as Period);
        }
        
        // Get current draft or submitted content
        const draftResult = await fetchCurrentPeriodDraft();
        if (draftResult.success && draftResult.draft) {
          const draft = draftResult.draft;
          
          // First try to get page_title (preferred), then fall back to entry title
          let title = draft.page_title || '';
          
          // If no page_title, try to get title from the first content entry
          if (!title && draft.content_entries && draft.content_entries.length > 0) {
            title = draft.content_entries[0].title || '';
          }
          
          // If still no title, use 'Untitled'
          if (!title) {
            title = 'Untitled';
          }
              
          setContentSubmission({
            id: draft.id,
            title: title,
            status: draft.status,
            period: periodResult?.period?.name || '',
            date: new Date(draft.updated_at).toLocaleDateString(),
            type: draft.type || 'photo',
            imageCount: (draft.content_entries || []).length
          });
        }
        
        // Get user's collabs
        const collabsResult = await getUserCollabs();
        if (collabsResult) {
          // Combined all types of collabs
          const combined = [
            ...(collabsResult.private || []),
            ...(collabsResult.community || []),
            ...(collabsResult.local || [])
          ];
          
          
          // Format for display
          const formattedCollabs = combined.map((collab) => {
            // Explicitly assert the type
            const collabData = collab as unknown as CollabData;
            
            // Extract status with type-safe checks
            let status = 'draft';
            
            // Use optional chaining to safely access nested properties
            if (collabData.status) {
              status = collabData.status;
            } else if (collabData.metadata?.status) {
              status = collabData.metadata.status as string;
            }
            
            return {
              id: collabData.id,
              title: collabData.title,
              mode: collabData.participation_mode || (collabData.is_private ? 'private' : 'community'),
              location: collabData.location,
              participants: collabData.participantCount || 0,
              type: getCollabType(collabData.type),
              status: status
            };
          });
          
          setActiveCollabs(formattedCollabs);
        }
        
        // Get communications
        const [draftComms, submittedComms] = await Promise.all([
          getDraftCommunications(),
          getSubmittedCommunications()
        ]);
        
        // Combine communications
        const allComms: Communication[] = [];
        
        if (draftComms.success && draftComms.drafts) {
          allComms.push(...draftComms.drafts.map(comm => ({
            id: comm.id,
            subject: comm.subject || 'No Subject',
            status: 'draft',
            recipient: getRecipientName(comm.profiles),
            date: new Date(comm.updated_at).toLocaleDateString()
          })));
        }
        
        if (submittedComms.success && submittedComms.submissions) {
          allComms.push(...submittedComms.submissions.map(comm => ({
            id: comm.id,
            subject: comm.subject || 'No Subject',
            status: 'submitted',
            recipient: getRecipientName(comm.profiles),
            date: new Date(comm.created_at || Date.now()).toLocaleDateString()
          })));
        }
        
        setCommunications(allComms);
        
        // Mock recent activity - we would implement this with actual data
        setRecentActivity([
          { id: '1', type: 'content', user: 'Recent Curator', action: 'viewed your content', time: '2 hours ago' },
          { id: '2', type: 'collab', user: 'Collaboration Member', action: 'joined your collaboration', time: 'Yesterday' }
        ]);

        // Fetch avatar
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
            
          if (profileData?.avatar_url) {
            setAvatarUrl(profileData.avatar_url);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  // Confirmation dialog component
  const ConfirmationDialog = () => {
    if (!showConfirm) return null;
    
    const getConfirmationText = () => {
      switch (confirmAction.action) {
        case 'leave':
          return 'Are you sure you want to leave this collaboration?';
        case 'withdraw':
          return 'Are you sure you want to withdraw this communication?';
        default:
          return 'Are you sure you want to proceed?';
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-sm max-w-sm w-full p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-sm bg-amber-100 flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-medium">Confirm Action</h3>
          </div>
          <p className="text-gray-700 mb-6">{getConfirmationText()}</p>
          <div className="flex justify-end gap-3">
            <button 
              className="px-4 py-2 border border-gray-200 rounded-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
              onClick={handleConfirmAction}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Delete Communication confirmation dialog
  const DeleteConfirmationDialog = () => {
    if (!showDeleteConfirm) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-sm max-w-sm w-full p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-sm bg-red-100 flex items-center justify-center">
              <X size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-medium">Delete Communication</h3>
          </div>
          <p className="text-gray-700 mb-6">Are you sure you want to delete this draft communication? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button 
              className="px-4 py-2 border border-gray-200 rounded-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-red-500 text-white rounded-sm hover:bg-red-600"
              onClick={handleDeleteCommunication}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Delete Content confirmation dialog
  const DeleteContentConfirmationDialog = () => {
    if (!showDeleteContentConfirm) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-sm max-w-sm w-full p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-sm bg-red-100 flex items-center justify-center">
              <X size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-medium">Delete Content</h3>
          </div>
          <p className="text-gray-700 mb-6">Are you sure you want to delete this content? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button 
              className="px-4 py-2 border border-gray-200 rounded-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setShowDeleteContentConfirm(false)}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-red-500 text-white rounded-sm hover:bg-red-600"
              onClick={handleDeleteContent}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white">
      {/* Header with text-based logo */}
      <header className="px-5 py-5 flex items-center justify-between bg-white border-b border-gray-100">
        <div className="h-6 flex items-center">
          {/* Text-based logo - keeping the orange/yellow */}
          <span className="text-lg font-normal">
            <span className="text-[#F05A28]">online</span>
            <span className="text-[#F5A93F]">{'//offline'}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center cursor-pointer group relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-gray-600" />
            )}
          </Link>
        </div>
      </header>
      
      {/* Period Info */}
      <div className="px-6 py-4 bg-blue-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-sm bg-white border border-blue-100">
            <CalendarDays size={18} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-base font-normal text-gray-900">{currentPeriod?.name || 'Current Period'}</h2>
            {currentPeriod?.end_date && (
              <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                <Clock size={12} className="text-blue-500" />
                <CountdownTimer endDate={currentPeriod.end_date} />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-100">
        <div className="flex px-6">
          <button
            className={`py-4 text-sm font-normal border-b-2 transition-colors ${
              activeTab === 'contribute'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('contribute')}
          >
            Contribute
          </button>
          <button
            className={`py-4 ml-8 text-sm font-normal border-b-2 transition-colors ${
              activeTab === 'curate'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('curate')}
          >
            Curate
          </button>
        </div>
      </div>
      
      {/* Content area */}
      <div className="px-6 py-6 pb-24">
        {activeTab === 'contribute' ? (
          <div className="space-y-8">
            {/* Quick Actions (without "Create New" heading) */}
            <div>
              <div className="grid grid-cols-3 gap-3">
                {contentSubmission ? (
                  // If we have content, this button should edit existing draft
                  <Link 
                    href={`/submit?draft=${contentSubmission.id}`} 
                    className="aspect-square bg-white border border-gray-200 rounded-sm p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      <Camera size={20} className="text-gray-700 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <span className="text-xs font-normal text-gray-700 group-hover:text-blue-500 transition-colors">Content</span>
                  </Link>
                ) : (
                  // If no content, this button should create new
                  <Link 
                    href="/submit" 
                    className="aspect-square bg-white border border-gray-200 rounded-sm p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      <Camera size={20} className="text-gray-700 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <span className="text-xs font-normal text-gray-700 group-hover:text-blue-500 transition-colors">Content</span>
                  </Link>
                )}
                <Link href="/collabs" className="aspect-square bg-white border border-gray-200 rounded-sm p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <UsersRound size={20} className="text-gray-700 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <span className="text-xs font-normal text-gray-700 group-hover:text-blue-500 transition-colors">Collaboration</span>
                </Link>
                <Link href="/communicate/new" className="aspect-square bg-white border border-gray-200 rounded-sm p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <MessageCircle size={20} className="text-gray-700 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <span className="text-xs font-normal text-gray-700 group-hover:text-blue-500 transition-colors">Communication</span>
                </Link>
              </div>
            </div>
            {/* Content Submission - Single Card */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-normal text-gray-400">Content</h2>
              </div>
              
              {contentSubmission ? (
                <Link 
                href={`/submit?draft=${contentSubmission.id}`}
                className={`p-3 border rounded-sm transition-colors ${
                  contentSubmission.status === 'submitted'
                    ? 'border-blue-200 hover:border-blue-300 bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200'
                } block cursor-pointer`}
              >
                <div className="flex items-center gap-3">
                  {renderContentTypeIcon(contentSubmission.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-normal text-gray-900 truncate">{contentSubmission.title}</h3>
                      {renderStatusBadge(contentSubmission.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{contentSubmission.period}</span>
                      <span>•</span>
                      <span>{contentSubmission.imageCount} image{contentSubmission.imageCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <button 
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteContentId(contentSubmission.id);
                      setShowDeleteContentConfirm(true);
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </Link>
            ) : (
              <div className="py-12 border border-gray-100 rounded-sm flex flex-col items-center justify-center">
                <div className="w-12 h-12 border border-gray-200 rounded-sm flex items-center justify-center mb-3">
                    <Camera size={24} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-3">No content submission for current period</p>
                <Link href="/submit" className="px-4 py-2 bg-blue-500 text-white text-sm rounded-sm">
                  Provide Content
                </Link>
              </div>
            )}
          </div>
          {/* Active Collaborations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-normal text-gray-400">Collaborations</h2>
              {activeCollabs.length > 0 && (
                <Link href="/collabs" className="text-xs text-blue-500 font-normal flex items-center gap-0.5 hover:underline">
                  <PlusCircle size={12} className="mr-0.5" />
                  New Collaboration
                </Link>
              )}
            </div>
            
            <div className="space-y-2">
              {activeCollabs.map(collab => (
                <div 
                  key={collab.id} 
                  className="p-3 border rounded-sm hover:border-gray-200 transition-colors hover:bg-blue-50 cursor-pointer"
                  onClick={() => router.push(`/collabs/${collab.id}/submit`)}
                >
                  <div className="flex items-center gap-3">
                    {collab.mode === 'local' ? (
                      <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-green-50 text-green-500">
                        <MapPin size={16} />
                      </div>
                    ) : collab.mode === 'private' ? (
                      <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-purple-50 text-purple-500">
                        <Lock size={16} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-blue-50 text-blue-500">
                        <Globe size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-normal text-gray-900 truncate">{collab.title}</h3>
                        {collab.status === 'submitted' && (
                          <span className="text-xs px-2 py-0.5 rounded-sm bg-blue-100 text-blue-600 border border-blue-200">
                            submitted
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {collab.participants} participant{collab.participants !== 1 ? 's' : ''}
                        </span>
                        {collab.mode === 'local' && collab.location && (
                          <span className="text-xs text-gray-500">• {collab.location}</span>
                        )}
                      </div>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirmDialog('leave', collab.id);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
              
              {activeCollabs.length === 0 && (
                <div className="py-12 border border-gray-100 rounded-sm flex flex-col items-center justify-center">
                 <div className="w-12 h-12 border border-gray-200 rounded-sm flex items-center justify-center mb-3">
                    <UsersRound size={24} className="text-gray-400" />
                </div>
                  <p className="text-sm text-gray-500 mb-3">No active collaborations</p>
                  <Link href="/collabs" className="px-4 py-2 bg-blue-500 text-white text-sm rounded-sm">
                    Join Collaboration
                  </Link>
                </div>
              )}
            </div>
          </div>
          {/* Communications */}
          <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-normal text-gray-400">Communications</h2>
                {communications.length > 0 && (
                  <Link href="/communicate/new" className="text-xs text-blue-500 font-normal flex items-center gap-0.5 hover:underline">
                    <PlusCircle size={12} className="mr-0.5" />
                    New Communication
                  </Link>
                )}
              </div>
              
              <div className="space-y-2">
                {communications.map(comm => (
                  <Link
                    key={comm.id}
                    href={`/communicate/${comm.id}`}
                    className={`p-3 border rounded-sm transition-colors ${
                      comm.status === 'submitted'
                        ? 'border-blue-200 hover:border-blue-300 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200'
                    } block cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-amber-50 text-amber-500">
                        <MessageCircle size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-normal text-gray-900 truncate">{comm.subject}</h3>
                          {renderStatusBadge(comm.status)}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>To: {comm.recipient}</span>
                            <span>•</span>
                            <span>{comm.date}</span>
                          </div>
                          
                          {comm.status === 'submitted' && (
                            <button 
                              className="text-blue-500 hover:text-blue-600 text-xs flex items-center gap-0.5"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showConfirmDialog('withdraw', comm.id);
                              }}
                            >
                              <RotateCcw size={12} />
                              Withdraw
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Replace chevron with X for draft communications */}
                      {comm.status === 'draft' ? (
                        <button 
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteCommId(comm.id);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500">
                          <ChevronRight size={16} />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
                
                {communications.length === 0 && (
                  <div className="py-12 border border-gray-100 rounded-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border border-gray-200 rounded-sm flex items-center justify-center mb-3">
                      <MessageCircle size={24} className="text-gray-400" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-gray-500 mb-3">No communications yet</p>
                    <Link href="/communicate/new" className="px-4 py-2 bg-blue-500 text-white text-sm rounded-sm">
                      Issue Communication
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Curation Actions */}
            <div className="space-y-2">
              <h2 className="text-sm font-normal text-gray-400 mb-3">Actions</h2>
              
              <Link href="/curate" className="p-3 border border-gray-100 rounded-sm hover:border-blue-200 transition-colors hover:bg-blue-50 group block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-gray-100 rounded-sm flex items-center justify-center group-hover:border-blue-200 group-hover:bg-white transition-colors">
                    <Edit size={16} className="text-gray-700 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-normal text-gray-900 group-hover:text-blue-500 transition-colors">Curate Your Magazine</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Select content for your print magazine</p>
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            </div>
            
            {/* Recent Activity */}
            <div className="space-y-2">
              <h2 className="text-sm font-normal text-gray-400 mb-3">Recent Activity</h2>
              
              {recentActivity.map((activity, index) => (
                <div key={index} className="p-3 border border-gray-100 rounded-sm hover:border-gray-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-sm bg-blue-50 flex-shrink-0 flex items-center justify-center">
                      <Camera size={14} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{activity.user}</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {recentActivity.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Confirmation Dialogs */}
      <ConfirmationDialog />
      <DeleteConfirmationDialog />
      <DeleteContentConfirmationDialog />
    </div>
  );
}

// Countdown timer component
const CountdownTimer = ({ endDate }: { endDate: string }) => {
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number }>({ days: 0, hours: 0 });
  
    useEffect(() => {
      const calculateTimeLeft = () => {
        const endDateTime = new Date(endDate).getTime();
        const now = new Date().getTime();
        const difference = endDateTime - now;
        
        if (difference > 0) {
          setTimeLeft({
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          });
        } else {
          setTimeLeft({ days: 0, hours: 0 });
        }
      };
      
      calculateTimeLeft();
      const timerId = setInterval(calculateTimeLeft, 60000); // Update every minute
      
      return () => clearInterval(timerId);
    }, [endDate]);
  
    return (
      <span>{timeLeft.days}d {timeLeft.hours}h remaining</span>
    );
  };

