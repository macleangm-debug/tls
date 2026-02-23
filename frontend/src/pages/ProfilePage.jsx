import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { 
  User, Mail, Phone, MapPin, Building, Calendar, Shield, Save, Scale, Award, 
  CheckCircle2, Copy, Download, Globe, Briefcase, GraduationCap, Plus, X,
  Eye, Link, Sparkles, Languages, ExternalLink, Loader2, Medal, BookOpen, 
  Users, Gavel, Quote, Camera, Upload, Trash2, Bell
} from "lucide-react";
import NotificationSettings from "../components/NotificationSettings";
import ReminderSettings from "../components/ReminderSettings";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const REGIONS = [
  "Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Mbeya",
  "Tanga", "Morogoro", "Zanzibar", "Kilimanjaro", "Iringa"
];

const PRACTICE_AREAS = [
  "Corporate Law", "Criminal Law", "Family Law", "Real Estate", "Tax Law",
  "Immigration", "Intellectual Property", "Labor Law", "Banking & Finance",
  "Environmental Law", "Human Rights", "Constitutional Law", "Commercial Litigation"
];

const LANGUAGES = ["English", "Swahili", "French", "Arabic", "German", "Chinese"];

const ProfilePage = () => {
  const { user, getAuthHeaders, fetchUser } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "basic";
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  
  // Basic profile form
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    region: user?.region || "",
    court_jurisdiction: user?.court_jurisdiction || "",
    firm_affiliation: user?.firm_affiliation || ""
  });

  // Public profile form
  const [publicProfile, setPublicProfile] = useState({
    title: "",
    bio: "",
    location: "",
    firm_name: "",
    website: "",
    practice_areas: [],
    education: [],
    experience: [],
    languages: [],
    experience_years: "",
    achievements: [],
    publications: [],
    memberships: [],
    bar_admissions: [],
    show_email: false,
    show_phone: false,
    public_profile_enabled: true
  });

  // New education/experience entry
  const [newEducation, setNewEducation] = useState({ degree: "", institution: "", year: "" });
  const [newExperience, setNewExperience] = useState({ position: "", company: "", duration: "", description: "" });
  const [newAchievement, setNewAchievement] = useState({ title: "", year: "" });
  const [newPublication, setNewPublication] = useState({ title: "", publication: "", year: "" });
  const [newMembership, setNewMembership] = useState("");
  const [newBarAdmission, setNewBarAdmission] = useState("");

  useEffect(() => {
    if (user?.public_profile) {
      setPublicProfile(prev => ({
        ...prev,
        ...user.public_profile
      }));
      setProfilePhoto(user.public_profile.profile_photo || null);
    }
  }, [user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePublicChange = (field, value) => {
    setPublicProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API}/profile`, formData, getAuthHeaders());
      await fetchUser();
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePublicSubmit = async (e) => {
    e.preventDefault();
    setPublicLoading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("title", publicProfile.title || "");
      formDataObj.append("bio", publicProfile.bio || "");
      formDataObj.append("location", publicProfile.location || "");
      formDataObj.append("firm_name", publicProfile.firm_name || "");
      formDataObj.append("website", publicProfile.website || "");
      formDataObj.append("experience_years", publicProfile.experience_years || "");
      formDataObj.append("show_email", publicProfile.show_email.toString());
      formDataObj.append("show_phone", publicProfile.show_phone.toString());
      formDataObj.append("public_profile_enabled", publicProfile.public_profile_enabled.toString());
      formDataObj.append("practice_areas", JSON.stringify(publicProfile.practice_areas || []));
      formDataObj.append("education", JSON.stringify(publicProfile.education || []));
      formDataObj.append("experience", JSON.stringify(publicProfile.experience || []));
      formDataObj.append("languages", JSON.stringify(publicProfile.languages || []));
      formDataObj.append("achievements", JSON.stringify(publicProfile.achievements || []));
      formDataObj.append("publications", JSON.stringify(publicProfile.publications || []));
      formDataObj.append("memberships", JSON.stringify(publicProfile.memberships || []));
      formDataObj.append("bar_admissions", JSON.stringify(publicProfile.bar_admissions || []));

      await axios.put(`${API}/user/public-profile`, formDataObj, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" }
      });
      await fetchUser();
      toast.success("Public profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update public profile");
    } finally {
      setPublicLoading(false);
    }
  };

  // Profile Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await axios.post(`${API}/user/profile-photo`, formData, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" }
      });

      setProfilePhoto(response.data.profile_photo);
      await fetchUser();
      toast.success("Profile photo updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePhotoDelete = async () => {
    setPhotoLoading(true);
    try {
      await axios.delete(`${API}/user/profile-photo`, getAuthHeaders());
      setProfilePhoto(null);
      await fetchUser();
      toast.success("Profile photo removed");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const addEducation = () => {
    if (newEducation.degree && newEducation.institution) {
      setPublicProfile(prev => ({
        ...prev,
        education: [...(prev.education || []), { ...newEducation }]
      }));
      setNewEducation({ degree: "", institution: "", year: "" });
    }
  };

  const removeEducation = (index) => {
    setPublicProfile(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addExperience = () => {
    if (newExperience.position && newExperience.company) {
      setPublicProfile(prev => ({
        ...prev,
        experience: [...(prev.experience || []), { ...newExperience }]
      }));
      setNewExperience({ position: "", company: "", duration: "", description: "" });
    }
  };

  const removeExperience = (index) => {
    setPublicProfile(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addAchievement = () => {
    if (newAchievement.title) {
      setPublicProfile(prev => ({
        ...prev,
        achievements: [...(prev.achievements || []), { ...newAchievement }]
      }));
      setNewAchievement({ title: "", year: "" });
    }
  };

  const removeAchievement = (index) => {
    setPublicProfile(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  const addPublication = () => {
    if (newPublication.title) {
      setPublicProfile(prev => ({
        ...prev,
        publications: [...(prev.publications || []), { ...newPublication }]
      }));
      setNewPublication({ title: "", publication: "", year: "" });
    }
  };

  const removePublication = (index) => {
    setPublicProfile(prev => ({
      ...prev,
      publications: prev.publications.filter((_, i) => i !== index)
    }));
  };

  const addMembership = () => {
    if (newMembership.trim()) {
      setPublicProfile(prev => ({
        ...prev,
        memberships: [...(prev.memberships || []), newMembership.trim()]
      }));
      setNewMembership("");
    }
  };

  const removeMembership = (index) => {
    setPublicProfile(prev => ({
      ...prev,
      memberships: prev.memberships.filter((_, i) => i !== index)
    }));
  };

  const addBarAdmission = () => {
    if (newBarAdmission.trim()) {
      setPublicProfile(prev => ({
        ...prev,
        bar_admissions: [...(prev.bar_admissions || []), newBarAdmission.trim()]
      }));
      setNewBarAdmission("");
    }
  };

  const removeBarAdmission = (index) => {
    setPublicProfile(prev => ({
      ...prev,
      bar_admissions: prev.bar_admissions.filter((_, i) => i !== index)
    }));
  };

  const togglePracticeArea = (area) => {
    setPublicProfile(prev => ({
      ...prev,
      practice_areas: prev.practice_areas?.includes(area)
        ? prev.practice_areas.filter(a => a !== area)
        : [...(prev.practice_areas || []), area]
    }));
  };

  const toggleLanguage = (lang) => {
    setPublicProfile(prev => ({
      ...prev,
      languages: prev.languages?.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...(prev.languages || []), lang]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const profileUrl = `${window.location.origin}/advocate/${user?.id}`;

  // Calculate profile completion
  const completionFields = [
    publicProfile.bio,
    publicProfile.practice_areas?.length > 0,
    publicProfile.education?.length > 0,
    publicProfile.experience?.length > 0,
    publicProfile.location,
    publicProfile.languages?.length > 0,
    publicProfile.achievements?.length > 0,
    publicProfile.memberships?.length > 0,
    profilePhoto
  ];
  const profileCompletion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your advocate credentials and public presence">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8 bg-white/5 p-1 rounded-xl">
          <TabsTrigger 
            value="basic" 
            className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <User className="w-4 h-4 mr-2" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger 
            value="public" 
            className="rounded-lg data-[state=active]:bg-purple-500 data-[state=active]:text-white"
          >
            <Globe className="w-4 h-4 mr-2" />
            Public Profile
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            data-testid="notifications-tab"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="rounded-lg data-[state=active]:bg-red-500 data-[state=active]:text-white"
          >
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Credential Card */}
            <div className="lg:col-span-1 space-y-6">
              {/* Digital ID Card */}
              <Card className="glass-card rounded-2xl border-white/10 overflow-hidden" data-testid="digital-id-card">
                <div className="h-2 bg-gradient-to-r from-tls-gold via-tls-blue-electric to-tls-verified" />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    {/* Profile Photo with Upload */}
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center overflow-hidden">
                        {profilePhoto ? (
                          <img src={profilePhoto} alt={user?.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-3xl font-bold">
                            {user?.full_name?.charAt(0) || 'A'}
                          </span>
                        )}
                      </div>
                      
                      {/* Photo Upload Overlay */}
                      <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <label className="cursor-pointer p-2 hover:bg-white/20 rounded-full transition-colors">
                          <Camera className="w-5 h-5 text-white" />
                          <input 
                            type="file" 
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            disabled={photoLoading}
                          />
                        </label>
                        {profilePhoto && (
                          <button 
                            onClick={handlePhotoDelete}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            disabled={photoLoading}
                          >
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </button>
                        )}
                      </div>
                      
                      {/* Loading Spinner */}
                      {photoLoading && (
                        <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    <Badge className="bg-tls-verified/20 text-tls-verified border-0">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{user?.full_name}</h3>
                  <p className="text-tls-gold font-medium text-sm mb-4">Advocate of the High Court</p>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-white/50">Roll Number</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{user?.roll_number || 'TLS-XXXX'}</span>
                        <button onClick={() => copyToClipboard(user?.roll_number)} className="text-white/40 hover:text-white">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-white/50">Admitted</span>
                      <span className="text-white">{user?.admission_year || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-white/50">Jurisdiction</span>
                      <span className="text-white">{user?.court_jurisdiction?.split(" ")[0] || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-white/50">Status</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-6 border-white/10 text-white/60 hover:bg-white/5 rounded-xl">
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
                  </Button>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card className="glass-card rounded-2xl border-white/10">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-white mb-4">Contact Information</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-white/60">
                      <Mail className="w-4 h-4" />
                      <span>{user?.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/60">
                      <Phone className="w-4 h-4" />
                      <span>{user?.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span>{user?.region}</span>
                    </div>
                    {user?.firm_affiliation && (
                      <div className="flex items-center gap-3 text-white/60">
                        <Building className="w-4 h-4" />
                        <span>{user?.firm_affiliation}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Edit Form */}
            <Card className="lg:col-span-2 glass-card rounded-2xl border-white/10" data-testid="profile-form">
              <CardContent className="p-6 lg:p-8">
                <h3 className="font-heading text-xl font-semibold text-white mb-6">Edit Profile</h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-white/70">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                          value={formData.full_name}
                          onChange={(e) => handleChange("full_name", e.target.value)}
                          className="pl-12 h-12 bg-white/5 border-white/10 text-white rounded-xl"
                          data-testid="fullname-input"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white/70">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          className="pl-12 h-12 bg-white/5 border-white/10 text-white rounded-xl"
                          data-testid="phone-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-white/70">Region</Label>
                      <Select value={formData.region} onValueChange={(v) => handleChange("region", v)}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white/70">Court Jurisdiction</Label>
                      <div className="relative">
                        <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                          value={formData.court_jurisdiction}
                          onChange={(e) => handleChange("court_jurisdiction", e.target.value)}
                          className="pl-12 h-12 bg-white/5 border-white/10 text-white rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70">Firm/Organization</Label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        value={formData.firm_affiliation}
                        onChange={(e) => handleChange("firm_affiliation", e.target.value)}
                        placeholder="Independent or Firm Name"
                        className="pl-12 h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-lg">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Public Profile Tab */}
        <TabsContent value="public">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Profile Preview & Link */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Link Card */}
              <Card className="glass-card rounded-2xl border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Link className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Your Public Profile</h4>
                      <p className="text-white/50 text-sm">Share with clients</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-3 mb-4">
                    <p className="text-white/60 text-xs break-all font-mono">{profileUrl}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      onClick={() => copyToClipboard(profileUrl)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      onClick={() => window.open(profileUrl, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Completion Progress */}
              <Card className="glass-card rounded-2xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h4 className="font-semibold text-white">Profile Strength</h4>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-white/60 text-sm">Completion</span>
                      <span className="text-purple-400 font-bold">{profileCompletion}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Profile Photo", done: !!profilePhoto },
                      { label: "Bio", done: !!publicProfile.bio },
                      { label: "Practice Areas", done: publicProfile.practice_areas?.length > 0 },
                      { label: "Education", done: publicProfile.education?.length > 0 },
                      { label: "Experience", done: publicProfile.experience?.length > 0 },
                      { label: "Location", done: !!publicProfile.location },
                      { label: "Languages", done: publicProfile.languages?.length > 0 },
                      { label: "Achievements", done: publicProfile.achievements?.length > 0 },
                      { label: "Memberships", done: publicProfile.memberships?.length > 0 }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${item.done ? 'text-emerald-400' : 'text-white/20'}`} />
                        <span className={item.done ? 'text-white/70' : 'text-white/40'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Privacy Settings */}
              <Card className="glass-card rounded-2xl border-white/10">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-white mb-4">Privacy Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm">Profile Visible</p>
                        <p className="text-white/40 text-xs">Allow public to view your profile</p>
                      </div>
                      <Switch 
                        checked={publicProfile.public_profile_enabled}
                        onCheckedChange={(v) => handlePublicChange("public_profile_enabled", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm">Show Email</p>
                        <p className="text-white/40 text-xs">Display email on profile</p>
                      </div>
                      <Switch 
                        checked={publicProfile.show_email}
                        onCheckedChange={(v) => handlePublicChange("show_email", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm">Show Phone</p>
                        <p className="text-white/40 text-xs">Display phone on profile</p>
                      </div>
                      <Switch 
                        checked={publicProfile.show_phone}
                        onCheckedChange={(v) => handlePublicChange("show_phone", v)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Public Profile Form */}
            <Card className="lg:col-span-2 glass-card rounded-2xl border-white/10">
              <CardContent className="p-6 lg:p-8">
                <h3 className="font-heading text-xl font-semibold text-white mb-6">Edit Public Profile</h3>
                
                <form onSubmit={handlePublicSubmit} className="space-y-6">
                  {/* Profile Photo Upload */}
                  <div className="space-y-3">
                    <Label className="text-white/70 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Profile Photo
                    </Label>
                    
                    <div className="flex items-center gap-6">
                      {/* Photo Preview */}
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                          {profilePhoto ? (
                            <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-10 h-10 text-white/30" />
                          )}
                        </div>
                        
                        {photoLoading && (
                          <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      {/* Upload Controls */}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <label className="cursor-pointer">
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                              disabled={photoLoading}
                              asChild
                            >
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Photo
                              </span>
                            </Button>
                            <input 
                              type="file" 
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handlePhotoUpload}
                              className="hidden"
                              disabled={photoLoading}
                            />
                          </label>
                          
                          {profilePhoto && (
                            <Button 
                              type="button"
                              variant="outline" 
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={handlePhotoDelete}
                              disabled={photoLoading}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-white/40 text-xs">
                          JPG, PNG or WebP. Max 5MB. Recommended: 400x400px
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Title & Bio */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white/70">Professional Title</Label>
                      <Input
                        value={publicProfile.title}
                        onChange={(e) => handlePublicChange("title", e.target.value)}
                        placeholder="e.g., Advocate of the High Court, Senior Partner"
                        className="h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/30"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white/70">Bio / About Me</Label>
                      <Textarea
                        value={publicProfile.bio}
                        onChange={(e) => handlePublicChange("bio", e.target.value)}
                        placeholder="Tell potential clients about yourself, your expertise, and what makes you unique..."
                        className="min-h-[120px] bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  {/* Location & Firm */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/70">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                          value={publicProfile.location}
                          onChange={(e) => handlePublicChange("location", e.target.value)}
                          placeholder="e.g., Dar es Salaam, Tanzania"
                          className="pl-12 h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/30"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Firm Name</Label>
                      <div className="relative">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                          value={publicProfile.firm_name}
                          onChange={(e) => handlePublicChange("firm_name", e.target.value)}
                          placeholder="Your law firm or 'Independent'"
                          className="pl-12 h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/30"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Website & Experience */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/70">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                          value={publicProfile.website}
                          onChange={(e) => handlePublicChange("website", e.target.value)}
                          placeholder="https://yourwebsite.com"
                          className="pl-12 h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/30"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Years of Experience</Label>
                      <Input
                        type="number"
                        value={publicProfile.experience_years}
                        onChange={(e) => handlePublicChange("experience_years", e.target.value)}
                        placeholder="e.g., 10"
                        className="h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  {/* Practice Areas */}
                  <div className="space-y-2">
                    <Label className="text-white/70">Practice Areas</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRACTICE_AREAS.map(area => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => togglePracticeArea(area)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            publicProfile.practice_areas?.includes(area)
                              ? 'bg-purple-500 text-white'
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="space-y-2">
                    <Label className="text-white/70">Languages</Label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            publicProfile.languages?.includes(lang)
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Education */}
                  <div className="space-y-3">
                    <Label className="text-white/70 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Education
                    </Label>
                    
                    {publicProfile.education?.map((edu, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{edu.degree}</p>
                          <p className="text-white/50 text-xs">{edu.institution} {edu.year && `• ${edu.year}`}</p>
                        </div>
                        <button type="button" onClick={() => removeEducation(i)} className="text-red-400 hover:text-red-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={newEducation.degree}
                        onChange={(e) => setNewEducation(p => ({ ...p, degree: e.target.value }))}
                        placeholder="Degree (e.g., LLB)"
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                      />
                      <Input
                        value={newEducation.institution}
                        onChange={(e) => setNewEducation(p => ({ ...p, institution: e.target.value }))}
                        placeholder="Institution"
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={newEducation.year}
                          onChange={(e) => setNewEducation(p => ({ ...p, year: e.target.value }))}
                          placeholder="Year"
                          className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                        />
                        <Button type="button" onClick={addEducation} size="icon" className="bg-purple-500 hover:bg-purple-600">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="space-y-3">
                    <Label className="text-white/70 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Professional Experience
                    </Label>
                    
                    {publicProfile.experience?.map((exp, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{exp.position}</p>
                          <p className="text-white/50 text-xs">{exp.company} {exp.duration && `• ${exp.duration}`}</p>
                        </div>
                        <button type="button" onClick={() => removeExperience(i)} className="text-red-400 hover:text-red-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={newExperience.position}
                        onChange={(e) => setNewExperience(p => ({ ...p, position: e.target.value }))}
                        placeholder="Position"
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                      />
                      <Input
                        value={newExperience.company}
                        onChange={(e) => setNewExperience(p => ({ ...p, company: e.target.value }))}
                        placeholder="Company/Firm"
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={newExperience.duration}
                          onChange={(e) => setNewExperience(p => ({ ...p, duration: e.target.value }))}
                          placeholder="Duration"
                          className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                        />
                        <Button type="button" onClick={addExperience} size="icon" className="bg-purple-500 hover:bg-purple-600">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Achievements */}
                  <div className="space-y-3">
                    <Label className="text-white/70 flex items-center gap-2">
                      <Medal className="w-4 h-4" />
                      Notable Achievements
                    </Label>
                    
                    {publicProfile.achievements?.map((ach, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{ach.title}</p>
                          {ach.year && <p className="text-white/50 text-xs">{ach.year}</p>}
                        </div>
                        <button type="button" onClick={() => removeAchievement(i)} className="text-red-400 hover:text-red-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        value={newAchievement.title}
                        onChange={(e) => setNewAchievement(p => ({ ...p, title: e.target.value }))}
                        placeholder="Achievement title"
                        className="col-span-3 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={newAchievement.year}
                          onChange={(e) => setNewAchievement(p => ({ ...p, year: e.target.value }))}
                          placeholder="Year"
                          className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                        />
                        <Button type="button" onClick={addAchievement} size="icon" className="bg-yellow-500 hover:bg-yellow-600">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Publications */}
                  <div className="space-y-3">
                    <Label className="text-white/70 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Publications & Articles
                    </Label>
                    
                    {publicProfile.publications?.map((pub, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{pub.title}</p>
                          <p className="text-white/50 text-xs">{pub.publication} {pub.year && `• ${pub.year}`}</p>
                        </div>
                        <button type="button" onClick={() => removePublication(i)} className="text-red-400 hover:text-red-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={newPublication.title}
                        onChange={(e) => setNewPublication(p => ({ ...p, title: e.target.value }))}
                        placeholder="Publication title"
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                      />
                      <Input
                        value={newPublication.publication}
                        onChange={(e) => setNewPublication(p => ({ ...p, publication: e.target.value }))}
                        placeholder="Journal/Publisher"
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={newPublication.year}
                          onChange={(e) => setNewPublication(p => ({ ...p, year: e.target.value }))}
                          placeholder="Year"
                          className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                        />
                        <Button type="button" onClick={addPublication} size="icon" className="bg-blue-500 hover:bg-blue-600">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Bar Admissions */}
                  <div className="space-y-3">
                    <Label className="text-white/70 flex items-center gap-2">
                      <Gavel className="w-4 h-4" />
                      Bar Admissions
                    </Label>
                    
                    <div className="flex flex-wrap gap-2">
                      {publicProfile.bar_admissions?.map((bar, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-sm">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{bar}</span>
                          <button type="button" onClick={() => removeBarAdmission(i)} className="ml-1 hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newBarAdmission}
                        onChange={(e) => setNewBarAdmission(e.target.value)}
                        placeholder="e.g., High Court of Tanzania, Court of Appeal"
                        className="flex-1 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBarAdmission())}
                      />
                      <Button type="button" onClick={addBarAdmission} size="icon" className="bg-emerald-500 hover:bg-emerald-600">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Professional Memberships */}
                  <div className="space-y-3">
                    <Label className="text-white/70 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Professional Memberships
                    </Label>
                    
                    <div className="flex flex-wrap gap-2">
                      {publicProfile.memberships?.map((membership, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-full text-sm">
                          <span>{membership}</span>
                          <button type="button" onClick={() => removeMembership(i)} className="ml-1 hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newMembership}
                        onChange={(e) => setNewMembership(e.target.value)}
                        placeholder="e.g., Tanganyika Law Society, East African Law Society"
                        className="flex-1 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMembership())}
                      />
                      <Button type="button" onClick={addMembership} size="icon" className="bg-purple-500 hover:bg-purple-600">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={publicLoading} className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-lg">
                    {publicLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Save Public Profile</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Event Reminders Section - NEW */}
            <ReminderSettings />
            
            {/* General Notification Preferences */}
            <Card className="glass-card rounded-2xl border-white/10">
              <CardContent className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-tls-blue-electric" />
                    Push Notification Preferences
                  </h2>
                  <p className="text-white/50 text-sm">
                    Choose which events trigger push notifications on your devices
                  </p>
                </div>
                <NotificationSettings />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="max-w-2xl mx-auto">
            <Card className="glass-card rounded-2xl border-white/10">
              <CardContent className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    Security Settings
                  </h2>
                  <p className="text-white/50 text-sm">
                    Manage your account security and authentication
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Password Section */}
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Password</p>
                        <p className="text-xs text-white/50">Last changed: Unknown</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => toast.info("Password change feature coming soon")}
                      >
                        Change Password
                      </Button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-white/50">Add an extra layer of security</p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        Coming Soon
                      </Badge>
                    </div>
                  </div>

                  {/* Active Sessions */}
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Active Sessions</p>
                        <p className="text-xs text-white/50">View and manage your login sessions</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => toast.info("Session management coming soon")}
                      >
                        View Sessions
                      </Button>
                    </div>
                  </div>

                  {/* Account Deletion */}
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-400 font-medium">Delete Account</p>
                        <p className="text-xs text-red-400/60">Permanently delete your account and all data</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => toast.error("Please contact TLS support to delete your account")}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ProfilePage;
