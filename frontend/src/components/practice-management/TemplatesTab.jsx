import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, FileText, Scale, FileSignature, Mail, Gavel, FileCheck, Download, RefreshCw } from "lucide-react";
import axios from "axios";
import { API } from "./shared";

export const TemplatesTab = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({ name: "", category: "contract", content: "", description: "", placeholders: [] });
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [showUseTemplate, setShowUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [useFormData, setUseFormData] = useState({});
  const [generating, setGenerating] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(false);
  const [includeQrStamp, setIncludeQrStamp] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/templates`, { headers });
      setTemplates(response.data.templates || []);
    } catch (error) {
      toast.error("Failed to fetch templates");
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const extractPlaceholders = (content) => {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  };

  const handleContentChange = (newContent) => {
    const placeholders = extractPlaceholders(newContent);
    setFormData({ ...formData, content: newContent, placeholders });
  };

  const insertPlaceholder = (placeholder) => {
    const newContent = formData.content + `{{${placeholder}}}`;
    handleContentChange(newContent);
  };

  const commonPlaceholders = [
    { name: "client_name", label: "Client Name" },
    { name: "client_address", label: "Client Address" },
    { name: "client_phone", label: "Client Phone" },
    { name: "advocate_name", label: "Advocate Name" },
    { name: "date", label: "Date" },
    { name: "case_number", label: "Case Number" },
    { name: "court_name", label: "Court Name" },
    { name: "amount", label: "Amount" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await axios.put(`${API}/api/practice/templates/${editingTemplate.id}`, formData, { headers });
        toast.success("Template updated");
      } else {
        await axios.post(`${API}/api/practice/templates`, formData, { headers });
        toast.success("Template created");
      }
      setShowForm(false);
      setEditingTemplate(null);
      setFormData({ name: "", category: "contract", content: "", description: "", placeholders: [] });
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save template");
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      content: template.content || "",
      description: template.description || "",
      placeholders: template.placeholders || extractPlaceholders(template.content || "")
    });
    setShowForm(true);
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    try {
      await axios.delete(`${API}/api/practice/templates/${template.id}`, { headers });
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handlePreview = () => {
    let content = formData.content;
    formData.placeholders.forEach(p => {
      content = content.replace(new RegExp(`\\{\\{${p}\\}\\}`, 'g'), `<span class="bg-yellow-200 px-1">[${p}]</span>`);
    });
    setPreviewContent(content);
    setShowPreview(true);
  };

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    const initialData = {};
    (template.placeholders || []).forEach(p => { initialData[p] = ""; });
    setUseFormData(initialData);
    setShowUseTemplate(true);
  };

  const handleGenerateFromTemplate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    try {
      const response = await axios.post(`${API}/api/templates/custom/generate`, {
        template_id: selectedTemplate.id,
        data: useFormData,
        include_signature: includeSignature,
        include_qr_stamp: includeQrStamp,
        save_to_vault: true
      }, { headers, responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedTemplate.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Document generated and saved to vault!");
      setShowUseTemplate(false);
    } catch (error) {
      toast.error("Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = { contract: <FileText className="w-5 h-5" />, affidavit: <Scale className="w-5 h-5" />, power_of_attorney: <FileSignature className="w-5 h-5" />, letter: <Mail className="w-5 h-5" />, court_filing: <Gavel className="w-5 h-5" />, other: <FileText className="w-5 h-5" /> };
    return icons[category] || icons.other;
  };

  const getCategoryColor = (category) => {
    const colors = { contract: "bg-emerald-500/20 text-emerald-400", affidavit: "bg-amber-500/20 text-amber-400", power_of_attorney: "bg-purple-500/20 text-purple-400", letter: "bg-blue-500/20 text-blue-400", court_filing: "bg-red-500/20 text-red-400", other: "bg-gray-500/20 text-gray-400" };
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Custom Templates</h2>
          <p className="text-sm text-white/50">Create reusable document templates with placeholders</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingTemplate(null); setFormData({ name: "", category: "contract", content: "", description: "", placeholders: [] }); }} className="bg-tls-blue-electric">
          <Plus className="w-4 h-4 mr-2" /> Create Template
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">{editingTemplate ? 'Edit Template' : 'New Template'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input placeholder="Template Name *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                  <option value="contract">Contract</option>
                  <option value="affidavit">Affidavit</option>
                  <option value="power_of_attorney">Power of Attorney</option>
                  <option value="letter">Letter</option>
                  <option value="court_filing">Court Filing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input placeholder="Description (optional)" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <div className="space-y-2">
                <p className="text-sm text-white/60">Insert Placeholder:</p>
                <div className="flex flex-wrap gap-2">
                  {commonPlaceholders.map(p => (
                    <Button key={p.name} type="button" size="sm" variant="outline" className="border-white/20 text-white text-xs h-7" onClick={() => insertPlaceholder(p.name)}>
                      {`{{${p.name}}}`}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/60">Template Content *</p>
                  <Button type="button" size="sm" variant="outline" className="border-white/20 text-white" onClick={handlePreview}>
                    <Eye className="w-3 h-3 mr-1" /> Preview
                  </Button>
                </div>
                <Textarea placeholder="Enter template content. Use {{placeholder_name}} for dynamic fields." value={formData.content} onChange={(e) => handleContentChange(e.target.value)} className="bg-white/5 border-white/10 text-white min-h-[300px] font-mono text-sm" required />
              </div>
              {formData.placeholders.length > 0 && (
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <p className="text-xs text-emerald-400 mb-2">Detected Placeholders ({formData.placeholders.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.placeholders.map(p => (
                      <Badge key={p} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">{`{{${p}}}`}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">{editingTemplate ? 'Update Template' : 'Save Template'}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingTemplate(null); }} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {templates.length === 0 && !showForm ? (
        <Card className="glass-card border-white/10 border-dashed">
          <CardContent className="p-12 text-center">
            <FileSignature className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/60 mb-2">No custom templates yet</p>
            <p className="text-sm text-white/40 mb-4">Create reusable templates for your frequently used documents</p>
            <Button onClick={() => setShowForm(true)} className="bg-tls-blue-electric">
              <Plus className="w-4 h-4 mr-2" /> Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="glass-card border-white/10 hover:border-white/20 transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(template.category)}`}>
                    {getCategoryIcon(template.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white">{template.name}</h3>
                    {template.description && <p className="text-xs text-white/50 mt-1 line-clamp-2">{template.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={`text-xs capitalize ${getCategoryColor(template.category)}`}>{template.category?.replace('_', ' ')}</Badge>
                      <span className="text-xs text-white/30">{template.placeholders?.length || 0} fields</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8" onClick={() => handleUseTemplate(template)}>
                    <FileCheck className="w-3 h-3 mr-1" /> Use
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 border-white/20 text-white" onClick={() => handleEdit(template)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(template)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Template Preview</DialogTitle>
            <DialogDescription className="text-white/60">Placeholders are highlighted in yellow</DialogDescription>
          </DialogHeader>
          <div className="bg-white rounded-lg p-6 max-h-[500px] overflow-y-auto">
            <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: previewContent.replace(/\n/g, '<br/>') }} />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)} className="bg-tls-blue-electric">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUseTemplate} onOpenChange={setShowUseTemplate}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-2xl w-[90vw]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-500" /> Generate Document
            </DialogTitle>
            <DialogDescription className="text-white/60">Fill in the fields to generate "{selectedTemplate?.name}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {selectedTemplate?.placeholders?.map(placeholder => (
              <div key={placeholder} className="space-y-1">
                <label className="text-xs text-white/60 capitalize">{placeholder.replace(/_/g, ' ')}</label>
                <Input placeholder={`Enter ${placeholder.replace(/_/g, ' ')}`} value={useFormData[placeholder] || ""} onChange={(e) => setUseFormData({ ...useFormData, [placeholder]: e.target.value })} className="bg-white/5 border-white/10 text-white" />
              </div>
            ))}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Include Signature</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={includeSignature} onChange={(e) => setIncludeSignature(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Include QR Stamp</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={includeQrStamp} onChange={(e) => setIncludeQrStamp(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUseTemplate(false)} className="border-white/20 text-white">Cancel</Button>
            <Button onClick={handleGenerateFromTemplate} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700">
              {generating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> Generate PDF</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
