import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { 
  Search, Plus, Download, Share2, Trash2, 
  FolderOpen, FileText, FileCheck, FileArchive, 
  QrCode, LayoutList, Grid3X3
} from "lucide-react";
import axios from "axios";
import { API, ConfirmDialog, formatFileSize } from "./shared";

export const DocumentsTab = ({ token }) => {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState(() => window.innerWidth >= 768 ? "table" : "card");

  const csrfToken = localStorage.getItem("tls_csrf_token") || "";
  const headers = { 
    Authorization: `Bearer ${token}`,
    "X-CSRF-Token": csrfToken
  };

  const fetchData = async () => {
    try {
      const params = { folder: selectedFolder };
      if (searchQuery) params.search = searchQuery;
      
      const [docsRes, foldersRes] = await Promise.all([
        axios.get(`${API}/api/practice/documents`, { headers, params }),
        axios.get(`${API}/api/practice/folders`, { headers })
      ]);
      setDocuments(docsRes.data.documents);
      setFolders(foldersRes.data.folders);
    } catch (error) {
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedFolder, searchQuery]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    formData.append('folder', selectedFolder || 'General');

    try {
      await axios.post(`${API}/api/practice/documents`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Document uploaded");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    if (doc.is_seed_data) {
      toast.info("This is a demo document. Upload a real document to test downloads.");
      return;
    }
    
    try {
      const response = await axios.get(`${API}/api/practice/documents/${doc.id}/download`, {
        headers,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: doc.file_type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.original_filename || doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Document downloaded!");
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const handleShare = async (doc) => {
    if (doc.is_seed_data) {
      toast.info("This is a demo document. Upload a real document to share.");
      return;
    }
    
    try {
      const response = await axios.get(`${API}/api/practice/documents/${doc.id}/download`, {
        headers,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: doc.file_type || 'application/pdf' });
      const file = new File([blob], doc.original_filename || doc.name, { type: doc.file_type || 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: doc.name,
          text: 'Document from TLS Portal'
        });
        toast.success("Document shared!");
      } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.original_filename || doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.info("Document downloaded. Share it manually via WhatsApp or email.");
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error("Failed to share document");
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDoc) return;
    try {
      await axios.delete(`${API}/api/practice/documents/${deleteDoc.id}`, { headers });
      toast.success("Document deleted successfully");
      setDeleteDoc(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const getDocIcon = (doc) => {
    if (doc.generated_doc_id) return <FileCheck className="w-5 h-5 text-emerald-500" />;
    if (doc.file_type?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (doc.file_type?.includes('image')) return <FileArchive className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-teal-500" />;
  };

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={!!deleteDoc}
        onOpenChange={(open) => !open && setDeleteDoc(null)}
        title="Delete Document"
        description={`Are you sure you want to delete "${deleteDoc?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">Document Vault</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input 
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border-white/10 text-white pl-9 w-48"
            />
          </div>
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button className="bg-tls-blue-electric" disabled={uploading} asChild>
              <span><Plus className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload'}</span>
            </Button>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!selectedFolder ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFolder(null)}
            className={!selectedFolder ? "bg-tls-blue-electric" : "border-white/20 text-white"}
          >
            All Documents ({documents.length})
          </Button>
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={selectedFolder === folder.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFolder(folder.name)}
              className={selectedFolder === folder.name ? "bg-tls-blue-electric" : "border-white/20 text-white"}
            >
              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: folder.color }} />
              {folder.name}
            </Button>
          ))}
        </div>
        <div className="hidden md:flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
          <button 
            onClick={() => setViewMode("table")} 
            className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
            data-testid="docs-view-table-btn"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode("card")} 
            className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
            data-testid="docs-view-card-btn"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {documents.length > 0 && viewMode === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white/50 text-sm font-medium">Document</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Folder</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Size</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Date</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Status</th>
                <th className="text-right p-3 text-white/50 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors" data-testid={`doc-row-${doc.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.generated_doc_id ? 'bg-emerald-500/20' : doc.is_seed_data ? 'bg-amber-500/20' : 'bg-teal-500/20'}`}>
                        {getDocIcon(doc)}
                      </div>
                      <span className="text-white font-medium truncate max-w-[200px]">{doc.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">{doc.folder}</Badge>
                  </td>
                  <td className="p-3 text-white/70 text-sm">{formatFileSize(doc.file_size)}</td>
                  <td className="p-3 text-white/50 text-sm">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    {doc.is_seed_data && <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30 mr-1">Demo</Badge>}
                    {doc.generated_doc_id && <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mr-1">Generated</Badge>}
                    {doc.verification_id && <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">Verified</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownload(doc)} 
                        className={`h-8 w-8 p-0 ${doc.is_seed_data ? 'text-white/20 cursor-not-allowed' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                        title={doc.is_seed_data ? "Demo document" : "Download"}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleShare(doc)} 
                        className={`h-8 w-8 p-0 ${doc.is_seed_data ? 'text-white/20 cursor-not-allowed' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                        title={doc.is_seed_data ? "Demo document" : "Share"}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteDoc(doc)} className="h-8 w-8 p-0 text-red-400/70 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : documents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="glass-card border-white/10 hover:border-white/20 transition-all group" data-testid={`doc-card-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.generated_doc_id ? 'bg-emerald-500/20' : doc.is_seed_data ? 'bg-amber-500/20' : 'bg-teal-500/20'}`}>
                    {getDocIcon(doc)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{doc.name}</h3>
                    <p className="text-xs text-white/50">{formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs border-white/20 text-white/60">{doc.folder}</Badge>
                      {doc.is_seed_data && <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">Demo</Badge>}
                      {doc.generated_doc_id && <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Generated</Badge>}
                      {doc.verification_id && (
                        <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                          <QrCode className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownload(doc)} 
                    className={`flex-1 text-xs ${doc.is_seed_data ? 'border-white/10 text-white/30 cursor-not-allowed' : 'border-white/20 text-white hover:bg-white/10'}`}
                  >
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleShare(doc)} 
                    className={`flex-1 text-xs ${doc.is_seed_data ? 'border-white/10 text-white/30 cursor-not-allowed' : 'border-white/20 text-white hover:bg-white/10'}`}
                  >
                    <Share2 className="w-3 h-3 mr-1" /> Share
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteDoc(doc)} className="text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {documents.length === 0 && !loading && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No documents yet</p>
          <p className="text-white/30 text-sm mt-1">Upload documents or generate from templates</p>
        </div>
      )}
    </div>
  );
};
