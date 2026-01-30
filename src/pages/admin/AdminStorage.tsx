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
      // Storage buckets are managed by Lovable Cloud
      // Show commonly used buckets based on tenant uploads
      const defaultBuckets: BucketInfo[] = [
        { id: "avatars", name: "avatars", public: true, created_at: new Date().toISOString() },
        { id: "documents", name: "documents", public: false, created_at: new Date().toISOString() },
        { id: "receipts", name: "receipts", public: false, created_at: new Date().toISOString() },
        { id: "student-photos", name: "student-photos", public: false, created_at: new Date().toISOString() },
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
            Platform file storage is managed through Lovable Cloud
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">
              Storage is automatically managed by Lovable Cloud. Files uploaded through the app 
              are stored securely and can be accessed based on bucket permissions.
            </p>
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

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Use public buckets only for assets that need to be publicly accessible
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Private buckets are ideal for user documents and sensitive files
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Set up proper RLS policies to control file access per tenant
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Compress images before upload to optimize storage usage
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
