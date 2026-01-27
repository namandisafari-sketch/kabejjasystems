import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export type RequisitionType = 'cash_advance' | 'reimbursement' | 'purchase_request';
export type RequisitionStatus = 'draft' | 'pending_level1' | 'pending_level2' | 'pending_level3' | 'approved' | 'partially_approved' | 'rejected' | 'cancelled';
export type ApproverRole = 'hod' | 'bursar' | 'head_teacher' | 'director' | 'admin';

export interface Requisition {
  id: string;
  tenant_id: string;
  requisition_number: string;
  requisition_type: RequisitionType;
  requester_id: string | null;
  requester_name: string;
  department: string | null;
  purpose: string;
  description: string | null;
  amount_requested: number;
  amount_approved: number | null;
  currency: string;
  status: RequisitionStatus;
  current_approval_level: number;
  max_approval_levels: number;
  urgency: string;
  supporting_documents: string[] | null;
  expense_category: string | null;
  budget_code: string | null;
  payment_method: string | null;
  bank_details: Record<string, unknown> | null;
  mobile_money_details: Record<string, unknown> | null;
  expected_date: string | null;
  actual_payment_date: string | null;
  receipt_submitted: boolean;
  receipt_urls: string[] | null;
  rejection_reason: string | null;
  cancelled_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequisitionApproval {
  id: string;
  tenant_id: string;
  requisition_id: string;
  approval_level: number;
  approver_role: ApproverRole;
  approver_id: string | null;
  approver_name: string | null;
  status: string;
  amount_approved: number | null;
  comments: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface RequisitionSettings {
  id: string;
  tenant_id: string;
  approval_levels: number;
  level1_role: ApproverRole;
  level1_label: string;
  level2_role: ApproverRole;
  level2_label: string;
  level3_role: ApproverRole | null;
  level3_label: string | null;
  auto_approve_below: number | null;
  require_receipt_for_advance: boolean;
  max_advance_amount: number | null;
  expense_categories: string[];
  created_at: string;
  updated_at: string;
}

export interface RequisitionActivity {
  id: string;
  tenant_id: string;
  requisition_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  details: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useRequisitions() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  return useQuery({
    queryKey: ['requisitions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('requisitions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Requisition[];
    },
    enabled: !!tenantId,
  });
}

export function useRequisition(id: string | null) {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  return useQuery({
    queryKey: ['requisition', id],
    queryFn: async () => {
      if (!id || !tenantId) return null;
      const { data, error } = await supabase
        .from('requisitions')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) throw error;
      return data as Requisition;
    },
    enabled: !!id && !!tenantId,
  });
}

export function useRequisitionApprovals(requisitionId: string | null) {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  return useQuery({
    queryKey: ['requisition-approvals', requisitionId],
    queryFn: async () => {
      if (!requisitionId || !tenantId) return [];
      const { data, error } = await supabase
        .from('requisition_approvals')
        .select('*')
        .eq('requisition_id', requisitionId)
        .eq('tenant_id', tenantId)
        .order('approval_level', { ascending: true });
      
      if (error) throw error;
      return data as RequisitionApproval[];
    },
    enabled: !!requisitionId && !!tenantId,
  });
}

export function useRequisitionActivity(requisitionId: string | null) {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  return useQuery({
    queryKey: ['requisition-activity', requisitionId],
    queryFn: async () => {
      if (!requisitionId || !tenantId) return [];
      const { data, error } = await supabase
        .from('requisition_activity')
        .select('*')
        .eq('requisition_id', requisitionId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RequisitionActivity[];
    },
    enabled: !!requisitionId && !!tenantId,
  });
}

export function useRequisitionSettings() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  return useQuery({
    queryKey: ['requisition-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('requisition_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error) throw error;
      return data as RequisitionSettings | null;
    },
    enabled: !!tenantId,
  });
}

