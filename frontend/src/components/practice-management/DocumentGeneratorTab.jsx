import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { toast } from "sonner";
import { 
  FileText, FileCheck, Download, Eye, RefreshCw, History, UserCheck, Scale, Mail, 
  Gavel, Building, QrCode, Pen, FolderOpen, AlertTriangle, Type, Send, Phone, Stamp 
} from "lucide-react";
import axios from "axios";
import { API } from "./shared";

export const DocumentGeneratorTab = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(false);
  const [includeQrStamp, setIncludeQrStamp] = useState(false);
  const [userSignature, setUserSignature] = useState(null);
  const [signatureType, setSignatureType] = useState("existing");
  const [typedSignature, setTypedSignature] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [saveToVault, setSaveToVault] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState(null);
  const [lastGeneratedFileName, setLastGeneratedFileName] = useState("");
  const [sharing, setSharing] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/api/templates/list`, { headers });
      setTemplates(response.data.templates || []);
    } catch (error) {
      toast.error("Failed to load document templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchSignature = async () => {
    try {
      const response = await axios.get(`${API}/api/advocate/signature`, { headers });
      if (response.data.signature_data) {
        setUserSignature(response.data.signature_data);
        setSignatureType("existing");
      }
    } catch (error) {}
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/api/templates/history`, { headers });
      setHistory(response.data.documents || []);
    } catch (error) {}
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/clients`, { headers });
      setClients(response.data.clients || []);
    } catch (error) {}
  };

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/cases`, { headers });
      setCases(response.data.cases || []);
    } catch (error) {}
  };

  useEffect(() => {
    fetchTemplates();
    fetchSignature();
    fetchHistory();
    fetchClients();
    fetchCases();
  }, []);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setPreviewHtml(null);
    setShowPreview(false);
    const initialData = {};
    template.placeholders?.forEach(p => { initialData[p] = ""; });
    setFormData(initialData);
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    try {
      const response = await axios.post(`${API}/api/templates/preview`, {
        template_id: selectedTemplate.id,
        data: formData,
        include_signature: includeSignature,
        include_qr_stamp: includeQrStamp
      }, { headers });
      setPreviewHtml(response.data.content);
      setShowPreview(true);
    } catch (error) {
      toast.error("Failed to preview document");
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    if (includeSignature && signatureType === "typed" && !typedSignature.trim()) {
      toast.error("Please enter your typed signature");
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/api/templates/generate`, {
        template_id: selectedTemplate.id,
        data: formData,
        include_signature: includeSignature,
        include_qr_stamp: includeQrStamp,
        save_to_vault: saveToVault,
        client_id: selectedClientId || null,
        case_id: selectedCaseId || null
      }, { headers, responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const fileName = `${selectedTemplate.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      setLastGeneratedPdf(blob);
      setLastGeneratedFileName(fileName);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(saveToVault ? "Document generated, saved to vault, and downloaded!" : "Document generated and downloaded!");
      fetchHistory();
      setShowShareModal(true);
    } catch (error) {
      toast.error("Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!lastGeneratedPdf) return;
    const url = window.URL.createObjectURL(lastGeneratedPdf);
    const link = document.createElement('a');
    link.href = url;
    link.download = lastGeneratedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Document downloaded!");
  };

  const handleShareWhatsApp = async () => {
    if (!lastGeneratedPdf) { toast.error("No document to share"); return; }
    setSharing(true);
    try {
      const file = new File([lastGeneratedPdf], lastGeneratedFileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: lastGeneratedFileName, text: 'Legal document from TLS Portal' });
        toast.success("Document shared!");
      } else {
        handleDownloadAgain();
        toast.info("Document downloaded. Please attach it manually in WhatsApp.");
        window.open('https://wa.me/', '_blank');
      }
    } catch (error) {
      if (error.name !== 'AbortError') toast.error("Failed to share document");
    } finally {
      setSharing(false);
    }
  };

  const formatPlaceholder = (name) => name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const getCategoryIcon = (category) => {
    const icons = { authorization: <UserCheck className="w-5 h-5" />, sworn_statement: <Scale className="w-5 h-5" />, notice: <Mail className="w-5 h-5" />, contract: <FileText className="w-5 h-5" />, court: <Gavel className="w-5 h-5" />, estate: <Building className="w-5 h-5" /> };
    return icons[category] || <FileText className="w-5 h-5" />;
  };

  const getCategoryColor = (category) => {
    const colors = { authorization: "bg-purple-500/20 text-purple-400 border-purple-500/30", sworn_statement: "bg-amber-500/20 text-amber-400 border-amber-500/30", notice: "bg-blue-500/20 text-blue-400 border-blue-500/30", contract: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", court: "bg-red-500/20 text-red-400 border-red-500/30", estate: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" };
    return colors[category] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-white/50" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-tls-blue-electric" /> Legal Document Generator
          </h2>
          <p className="text-sm text-white/50 mt-1">Generate professional legal documents with digital signatures and QR verification</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="border-white/20 text-white" data-testid="toggle-history-btn">
          <History className="w-4 h-4 mr-2" /> History ({history.length})
        </Button>
      </div>

      {showHistory && history.length > 0 && (
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Recent Documents</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.slice(0, 10).map((doc, idx) => (
                <div key={doc.id || idx} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm text-white">{doc.template_name}</p>
                    <p className="text-xs text-white/40">{new Date(doc.generated_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {doc.include_signature && <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Signed</Badge>}
                    {doc.include_qr_stamp && <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">QR</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedTemplate ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="glass-card border-white/10 hover:border-tls-blue-electric/50 transition-all cursor-pointer group" onClick={() => handleSelectTemplate(template)} data-testid={`template-card-${template.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColor(template.category)}`}>{getCategoryIcon(template.category)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-tls-blue-electric transition-colors">{template.name}</h3>
                    {template.name_sw && template.name_sw !== template.name && <p className="text-xs text-white/40 italic">{template.name_sw}</p>}
                    <p className="text-sm text-white/60 mt-1">{template.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className={`text-xs capitalize ${getCategoryColor(template.category)}`}>{template.category?.replace('_', ' ')}</Badge>
                      <span className="text-xs text-white/30">{template.placeholders?.length || 0} fields</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card className="glass-card border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(selectedTemplate.category)}`}>{getCategoryIcon(selectedTemplate.category)}</div>
                    <div>
                      <CardTitle className="text-white">{selectedTemplate.name}</CardTitle>
                      <p className="text-xs text-white/50">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)} className="border-white/20 text-white" data-testid="back-to-templates-btn">← Back</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/60 font-medium">Fill in the document details:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedTemplate.placeholders?.map((placeholder) => (
                    <div key={placeholder} className="space-y-1">
                      <label className="text-xs text-white/60">{formatPlaceholder(placeholder)}</label>
                      {placeholder.includes('content') || placeholder.includes('description') || placeholder.includes('bequests') ? (
                        <Textarea placeholder={`Enter ${formatPlaceholder(placeholder).toLowerCase()}`} value={formData[placeholder] || ""} onChange={(e) => setFormData({ ...formData, [placeholder]: e.target.value })} className="bg-white/5 border-white/10 text-white" rows={3} />
                      ) : (
                        <Input placeholder={`Enter ${formatPlaceholder(placeholder).toLowerCase()}`} value={formData[placeholder] || ""} onChange={(e) => setFormData({ ...formData, [placeholder]: e.target.value })} className="bg-white/5 border-white/10 text-white" type={placeholder.includes('date') ? 'date' : placeholder.includes('amount') || placeholder.includes('price') ? 'number' : 'text'} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-white/10 mt-4">
                  <p className="text-sm text-white/60 font-medium mb-3">Link Document (Optional)</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-white/60">Link to Client</label>
                      <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm" data-testid="client-select">
                        <option value="">-- No Client --</option>
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-white/60">Link to Case</label>
                      <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm" data-testid="case-select">
                        <option value="">-- No Case --</option>
                        {cases.map(c => <option key={c.id} value={c.id}>{c.title} ({c.reference})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardHeader className="pb-3"><CardTitle className="text-sm text-white flex items-center gap-2"><Stamp className="w-4 h-4 text-emerald-500" /> Document Authentication</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-blue-400" />
                    <div><p className="text-white font-medium">QR Verification Stamp</p><p className="text-xs text-white/50">Add a scannable QR code for document verification</p></div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={includeQrStamp} onChange={(e) => setIncludeQrStamp(e.target.checked)} className="sr-only peer" data-testid="qr-stamp-toggle" />
                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Pen className="w-5 h-5 text-purple-400" />
                      <div><p className="text-white font-medium">Digital Signature</p><p className="text-xs text-white/50">Add your digital signature to the document</p></div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={includeSignature} onChange={(e) => setIncludeSignature(e.target.checked)} className="sr-only peer" data-testid="signature-toggle" />
                      <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {includeSignature && (
                    <div className="pl-4 space-y-3 border-l-2 border-purple-500/30">
                      {userSignature && (
                        <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${signatureType === 'existing' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-white/5 hover:bg-white/10'}`}>
                          <input type="radio" name="signatureType" checked={signatureType === 'existing'} onChange={() => setSignatureType('existing')} className="hidden" />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${signatureType === 'existing' ? 'border-purple-500 bg-purple-500' : 'border-white/30'}`}>
                            {signatureType === 'existing' && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">Use Saved Signature</p>
                            <img src={`data:image/png;base64,${userSignature}`} alt="Your signature" className="h-10 mt-1 object-contain" />
                          </div>
                        </label>
                      )}
                      <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${signatureType === 'typed' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-white/5 hover:bg-white/10'}`}>
                        <input type="radio" name="signatureType" checked={signatureType === 'typed'} onChange={() => setSignatureType('typed')} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${signatureType === 'typed' ? 'border-purple-500 bg-purple-500' : 'border-white/30'}`}>
                          {signatureType === 'typed' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2"><Type className="w-4 h-4 text-white/60" /><p className="text-white text-sm font-medium">Type Signature</p></div>
                          {signatureType === 'typed' && <Input placeholder="Type your full name as signature" value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} className="bg-white/10 border-white/20 text-white italic font-serif" onClick={(e) => e.stopPropagation()} />}
                        </div>
                      </label>
                      {!userSignature && (
                        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                          <p className="text-amber-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />No saved signature found. Use typed signature or go to Profile to upload one.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-emerald-400" />
                    <div><p className="text-white font-medium">Auto-Save to Document Vault</p><p className="text-xs text-white/50">Save generated document to your vault for easy access</p></div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={saveToVault} onChange={(e) => setSaveToVault(e.target.checked)} className="sr-only peer" data-testid="save-vault-toggle" />
                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handlePreview} variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10" data-testid="preview-document-btn">
                <Eye className="w-4 h-4 mr-2" /> Preview Document
              </Button>
              <Button onClick={handleGenerate} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={generating} data-testid="generate-document-btn">
                {generating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> Generate & Save</>}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="glass-card border-white/10 sticky top-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white flex items-center gap-2"><Eye className="w-4 h-4 text-tls-blue-electric" />Document Preview</CardTitle></CardHeader>
              <CardContent>
                {showPreview && previewHtml ? (
                  <div className="bg-white rounded-lg p-4 max-h-[600px] overflow-y-auto text-black prose prose-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <div className="bg-white/5 rounded-lg p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-white/30" />
                    <p className="text-white/50 text-sm">Fill in the form and click "Preview Document" to see a preview</p>
                    <p className="text-white/30 text-xs mt-2">The preview will show how your document will look</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Send className="w-5 h-5 text-emerald-500" />Document Generated Successfully!</DialogTitle>
            <DialogDescription className="text-white/60">Your document has been generated{saveToVault ? ' and saved to your vault' : ''}. Share it with your client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><FileCheck className="w-5 h-5 text-emerald-500" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{lastGeneratedFileName}</p>
                  <p className="text-xs text-white/50">PDF Document • Ready to share</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="border-white/20 text-white flex-col h-auto py-5 hover:bg-white/10" onClick={handleDownloadAgain} data-testid="download-again-btn">
                <Download className="w-7 h-7 mb-2 text-blue-400" /><span className="text-sm font-medium">Download</span><span className="text-xs text-white/50">Save & share manually</span>
              </Button>
              <Button variant="outline" className="border-white/20 text-white flex-col h-auto py-5 hover:bg-emerald-500/20" onClick={handleShareWhatsApp} disabled={sharing} data-testid="share-whatsapp-btn">
                <Phone className="w-7 h-7 mb-2 text-emerald-500" /><span className="text-sm font-medium">{sharing ? 'Sharing...' : 'WhatsApp'}</span><span className="text-xs text-white/50">Share directly</span>
              </Button>
            </div>
            <p className="text-xs text-white/40 text-center">WhatsApp share uses your device's share feature. If not supported, download and attach manually.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowShareModal(false); setLastGeneratedPdf(null); setLastGeneratedFileName(""); }} className="border-white/20 text-white">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
