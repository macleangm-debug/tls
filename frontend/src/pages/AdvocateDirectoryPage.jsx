import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import axios from "axios";
import { 
  Search, MapPin, Briefcase, Shield, CheckCircle2, 
  Filter, ChevronRight, Users, Award, Loader2, X,
  GraduationCap, Scale, Building2, Star, RefreshCw
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRACTICE_AREAS = [
  "All Areas", "Corporate Law", "Criminal Law", "Family Law", "Real Estate", "Tax Law",
  "Immigration", "Intellectual Property", "Labor Law", "Banking & Finance",
  "Environmental Law", "Human Rights", "Constitutional Law", "Commercial Litigation"
];

const POPULAR_SPECIALIZATIONS = [
  "Corporate Law", "Criminal Law", "Family Law", "Real Estate", "Banking & Finance", "Commercial Litigation"
];

const REGIONS = [
  "All Regions", "Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Mbeya",
  "Tanga", "Morogoro", "Zanzibar", "Kilimanjaro", "Iringa"
];

const ITEMS_PER_PAGE = 20;

export default function AdvocateDirectoryPage() {
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("All Areas");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Ref for infinite scroll
  const observerRef = useRef();
  const loadMoreRef = useRef();
  
  // Debounce search
  const searchTimeoutRef = useRef();

  // Fetch advocates with pagination
  const fetchAdvocates = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: ITEMS_PER_PAGE.toString()
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedArea !== "All Areas") params.append('practice_area', selectedArea);
      if (selectedRegion !== "All Regions") params.append('region', selectedRegion);
      
      const response = await axios.get(`${API_URL}/api/advocates/directory?${params}`);
      const data = response.data;
      
      if (append) {
        setAdvocates(prev => [...prev, ...data.advocates]);
      } else {
        setAdvocates(data.advocates || []);
      }
      
      setTotalCount(data.total || 0);
      setHasMore(data.has_more || false);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to fetch advocates:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedArea, selectedRegion]);

  // Initial load
  useEffect(() => {
    fetchAdvocates(1, false);
  }, []);

  // Re-fetch when filters change (with debounce for search)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      setAdvocates([]);
      fetchAdvocates(1, false);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedArea, selectedRegion]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchAdvocates(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    observerRef.current = observer;
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, loadingMore, hasMore, page, fetchAdvocates]);

  // Filter advocates client-side for immediate feedback
  const filteredAdvocates = advocates.filter(adv => {
    const matchesSearch = searchQuery === "" || 
      adv.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adv.firm_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adv.practice_areas?.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesArea = selectedArea === "All Areas" || 
      adv.practice_areas?.includes(selectedArea);
    
    const matchesRegion = selectedRegion === "All Regions" || 
      adv.location?.includes(selectedRegion) ||
      adv.region === selectedRegion;
    
    return matchesSearch && matchesArea && matchesRegion;
  });

  const handleSpecializationClick = (area) => {
    setSelectedArea(area);
    setShowFilters(true);
  };

  const clearAllFilters = () => {
    setSelectedArea("All Areas");
    setSelectedRegion("All Regions");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-[#02040A] flex flex-col">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#02040A]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1.5">
                <img src="/assets/tls-logo.png" alt="TLS" className="w-full h-full object-contain" />
              </div>
              <span className="text-white font-semibold text-lg">Tanganyika Law Society</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/verify" className="text-white/60 hover:text-white transition-colors text-sm">
                Verify Document
              </Link>
              <Link to="/business" className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm">
                For Business
              </Link>
              <Link to="/login">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Fixed Search Header */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-[#02040A]/95 backdrop-blur-xl border-b border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium">
                {totalCount.toLocaleString()} TLS Verified Advocates
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Find a Qualified Advocate
            </h1>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, firm, or expertise..."
                className="w-full h-12 pl-12 pr-32 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/40"
                data-testid="advocate-search-input"
              />
              <Button 
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white hover:bg-white/10 ${showFilters ? 'bg-white/10 text-white' : ''}`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Quick Specialization Tags */}
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <span className="text-white/40 text-xs mr-1 flex items-center">
                <Scale className="w-3 h-3 mr-1" />
                Popular:
              </span>
              {POPULAR_SPECIALIZATIONS.map(area => (
                <button
                  key={area}
                  onClick={() => handleSpecializationClick(area)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                    selectedArea === area
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                  data-testid={`specialization-${area.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {area}
                </button>
              ))}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-3 p-4 bg-white/5 rounded-xl border border-white/10 animate-in slide-in-from-top-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-white/60 text-xs">Expertise / Specialization</label>
                    <Select value={selectedArea} onValueChange={setSelectedArea}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-10" data-testid="practice-area-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRACTICE_AREAS.map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/60 text-xs">Region</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-10" data-testid="region-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map(region => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {(selectedArea !== "All Areas" || selectedRegion !== "All Regions" || searchQuery) && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="text-white/40 text-xs">Active:</span>
                    {searchQuery && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">
                        <Search className="w-3 h-3 mr-1" />
                        "{searchQuery}"
                        <button onClick={() => setSearchQuery("")} className="ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {selectedArea !== "All Areas" && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                        <Scale className="w-3 h-3 mr-1" />
                        {selectedArea}
                        <button onClick={() => setSelectedArea("All Areas")} className="ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {selectedRegion !== "All Regions" && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-0 text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {selectedRegion}
                        <button onClick={() => setSelectedRegion("All Regions")} className="ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    <button 
                      onClick={clearAllFilters}
                      className="text-white/40 hover:text-white text-xs ml-2"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Results Container */}
      <div 
        className={`flex-1 overflow-y-auto ${showFilters ? 'pt-[340px]' : 'pt-[240px]'}`}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Results Count */}
          <div className="text-center mb-4 sticky top-0 py-2 bg-[#02040A]/80 backdrop-blur-sm z-10">
            <p className="text-white/50 text-sm">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading advocates...
                </span>
              ) : (
                `Showing ${filteredAdvocates.length} of ${totalCount.toLocaleString()} advocates`
              )}
            </p>
          </div>

          {/* Advocates Grid */}
          {loading && advocates.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
                <p className="text-white/60">Loading advocates...</p>
              </div>
            </div>
          ) : filteredAdvocates.length === 0 ? (
            <Card className="bg-white/[0.03] border-white/10 max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No advocates found</h3>
                <p className="text-white/50 mb-4">Try adjusting your search or filters</p>
                <Button onClick={clearAllFilters} variant="outline" className="border-white/20 text-white">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAdvocates.map((advocate) => (
                  <Link key={advocate.id} to={`/advocate/${advocate.id}`} data-testid={`advocate-card-${advocate.id}`}>
                    <Card className="bg-white/[0.03] border-white/10 hover:border-emerald-500/30 transition-all group h-full hover:bg-white/[0.05]">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                            {advocate.profile_photo ? (
                              <img src={advocate.profile_photo} alt={advocate.full_name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <span className="text-white text-lg font-bold">
                                {advocate.full_name?.charAt(0) || 'A'}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                              {advocate.full_name}
                            </h3>
                            <p className="text-white/50 text-xs truncate">
                              {advocate.title || "Advocate of the High Court"}
                            </p>
                          </div>
                          
                          {/* Verified Badge */}
                          <div className="flex-shrink-0">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                          </div>
                        </div>

                        {/* Practice Areas - Compact */}
                        {advocate.practice_areas && advocate.practice_areas.length > 0 ? (
                          <div className="mb-3 p-2.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                            <div className="flex flex-wrap gap-1">
                              {advocate.practice_areas.slice(0, 2).map((area, i) => (
                                <Badge 
                                  key={i} 
                                  className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px] px-2 py-0.5"
                                >
                                  {area}
                                </Badge>
                              ))}
                              {advocate.practice_areas.length > 2 && (
                                <Badge className="bg-white/10 text-white/60 border-0 text-[10px] px-2 py-0.5">
                                  +{advocate.practice_areas.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-3 p-2.5 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-white/40 text-[10px]">General Practice</span>
                          </div>
                        )}

                        {/* Info - Compact */}
                        <div className="space-y-1.5 mb-3 text-xs">
                          {advocate.location && (
                            <div className="flex items-center gap-2 text-white/50">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{advocate.location}</span>
                            </div>
                          )}
                          {advocate.firm_name && (
                            <div className="flex items-center gap-2 text-white/50">
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">{advocate.firm_name}</span>
                            </div>
                          )}
                          {advocate.experience_years && (
                            <div className="flex items-center gap-2 text-white/50">
                              <Award className="w-3 h-3" />
                              <span>{advocate.experience_years}+ years</span>
                            </div>
                          )}
                        </div>

                        {/* Stats & CTA */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div className="flex items-center gap-3 text-[10px] text-white/40">
                            <span>{advocate.documents_stamped || 0} docs</span>
                            {advocate.verification_count > 0 && (
                              <span className="text-purple-400">✓ {advocate.verification_count} verified</span>
                            )}
                          </div>
                          <span className="text-emerald-400 text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                            View
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Load More Trigger */}
              <div 
                ref={loadMoreRef} 
                className="py-8 flex items-center justify-center"
              >
                {loadingMore && (
                  <div className="flex items-center gap-3 text-white/60">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                    <span className="text-sm">Loading more advocates...</span>
                  </div>
                )}
                {!hasMore && filteredAdvocates.length > 0 && (
                  <p className="text-white/40 text-sm">
                    You've reached the end • {filteredAdvocates.length} advocates shown
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="py-6 px-4 border-t border-white/5 bg-[#02040A]">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-white/40 text-xs">
              © 2026 Tanganyika Law Society. All advocates listed are verified TLS members.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