export function useCreateRequisition() {
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();

  return useMutation({
    mutationFn: async (data: Partial<Requisition>) => {
      if (!tenantData?.tenantId) throw new Error('No tenant');
      
      const { data: user } = await supabase.auth.getUser();
      
      const insertData = {
        tenant_id: tenantData.tenantId,
        requester_id: user.user?.id || null,
        requester_name: data.requester_name || '',
        requisition_number: '',
        requisition_type: data.requisition_type || 'cash_advance',
        purpose: data.purpose || '',
        description: data.description || null,
        amount_requested: data.amount_requested || 0,
        urgency: data.urgency || 'normal',
        expense_category: data.expense_category || null,
        payment_method: data.payment_method || null,
        expected_date: data.expected_date || null,
        notes: data.notes || null,
        department: data.department || null,
        status: 'draft' as const,
      };
      
      const { data: result, error } = await supabase
        .from('requisitions')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('requisition_activity').insert({
        tenant_id: tenantData.tenantId,
        requisition_id: result.id,
        user_id: user.user?.id || null,
        user_name: data.requester_name || null,
        action: 'created',
        details: 'Requisition created',
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      toast.success('Requisition created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create requisition: ' + error.message);
    },
  });
}

export function useUpdateRequisition() {
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Requisition> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      
      // Only include fields that are set
      if (data.status) updateData.status = data.status;
      if (data.amount_approved !== undefined) updateData.amount_approved = data.amount_approved;
      if (data.rejection_reason) updateData.rejection_reason = data.rejection_reason;
      if (data.current_approval_level !== undefined) updateData.current_approval_level = data.current_approval_level;
      if (data.notes) updateData.notes = data.notes;
      
      const { data: result, error } = await supabase
        .from('requisitions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', variables.id] });
      toast.success('Requisition updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
}

export function useSubmitRequisition() {
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();

  return useMutation({
    mutationFn: async (requisitionId: string) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Get settings to know approval levels
      const { data: settings } = await supabase
        .from('requisition_settings')
        .select('*')
        .eq('tenant_id', tenantData?.tenantId)
        .maybeSingle();
      
      const maxLevels = settings?.approval_levels || 2;
      
      // Update requisition status
      const { data: result, error } = await supabase
        .from('requisitions')
        .update({ 
          status: 'pending_level1',
          current_approval_level: 1,
          max_approval_levels: maxLevels,
        })
        .eq('id', requisitionId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create approval records
      for (let level = 1; level <= maxLevels; level++) {
        const roleKey = `level${level}_role` as keyof typeof settings;
        const role = (settings?.[roleKey] as ApproverRole) || (level === 1 ? 'bursar' : 'head_teacher');
        
        await supabase.from('requisition_approvals').insert({
          tenant_id: tenantData?.tenantId!,
          requisition_id: requisitionId,
          approval_level: level,
          approver_role: role as ApproverRole,
          status: 'pending',
        });
      }
      
      // Log activity
      await supabase.from('requisition_activity').insert({
        tenant_id: tenantData?.tenantId!,
        requisition_id: requisitionId,
        user_id: user.user?.id || null,
        action: 'submitted',
        details: 'Requisition submitted for approval',
      });
      
      return result;
    },
    onSuccess: (_, requisitionId) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', requisitionId] });
      queryClient.invalidateQueries({ queryKey: ['requisition-approvals', requisitionId] });
      toast.success('Requisition submitted for approval');
    },
    onError: (error) => {
      toast.error('Failed to submit: ' + error.message);
    },
  });
}

export function useApproveRequisition() {
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();

  return useMutation({
    mutationFn: async ({ 
      requisitionId, 
      approvalId,
      amountApproved,
      comments,
    }: { 
      requisitionId: string;
      approvalId: string;
      amountApproved?: number;
      comments?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user?.id)
        .single();
      
      // Update approval record
      await supabase
        .from('requisition_approvals')
        .update({
          status: 'approved',
          approver_id: user.user?.id,
          approver_name: profile?.full_name,
          amount_approved: amountApproved,
          comments,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approvalId);
      
      // Get requisition and its approvals
      const { data: requisition } = await supabase
        .from('requisitions')
        .select('*')
        .eq('id', requisitionId)
        .single();
      
      const currentLevel = requisition?.current_approval_level || 1;
      const maxLevels = requisition?.max_approval_levels || 2;
      
      let newStatus: RequisitionStatus;
      let newLevel = currentLevel;
      
      if (currentLevel >= maxLevels) {
        // Final approval
        newStatus = amountApproved && amountApproved < (requisition?.amount_requested || 0) 
          ? 'partially_approved' 
          : 'approved';
      } else {
        // Move to next level
        newLevel = currentLevel + 1;
        newStatus = `pending_level${newLevel}` as RequisitionStatus;
      }
      
      // Update requisition
      const { error } = await supabase
        .from('requisitions')
        .update({
          status: newStatus,
          current_approval_level: newLevel,
          amount_approved: amountApproved || requisition?.amount_requested,
        })
        .eq('id', requisitionId);
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('requisition_activity').insert({
        tenant_id: tenantData?.tenantId,
        requisition_id: requisitionId,
        user_id: user.user?.id,
        user_name: profile?.full_name,
        action: 'approved',
        details: comments || `Approved at level ${currentLevel}`,
        metadata: { amount_approved: amountApproved },
      });
      
      return { newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', variables.requisitionId] });
      queryClient.invalidateQueries({ queryKey: ['requisition-approvals', variables.requisitionId] });
      queryClient.invalidateQueries({ queryKey: ['requisition-activity', variables.requisitionId] });
      toast.success('Requisition approved');
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    },
  });
}

export function useRejectRequisition() {
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();

  return useMutation({
    mutationFn: async ({ 
      requisitionId, 
      approvalId,
      reason,
    }: { 
      requisitionId: string;
      approvalId: string;
      reason: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user?.id)
        .single();
      
      // Update approval record
      await supabase
        .from('requisition_approvals')
        .update({
          status: 'rejected',
          approver_id: user.user?.id,
          approver_name: profile?.full_name,
          comments: reason,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approvalId);
      
      // Update requisition
      const { error } = await supabase
        .from('requisitions')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', requisitionId);
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('requisition_activity').insert({
        tenant_id: tenantData?.tenantId,
        requisition_id: requisitionId,
        user_id: user.user?.id,
        user_name: profile?.full_name,
        action: 'rejected',
        details: reason,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', variables.requisitionId] });
      queryClient.invalidateQueries({ queryKey: ['requisition-approvals', variables.requisitionId] });
      queryClient.invalidateQueries({ queryKey: ['requisition-activity', variables.requisitionId] });
      toast.success('Requisition rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject: ' + error.message);
    },
  });
}

export function useUpdateRequisitionSettings() {
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();

  return useMutation({
    mutationFn: async (data: Partial<RequisitionSettings>) => {
      if (!tenantData?.tenantId) throw new Error('No tenant');
      
      const { data: result, error } = await supabase
        .from('requisition_settings')
        .upsert({
          tenant_id: tenantData.tenantId,
          ...data,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisition-settings'] });
      toast.success('Settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });
}
