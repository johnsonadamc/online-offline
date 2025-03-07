'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Link2, 
  Users,
  Clock, 
  UserPlus,
  X,
  Search,
  Check,
  ArrowLeft,
  Globe,
  MapPin,
  Lock
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
  internal_reference?: any;
  requirements?: any;
  connection_rules?: any;
}

interface User {
  id: number | string;
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

export default function CollabsLibrary() {
  const router = useRouter();
  const [availablePrompts, setAvailablePrompts] = useState<CollabTemplate[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedCollabTitle, setSelectedCollabTitle] = useState('');
  const [selectedCollabId, setSelectedCollabId] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod>({
    id: '',
    season: 'Spring',
    year: 2025
  });
  
  // Sample users for search results
  const searchResults: User[] = [
    { id: 1, name: 'Sarah Chen', bio: 'Photographer | Urban Documentation', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Alex Kim', bio: 'Writer | Cultural Essays', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Maria Garcia', bio: 'Visual Artist | Mixed Media', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'James Liu', bio: 'Street Photographer | Documentary', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'Maya Patel', bio: 'Illustrator | Digital Art', avatar: '/api/placeholder/32/32' }
  ];

  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const supabase = createClientComponentClient();
    setLoading(true);
    
    try {
      // 1. Get the current user
      const { data: { user } } = await supabase.auth.getUser();
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
      
      if (periodError || !activePeriod) {
        console.error("Error fetching active period:", periodError);
        return;
      } 
      
      console.log("Active period:", activePeriod);
      setCurrentPeriod({
        id: activePeriod.id,
        season: activePeriod.season,
        year: activePeriod.year
      });

      // 3. First, get all the user's active collaborations
      const { data: activeParticipations, error: participationsError } = await supabase
        .from('collab_participants')
        .select('collab_id')
        .eq('profile_id', user.id)
        .eq('status', 'active');
      
      if (participationsError) {
        console.error("Error fetching user participations:", participationsError);
        return;
      }
      
      // Get the collab IDs
      const activeCollabIds = activeParticipations?.map(p => p.collab_id) || [];
      console.log("User's active collab IDs:", activeCollabIds);
      
      // Get metadata for these collabs to extract template IDs
      let activeTemplateIds: string[] = [];
      
      if (activeCollabIds.length > 0) {
        const { data: collabs, error: collabsError } = await supabase
          .from('collabs')
          .select('metadata')
          .in('id', activeCollabIds);
        
        if (collabsError) {
          console.error("Error fetching collabs:", collabsError);
        } else if (collabs && collabs.length > 0) {
          activeTemplateIds = collabs
            .map(collab => {
              if (collab.metadata && typeof collab.metadata === 'object' && 'template_id' in collab.metadata) {
                return collab.metadata.template_id;
              }
              return null;
            })
            .filter((id): id is string => id !== null);
          
          console.log("User's active template IDs:", activeTemplateIds);
        }
      }

      // 4. Get all templates for this period
      const { data: periodTemplates, error: periodTemplatesError } = await supabase
        .from('period_templates')
        .select('template_id')
        .eq('period_id', activePeriod.id);
      
      if (periodTemplatesError) {
        console.error("Error fetching period templates:", periodTemplatesError);
        return;
      }
      
      const periodTemplateIds = periodTemplates?.map(pt => pt.template_id) || [];
      console.log("Period template IDs:", periodTemplateIds);
      
      // 5. Get full details of all templates for this period - include instruction fields
      if (periodTemplateIds.length === 0) {
        console.log("No templates found for this period");
        setAvailablePrompts([]);
        setLoading(false);
        return;
      }
      
      const { data: allTemplates, error: templatesError } = await supabase
        .from('collab_templates')
        .select('*')
        .in('id', periodTemplateIds);
      
      if (templatesError || !allTemplates) {
        console.error("Error fetching templates:", templatesError);
        return;
      }
      
      console.log("All templates before filtering:", allTemplates);
      
      // Filter out templates that the user has already joined
      const filteredTemplates = allTemplates.filter(template => 
        !activeTemplateIds.includes(template.id)
      );
      
      console.log("Available templates after filtering:", filteredTemplates);
      
      // Default type to 'theme' if not set
      const processedTemplates = filteredTemplates.map(template => ({
        ...template,
        type: template.type || 'theme'
      }));
      
      setAvailablePrompts(processedTemplates);
    } catch (error) {
      console.error('Error loading collab data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = async (collabId: string, title: string, mode: ParticipationMode) => {
    try {
      if (mode === 'private') {
        // For private mode, open the invite dialog
        setSelectedCollabId(collabId);
        setSelectedCollabTitle(title);
        setShowInviteDialog(true);
        return;
      }
      
      console.log(`Joining ${mode} collab:`, title, "ID:", collabId);
      
      // Find the template in available prompts
      const template = availablePrompts.find(p => p.id === collabId);
      if (!template) {
        console.error('Template not found in available prompts:', collabId);
        alert('Error: Template not found');
        return;
      }
      
      // Handle joining directly with Supabase
      const supabase = createClientComponentClient();
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to join a collaboration');
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
        console.error("Error creating collab:", collabError);
        alert('Could not create collaboration. Please try again later.');
        return;
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
        console.error("Error adding participant:", participantError);
        alert('Could not join collaboration. Please try again later.');
        return;
      }
      
      // Update UI immediately
      setAvailablePrompts(prev => prev.filter(c => c.id !== collabId));
      
      // Success message and redirect
      alert(`You've successfully joined the "${title}" collaboration in ${mode} mode.`);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Exception in handleJoinClick:', error);
      alert(`Could not join the collaboration due to an unexpected error. Please try again later.`);
    }
  };

  const toggleUser = (user: User) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const CollabCard = ({ collab }: { collab: CollabTemplate }) => {
    // Use a default type if none exists
    const displayType = collab.type || 'theme';
    
    return (
      <Card className="hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        <div className="p-6 flex flex-col h-full">
          {/* Header with title and type badge */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-medium line-clamp-2">{collab.name}</h3>
            <div className="ml-3 flex-shrink-0">
              {displayType === 'chain' && (
                <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs flex items-center gap-1 whitespace-nowrap">
                  <Link2 size={12} />
                  Chain
                </div>
              )}
              {displayType === 'theme' && (
                <div className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full text-xs whitespace-nowrap">
                  Theme
                </div>
              )}
              {displayType === 'narrative' && (
                <div className="bg-amber-100 text-amber-600 px-2 py-1 rounded-full text-xs whitespace-nowrap">
                  Narrative
                </div>
              )}
            </div>
          </div>
          
          {/* Description with fixed height */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 line-clamp-3 min-h-[3rem]">
              {collab.display_text}
            </p>
          </div>
          
          {/* Instructions with fixed height and scrollable if needed */}
          {collab.instructions ? (
            <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 max-h-28 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {collab.instructions}
              </p>
            </div>
          ) : (
            <div className="mb-4 min-h-[1rem]"></div>
          )}
          
          {/* Tags with fixed height */}
          <div className="mb-4 min-h-[2rem]">
            <div className="flex flex-wrap gap-1">
              {collab.tags?.slice(0, 3).map((tag: string, index: number) => (
                <span 
                  key={index}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Participant stats */}
          <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-xs">
              <Globe size={14} className="text-green-500 flex-shrink-0" />
              <span><strong>{collab.participant_count || Math.floor(Math.random() * 30) + 5}</strong> participants in Community pool</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <MapPin size={14} className="text-amber-500 flex-shrink-0" />
              <span><strong>{Math.floor(Math.random() * 15) + 3}</strong> participants in San Francisco</span>
            </div>
          </div>

          {/* Chain phases info */}
          {displayType === 'chain' && collab.phases && (
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-4">
              <Clock size={14} className="flex-shrink-0" />
              <span>{collab.phases} phases {collab.duration ? `over ${collab.duration}` : ''}</span>
            </div>
          )}

          {/* Action buttons - using mt-auto to push to bottom */}
          <div className="grid grid-cols-3 gap-2 mt-auto">
            <button 
              className="bg-green-500 text-white px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-green-600 transition-colors text-xs"
              onClick={() => handleJoinClick(collab.id, collab.name, 'community')}
            >
              <Globe size={14} />
              Community
            </button>
            <button 
              className="bg-amber-500 text-white px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-amber-600 transition-colors text-xs"
              onClick={() => handleJoinClick(collab.id, collab.name, 'local')}
            >
              <MapPin size={14} />
              Local
            </button>
            <button 
              className="border border-indigo-500 text-indigo-500 px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-indigo-50 transition-colors text-xs"
              onClick={() => handleJoinClick(collab.id, collab.name, 'private')}
            >
              <UserPlus size={14} />
              Private
            </button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <Link 
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-light mb-6">
        {currentPeriod.season} {currentPeriod.year} Collab Prompts
      </h1>

      {loading ? (
        <div className="text-center py-10">Loading collaboration prompts...</div>
      ) : availablePrompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePrompts.map(collab => (
            <CollabCard key={collab.id} collab={collab} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          <p>You've joined all available collaboration prompts for this period.</p>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Refresh List
          </button>
        </div>
      )}

      {/* Simple Modal Dialog - No shadcn/ui dependencies */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <UserPlus size={20} />
                Start Private Collab: {selectedCollabTitle}
              </h2>
              <button 
                onClick={() => setShowInviteDialog(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-6 my-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search online//offline contributors..."
                  className="w-full pl-10 pr-4 py-3 border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                  {selectedUsers.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border"
                    >
                      <img src={user.avatar} alt="" className="w-5 h-5 rounded-full" />
                      <span className="text-sm">{user.name}</span>
                      <button 
                        onClick={() => toggleUser(user)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border rounded-lg overflow-hidden divide-y max-h-64 overflow-y-auto">
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
                        className={`p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer
                          ${isSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleUser(user)}
                      >
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
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
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button 
                disabled={selectedUsers.length === 0}
                className={`px-4 py-2 rounded ${selectedUsers.length === 0 ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                onClick={async () => {
                  try {
                    console.log("Creating private collab with template ID:", selectedCollabId);
                    
                    // Handle directly with Supabase
                    const supabase = createClientComponentClient();
                    
                    // Get the current user
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                      alert('You must be logged in to create a collaboration');
                      return;
                    }
                    
                    // Get template info
                    const template = availablePrompts.find(t => t.id === selectedCollabId);
                    if (!template) {
                      alert('Template not found');
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
                      console.error("Error creating private collab:", collabError);
                      alert('Could not create private collaboration. Please try again later.');
                      return;
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
                      console.error("Error adding organizer:", organizerError);
                      alert('Could not add you as organizer. Please try again later.');
                      return;
                    }
                    
                    // Add selected users as members (invited)
                    if (selectedUsers.length > 0) {
                      const invites = selectedUsers.map(selectedUser => ({
                        profile_id: selectedUser.id.toString(),
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
                        console.error("Error inviting members:", inviteError);
                        // Don't fail the whole operation if invites fail
                      }
                    }
                    
                    // Update UI immediately
                    setAvailablePrompts(prev => prev.filter(c => c.id !== selectedCollabId));
                    setShowInviteDialog(false);
                    
                    // Success message and redirect
                    alert(`You've successfully created a private collaboration with ${selectedUsers.length} invited participants.`);
                    window.location.href = '/dashboard';
                  } catch (error) {
                    console.error("Error creating private collab:", error);
                    alert(`Could not create private collaboration due to an unexpected error. Please try again later.`);
                  }
                }}
              >
                Send Invites ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}