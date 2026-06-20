import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, CheckCircle, X, FileImage } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PrescriptionUploadProps {
  patientId?: string;
  tenantId: string;
  onUploadComplete?: () => void;
}

const PrescriptionUpload = ({ patientId, tenantId, onUploadComplete }: PrescriptionUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [notes, setNotes] = useState("");

  const { data: { user } } = useQuery({
    queryKey: ['auth-user-upload'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return { user };
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `rx-upload-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `prescription-uploads/${tenantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("business-files")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("business-files")
        .getPublicUrl(filePath);

      const { error: insertError } = await (supabase.from("prescription_uploads") as any)
        .insert([{
          tenant_id: tenantId,
          patient_id: patientId || null,
          image_url: publicUrl,
          doctor_name: doctorName || null,
          notes: notes || null,
          status: "pending",
          uploaded_by: user?.id,
        }]);

      if (insertError) throw insertError;

      toast({ title: "Uploaded", description: "Prescription uploaded for review" });
      clearSelection();
      setDoctorName("");
      setNotes("");
      onUploadComplete?.();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer group"
        onClick={() => !preview && fileInputRef.current?.click()}>
        {preview ? (
          <div className="relative inline-block">
            <img src={preview} alt="Prescription preview" className="max-h-48 rounded-lg object-contain mx-auto" />
            <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={(e) => { e.stopPropagation(); clearSelection(); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="py-4">
            <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-3 group-hover:text-primary transition-colors" />
            <p className="font-medium mb-1">Snap & Upload Prescription</p>
            <p className="text-sm text-muted-foreground">JPG, PNG, or PDF</p>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" />
      </div>

      {selectedFile && (
        <div className="space-y-3">
          <Input placeholder="Doctor's name (optional)" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
          <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button className="w-full" disabled={uploading} onClick={handleUpload}>
            {uploading ? "Uploading..." : "Upload Prescription"}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground justify-center">
        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Reviewed by pharmacist</span>
        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Secure & encrypted</span>
      </div>
    </div>
  );
};

export default PrescriptionUpload;
