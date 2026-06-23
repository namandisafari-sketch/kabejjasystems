import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Check, Loader2, Pen } from "lucide-react";
import { format } from "date-fns";

interface LeaseSigningDialogProps {
  lease: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeaseSigningDialog({ lease, open, onOpenChange }: LeaseSigningDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signatureMode, setSignatureMode] = useState<'type' | 'draw' | 'none'>('none');
  const [typedSignature, setTypedSignature] = useState('');
  const [signed, setSigned] = useState(false);

  const { data: existingSignatures = [] } = useQuery({
    queryKey: ['lease-signatures', lease?.id],
    enabled: !!lease?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lease_signatures')
        .select('*')
        .eq('lease_id', lease.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const signatureData = signatureMode === 'draw'
        ? canvasRef.current?.toDataURL()
        : typedSignature;
      const { error } = await supabase.from('lease_signatures').insert({
        lease_id: lease.id,
        signer_type: 'manager',
        signer_name: signerName,
        signer_email: signerEmail || null,
        signature_data: signatureData,
        signed_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease-signatures'] });
      setSigned(true);
      toast({ title: "Lease signed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setSigned(false); setSignatureMode('none'); setSignerName(''); setSignerEmail(''); setTypedSignature(''); clearCanvas(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Sign Lease Agreement
          </DialogTitle>
          <DialogDescription>
            {lease?.rental_tenants?.full_name} - {(lease?.rental_units as any)?.rental_properties?.name} {(lease?.rental_units as any)?.unit_number}
          </DialogDescription>
        </DialogHeader>

        {existingSignatures.length > 0 && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Signatures Collected</p>
            {existingSignatures.map((sig: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{sig.signer_name} ({sig.signer_type})</span>
                <Badge variant="outline" className="text-emerald-600">
                  <Check className="h-3 w-3 mr-1" />
                  {format(new Date(sig.signed_at), 'MMM d, yyyy')}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {!signed ? (
          <div className="space-y-4">
            {signatureMode === 'none' && (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-20 flex-col" onClick={() => setSignatureMode('type')}>
                  <Pen className="h-5 w-5 mb-1" />
                  Type Signature
                </Button>
                <Button variant="outline" className="flex-1 h-20 flex-col" onClick={() => setSignatureMode('draw')}>
                  <Pen className="h-5 w-5 mb-1" />
                  Draw Signature
                </Button>
              </div>
            )}

            {signatureMode !== 'none' && (
              <>
                <div>
                  <Label>Full Name</Label>
                  <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Enter your full name" />
                </div>
                <div>
                  <Label>Email (optional)</Label>
                  <Input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} placeholder="your@email.com" />
                </div>

                {signatureMode === 'draw' && (
                  <div>
                    <Label>Draw Your Signature</Label>
                    <div className="mt-1 border rounded-lg overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        className="w-full touch-none cursor-crosshair bg-white"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} className="mt-1">
                      Clear
                    </Button>
                  </div>
                )}

                {signatureMode === 'type' && (
                  <div>
                    <Label>Type Your Signature</Label>
                    <Input
                      value={typedSignature}
                      onChange={e => setTypedSignature(e.target.value)}
                      placeholder="Type your full name as signature"
                      className="font-signature text-lg mt-1"
                    />
                    {typedSignature && (
                      <div className="mt-2 p-3 border rounded-lg bg-white">
                        <p className="font-signature text-xl italic">{typedSignature}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={() => setSignatureMode('none')}>
                    Back
                  </Button>
                  <Button
                    onClick={() => signMutation.mutate()}
                    disabled={!signerName || (signatureMode === 'draw' ? false : !typedSignature) || signMutation.isPending}
                  >
                    {signMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <FileSignature className="h-4 w-4 mr-2" />
                    Sign Lease
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="font-medium">Lease Signed Successfully</p>
            <p className="text-sm text-muted-foreground">The lease agreement has been digitally signed.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-3 mt-2">
          <p>Lease #{lease?.lease_number} | {lease?.start_date && format(new Date(lease.start_date), 'MMM d, yyyy')} - {lease?.end_date && format(new Date(lease.end_date), 'MMM d, yyyy')}</p>
          <p className="mt-1">By signing, you agree to the terms and conditions of this lease agreement.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
