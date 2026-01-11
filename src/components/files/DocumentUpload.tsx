import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Loader2, X } from "lucide-react";

interface DocumentUploadProps {
  userId: string;
  onUploadComplete: (url: string, fileName: string) => void;
  onCancel?: () => void;
  accept?: string;
  maxSizeMB?: number;
}

const DocumentUpload = ({
  userId,
  onUploadComplete,
  onCancel,
  accept = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx",
  maxSizeMB = 10,
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File must be less than ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${selectedFile.name}`;

      const { error } = await supabase.storage
        .from("documents")
        .upload(fileName, selectedFile);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      onUploadComplete(publicUrl, selectedFile.name);
      toast.success("Document uploaded");
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    onCancel?.();
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!selectedFile ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <FileText className="mr-2 h-4 w-4" />
          Attach Document
        </Button>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <FileText className="h-5 w-5 text-accent" />
          <span className="text-sm truncate flex-1">{selectedFile.name}</span>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Upload"
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
