import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Search, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PartnershipDeed } from "@/components/partnership/PartnershipDeed";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  business_code: string | null;
  logo_url: string | null;
}

export default function AdminPartnershipDeed() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Tenant | null>(null);
  const deedRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: tenants } = useQuery({
    queryKey: ["tenants-for-deed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, name, address, phone, email, business_code, logo_url")
        .order("name");
      return (data || []) as Tenant[];
    },
  });

  const filtered = tenants?.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const generateDate = format(new Date(), "do MMMM yyyy");

  const handleDownloadPDF = async () => {
    if (!deedRef.current) return;

    try {
      const canvas = await html2canvas(deedRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = 297;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Partnership_Deed_${selected?.name?.replace(/\s+/g, "_") || "School"}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Downloaded",
        description: `Partnership deed saved as ${fileName}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    if (!deedRef.current) return;
    const content = deedRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Partnership Deed - ${selected?.name || "School"}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; padding: 20px; color: black; background: white; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partnership Deed Generator</h1>
        <p className="text-muted-foreground">
          Generate a formal Partnership Deed & Service Agreement for a school
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Select School</CardTitle>
            <CardDescription>Choose a school to generate the deed</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search schools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {filtered?.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No schools found</p>
              )}
              {filtered?.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => setSelected(tenant)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selected?.id === tenant.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{tenant.name}</div>
                  {tenant.business_code && (
                    <div className="text-xs opacity-70">Code: {tenant.business_code}</div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">Document Preview</CardTitle>
              <CardDescription>
                {selected
                  ? "Partnership Deed & Service Agreement"
                  : "Select a school to generate the deed"}
              </CardDescription>
            </div>
            {selected && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="border rounded-lg overflow-auto max-h-[600px]">
                <PartnershipDeed
                  ref={deedRef}
                  schoolName={selected.name}
                  schoolAddress={selected.address || ""}
                  schoolPhone={selected.phone || ""}
                  schoolEmail={selected.email || ""}
                  businessCode={selected.business_code || ""}
                  date={generateDate}
                  logoUrl={selected.logo_url || undefined}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p>Select a school from the left to generate</p>
                <p className="text-sm">the Partnership Deed & Service Agreement</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
