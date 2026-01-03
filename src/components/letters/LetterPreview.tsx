import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface LetterPreviewProps {
  letter: any;
  tenant: any;
  isOpen: boolean;
  onClose: () => void;
}

export const LetterPreview = ({ letter, tenant, isOpen, onClose }: LetterPreviewProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch letter settings
  const { data: settings } = useQuery({
    queryKey: ['letter-settings', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from('letter_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id && isOpen,
  });

  if (!letter) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const marginTop = settings?.margin_top || 20;
    const marginBottom = settings?.margin_bottom || 20;
    const marginLeft = settings?.margin_left || 25;
    const marginRight = settings?.margin_right || 25;
    const lineSpacing = settings?.line_spacing || 1.5;
    const fontSize = settings?.font_size || 12;
    const fontFamily = settings?.font_family || 'Arial';

    const useCustomHeader = settings?.use_custom_header && settings?.custom_header_image_url;
    const useCustomFooter = settings?.use_custom_footer && settings?.custom_footer_image_url;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${letter.title}</title>
          <style>
            @page {
              margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
            }
            body {
              font-family: ${fontFamily}, sans-serif;
              font-size: ${fontSize}pt;
              line-height: ${lineSpacing};
              color: #000;
            }
            .custom-header {
              width: 100%;
              margin-bottom: 20px;
            }
            .custom-header img {
              width: 100%;
              max-height: 150px;
              object-fit: contain;
            }
            .custom-footer {
              margin-top: 40px;
              width: 100%;
            }
            .custom-footer img {
              width: 100%;
              max-height: 100px;
              object-fit: contain;
            }
            .header {
              text-align: ${settings?.logo_position || 'center'};
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .header img {
              max-height: 80px;
              margin-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 18pt;
            }
            .header p {
              margin: 2px 0;
              font-size: 10pt;
              color: #555;
            }
            .meta {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
              font-size: 10pt;
            }
            .subject {
              font-weight: bold;
              text-align: center;
              text-decoration: underline;
              margin: 20px 0;
              font-size: 14pt;
            }
            .content {
              text-align: justify;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 40px;
            }
            .signature-area {
              margin-top: 50px;
              display: flex;
              justify-content: flex-end;
            }
            .signature-block {
              text-align: center;
              width: 200px;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-top: 50px;
              padding-top: 5px;
            }
            .stamp-area {
              margin-top: 30px;
              text-align: center;
            }
            .stamp-box {
              display: inline-block;
              width: 100px;
              height: 100px;
              border: 1px dashed #999;
            }
            .footer-message {
              margin-top: 30px;
              text-align: center;
              font-size: 9pt;
              color: #666;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Replace placeholders in content
  const processContent = (content: string) => {
    let processed = content;
    if (letter.students) {
      processed = processed.replace(/\{\{student_name\}\}/gi, letter.students.full_name || '');
      processed = processed.replace(/\{\{admission_number\}\}/gi, letter.students.admission_number || '');
    }
    if (letter.school_classes) {
      processed = processed.replace(/\{\{class_name\}\}/gi, letter.school_classes.name || '');
    }
    return processed;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Letter Preview</DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="bg-white p-8 border rounded-lg text-black">
          {/* Custom Header Image */}
          {settings?.use_custom_header && settings?.custom_header_image_url ? (
            <div className="custom-header mb-6">
              <img 
                src={settings.custom_header_image_url} 
                alt="Letterhead" 
                className="w-full max-h-36 object-contain"
              />
            </div>
          ) : (
            /* Default Header */
            <div className={`border-b-2 border-gray-800 pb-4 mb-6 text-${settings?.logo_position || 'center'}`}>
              {settings?.show_logo !== false && tenant?.logo_url && (
                <img src={tenant.logo_url} alt="Logo" className="h-16 mx-auto mb-2" />
              )}
              {settings?.show_school_name !== false && (
                <h1 className="text-xl font-bold">{tenant?.name}</h1>
              )}
              {settings?.show_address !== false && tenant?.address && (
                <p className="text-sm text-gray-600">{tenant.address}</p>
              )}
              <div className="flex justify-center gap-4 text-sm text-gray-600">
                {settings?.show_phone !== false && tenant?.phone && (
                  <span>Tel: {tenant.phone}</span>
                )}
                {settings?.show_email !== false && tenant?.email && (
                  <span>Email: {tenant.email}</span>
                )}
              </div>
              {settings?.header_text && (
                <p className="text-sm italic mt-1">{settings.header_text}</p>
              )}
            </div>
          )}

          {/* Meta info */}
          <div className="flex justify-between mb-6 text-sm">
            <div>
              {letter.reference_number && <p>Ref: {letter.reference_number}</p>}
            </div>
            <div>
              <p>Date: {format(new Date(letter.letter_date), 'MMMM dd, yyyy')}</p>
            </div>
          </div>

          {/* Subject */}
          {letter.subject && (
            <p className="text-center font-bold underline mb-6">
              RE: {letter.subject.toUpperCase()}
            </p>
          )}

          {/* Content */}
          <div className="whitespace-pre-wrap text-justify leading-relaxed">
            {processContent(letter.content)}
          </div>

          {/* Custom Footer Image or Default Footer */}
          {settings?.use_custom_footer && settings?.custom_footer_image_url ? (
            <div className="custom-footer mt-10">
              <img 
                src={settings.custom_footer_image_url} 
                alt="Footer" 
                className="w-full max-h-24 object-contain"
              />
            </div>
          ) : (
            /* Default Footer */
            <div className="mt-10">
              {settings?.show_signature_line !== false && (
                <div className="flex justify-end">
                  <div className="text-center w-48">
                    <div className="border-t border-black mt-12 pt-1">
                      {settings?.signature_title || 'Head Teacher'}
                    </div>
                  </div>
                </div>
              )}

              {settings?.show_stamp_area !== false && (
                <div className="mt-8 text-center">
                  <div className="inline-block w-24 h-24 border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400">
                    [Official Stamp]
                  </div>
                </div>
              )}

              {settings?.footer_text && (
                <p className="mt-6 text-center text-sm text-gray-500 italic">
                  {settings.footer_text}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Letter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};