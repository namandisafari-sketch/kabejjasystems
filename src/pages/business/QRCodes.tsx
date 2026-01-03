import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { useTenant } from "@/hooks/use-tenant";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Printer, ExternalLink, Bug, TableIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const QRCodes = () => {
  const { data: tenant } = useTenant();
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const qrRef = useRef<HTMLDivElement>(null);
  const tableQrRef = useRef<HTMLDivElement>(null);

  const { data: tables } = useQuery({
    queryKey: ['tables-for-qr', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .order('table_number');
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  const selectedTable = tables?.find(t => t.id === selectedTableId);
  const baseUrl = window.location.origin;
  const generalMenuUrl = `${baseUrl}/menu/${tenant?.tenantId}`;
  const tableMenuUrl = selectedTableId 
    ? `${baseUrl}/menu/${tenant?.tenantId}/${selectedTableId}` 
    : '';

  const downloadQR = (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    const svg = ref.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx?.fillRect(0, 0, 400, 400);
      ctx!.fillStyle = 'white';
      ctx?.fillRect(0, 0, 400, 400);
      ctx?.drawImage(img, 0, 0, 400, 400);
      
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQR = (ref: React.RefObject<HTMLDivElement>, title: string, subtitle?: string) => {
    if (!ref.current) return;
    const svg = ref.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 2rem;
              border: 2px solid #000;
              border-radius: 1rem;
            }
            h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
            p { margin: 0 0 1rem; color: #666; }
            .scan-text { margin-top: 1rem; font-size: 0.875rem; color: #666; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
            ${svgData}
            <p class="scan-text">Scan to view menu</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <QrCode className="h-8 w-8" />
            QR Code Menus
          </h1>
          <p className="text-muted-foreground">
            Generate QR codes for customers to view your menu
          </p>
        </div>
        {tenant?.isDevMode && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500">
            <Bug className="h-3 w-3 mr-1" />
            Dev Mode
          </Badge>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General Menu QR</TabsTrigger>
          <TabsTrigger value="tables">Table-Specific QR</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>General Menu QR Code</CardTitle>
                <CardDescription>
                  A single QR code that displays your full menu. Great for entrance displays or marketing materials.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  ref={qrRef}
                  className="bg-white p-6 rounded-lg border flex items-center justify-center"
                >
                  {tenant?.tenantId ? (
                    <QRCodeSVG
                      value={generalMenuUrl}
                      size={200}
                      level="H"
                      includeMargin
                    />
                  ) : (
                    <div className="h-[200px] w-[200px] bg-muted animate-pulse rounded" />
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => downloadQR(qrRef, 'menu-qr')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => printQR(qrRef, 'Scan for Menu')}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => window.open(generalMenuUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview Menu
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Download or Print</p>
                      <p className="text-sm text-muted-foreground">
                        Get your QR code in printable format
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Place at Tables</p>
                      <p className="text-sm text-muted-foreground">
                        Put printed QR codes on tables, walls, or menu stands
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Customers Scan</p>
                      <p className="text-sm text-muted-foreground">
                        Customers scan with their phone camera to view menu
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Tip:</strong> Menu updates automatically! When you add or change items in your menu, customers will see the latest version.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tables">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TableIcon className="h-5 w-5" />
                  Table-Specific QR Code
                </CardTitle>
                <CardDescription>
                  Generate unique QR codes for each table. Customers will see which table they're at.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Table</Label>
                  <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Choose a table..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tables?.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          Table {table.table_number} - {table.location} (Seats {table.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTableId && (
                  <>
                    <div 
                      ref={tableQrRef}
                      className="bg-white p-6 rounded-lg border flex items-center justify-center"
                    >
                      <QRCodeSVG
                        value={tableMenuUrl}
                        size={200}
                        level="H"
                        includeMargin
                      />
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      Table {selectedTable?.table_number} • {selectedTable?.location}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => downloadQR(tableQrRef, `table-${selectedTable?.table_number}-qr`)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => printQR(
                          tableQrRef, 
                          `Table ${selectedTable?.table_number}`,
                          selectedTable?.location
                        )}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </div>

                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => window.open(tableMenuUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview Table Menu
                    </Button>
                  </>
                )}

                {!selectedTableId && (
                  <div className="text-center py-8 text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a table to generate its QR code</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Tables</CardTitle>
                <CardDescription>Quick access to generate QR codes for all your tables</CardDescription>
              </CardHeader>
              <CardContent>
                {tables && tables.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tables.map((table) => (
                      <Button
                        key={table.id}
                        variant={selectedTableId === table.id ? "default" : "outline"}
                        className="h-auto py-3 flex-col"
                        onClick={() => setSelectedTableId(table.id)}
                      >
                        <span className="font-bold">{table.table_number}</span>
                        <span className="text-xs opacity-70">{table.location}</span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tables found. Add tables in the Tables section first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QRCodes;
