-- Fix overly permissive RLS policies by removing the ALL policies and creating proper INSERT/UPDATE/DELETE policies

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can manage own tenant withdrawal settings" ON public.withdrawal_settings;
DROP POLICY IF EXISTS "Users can manage own tenant promotion rules" ON public.promotion_rules;
DROP POLICY IF EXISTS "Users can manage own tenant promotion decisions" ON public.promotion_decisions;
DROP POLICY IF EXISTS "Users can manage own tenant fee voids" ON public.student_fee_voids;
DROP POLICY IF EXISTS "Users can manage own tenant absence alerts" ON public.absence_alerts;
DROP POLICY IF EXISTS "Users can manage own tenant holidays" ON public.school_holidays;

-- Create proper INSERT policies
CREATE POLICY "Users can insert own tenant withdrawal settings" ON public.withdrawal_settings
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert own tenant promotion rules" ON public.promotion_rules
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert own tenant promotion decisions" ON public.promotion_decisions
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert own tenant fee voids" ON public.student_fee_voids
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert own tenant absence alerts" ON public.absence_alerts
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert own tenant holidays" ON public.school_holidays
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Create proper UPDATE policies
CREATE POLICY "Users can update own tenant withdrawal settings" ON public.withdrawal_settings
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id()) WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own tenant promotion rules" ON public.promotion_rules
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id()) WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own tenant promotion decisions" ON public.promotion_decisions
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id()) WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own tenant fee voids" ON public.student_fee_voids
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id()) WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own tenant absence alerts" ON public.absence_alerts
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id()) WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own tenant holidays" ON public.school_holidays
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id()) WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Create proper DELETE policies
CREATE POLICY "Users can delete own tenant withdrawal settings" ON public.withdrawal_settings
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete own tenant promotion rules" ON public.promotion_rules
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete own tenant promotion decisions" ON public.promotion_decisions
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete own tenant fee voids" ON public.student_fee_voids
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete own tenant absence alerts" ON public.absence_alerts
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete own tenant holidays" ON public.school_holidays
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());