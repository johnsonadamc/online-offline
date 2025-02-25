'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Link2, 
  Users,
  Clock, 
  UserPlus,
  Palette,
  BookOpen,
  X,
  Search,
  Check,
  ArrowLeft,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { getAvailableCollabs, joinCollab } from '@/lib/supabase/collabLibrary';

// Define interfaces for type safety
interface CollabTemplate {
  id: string;
  name: string;
  display_text: string;
  type: 'chain' | 'theme' | 'narrative';
  participant_count?: number;
  tags?: string[];
  phases?: number;
  duration?: string;
}

interface User {
  id: number | string;
  name: string;
  bio: string;
  avatar: string;
}

export default function CollabsLibrary() {
  const [availableCollabs, setAvailableCollabs] = useState<{
    chain: CollabTemplate[],
    theme: CollabTemplate[],
    narrative: CollabTemplate[]
  }>({
    chain: [],
    theme: [],
    narrative: []
  });
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedCollabTitle, setSelectedCollabTitle] = useState('');
  const [selectedCollabId, setSelectedCollabId] = useState('');
  const [selectedCollabType, setSelectedCollabType] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Sample users for search results
  const searchResults: User[] = [
    { id: 1, name: 'Sarah Chen', bio: 'Photographer | Urban Documentation', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Alex Kim', bio: 'Writer | Cultural Essays', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Maria Garcia', bio: 'Visual Artist | Mixed Media', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'James Liu', bio: 'Street Photographer | Documentary', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'Maya Patel', bio: 'Illustrator | Digital Art', avatar: '/api/placeholder/32/32' }
  ];

  useEffect(() => {
    const loadCollabs = async () => {
      setLoading(true);
      const collabs = await getAvailableCollabs();
      setAvailableCollabs(collabs);
      setLoading(false);
    };
    loadCollabs();
  }, []);

// In collabs/page.tsx, update the handleJoinClick function
const handleJoinClick = async (collabId: string, title: string, type: string) => {
  try {
    // Removed the alert - just log to console instead
    console.log("Joining collab:", title);
    
    const result = await joinCollab(collabId, false);
    console.log("Join result:", result);
    
    if (result.success) {
      // Success - redirect to dashboard without alert
      window.location.href = '/dashboard';
    } else {
      // Error, but still no alert
      console.error('Error joining collab:', result.error);
    }
  } catch (error) {
    console.error('Error joining collab:', error);
  }
};

  const handleStartPrivateClick = (collabId: string, title: string, type: string) => {
    setSelectedCollabId(collabId);
    setSelectedCollabTitle(title);
    setSelectedCollabType(type);
    setShowInviteDialog(true);
  };

  const toggleUser = (user: User) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const CollabCard = ({ collab }: { collab: CollabTemplate }) => (
    <Card className="hover:shadow-lg transition-all duration-300">
      <div className="pt-8 px-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium">{collab.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{collab.display_text}</p>
          </div>
          {collab.type === 'chain' && (
            <div className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <Link2 size={12} />
              Chain
            </div>
          )}
          {collab.type === 'theme' && (
            <div className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <Palette size={12} />
              Theme
            </div>
          )}
          {collab.type === 'narrative' && (
            <div className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <BookOpen size={12} />
              Narrative
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users size={14} />
            {collab.participant_count || 0} participants
          </div>

          {collab.type === 'chain' && collab.phases && (
            <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg">
              {collab.duration && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-gray-400" />
                  <span>{collab.phases} phases over {collab.duration}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {collab.tags?.map((tag: string, index: number) => (
              <span 
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              onClick={() => handleJoinClick(collab.id, collab.name, collab.type)}
            >
              <Users size={16} />
              Join Community Collab
            </button>
            <button 
              className="flex-1 border border-blue-500 text-blue-500 px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              onClick={() => handleStartPrivateClick(collab.id, collab.name, collab.type)}
            >
              <UserPlus size={16} />
              Start Private Collab
            </button>
          </div>
        </div>
      </div>
    </Card>
  );

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

      <h1 className="text-3xl font-light mb-6">Join a Collab</h1>

      <Tabs defaultValue="chain" className="space-y-8">
        <TabsList>
          <TabsTrigger value="chain" className="flex items-center gap-2">
            <Link2 size={16} />
            Chain
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette size={16} />
            Themes
          </TabsTrigger>
          <TabsTrigger value="narrative" className="flex items-center gap-2">
            <BookOpen size={16} />
            Narrative
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chain">
          {loading ? (
            <div className="text-center py-10">Loading chain collabs...</div>
          ) : availableCollabs.chain.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCollabs.chain.map(collab => (
                <CollabCard key={collab.id} collab={collab} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">No chain collabs available at the moment.</div>
          )}
        </TabsContent>

        <TabsContent value="theme">
          {loading ? (
            <div className="text-center py-10">Loading theme collabs...</div>
          ) : availableCollabs.theme.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCollabs.theme.map(collab => (
                <CollabCard key={collab.id} collab={collab} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">No theme collabs available at the moment.</div>
          )}
        </TabsContent>

        <TabsContent value="narrative">
          {loading ? (
            <div className="text-center py-10">Loading narrative collabs...</div>
          ) : availableCollabs.narrative.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCollabs.narrative.map(collab => (
                <CollabCard key={collab.id} collab={collab} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">No narrative collabs available at the moment.</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Simple Modal Dialog - No shadcn/ui dependencies */}
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
    // Use true for isPrivate parameter
    try {
      console.log("Creating private collab with template ID:", selectedCollabId);
      
      const result = await joinCollab(
        selectedCollabId, 
        true,
        selectedUsers.map(u => u.id.toString())
      );
      
      console.log("Private collab creation result:", result);
      
      if (result.success) {
        // Success - redirect without alert
        setShowInviteDialog(false);
        window.location.href = '/dashboard';
      } else {
        // Error, but no alert
        console.error("Error creating private collab:", result.error);
      }
    } catch (error) {
      console.error("Error creating private collab:", error);
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