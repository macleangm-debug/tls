import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import axios from "axios";
import { 
  Shield, MapPin, Phone, Mail, Globe, 
  Calendar, Award, Briefcase, GraduationCap, Scale,
  Building2, ExternalLink, Loader2, AlertCircle,
  User, BookOpen, Users, Languages, Quote, ChevronRight,
  FileText, Gavel, Medal, Newspaper
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdvocateProfilePage() {
  const { advocateId } = useParams();
  const [advocate, setAdvocate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdvocate = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/advocates/public/${advocateId}`);
        setAdvocate(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Advocate not found");
      } finally {
        setLoading(false);
      }
    };
    fetchAdvocate();
  }, [advocateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02040A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading advocate profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#02040A] flex items-center justify-center px-4">
        <Card className="bg-white/[0.03] border-white/10 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
            <p className="text-white/60 mb-6">{error}</p>
            <Link to="/directory">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                Browse Advocates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040A]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#02040A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1.5">
                <img src="/assets/tls-logo.png" alt="TLS" className="w-full h-full object-contain" />
              </div>
              <span className="text-white font-semibold text-lg">Tanganyika Law Society</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/directory" className="text-white/60 hover:text-white transition-colors text-sm">
                Find Advocates
              </Link>
              <Link to="/verify" className="text-white/60 hover:text-white transition-colors text-sm">
                Verify Document
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

      {/* Profile Header */}
      <section className="pt-24 pb-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border-white/10 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-emerald-600/30 via-emerald-500/20 to-teal-600/30" />
            <CardContent className="p-8 -mt-16">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center overflow-hidden border-4 border-[#02040A] shadow-xl">
                    {advocate.profile_photo ? (
                      <img src={advocate.profile_photo} alt={advocate.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-4xl font-bold">
                        {advocate.full_name?.charAt(0) || 'A'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                          {advocate.full_name}
                        </h1>
                        {/* TLS Verified Badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 text-sm font-medium">TLS Verified</span>
                        </div>
                      </div>
                      <p className="text-emerald-400 font-medium text-lg mb-3">
                        {advocate.title || "Advocate of the High Court of Tanzania"}
                      </p>
                      
                      {/* Quick Info Row */}
                      <div className="flex flex-wrap gap-4 text-white/60 text-sm">
                        {advocate.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{advocate.location}</span>
                          </div>
                        )}
                        {advocate.experience_years && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4" />
                            <span>{advocate.experience_years}+ years experience</span>
                          </div>
                        )}
                        {advocate.firm_name && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" />
                            <span>{advocate.firm_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact CTA */}
                    <div className="flex flex-col gap-2">
                      {advocate.show_email && advocate.email && (
                        <a href={`mailto:${advocate.email}`}>
                          <Button className="bg-emerald-500 hover:bg-emerald-600 w-full md:w-auto">
                            <Mail className="w-4 h-4 mr-2" />
                            Contact
                          </Button>
                        </a>
                      )}
                      {advocate.website && (
                        <a href={advocate.website} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full md:w-auto">
                            <Globe className="w-4 h-4 mr-2" />
                            Website
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Profile Content */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About / Professional Summary */}
              {advocate.bio && (
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-emerald-400" />
                      Professional Summary
                    </h3>
                    <p className="text-white/70 leading-relaxed whitespace-pre-line">{advocate.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Practice Areas / Expertise */}
              {advocate.practice_areas && advocate.practice_areas.length > 0 && (
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-emerald-400" />
                      Areas of Practice
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {advocate.practice_areas.map((area, i) => (
                        <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {advocate.education && advocate.education.length > 0 && (
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-emerald-400" />
                      Education & Qualifications
                    </h3>
                    <div className="space-y-4">
                      {advocate.education.map((edu, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{edu.degree}</h4>
                            <p className="text-white/60 text-sm">{edu.institution}</p>
                            {edu.year && <p className="text-white/40 text-sm">{edu.year}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Professional Experience */}
              {advocate.experience && advocate.experience.length > 0 && (
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-emerald-400" />
                      Professional Experience
                    </h3>
                    <div className="space-y-4">
                      {advocate.experience.map((exp, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{exp.position}</h4>
                            <p className="text-white/60 text-sm">{exp.company}</p>
                            {exp.duration && <p className="text-white/40 text-sm">{exp.duration}</p>}
                            {exp.description && <p className="text-white/50 text-sm mt-1">{exp.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notable Achievements */}
              {advocate.achievements && advocate.achievements.length > 0 && (
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-400" />
                      Notable Achievements
                    </h3>
                    <div className="space-y-3">
                      {advocate.achievements.map((achievement, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Medal className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-white">{achievement.title}</p>
                            {achievement.year && <p className="text-white/40 text-sm">{achievement.year}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Publications */}
              {advocate.publications && advocate.publications.length > 0 && (
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Newspaper className="w-5 h-5 text-emerald-400" />
                      Publications & Articles
                    </h3>
                    <div className="space-y-3">
                      {advocate.publications.map((pub, i) => (
                        <div key={i} className="flex items-start gap-3 group">
                          <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-white group-hover:text-emerald-400 transition-colors">
                              {pub.title}
                            </p>
                            <p className="text-white/40 text-sm">{pub.publication} {pub.year && `• ${pub.year}`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Trust Metrics */}
              <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    Trust Metrics
                  </h3>
                  
                  {/* Top Ranking Badge */}
                  {advocate.is_top_10_percent && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2">
                      <span className="text-2xl">⭐</span>
                      <div>
                        <p className="text-yellow-400 font-semibold text-sm">Top 10% Verified</p>
                        <p className="text-white/50 text-xs">Among most verified advocates</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/5 rounded-xl text-center">
                      <p className="text-2xl font-bold text-white">{advocate.documents_stamped || 0}</p>
                      <p className="text-xs text-white/50">Documents Stamped</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl text-center">
                      <p className="text-2xl font-bold text-white">{advocate.verification_count || 0}</p>
                      <p className="text-xs text-white/50">Times Verified</p>
                    </div>
                  </div>
                  
                  {advocate.uses_digital_stamps && (
                    <div className="mt-3 p-2 bg-emerald-500/10 rounded-lg text-center">
                      <p className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                        <Shield className="w-3 h-3" />
                        Uses Digital QR Verification
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Achievements */}
              {advocate.earned_achievements && advocate.earned_achievements.length > 0 && (
                <Card className="bg-white/[0.03] border-yellow-500/20">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-400" />
                      Achievements
                    </h3>
                    <div className="space-y-3">
                      {advocate.earned_achievements.slice(0, 5).map((ach, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-yellow-500/5 rounded-lg">
                          <span className="text-xl">{ach.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-white">{ach.name}</p>
                            <p className="text-xs text-white/40">{ach.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Info */}
              <Card className="bg-white/[0.03] border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    {advocate.show_email && advocate.email && (
                      <a href={`mailto:${advocate.email}`} className="flex items-center gap-3 text-white/70 hover:text-emerald-400 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Mail className="w-5 h-5" />
                        </div>
                        <span className="text-sm truncate">{advocate.email}</span>
                      </a>
                    )}
                    {advocate.show_phone && advocate.phone && (
                      <a href={`tel:${advocate.phone}`} className="flex items-center gap-3 text-white/70 hover:text-emerald-400 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Phone className="w-5 h-5" />
                        </div>
                        <span className="text-sm">{advocate.phone}</span>
                      </a>
                    )}
                    {advocate.firm_name && (
                      <div className="flex items-center gap-3 text-white/70">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-sm">{advocate.firm_name}</span>
                      </div>
                    )}
                    {advocate.location && (
                      <div className="flex items-center gap-3 text-white/70">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="text-sm">{advocate.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bar Admissions */}
              {advocate.bar_admissions && advocate.bar_admissions.length > 0 && (
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Gavel className="w-5 h-5 text-emerald-400" />
                      Bar Admissions
                    </h3>
                    <div className="space-y-2">
                      {advocate.bar_admissions.map((bar, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span className="text-white/70 text-sm">{bar}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Professional Memberships */}
              {advocate.memberships && advocate.memberships.length > 0 && (
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-400" />
                      Professional Memberships
                    </h3>
                    <div className="space-y-2">
                      {advocate.memberships.map((membership, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-emerald-400" />
                          <span className="text-white/70 text-sm">{membership}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Languages */}
              {advocate.languages && advocate.languages.length > 0 && (
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Languages className="w-5 h-5 text-emerald-400" />
                      Languages
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {advocate.languages.map((lang, i) => (
                        <Badge key={i} variant="outline" className="border-white/20 text-white/70">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* TLS Verification Card */}
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">TLS Verified Advocate</h3>
                  <p className="text-white/60 text-sm mb-4">
                    This advocate is verified by the Tanganyika Law Society and authorized to practice law in Tanzania.
                  </p>
                  {advocate.roll_number && (
                    <p className="text-emerald-400 font-mono text-sm">
                      Roll No: {advocate.roll_number}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Client Testimonials */}
      {advocate.testimonials && advocate.testimonials.length > 0 && (
        <section className="pb-20 px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Quote className="w-5 h-5 text-emerald-400" />
                  Client Testimonials
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {advocate.testimonials.map((testimonial, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-5">
                      <p className="text-white/70 italic mb-4">"{testimonial.text}"</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-emerald-400 font-bold">
                            {testimonial.client_name?.charAt(0) || 'C'}
                          </span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{testimonial.client_name}</p>
                          {testimonial.client_title && (
                            <p className="text-white/40 text-xs">{testimonial.client_title}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            Profile verified by Tanganyika Law Society
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/directory" className="text-white/60 hover:text-white transition-colors">
              Find More Advocates
            </Link>
            <Link to="/verify" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Verify a Document
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
