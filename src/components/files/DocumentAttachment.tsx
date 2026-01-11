import { FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentAttachmentProps {
  url: string;
  fileName?: string;
  className?: string;
}

const getFileExtension = (url: string): string => {
  const parts = url.split(".");
  return parts[parts.length - 1].split("?")[0].toUpperCase();
};

const getFileName = (url: string, providedName?: string): string => {
  if (providedName) return providedName;
  const parts = url.split("/");
  const fullName = parts[parts.length - 1].split("?")[0];
  // Remove timestamp prefix if present
  const nameParts = fullName.split("-");
  return nameParts.length > 1 ? nameParts.slice(1).join("-") : fullName;
};

const DocumentAttachment = ({ url, fileName, className }: DocumentAttachmentProps) => {
  const extension = getFileExtension(url);
  const displayName = getFileName(url, fileName);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = displayName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpen = () => {
    window.open(url, "_blank");
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-muted rounded-lg border border-border/50 ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground">{extension} Document</p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleOpen}
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDownload}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DocumentAttachment;
