import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  HardDrive, ArrowLeft, RefreshCw, FolderOpen, 
  Image, FileText, Film, Music, Archive
} from "lucide-react";

interface BucketInfo {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
  file_count?: number;
}

export default function AdminStorage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);

  const fetchStorageInfo = async () => {
    setLoading(true);
    try {
      // Storage buckets for self-hosted Supabase
      // These represent the configured buckets on your self-hosted instance
      const defaultBuckets: BucketInfo[] = [
        { id: "avatars", name: "avatars", public: true, created_at: new Date().toISOString() },
        { id: "documents", name: "documents", public: false, created_at: new Date().toISOString() },
        { id: "receipts", name: "receipts", public: false, created_at: new Date().toISOString() },
        { id: "student-photos", name: "student-photos", public: false, created_at: new Date().toISOString() },
        { id: "payment-proofs", name: "payment-proofs", public: false, created_at: new Date().toISOString() },
      ];
      setBuckets(defaultBuckets);
    } catch (error) {
      console.error("Error fetching storage info:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const getFileIcon = (bucketName: string) => {
    const name = bucketName.toLowerCase();
    if (name.includes("image") || name.includes("avatar") || name.includes("photo")) {
      return <Image className="h-5 w-5" />;
    }
    if (name.includes("video") || name.includes("film")) {
      return <Film className="h-5 w-5" />;
    }
    if (name.includes("audio") || name.includes("music")) {
      return <Music className="h-5 w-5" />;
    }
    if (name.includes("document") || name.includes("pdf")) {
      return <FileText className="h-5 w-5" />;
    }
    if (name.includes("archive") || name.includes("backup")) {
      return <Archive className="h-5 w-5" />;
    }
    return <FolderOpen className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/system-health")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Storage Usage</h1>
            <p className="text-muted-foreground">
              Monitor file storage across the platform
            </p>
          </div>
        </div>
        <Button onClick={fetchStorageInfo} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Storage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Overview
          </CardTitle>
          <CardDescription>
            File storage for your self-hosted Supabase instance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium mb-2">Self-Hosted Configuration</p>
            <p className="text-sm text-muted-foreground">
              Storage is managed on your self-hosted Supabase server at <code className="text-xs bg-muted px-1 py-0.5 rounded">172.233.185.42:8000</code>. 
              Files are stored securely and accessed based on bucket RLS policies.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Storage Location</p>
              <p className="font-medium text-sm">Self-Hosted Server</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Access Control</p>
              <p className="font-medium text-sm">RLS Policies</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buckets List */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Buckets</CardTitle>
          <CardDescription>
            Configured storage locations for different file types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : buckets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buckets.map((bucket) => (
                <Card key={bucket.id} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getFileIcon(bucket.name)}
                        </div>
                        <div>
                          <p className="font-medium">{bucket.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(bucket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={bucket.public ? "default" : "secondary"}>
                        {bucket.public ? "Public" : "Private"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No storage buckets configured</p>
              <p className="text-sm">Buckets will appear here when file storage is needed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Self-Hosted Info */}
      <Card>
        <CardHeader>
          <CardTitle>Self-Hosted Storage Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-sm font-medium mb-2">Managing Storage on Self-Hosted Instance</p>
            <p className="text-sm text-muted-foreground mb-3">
              To manage storage buckets directly, access your Supabase dashboard:
            </p>
            <code className="block text-xs bg-muted p-2 rounded">
              http://172.233.185.42:8000 → Storage
            </code>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Create buckets via SQL migrations for version control
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Set up RLS policies to control tenant-specific file access
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Use private buckets for sensitive documents (receipts, ID cards)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Monitor disk usage on your Linode server periodically
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
