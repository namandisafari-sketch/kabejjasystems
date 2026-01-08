import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().max(50).optional(),
  credit_limit: z.number().min(0).default(0),
});

interface QuickCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onCustomerCreated: (customer: { id: string; name: string; phone: string | null; credit_limit: number; current_balance: number }) => void;
}

export function QuickCustomerDialog({ open, onOpenChange, tenantId, onCustomerCreated }: QuickCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    credit_limit: "0",
  });

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const validated = customerSchema.parse({
        name: formData.name,
        phone: formData.phone || undefined,
        credit_limit: parseFloat(formData.credit_limit) || 0,
      });

      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: validated.name,
          phone: validated.phone || null,
          credit_limit: validated.credit_limit,
          current_balance: 0,
          tenant_id: tenantId,
          created_by: user.id,
        })
        .select('id, name, phone, credit_limit, current_balance')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: "Customer Created",
        description: `${data.name} has been added`,
      });
      onCustomerCreated(data);
      onOpenChange(false);
      setFormData({ name: "", phone: "", credit_limit: "0" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomerMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Quick Add Customer
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter customer name"
              required
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="credit_limit">Credit Limit (UGX)</Label>
            <Input
              id="credit_limit"
              type="number"
              min="0"
              value={formData.credit_limit}
              onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set to 0 for cash-only customers
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomerMutation.isPending || !formData.name.trim()}>
              {createCustomerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}