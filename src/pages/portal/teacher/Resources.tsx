import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileText, Link, Loader2, Trash2, Download, Search,
  BookOpen, GraduationCap, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

type ResourceType = "teaching_material" | "past_paper" | "curriculum" | "other";

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  teaching_material: "Teaching Material",
  past_paper: "Past Paper",
  curriculum: "Curriculum Document",
  other: "Other",
};

interface Resource {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  resource_type: ResourceType;
  subject_id: string | null;
  class_id: string | null;
  is_published: boolean;
  created_at: string;
  subject_name?: string;
  class_name?: string;
}

export default function TeacherResources() {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const { toast } = useToast();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("teaching_material");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    loadResources();
    loadFilters();
  }, [tenantId]);

  const loadResources = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("student_resources")
      .select("id, title, description, file_url, resource_type, subject_id, class_id, is_published, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (data) {
      const subjectIds = [...new Set(data.map((r: any) => r.subject_id).filter(Boolean))];
      const classIds = [...new Set(data.map((r: any) => r.class_id).filter(Boolean))];

      const [{ data: subs }, { data: cls }] = await Promise.all([
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : Promise.resolve({ data: [] }),
        classIds.length > 0 ? supabase.from("school_classes").select("id, name").in("id", classIds) : Promise.resolve({ data: [] }),
      ]);

      const subMap = new Map((subs || []).map((s: any) => [s.id, s.name]));
      const clsMap = new Map((cls || []).map((c: any) => [c.id, c.name]));

      setResources(data.map((r: any) => ({
        ...r,
        resource_type: r.resource_type as ResourceType,
        subject_name: subMap.get(r.subject_id) || undefined,
        class_name: clsMap.get(r.class_id) || undefined,
      })));
    }
    setLoading(false);
  };

  const loadFilters = async () => {
    if (!tenantId) return;
    const [{ data: subs }, { data: cls }] = await Promise.all([
      supabase.from("subjects").select("id, name").eq("tenant_id", tenantId).order("name"),
      supabase.from("school_classes").select("id, name").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
    ]);
    setSubjects(subs || []);
    setClasses(cls || []);
  };

  const handleUpload = async () => {
    if (!tenantId || !title.trim()) return;
    setUploading(true);
    try {
      let fileUrl = linkUrl.trim() || null;

      if (file) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `teacher-resources/${tenantId}/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("school-resources")
          .upload(filePath, file);

        if (uploadErr) throw new Error(uploadErr.message);

        const { data: { publicUrl } } = supabase.storage
          .from("school-resources")
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
      }

      if (!fileUrl) throw new Error("Please upload a file or provide a link");

      const { error: insertErr } = await supabase
        .from("student_resources")
        .insert({
          tenant_id: tenantId,
          title: title.trim(),
          description: description.trim() || null,
          file_url: fileUrl,
          resource_type: resourceType,
          subject_id: subjectId || null,
          class_id: classId || null,
          is_published: true,
        });

      if (insertErr) throw new Error(insertErr.message);

      toast({ title: "Resource uploaded", description: "Students can now view this resource." });
      setShowUpload(false);
      resetForm();
      loadResources();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileUrl: string | null) => {
    if (!confirm("Delete this resource permanently?")) return;
    if (fileUrl && fileUrl.includes("/school-resources/")) {
      const path = fileUrl.split("/school-resources/")[1];
      await supabase.storage.from("school-resources").remove([path]);
    }
    await supabase.from("student_resources").delete().eq("id", id);
    toast({ title: "Deleted" });
    loadResources();
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setResourceType("teaching_material");
    setSubjectId("");
    setClassId("");
    setFile(null);
    setLinkUrl("");
  };

  const filtered = resources.filter((r) => {
    if (filterType !== "all" && r.resource_type !== filterType) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getFileType = (url: string) => {
    const ext = url.split(".").pop()?.toLowerCase();
    if (["pdf"].includes(ext || "")) return "PDF";
    if (["doc", "docx"].includes(ext || "")) return "Word";
    if (["xls", "xlsx"].includes(ext || "")) return "Excel";
    if (["ppt", "pptx"].includes(ext || "")) return "PPT";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "Image";
    if (["mp4", "avi", "mov"].includes(ext || "")) return "Video";
    if (url.startsWith("http")) return "Link";
    return "File";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teaching Resources</h1>
          <p className="text-sm text-muted-foreground">Upload and manage materials for your students</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" /> Upload Resource
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(RESOURCE_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3" />
            <p>{search || filterType !== "all" ? "No matching resources" : "No resources uploaded yet"}</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" /> Upload First Resource
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-medium truncate">{r.title}</CardTitle>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">{getFileType(r.file_url || "")}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="secondary" className="text-xs">{RESOURCE_TYPE_LABELS[r.resource_type] || r.resource_type}</Badge>
                  {r.subject_name && <Badge variant="outline" className="text-xs">{r.subject_name}</Badge>}
                  {r.class_name && <Badge variant="outline" className="text-xs">{r.class_name}</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy")}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                      <a href={r.file_url || "#"} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(r.id, r.file_url)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showUpload} onOpenChange={(o) => { if (!o) resetForm(); setShowUpload(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Resource</DialogTitle>
            <DialogDescription>Share teaching materials, past papers, or curriculum documents with your students.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. S.3 Mathematics Notes - Algebra" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the resource..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Resource Type</Label>
                <Select value={resourceType} onValueChange={(v) => setResourceType(v as ResourceType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESOURCE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Subjects</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-md p-4 space-y-3">
              <Label>File or Link</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => { setFile(e.target.files?.[0] || null); setLinkUrl(""); }}
                    className="file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary/10 file:text-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Input
                  placeholder="Paste a link URL..."
                  value={linkUrl}
                  onChange={(e) => { setLinkUrl(e.target.value); setFile(null); }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !title.trim() || (!file && !linkUrl.trim())}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Upload className="h-4 w-4 mr-2" /> Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
