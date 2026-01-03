import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileArchive, FileText, Download, Printer } from 'lucide-react';
import { useBatchReportExport } from '@/hooks/use-batch-report-export';

interface ReportCardData {
  id: string;
  studentName: string;
  className: string;
}

interface BatchExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportCards: ReportCardData[];
  tenantData: any;
  termName: string;
  type: 'regular' | 'ecd';
}

export function BatchExportDialog({
  open,
  onOpenChange,
  reportCards,
  tenantData,
  termName,
  type,
}: BatchExportDialogProps) {
  const { isExporting, exportProgress, exportAsZip, exportAsSinglePDF } = useBatchReportExport();

  const handleExportZip = async () => {
    await exportAsZip(type, reportCards, tenantData, termName);
    onOpenChange(false);
  };

  const handleExportPDF = async () => {
    await exportAsSinglePDF(type, reportCards, tenantData, termName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Batch Export Report Cards
          </DialogTitle>
          <DialogDescription>
            Export {reportCards.length} report cards based on your current filters
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          <div className="py-6 space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Generating report cards... {exportProgress}%
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleExportZip}
              disabled={reportCards.length === 0}
            >
              <FileArchive className="h-8 w-8 text-primary" />
              <div className="text-center">
                <div className="font-semibold">Download as ZIP</div>
                <div className="text-xs text-muted-foreground">
                  Individual HTML files for each student
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleExportPDF}
              disabled={reportCards.length === 0}
            >
              <Printer className="h-8 w-8 text-primary" />
              <div className="text-center">
                <div className="font-semibold">Print All as PDF</div>
                <div className="text-xs text-muted-foreground">
                  Combined document with page breaks for easy printing
                </div>
              </div>
            </Button>

            {reportCards.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No report cards match your current filters
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
