import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { 
  Search, HelpCircle, BookOpen, FileText, Stamp, Users, 
  Calendar, CreditCard, Shield, ChevronDown, ChevronRight,
  ExternalLink, MessageCircle, Mail, Phone, Gavel, Building,
  CheckCircle2, Clock, AlertTriangle, Layers, QrCode, Download
} from "lucide-react";

// Help content organized by category
const HELP_CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    color: "emerald",
    articles: [
      {
        id: "what-is-tls",
        title: "What is the TLS Digital Stamping Platform?",
        content: `The TLS Digital Stamping Platform is a secure system for Tanzanian advocates to digitally stamp and verify legal documents. It provides:

• **Digital Certification** - Add verifiable digital stamps to your legal documents
• **Document Verification** - Allow anyone to verify the authenticity of stamped documents
• **Practice Management** - Manage clients, cases, calendar, and tasks
• **Stamp Tracking** - Track all issued stamps and their verification status

The platform is operated by the Tanganyika Law Society (TLS) in partnership with IDC to ensure authenticity and legal compliance.`
      },
      {
        id: "account-setup",
        title: "How do I set up my account?",
        content: `To set up your TLS Portal account:

1. **Registration** - Visit the TLS Portal and click "Register"
2. **Enter Details** - Provide your TLS Member Number, Roll Number, and personal information
3. **Verification** - Your details will be verified against TLS records
4. **Signature Upload** - Upload or draw your digital signature
5. **Profile Completion** - Add your firm details and contact information

**Note:** Only registered TLS members can create an account. Your practicing status must be "Active" to use stamping features.`
      },
      {
        id: "dashboard-overview",
        title: "Understanding the Dashboard",
        content: `Your dashboard provides a quick overview of your activity:

• **Stamp Statistics** - Total stamps issued, valid, revoked, and expired
• **Recent Activity** - Your latest stamps and verifications
• **Quick Actions** - Fast access to stamp document, verify, and practice management
• **Notifications** - Important updates from TLS

The sidebar navigation gives you access to all features including Document Stamping, Batch Stamping, Stamp Ledger, and Practice Management tools.`
      }
    ]
  },
  {
    id: "document-stamping",
    title: "Document Stamping",
    icon: Stamp,
    color: "blue",
    articles: [
      {
        id: "how-to-stamp",
        title: "How do I stamp a document?",
        content: `To stamp a document:

1. **Navigate** to "Stamp Document" in the sidebar
2. **Upload** your PDF document (or use camera to scan)
3. **Select Stamp Type** - Choose Certification or Notarization
4. **Position the Stamp** - Drag to place where you want the stamp
5. **Fill Details** - Enter recipient name, description, and document type
6. **Preview** - Click "Preview Stamped PDF" to review
7. **Generate** - Click "Generate Verified Document" to create final PDF

The stamped PDF will automatically download with a unique verification QR code.`
      },
      {
        id: "stamp-types",
        title: "What stamp types are available?",
        content: `The platform offers two stamp types:

**Certification Stamp**
• Used for certifying true copies of documents
• Includes signature placeholder
• Options: Print signature later OR embed digital signature
• Larger stamp size (150 × 95 PT)

**Notarization Stamp**
• Used for notarizing documents and affidavits
• No signature placeholder
• Compact design (140 × 75 PT)

Both stamps include:
• TLS logo and "VERIFIED" text
• Advocate name and roll number
• Date and time of stamping
• Unique QR code for verification
• Document hash for integrity checking`
      },
      {
        id: "scan-document",
        title: "How do I scan documents with my camera?",
        content: `The platform includes "CamScanner-like" functionality:

1. Click **"Scan Doc"** button on the stamp page
2. **Capture Pages** - Take photos of each page
3. **Auto-Crop** - The system automatically detects document edges and crops
4. **Enhance** - Pages are enhanced for better readability
5. **Manage Pages** - Reorder or delete pages as needed
6. **Submit** - Click "Done" to merge all pages into a single PDF

The auto-crop feature uses AI to:
• Detect document boundaries
• Correct perspective distortion
• Enhance contrast and readability
• Remove shadows and noise`
      },
      {
        id: "batch-stamping",
        title: "How do I stamp multiple documents at once?",
        content: `Batch stamping allows you to stamp up to 25 documents simultaneously:

1. Go to **"Batch Stamp"** in the sidebar
2. **Choose Mode**:
   - Same Stamp for All: Apply identical settings to all documents
   - Different per Document: Customize each document individually
3. **Upload PDFs** - Drag and drop or select multiple files
4. **Configure Settings** - Set stamp type, position, recipient, etc.
5. **Process** - Click "Stamp X Documents"
6. **Download** - A ZIP file with all stamped documents will download

Each document receives a unique stamp ID for individual verification.`
      }
    ]
  },
  {
    id: "verification",
    title: "Stamp Verification",
    icon: Shield,
    color: "purple",
    articles: [
      {
        id: "how-to-verify",
        title: "How do I verify a stamped document?",
        content: `There are multiple ways to verify a stamped document:

**Method 1: QR Code**
• Scan the QR code on the stamp with any smartphone
• You'll be redirected to the verification page

**Method 2: Stamp ID**
• Go to "Stamp Ledger" → "Verify Stamp" tab
• Enter the Stamp ID (e.g., TLS-20240101-ABC12345)
• Click "Verify"

**Method 3: Document Hash**
• If you have the original PDF, you can verify by document hash
• The hash ensures the document hasn't been modified

**Method 4: Public Verification Page**
• Visit: ${process.env.REACT_APP_BACKEND_URL}/verify/[STAMP_ID]
• Anyone can verify without logging in`
      },
      {
        id: "verification-results",
        title: "Understanding verification results",
        content: `When you verify a stamp, you'll see:

**Valid (Green)**
• The stamp is authentic and active
• Document has not been modified
• Advocate's practicing status is confirmed

**Revoked (Red)**
• The stamp has been revoked by the advocate
• Shows revocation reason and date
• Document should not be relied upon

**Expired (Yellow)**
• The stamp validity period has passed
• May still indicate the document was stamped
• Check with the advocate for renewal

**Invalid (Red)**
• Stamp ID not found in the system
• Document may be fraudulent
• Contact TLS for assistance`
      },
      {
        id: "revoke-stamp",
        title: "How do I revoke a stamp?",
        content: `You may need to revoke a stamp if:
• An error was made in the document
• The document is no longer valid
• Fraud or misuse is suspected

To revoke:
1. Go to **"Stamp Ledger"**
2. Find the stamp in the list
3. Click the **trash icon** or "Revoke" button
4. Enter a **reason** for revocation (required)
5. Confirm the revocation

**Important:** Revocation is permanent and cannot be undone. The stamp will show as "Revoked" to anyone who verifies it.`
      }
    ]
  },
  {
    id: "practice-management",
    title: "Practice Management",
    icon: Gavel,
    color: "amber",
    articles: [
      {
        id: "clients-management",
        title: "How do I manage clients?",
        content: `The Clients feature helps you organize your client information:

**Adding Clients**
1. Go to Practice Management → Clients
2. Click "New Client"
3. Enter client details (name, contact, type)
4. Save the client

**Client Types**
• Individual - Personal clients
• Corporate - Company clients
• Government - Government agencies
• NGO - Non-profit organizations

**Client Features**
• Contact information storage
• Link clients to cases
• View client history
• Generate client reports`
      },
      {
        id: "cases-management",
        title: "How do I manage cases?",
        content: `Cases help you track legal matters:

**Creating Cases**
1. Go to Practice Management → Cases
2. Click "New Case"
3. Select a client (must add clients first)
4. Enter case details:
   - Title and reference number
   - Case type (Litigation, Corporate, Family, etc.)
   - Court and opposing party
   - Priority and status

**Case Statuses**
• Active - Currently being worked on
• Pending - Waiting for action/response
• On Hold - Temporarily paused
• Closed - Completed

**Linking to Calendar**
• Cases can be linked to calendar events
• Track hearings and deadlines per case`
      },
      {
        id: "calendar-events",
        title: "How do I use the calendar?",
        content: `The calendar helps you manage your schedule:

**Event Types**
• Court Hearing - Court appearances
• Meeting - Client and other meetings
• Deadline - Filing and other deadlines
• Reminder - Personal reminders
• Appointment - General appointments

**Creating Events**
1. Go to Practice Management → Calendar
2. Click on a date or "Add Event"
3. Fill in event details
4. Link to client/case if applicable
5. Save

**Event Actions**
• Mark as Complete - Record outcome
• Reschedule - Move to new date
• Cancel - With reason
• Create Follow-up Task

**Drag & Drop**
• Drag events to reschedule them
• View by month, week, or day`
      },
      {
        id: "tasks-management",
        title: "How do I manage tasks?",
        content: `Tasks help you track to-dos:

**Creating Tasks**
1. Go to Practice Management → Tasks
2. Click "New Task"
3. Enter task details:
   - Title and description
   - Due date
   - Priority (High, Medium, Low)
   - Link to client/case

**Task Features**
• Filter by status (Pending, Completed)
• Filter by priority
• Sort by due date
• Mark as complete

**Calendar Integration**
• Tasks with due dates appear on calendar
• Overdue tasks show warnings
• Convert events to follow-up tasks`
      }
    ]
  },
  {
    id: "billing",
    title: "Billing & Subscriptions",
    icon: CreditCard,
    color: "cyan",
    articles: [
      {
        id: "subscription-plans",
        title: "What subscription plans are available?",
        content: `The platform offers flexible subscription options:

**Free Trial**
• 30 days free access
• All features included
• No payment required to start

**Monthly Plan**
• Pay-as-you-go flexibility
• Cancel anytime
• Automatic renewal

**Annual Plan**
• Discounted rate (save ~20%)
• One payment per year
• Best value for regular users

**Stamp Packages**
• Pay-per-stamp options
• Purchase stamp credits
• Use as needed

Contact TLS for current pricing and special offers.`
      },
      {
        id: "payment-methods",
        title: "What payment methods are accepted?",
        content: `We accept various payment methods:

**Mobile Money**
• M-Pesa
• Tigo Pesa
• Airtel Money
• Halopesa

**Bank Transfer**
• Direct bank deposit
• Online banking

**Other Methods**
• Credit/Debit cards (coming soon)
• KwikPay integration (coming soon)

For assistance with payments, contact TLS support.`
      }
    ]
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: AlertTriangle,
    color: "red",
    articles: [
      {
        id: "stamp-not-visible",
        title: "Why isn't my stamp visible on the document?",
        content: `If the stamp isn't visible:

**Check Position**
• Ensure the stamp isn't placed outside the document
• Try repositioning to center or corner

**Document Issues**
• Some PDFs may have issues - try re-uploading
• Ensure the PDF isn't encrypted or password-protected

**Browser Issues**
• Clear browser cache
• Try a different browser (Chrome recommended)
• Disable browser extensions

**Still Having Issues?**
• Contact support with your stamp ID
• Include a screenshot of the problem`
      },
      {
        id: "verification-failed",
        title: "Why is verification failing?",
        content: `Verification may fail for several reasons:

**Invalid Stamp ID**
• Check for typos in the stamp ID
• Ensure you're entering the complete ID (TLS-XXXXXXXX-XXXXXXXX)

**Document Modified**
• If the PDF was edited after stamping, hash won't match
• Re-stamp the original document if needed

**Network Issues**
• Check your internet connection
• Try refreshing the page

**Stamp Revoked/Expired**
• The stamp may have been revoked by the advocate
• Check the stamp status in Stamp Ledger`
      },
      {
        id: "upload-errors",
        title: "Why can't I upload my document?",
        content: `Document upload issues:

**File Size**
• Maximum file size: 10MB per document
• Compress large PDFs before uploading

**File Format**
• Only PDF format is supported for stamping
• Convert other formats to PDF first
• For images, use the "Scan Doc" feature

**Browser Compatibility**
• Use a modern browser (Chrome, Firefox, Edge)
• Enable JavaScript
• Allow file uploads in browser settings

**Network Timeout**
• Slow connections may cause timeouts
• Try uploading smaller files
• Check your internet speed`
      }
    ]
  }
];

const HelpCenterPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState("getting-started");
  const [expandedArticle, setExpandedArticle] = useState(null);

  // Filter articles based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return HELP_CATEGORIES;
    
    const query = searchQuery.toLowerCase();
    return HELP_CATEGORIES.map(cat => ({
      ...cat,
      articles: cat.articles.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query)
      )
    })).filter(cat => cat.articles.length > 0);
  }, [searchQuery]);

  // Get color classes
  const getColorClasses = (color) => {
    const colors = {
      emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      red: "bg-red-500/20 text-red-400 border-red-500/30"
    };
    return colors[color] || colors.emerald;
  };

  const getIconBgClass = (color) => {
    const colors = {
      emerald: "bg-emerald-500/20",
      blue: "bg-blue-500/20",
      purple: "bg-purple-500/20",
      amber: "bg-amber-500/20",
      cyan: "bg-cyan-500/20",
      red: "bg-red-500/20"
    };
    return colors[color] || colors.emerald;
  };

  const getIconTextClass = (color) => {
    const colors = {
      emerald: "text-emerald-400",
      blue: "text-blue-400",
      purple: "text-purple-400",
      amber: "text-amber-400",
      cyan: "text-cyan-400",
      red: "text-red-400"
    };
    return colors[color] || colors.emerald;
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
            <HelpCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Help Center</h1>
          <p className="text-white/50 mt-2">
            Find answers to common questions and learn how to use the TLS Digital Stamping Platform
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-white/50 mt-2 text-center">
              Found {filteredCategories.reduce((sum, cat) => sum + cat.articles.length, 0)} articles
            </p>
          )}
        </div>

        {/* Quick Links */}
        {!searchQuery && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ">
            {[
              { icon: Stamp, label: "Stamp Documents", link: "/stamp-document" },
              { icon: Shield, label: "Verify Stamps", link: "/stamp-ledger" },
              { icon: Layers, label: "Batch Stamping", link: "/batch-stamp" },
              { icon: Calendar, label: "Calendar", link: "/practice-management" }
            ].map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-center group"
              >
                <item.icon className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-white">{item.label}</p>
              </a>
            ))}
          </div>
        )}

        {/* Categories */}
        <div className=" space-y-4">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getIconBgClass(category.color)}`}>
                    <category.icon className={`w-5 h-5 ${getIconTextClass(category.color)}`} />
                  </div>
                  <div className="text-left">
                    <h2 className="font-semibold text-white">{category.title}</h2>
                    <p className="text-xs text-white/50">{category.articles.length} articles</p>
                  </div>
                </div>
                {expandedCategory === category.id ? (
                  <ChevronDown className="w-5 h-5 text-white/50" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/50" />
                )}
              </button>

              {/* Articles */}
              {expandedCategory === category.id && (
                <div className="border-t border-white/10">
                  {category.articles.map((article, idx) => (
                    <div key={article.id} className={idx > 0 ? "border-t border-white/5" : ""}>
                      {/* Article Title */}
                      <button
                        onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                      >
                        <span className="text-white/80 text-left">{article.title}</span>
                        {expandedArticle === article.id ? (
                          <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                        )}
                      </button>

                      {/* Article Content */}
                      {expandedArticle === article.id && (
                        <div className="px-4 pb-4">
                          <div className="p-4 bg-white/5 rounded-xl prose prose-invert prose-sm max-w-none">
                            {article.content.split('\n\n').map((paragraph, pIdx) => {
                              // Check if it's a list
                              if (paragraph.startsWith('•') || paragraph.includes('\n•')) {
                                const items = paragraph.split('\n').filter(item => item.trim());
                                return (
                                  <ul key={pIdx} className="list-none space-y-1 my-2">
                                    {items.map((item, iIdx) => (
                                      <li key={iIdx} className="text-white/70 text-sm pl-4 relative">
                                        {item.startsWith('•') ? (
                                          <>
                                            <span className="absolute left-0 text-emerald-400">•</span>
                                            <span dangerouslySetInnerHTML={{ 
                                              __html: item.slice(1).trim()
                                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                            }} />
                                          </>
                                        ) : (
                                          <span dangerouslySetInnerHTML={{ 
                                            __html: item
                                              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                          }} />
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                );
                              }
                              
                              // Check if it's a numbered list
                              if (/^\d+\./.test(paragraph)) {
                                const items = paragraph.split('\n').filter(item => item.trim());
                                return (
                                  <ol key={pIdx} className="list-none space-y-1 my-2">
                                    {items.map((item, iIdx) => (
                                      <li key={iIdx} className="text-white/70 text-sm pl-6 relative">
                                        <span className="absolute left-0 text-emerald-400 font-medium">
                                          {item.match(/^\d+/)?.[0]}.
                                        </span>
                                        <span dangerouslySetInnerHTML={{ 
                                          __html: item.replace(/^\d+\.\s*/, '')
                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                        }} />
                                      </li>
                                    ))}
                                  </ol>
                                );
                              }
                              
                              // Regular paragraph
                              return (
                                <p 
                                  key={pIdx} 
                                  className="text-white/70 text-sm my-2"
                                  dangerouslySetInnerHTML={{ 
                                    __html: paragraph
                                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className=" bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-semibold text-white mb-2">Still need help?</h3>
              <p className="text-white/60">Our support team is ready to assist you with any questions.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href="mailto:support@tls.or.tz" 
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-white"
              >
                <Mail className="w-4 h-4" />
                support@tls.or.tz
              </a>
              <a 
                href="tel:+255222115168" 
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-white"
              >
                <Phone className="w-4 h-4" />
                +255 22 211 5168
              </a>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-white/30">
          Last updated: March 2026 • Documentation managed by IDC
        </p>
      </div>
    </DashboardLayout>
  );
};

export default HelpCenterPage;
