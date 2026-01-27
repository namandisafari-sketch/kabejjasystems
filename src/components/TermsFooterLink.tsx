import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

export function TermsFooterLink() {
  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-[60]">
      <Link
        to="/terms-and-conditions"
        className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground bg-card border border-border rounded-full shadow-md hover:shadow-lg transition-all"
      >
        <FileText className="h-3.5 w-3.5" />
        <span>Terms & Conditions</span>
      </Link>
    </div>
  );
}
