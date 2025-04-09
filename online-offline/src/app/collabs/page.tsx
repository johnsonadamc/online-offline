'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users,
  Clock, 
  X,
  Search,
  Check,
  ArrowLeft,
  Globe,
  MapPin,
  Lock,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define interfaces for type safety
interface CollabTemplate {
  id: string;
  name: string;
  display_text: string;
  type: 'chain' | 'theme' | 'narrative' | string;
  participant_count?: number;
  tags?: string[];
  phases?: number;
  duration?: string;
  instructions?: string;
  internal_reference?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  connection_rules?: Record<string, unknown>;
  communityParticipantCount?: number;
  localParticipantCount?: number;
}

interface User {
  id: string;
  name: string;
  bio: string;
  avatar: string;
}

interface CurrentPeriod {
  id: string;
  season: string;
  year: number;
}

type ParticipationMode = 'community' | 'local' | 'private';

type ErrorState = {
  message: string;
  isVisible: boolean;
};

export default function CollabsLibrary() {
  const router = useRouter();
  const [availablePrompts, setAvailablePrompts] = useState<CollabTemplate[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedCollabTitle, setSelectedCollabTitle] = useState('');
  const [selectedCollabId, setSelectedCollabId] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState>({ message: '', isVisible: false });
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod>({
    id: '',
    season: 'Spring',
    year: 2025
  });
  
  // Sample users for search results - in production this would come from the database
  const searchResults: User[] = [
    { id: '1', name: 'Sarah Chen', bio: 'Photographer | Urban Documentation', avatar: '/api/placeholder/32/32' },
    { id: '2', name: 'Alex Kim', bio: 'Writer | Cultural Essays', avatar: '/api/placeholder/32/32' },
    { id: '3', name: 'Maria Garcia', bio: 'Visual Artist | Mixed Media', avatar: '/api/placeholder/32/32' },
    { id: '4', name: 'James Liu', bio: 'Street Photographer | Documentary', avatar: '/api/placeholder/32/32' },
    { id: '5', name: 'Maya Patel', bio: 'Illustrator | Digital Art', avatar: '/api/placeholder/32/32' }
  ];

  const showError = (message: string) => {
    setError({ message, isVisible: true });
    setTimeout(() => {
      setError(prev => ({ ...prev, isVisible: false }));
    }, 5000);
  };
  
  // Use callback to prevent recreation on every render
  const loadData = useCallback(async () => {
    const supabase = createClientComponentClient();
    setLoading(true);
    
    try {
      // 1. Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Auth error:", JSON.stringify(userError));
        throw new Error(userError.message || "Authentication error");
      }
      
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      // 2. Get the current active period
      const { data: activePeriod, error: periodError } = await supabase
        .from('periods')
        .select('id, name, season, year')
        .eq('is_active', true)
        .order('end_date', { ascending: false })
        .limit(1)
        .single();
      
      if (periodError) {
        console.error("Period error:", JSON.stringify(periodError));
        throw new Error(`Failed to fetch active period: ${periodError.message}`);
      }
      
      if (!activePeriod) {
        throw new Error('No active period found');
      }
      
      setCurrentPeriod({
        id: activePeriod.id,
        season: activePeriod.season,
        year: activePeriod.year
      });

      // 3. Get all the user's active collaborations
      const { data: activeParticipations, error: participationsError } = await supabase
        .from('collab_participants')
        .select('collab_id')
        .eq('profile_id', user.id)
        .eq('status', 'active');
      
      if (participationsError) {
        console.error("Participations error:", JSON.stringify(participationsError));
        throw new Error(`Failed to fetch active participations: ${participationsError.message}`);
      }
      
      // Get the collab IDs
      const activeCollabIds = activeParticipations?.map(p => p.collab_id) || [];
      
      // Get metadata for these collabs to extract template IDs
      let activeTemplateIds: string[] = [];
      
      if (activeCollabIds.length > 0) {
        const { data: collabs, error: collabsError } = await supabase
          .from('collabs')
          .select('metadata')
          .in('id', activeCollabIds);
        
        if (collabsError) {
          console.error("Collabs error:", JSON.stringify(collabsError));
          throw new Error(`Failed to fetch collab metadata: ${collabsError.message}`);
        }
        
        if (collabs && collabs.length > 0) {
          activeTemplateIds = collabs
            .map(collab => {
              if (collab.metadata && typeof collab.metadata === 'object' && 'template_id' in collab.metadata) {
                return collab.metadata.template_id as string;
              }
              return null;
            })
            .filter((id): id is string => id !== null);
        }
      }

      // 4. Get all templates for this period
      const { data: periodTemplates, error: periodTemplatesError } = await supabase
        .from('period_templates')
        .select('template_id')
        .eq('period_id', activePeriod.id);
      
      if (periodTemplatesError) {
        console.error("Period templates error:", JSON.stringify(periodTemplatesError));
        throw new Error(`Failed to fetch period templates: ${periodTemplatesError.message}`);
      }
      
      const periodTemplateIds = periodTemplates?.map(pt => pt.template_id) || [];
      
      // 5. Get full details of all templates for this period
      if (periodTemplateIds.length === 0) {
        setAvailablePrompts([]);
        setLoading(false);
        return;
      }
      
      const { data: allTemplates, error: templatesError } = await supabase
        .from('collab_templates')
        .select('*')
        .in('id', periodTemplateIds);
      
      if (templatesError) {
        console.error("Templates error:", JSON.stringify(templatesError));
        throw new Error(`Failed to fetch templates: ${templatesError.message}`);
      }
      
      if (!allTemplates) {
        throw new Error('No templates found');
      }
      
      // Filter out templates that the user has already joined
      const filteredTemplates = allTemplates.filter(template => 
        !activeTemplateIds.includes(template.id)
      );
      
      // Default type to 'theme' if not set
      const processedTemplates = filteredTemplates.map(template => ({
        ...template,
        type: template.type || 'theme'
      }));
      
      // 6. For each template, get the participant counts for community and local
      const templatesWithCounts = await Promise.all(
        processedTemplates.map(async (template) => {
          try {
            // Get all collabs for this period
            const { data: collabsData, error: collabsError } = await supabase
              .from('collabs')
              .select('id, participation_mode, location, metadata')
              .eq('period_id', activePeriod.id);
              
            if (collabsError) {
              console.error("Collabs fetch error:", JSON.stringify(collabsError));
              template.communityParticipantCount = 0;
              template.localParticipantCount = 0;
              return template;
            }
            
            if (!collabsData || collabsData.length === 0) {
              template.communityParticipantCount = 0;
              template.localParticipantCount = 0;
              return template;
            }
            
            // Filter to find collabs with this template ID
            const matchingCollabs = collabsData.filter(collab => {
              if (!collab.metadata || typeof collab.metadata !== 'object') return false;
              return 'template_id' in collab.metadata && collab.metadata.template_id === template.id;
            });
            
            if (matchingCollabs.length === 0) {
              template.communityParticipantCount = 0;
              template.localParticipantCount = 0;
              return template;
            }
            
            // Get IDs by mode
            const communityIds = matchingCollabs
              .filter(collab => collab.participation_mode === 'community' || collab.participation_mode === 'local')
              .map(collab => collab.id);
              
            const localIds = matchingCollabs
              .filter(collab => collab.participation_mode === 'local')
              .map(collab => collab.id);
            
            // Get participant counts
            if (communityIds.length > 0) {
              const { count, error: countError } = await supabase
                .from('collab_participants')
                .select('*', { count: 'exact', head: true })
                .in('collab_id', communityIds)
                .eq('status', 'active');
                
              if (countError) {
                console.error("Community count error:", JSON.stringify(countError));
                template.communityParticipantCount = 0;
              } else {
                template.communityParticipantCount = count || 0;
              }
            } else {
              template.communityParticipantCount = 0;
            }
            
            // Get local participants count
            if (localIds.length > 0) {
              const { count, error: countError } = await supabase
                .from('collab_participants')
                .select('*', { count: 'exact', head: true })
                .in('collab_id', localIds)
                .eq('status', 'active');
                
              if (countError) {
                console.error("Local count error:", JSON.stringify(countError));
                template.localParticipantCount = 0;
              } else {
                template.localParticipantCount = count || 0;
              }
            } else {
              template.localParticipantCount = 0;
            }
            
            return template;
          } catch (err) {
            console.error("Template count error:", err);
            template.communityParticipantCount = 0;
            template.localParticipantCount = 0;
            return template;
          }
        })
      );
      
      setAvailablePrompts(templatesWithCounts);
    } catch (err) {
      console.error("Load data error:", err);
      showError(err instanceof Error ? err.message : "Failed to load collaboration data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
    // loadData is included in the dependency array as it's wrapped in useCallback
  }, [loadData]);

  const handleJoinClick = async (collabId: string, title: string, mode: ParticipationMode) => {
    try {
      if (mode === 'private') {
        // For private mode, open the invite dialog
        setSelectedCollabId(collabId);
        setSelectedCollabTitle(title);
        setShowInviteDialog(true);
        return;
      }
      
      // Find the template in available prompts
      const template = availablePrompts.find(p => p.id === collabId);
      if (!template) {
        showError('Error: Template not found');
        return;
      }
      
      // Handle joining directly with Supabase
      const supabase = createClientComponentClient();
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("User error:", JSON.stringify(userError));
        throw new Error(userError.message || "Authentication error");
      }
      
      if (!user) {
        showError('You must be logged in to join a collaboration');
        return;
      }
      
      // First, create the collab
      const { data: collab, error: collabError } = await supabase
        .from('collabs')
        .insert({
          title: template.name,
          description: template.display_text,
          type: template.type || 'theme',
          is_private: false,
          participation_mode: mode,
          location: mode === 'local' ? "San Francisco" : null,
          created_by: user.id,
          total_phases: template.phases || null,
          current_phase: 1,
          metadata: {
            template_id: template.id,
            participation_mode: mode,
            location: mode === 'local' ? "San Francisco" : null
          }
        })
        .select()
        .single();
      
      if (collabError) {
        console.error("Collab create error:", JSON.stringify(collabError));
        throw new Error(`Could not create collaboration: ${collabError.message}`);
      }
      
      // Now add the user as a participant
      const { error: participantError } = await supabase
        .from('collab_participants')
        .insert({
          profile_id: user.id,
          collab_id: collab.id,
          role: 'member',
          status: 'active',
          participation_mode: mode,
          location: mode === 'local' ? "San Francisco" : null
        });
      
      if (participantError) {
        console.error("Participant error:", JSON.stringify(participantError));
        throw new Error(`Could not join collaboration: ${participantError.message}`);
      }
      
      // Update UI immediately
      setAvailablePrompts(prev => prev.filter(c => c.id !== collabId));
      
      // Success message and redirect
      alert("You have successfully joined the " + title + " collaboration in " + mode + " mode.");
      router.push('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not join the collaboration");
    }
  };

  const createPrivateCollab = async () => {
    try {
      const supabase = createClientComponentClient();
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("User error:", JSON.stringify(userError));
        throw new Error(userError.message || "Authentication error");
      }
      
      if (!user) {
        showError('You must be logged in to create a collaboration');
        return;
      }
      
      // Get template info
      const template = availablePrompts.find(t => t.id === selectedCollabId);
      if (!template) {
        showError('Template not found');
        return;
      }
      
      // Create the private collab with explicit data
      const { data: collab, error: collabError } = await supabase
        .from('collabs')
        .insert({
          title: template.name,
          description: template.display_text,
          type: template.type || 'theme',
          is_private: true,
          participation_mode: 'private',
          location: null,
          created_by: user.id,
          total_phases: template.phases || null,
          current_phase: 1,
          metadata: {
            template_id: template.id,
            participation_mode: 'private',
            location: null
          }
        })
        .select()
        .single();
      
      if (collabError) {
        console.error("Collab error:", JSON.stringify(collabError));
        throw new Error(`Could not create private collaboration: ${collabError.message}`);
      }
      
      // Add the current user as organizer
      const { error: organizerError } = await supabase
        .from('collab_participants')
        .insert({
          profile_id: user.id,
          collab_id: collab.id,
          role: 'organizer',
          status: 'active',
          participation_mode: 'private',
          location: null
        });
      
      if (organizerError) {
        console.error("Organizer error:", JSON.stringify(organizerError));
        throw new Error(`Could not add you as organizer: ${organizerError.message}`);
      }
      
      // Add selected users as members (invited)
      if (selectedUsers.length > 0) {
        const invites = selectedUsers.map(selectedUser => ({
          profile_id: selectedUser.id,
          collab_id: collab.id,
          role: 'member',
          status: 'invited',
          participation_mode: 'private',
          location: null
        }));
        
        const { error: inviteError } = await supabase
          .from('collab_participants')
          .insert(invites);
        
        if (inviteError) {
          // Log the error but don't fail the whole operation
          console.error("Invite error:", JSON.stringify(inviteError));
        }
      }
      
      // Update UI immediately
      setAvailablePrompts(prev => prev.filter(c => c.id !== selectedCollabId));
      setShowInviteDialog(false);
      
      // Success message and redirect
      alert("You have successfully created a private collaboration with " + selectedUsers.length + " invited participants.");
      router.push('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not create private collaboration");
    }
  };

  const toggleUser = (user: User) => {
    setSelectedUsers(prev => {
      if (prev.find(u => u.id === user.id)) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Render a collab card with updated styling to match dashboard
  const CollabCard = ({ collab }: { collab: CollabTemplate }) => {
    // Use a default type if none exists
    const displayType = collab.type || 'theme';
    
    // Get community and local participant counts safely
    const communityCount = collab.communityParticipantCount || 0;
    const localCount = collab.localParticipantCount || 0;
    
    return (
      <div className="border border-gray-100 rounded-md shadow-sm hover:shadow-md transition-all bg-white hover:border-gray-200">
        <div className="p-4">
          {/* Header with title only (no type badge) */}
          <div className="mb-3">
            <h3 className="text-base font-medium line-clamp-2">{collab.name}</h3>
          </div>
          
          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-3 mb-4">
            {collab.display_text}
          </p>
          
          {/* Instructions with updated styling */}
          {collab.instructions && (
            <div className="mb-4">
              <div className="bg-blue-50 p-4 rounded-sm border-l-4 border-blue-500 shadow-sm">
                <h3 className="font-medium text-blue-800 mb-2 flex items-center text-sm">
                  <FileText className="h-4 w-4 mr-1.5" />
                  INSTRUCTIONS
                </h3>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {collab.instructions}
                </div>
              </div>
            </div>
          )}
          
          {/* Tags */}
          {collab.tags && collab.tags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {collab.tags.slice(0, 3).map((tag: string, index: number) => (
                  <span 
                    key={index}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-sm text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Participant stats - inline modern approach */}
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <Globe size={14} className="text-blue-500" />
              <span><strong>{communityCount}</strong> community</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-green-500" />
              <span><strong>{localCount}</strong> local</span>
            </div>
          </div>

          {/* Chain phases info */}
          {displayType === 'chain' && collab.phases && (
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-4">
              <Clock size={14} className="flex-shrink-0" />
              <span>{collab.phases} phases {collab.duration ? `over ${collab.duration}` : ''}</span>
            </div>
          )}

          {/* Action buttons - Modern, lighter approach */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button 
              className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1.5 rounded-sm flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors text-xs"
              onClick={() => handleJoinClick(collab.id, collab.name, 'community')}
            >
              <Globe size={14} />
              Community
            </button>
            <button 
              className="bg-green-50 text-green-600 border border-green-100 px-2 py-1.5 rounded-sm flex items-center justify-center gap-1 hover:bg-green-100 transition-colors text-xs"
              onClick={() => handleJoinClick(collab.id, collab.name, 'local')}
            >
              <MapPin size={14} />
              Local
            </button>
            <button 
              className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-1.5 rounded-sm flex items-center justify-center gap-1 hover:bg-purple-100 transition-colors text-xs"
              onClick={() => handleJoinClick(collab.id, collab.name, 'private')}
            >
              <Lock size={14} />
              Private
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <h1 className="text-xl md:text-2xl font-medium mb-4">
        {currentPeriod.season} {currentPeriod.year} Collab Prompts
      </h1>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Join collaboration templates to create or participate in creative projects with other contributors.
        </p>
      </div>

      {/* Error display */}
      {error.isVisible && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
          <span className="text-gray-600">Loading collaboration prompts...</span>
        </div>
      ) : availablePrompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availablePrompts.map(collab => (
            <CollabCard key={collab.id} collab={collab} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-gray-50 border border-gray-100 rounded-sm">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-sm flex items-center justify-center">
            <Users size={20} className="text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">You have joined all available collaboration prompts for this period.</p>
          <button 
            onClick={loadData}
            className="py-2.5 px-4 rounded-sm text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Refresh List
          </button>
        </div>
      )}

      {/* User Invite Modal Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm max-w-lg w-full mx-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Lock size={18} />
                Start Private Collab: {selectedCollabTitle}
              </h2>
              <button 
                onClick={() => setShowInviteDialog(false)}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search online//offline contributors..."
                    className="w-full pl-10 pr-4 py-2 border rounded-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search contributors"
                  />
                </div>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-sm">
                    {selectedUsers.map(user => (
                      <div 
                        key={user.id}
                        className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-sm border"
                      >
                        {/* Using a text avatar instead of img for Next.js optimization */}
                        <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden">
                          {user.name.charAt(0)}
                        </span>
                        <span className="text-sm">{user.name}</span>
                        <button 
                          onClick={() => toggleUser(user)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={"Remove " + user.name}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border rounded-sm overflow-hidden divide-y max-h-64 overflow-y-auto">
                  {searchResults
                    .filter(user => 
                      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      user.bio.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(user => {
                      const isSelected = selectedUsers.find(u => u.id === user.id);
                      return (
                        <div 
                          key={user.id}
                          className={`p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer
                            ${isSelected ? 'bg-blue-50' : ''}`}
                          onClick={() => toggleUser(user)}
                        >
                          <div className="flex items-center gap-3">
                            {/* Using a text avatar instead of img for Next.js optimization */}
                            <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium overflow-hidden">
                              {user.name.charAt(0)}
                            </span>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-gray-600">{user.bio}</div>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-blue-500 text-white' : 'border'
                          }`}>
                            {isSelected && <Check size={14} />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowInviteDialog(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm"
                >
                  Cancel
                </button>
                <button 
                  disabled={selectedUsers.length === 0}
                  className={`px-4 py-2 rounded-sm ${selectedUsers.length === 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                  onClick={createPrivateCollab}
                >
                  Send Invites ({selectedUsers.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}