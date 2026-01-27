import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

export function TermsFooterLink() {
  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-40">
      <Link
        to="/terms-and-conditions"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-card/80 backdrop-blur-sm border border-border rounded-full shadow-sm hover:shadow transition-all"
      >
        <FileText className="h-3 w-3" />
        <span>Terms & Conditions</span>
      </Link>
    </div>
  );
}
