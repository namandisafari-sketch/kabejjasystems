-- Parent notification preferences (opt-in per parent)
CREATE TABLE public.parent_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  whatsapp_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  gate_alerts BOOLEAN DEFAULT true,
  attendance_alerts BOOLEAN DEFAULT true,
  timetable_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id)
);

CREATE INDEX idx_parent_notif_prefs_parent ON public.parent_notification_preferences(parent_id);

ALTER TABLE public.parent_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their own preferences" ON public.parent_notification_preferences FOR SELECT
  USING (parent_id IN (SELECT id FROM public.parents WHERE user_id = auth.uid()));

CREATE POLICY "Parents can upsert their own preferences" ON public.parent_notification_preferences FOR INSERT
  WITH CHECK (parent_id IN (SELECT id FROM public.parents WHERE user_id = auth.uid()));

CREATE POLICY "Parents can update their own preferences" ON public.parent_notification_preferences FOR UPDATE
  USING (parent_id IN (SELECT id FROM public.parents WHERE user_id = auth.uid()));

CREATE POLICY "Staff can view parent preferences" ON public.parent_notification_preferences FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Add tenant_id to parent_notification_preferences after creation
ALTER TABLE public.parent_notification_preferences ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Tenant-level notification service configuration
CREATE TABLE public.notification_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'africas_talking',
  api_key TEXT,
  username TEXT,
  sender_id TEXT DEFAULT 'TENNAHUB',
  whatsapp_number TEXT,
  email_from TEXT,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can view their notification config" ON public.notification_config FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant staff can insert notification config" ON public.notification_config FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant staff can update their notification config" ON public.notification_config FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Outgoing notification log
CREATE TABLE public.outgoing_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outgoing_notif_tenant ON public.outgoing_notifications(tenant_id);
CREATE INDEX idx_outgoing_notif_status ON public.outgoing_notifications(status);
CREATE INDEX idx_outgoing_notif_created ON public.outgoing_notifications(created_at DESC);

ALTER TABLE public.outgoing_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can view outgoing notifications" ON public.outgoing_notifications FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert outgoing notifications" ON public.outgoing_notifications FOR INSERT
  WITH CHECK (true);
