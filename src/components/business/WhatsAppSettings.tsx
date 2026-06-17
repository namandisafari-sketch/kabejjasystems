import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, QrCode, Link2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useCreateInstance, useConnectInstance, useConnectionState, useSendWhatsApp, useLogoutInstance } from "@/hooks/use-evolution-api";

interface WhatsAppSettingsProps {
  tenantId: string | null;
}

export function WhatsAppSettings({ tenantId }: WhatsAppSettingsProps) {
  const [instanceName, setInstanceName] = useState("parent-notifications");
  const [base64Qr, setBase64Qr] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const createInstance = useCreateInstance();
  const connectInstance = useConnectInstance();
  const connectionState = useConnectionState(instanceName);
  const sendWhatsApp = useSendWhatsApp();
  const logoutInstance = useLogoutInstance();

  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("Hello from TennaHub! This is a test message.");

  useEffect(() => {
    if (connectionState.data?.state === "open") {
      setConnected(true);
      setBase64Qr(null);
    }
  }, [connectionState.data]);

  const handleCreateAndConnect = async () => {
    try {
      await createInstance.mutateAsync({ instanceName, qrcode: true });
      const qrData = await connectInstance.mutateAsync(instanceName);
      setBase64Qr(qrData.base64);
      toast.success("Instance created. Scan the QR code with WhatsApp.");
    } catch (error: any) {
      if (error.message?.includes("409") || error.message?.includes("already exists")) {
        const qrData = await connectInstance.mutateAsync(instanceName);
        setBase64Qr(qrData.base64);
        toast.success("Reconnected. Scan the QR code.");
      } else {
        toast.error(error.message || "Failed to create instance");
      }
    }
  };

  const handleDisconnect = async () => {
    try {
      await logoutInstance.mutateAsync(instanceName);
      setConnected(false);
      setBase64Qr(null);
      toast.success("Disconnected from WhatsApp");
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect");
    }
  };

  const handleTestMessage = async () => {
    if (!testNumber) {
      toast.error("Enter a phone number to test");
      return;
    }
    try {
      await sendWhatsApp.mutateAsync({
        number: testNumber.replace(/[+\s-]/g, ""),
        text: testMessage,
      });
      toast.success("Test message sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send test message");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-brand-blue" />
            WhatsApp Integration
          </CardTitle>
          <CardDescription>
            Connect your WhatsApp Business number to send notifications to parents and customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">
              You need a self-hosted <strong>Evolution API</strong> server. 
              Get started at <a href="https://github.com/evolution-foundation/evolution-api" target="_blank" rel="noopener noreferrer" className="underline">github.com/evolution-foundation/evolution-api</a>.
              Set <code className="bg-muted px-1 rounded">EVOLUTION_API_URL</code> and <code className="bg-muted px-1 rounded">EVOLUTION_API_KEY</code> in your server environment.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="instance-name">Instance Name</Label>
            <Input
              id="instance-name"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="parent-notifications"
              className="font-mono"
            />
          </div>

          {!connected && (
            <Button
              onClick={handleCreateAndConnect}
              disabled={createInstance.isPending || connectInstance.isPending || !instanceName.trim()}
              className="w-full"
            >
              {createInstance.isPending || connectInstance.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
              ) : (
                <><Link2 className="h-4 w-4 mr-2" /> Create & Connect Instance</>
              )}
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={logoutInstance.isPending || !connected}
            className="w-full"
          >
            {logoutInstance.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Disconnecting...</>
            ) : (
              <><XCircle className="h-4 w-4 mr-2" /> Disconnect</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* QR Code */}
      {base64Qr && !connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scan QR Code
            </CardTitle>
            <CardDescription>
              Open WhatsApp on your phone, tap Menu or Settings, and select "Link a Device" to scan this QR code.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <img src={base64Qr} alt="WhatsApp QR Code" className="w-64 h-64" />
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connected ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Status: <strong>{connectionState.data?.state || "disconnected"}</strong>
          </p>
          {connectionState.data?.statusReason && (
            <p className="text-xs text-muted-foreground mt-1">
              Reason: {connectionState.data.statusReason}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Test Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Send Test Message
          </CardTitle>
          <CardDescription>Send a test WhatsApp message to verify the connection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-number">Phone Number (with country code)</Label>
            <Input
              id="test-number"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="+2567XXXXXXXX"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-message">Message</Label>
            <Input
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>
          <Button
            onClick={handleTestMessage}
            disabled={sendWhatsApp.isPending || !connected || !testNumber.trim()}
          >
            {sendWhatsApp.isPending ? "Sending..." : "Send Test Message"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
