"use client";
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Link2, 
  Users,
  Clock, 
  UserPlus,
  ArrowUpRight,
  Palette,
  BookOpen,
  X,
  Search,
  Check,
  Filter,
  DollarSign,
  Lock,
  Send,
  ArrowLeft,
  Camera,
  Music,
  Pen,
  History as HistoryIcon
} from 'lucide-react';

// Import your getCurrentPeriod function to show the current magazine period
import { getCurrentPeriod } from '@/lib/supabase/content';

interface Creator {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  bio: string;
  creatorType: string;
  contentType: string;
  tags: string[];
  lastPost: string;
  avatar: string;
  previousQuarter: boolean;
  type: 'friend';
  icon: React.ElementType;
  isPrivate?: boolean;
}

interface Ad {
  id: string;
  name: string;
  bio: string;
  lastPost: string;
  avatar: string;
  type: 'ad';
  discount: number;
}

interface Period {
  id: string;
  name: string;
  season: string;
  year: number;
  end_date: string;
}

export default function CurationInterface() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const baseQuarterlyPrice = 25;
  const adDiscountAmount = 2;
  const maxContentPieces = 20;

  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [followRequests, setFollowRequests] = useState<Record<string, boolean>>({});
  const [savingSelections, setSavingSelections] = useState(false);

  const contentTypes = [
    { id: "photo", label: "Photography", icon: Camera },
    { id: "art", label: "Art", icon: Palette },
    { id: "music", label: "Music", icon: Music },
    { id: "essay", label: "Essays", icon: BookOpen },
    { id: "poetry", label: "Poetry", icon: Pen }
  ];

  // Calculate remaining content slots
  const remainingContent = maxContentPieces - (selectedCreators.length + selectedAds.length);

  // Calculate price with discounts
  const calculatePrice = () => {
    return baseQuarterlyPrice - (selectedAds.length * adDiscountAmount);
  };

  // Toggle content type filter
  const toggleFilter = (contentType: string) => {
    if (activeFilters.includes(contentType)) {
      setActiveFilters(activeFilters.filter(type => type !== contentType));
    } else {
      setActiveFilters([...activeFilters, contentType]);
    }
  };

  // Toggle selection of creator or ad
  const toggleItem = (id: string, type: 'friend' | 'ad') => {
    if (type === 'ad') {
      if (selectedAds.includes(id)) {
        setSelectedAds(selectedAds.filter(adId => adId !== id));
      } else if (remainingContent > 0) {
        setSelectedAds([...selectedAds, id]);
      }
    } else {
      if (selectedCreators.includes(id)) {
        setSelectedCreators(selectedCreators.filter(creatorId => creatorId !== id));
      } else if (remainingContent > 0) {
        setSelectedCreators([...selectedCreators, id]);
      }
    }
  };

  // Load creators, ads, and current period data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Get current period
        const periodResult = await getCurrentPeriod();
        if (periodResult && periodResult.success && periodResult.period) {
          setCurrentPeriod(periodResult.period as Period);
        }

        // In a real implementation, fetch creators from your database
        // For now, we'll use sample data
        const sampleCreators: Creator[] = [
          { 
            id: '1', 
            name: "Sarah Kim", 
            firstName: "Sarah",
            lastName: "Kim",
            bio: "Street photographer documenting city life and urban stories",
            creatorType: "Photographer",
            contentType: "photo",
            tags: ["Street Photography", "Black & White", "Urban Life", "Documentary"],
            lastPost: "New series: Dawn Markets of Chinatown",
            avatar: "/api/placeholder/400/400?text=SK",
            previousQuarter: true,
            type: "friend",
            icon: Camera,
            isPrivate: true
          },
          { 
            id: '2', 
            name: "Maya Patel", 
            firstName: "Maya",
            lastName: "Patel",
            bio: "Contemporary poet exploring themes of nature and identity",
            creatorType: "Poet",
            contentType: "poetry",
            tags: ["Modern Poetry", "Haiku", "Nature Poems", "Identity"],
            lastPost: "Poetry Collection: Roots and Wings",
            avatar: "/api/placeholder/400/400?text=MP",
            previousQuarter: true,
            type: "friend",
            icon: Pen
          },
          { 
            id: '3', 
            name: "James Liu", 
            firstName: "James",
            lastName: "Liu",
            bio: "Visual artist working with mixed media and digital collage",
            creatorType: "Artist",
            contentType: "art",
            tags: ["Mixed Media", "Digital Art", "Collage", "Urban Themes"],
            lastPost: "Exhibition: Digital Landscapes",
            avatar: "/api/placeholder/400/400?text=JL",
            previousQuarter: false,
            type: "friend",
            icon: Palette
          },
          { 
            id: '4', 
            name: "Zoe Rodriguez", 
            firstName: "Zoe",
            lastName: "Rodriguez",
            bio: "Documentary photographer focused on community stories",
            creatorType: "Photographer",
            contentType: "photo",
            tags: ["Documentary", "Portrait", "Community", "Black & White"],
            lastPost: "Photo Essay: Neighborhood Heroes",
            avatar: "/api/placeholder/400/400?text=ZR",
            previousQuarter: false,
            type: "friend",
            icon: Camera
          }
        ];

        const sampleAds: Ad[] = [
          {
            id: "ad1",
            name: "Artisan's Supply Co.",
            bio: "Premium art supplies and workshops for creators",
            lastPost: "Featured: New Sustainable Paint Collection",
            avatar: "/api/placeholder/400/400?text=AS",
            type: "ad",
            discount: 2
          },
          {
            id: "ad2",
            name: "The Reading Room",
            bio: "Independent bookstore with curated collections & events",
            lastPost: "Event: Monthly Poetry Reading Night",
            avatar: "/api/placeholder/400/400?text=RR",
            type: "ad",
            discount: 2
          }
        ];

        setCreators(sampleCreators);
        setAds(sampleAds);
        
        // Fetch previously selected creators and ads from database
        // In a real implementation, you would fetch this from your database
        // For now, let's default to selecting a couple items
        setSelectedCreators(['1', '2']);
        setSelectedAds([]);
      } catch (error) {
        console.error("Error loading curation data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Save curation selections to the database
  const saveSelections = async () => {
    setSavingSelections(true);
    try {
      // Actual implementation would save to your database
      // Example:
      // const { data: { user } } = await supabase.auth.getUser();
      // if (!user) return;
      
      // For each selected creator
      // for (const creatorId of selectedCreators) {
      //   await supabase
      //     .from('curator_selections')
      //     .upsert({
      //       curator_id: user.id,
      //       creator_id: creatorId,
      //       period_id: currentPeriod?.id,
      //       selected_at: new Date().toISOString()
      //     });
      // }
      
      // In this demo, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Your magazine selections have been saved!');
      router.push('/dashboard');
    } catch (error) {
      console.error("Error saving selections:", error);
      alert('There was an error saving your selections.');
    } finally {
      setSavingSelections(false);
    }
  };

  // Handle follow request for private creators
  const handleFollowRequest = (creatorId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card from being selected
    setFollowRequests(prev => ({ ...prev, [creatorId]: true }));
    // In a real implementation, send the request to your backend
  };

  // Filter creators based on search term and active filters
  const filteredCreators = creators.filter(creator => {
    const matchesSearch = searchTerm === '' || 
      creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creator.bio.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesFilter = activeFilters.length === 0 || 
      activeFilters.includes(creator.contentType);
      
    return matchesSearch && matchesFilter;
  });

  // Render a creator card
  const renderCreatorCard = (creator: Creator) => {
    const CreatorIcon = creator.icon;
    const isSelected = selectedCreators.includes(creator.id);
    
    return (
      <div 
        key={creator.id}
        onClick={() => toggleItem(creator.id, "friend")}
        className={`bg-white rounded-lg shadow-sm border p-6 cursor-pointer transition-all hover:bg-gray-50 ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="mr-6">
              <div className="relative mb-2">
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                {creator.previousQuarter && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <HistoryIcon size={12} className="text-white" />
                  </div>
                )}
              </div>
              {creator.isPrivate && (
                <div className="flex flex-col items-center text-center w-16 gap-2">
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs flex items-center gap-1 text-gray-600 justify-center w-full">
                    <Lock size={12} />
                    Private
                  </span>
                  {!followRequests[creator.id] ? (
                    <button
                      onClick={(e) => handleFollowRequest(creator.id, e)}
                      className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full text-xs flex items-center gap-1 transition-colors w-full justify-center"
                    >
                      <Send size={12} />
                      Request Follow
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs flex items-center gap-1 justify-center w-full">
                      <Clock size={12} />
                      Requested
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-lg">{creator.name}</h3>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                  <CreatorIcon size={14} className="mr-1" />
                  {creator.creatorType}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{creator.bio}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {creator.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-500">{creator.lastPost}</p>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSelected 
              ? "bg-blue-500 text-white" 
              : "bg-gray-100"
          }`}>
            {isSelected && <Check size={16} />}
          </div>
        </div>
      </div>
    );
  };

  // Render an ad card
  const renderAdCard = (ad: Ad) => {
    const isSelected = selectedAds.includes(ad.id);
    
    return (
      <div 
        key={ad.id}
        onClick={() => toggleItem(ad.id, "ad")}
        className={`bg-green-50 rounded-lg shadow-sm border p-6 cursor-pointer transition-all hover:bg-green-100 ${
          isSelected ? "ring-2 ring-green-500" : ""
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="relative mr-6">
              <img
                src={ad.avatar}
                alt={ad.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <DollarSign size={12} className="text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-1">{ad.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{ad.bio}</p>
              <p className="text-xs text-green-600">{ad.lastPost}</p>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSelected 
              ? "bg-green-500 text-white" 
              : "bg-gray-100"
          }`}>
            {isSelected && <Check size={16} />}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading curation interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* Price Display */}
        <Card className="mb-4">
          <CardContent className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-light mb-1">
                  {currentPeriod ? `${currentPeriod.season} ${currentPeriod.year} Magazine` : 'Your Custom Magazine'}
                </h1>
                <p className="opacity-90 text-sm">Your magazine will include one piece from each selected creator</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 min-w-[180px]">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span>${baseQuarterlyPrice}</span>
                  </div>
                  {selectedAds.length > 0 && (
                    <div className="flex justify-between text-green-200">
                      <span>Ad Savings:</span>
                      <span>-${selectedAds.length * adDiscountAmount}</span>
                    </div>
                  )}
                  <div className="border-t border-white/20 mt-2 pt-2 flex justify-between font-medium text-lg">
                    <span>Total:</span>
                    <span>${calculatePrice()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Count Banner */}
        <Card className="mb-8">
          <CardContent className="p-4 bg-blue-50 border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div>
                  <div className="text-lg font-medium">
                    {remainingContent} Slots Remaining
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="inline-block mr-4">
                      <span className="font-medium">{selectedCreators.length}</span> creator pieces
                    </span>
                    <span className="inline-block">
                      <span className="font-medium">{selectedAds.length}</span> ad pieces
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 border-l border-gray-300 pl-6">
                  Maximum: {maxContentPieces}
                </div>
              </div>
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 rounded-full h-2 transition-all"
                  style={{ 
                    width: `${((maxContentPieces - remainingContent) / maxContentPieces) * 100}%`
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Creators Section */}
        <div className="space-y-6 mb-8">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              type="text"
              placeholder="Search creators..."
              className="w-full pl-10 pr-4 py-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Content Type Filters */}
          <div className="flex gap-2 flex-wrap">
            {contentTypes.map((contentType) => {
              const Icon = contentType.icon;
              return (
                <button
                  key={contentType.id}
                  onClick={() => toggleFilter(contentType.id)}
                  className={`px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors ${
                    activeFilters.includes(contentType.id)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Icon size={16} />
                  {contentType.label}
                </button>
              );
            })}
          </div>

          <h2 className="text-xl font-medium px-2">Creators</h2>
          <div className="space-y-4">
            {filteredCreators.length > 0 ? (
              filteredCreators.map(renderCreatorCard)
            ) : (
              <p className="text-gray-500 text-center py-6">
                No creators match your filters. Try adjusting your search criteria.
              </p>
            )}
          </div>
        </div>

        {/* Ads Section */}
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-medium px-2">Optional Ads (-$2 each)</h2>
          <div className="space-y-4">
            {ads.map(renderAdCard)}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <Button 
            onClick={saveSelections}
            disabled={savingSelections}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 text-lg"
          >
            {savingSelections ? 'Saving...' : 'Save Magazine Selections'}
          </Button>
        </div>
      </div>
    </div>
  );
}