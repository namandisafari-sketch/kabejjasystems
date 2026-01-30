import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a unique ID for invitations
 */
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Generate a secure invitation token for admin signup
 * @param email - Email of the person being invited
 * @param expiresInDays - Number of days until invitation expires (default: 7)
 * @returns Invitation token and URL
 */
export const generateAdminInvitation = async (
  email: string,
  expiresInDays: number = 7
): Promise<{ token: string; inviteUrl: string } | null> => {
  try {
    const token = generateId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data: { session } } = await supabase.auth.getSession();
    
    // Only superadmins can generate invitations
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session?.user.id)
      .single();

    if (profile?.role !== 'superadmin') {
      console.error('Only superadmins can generate invitations');
      return null;
    }

    const { error } = await (supabase
      .from('admin_invitations' as any)
      .insert({
        email,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: session?.user.id,
      }) as any);

    if (error) {
      console.error('Failed to create invitation:', error);
      return null;
    }

    const inviteUrl = `${window.location.origin}/admin-signup?token=${token}`;

    return {
      token,
      inviteUrl,
    };
  } catch (error) {
    console.error('Error generating invitation:', error);
    return null;
  }
};

/**
 * Validate an admin invitation token
 */
export const validateAdminInvitation = async (token: string): Promise<boolean> => {
  try {
    const { data, error } = await (supabase
      .from('admin_invitations' as any)
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single() as any);

    return !error && !!data;
  } catch (error) {
    console.error('Error validating invitation:', error);
    return false;
  }
};

/**
 * List all pending admin invitations (superadmin only)
 */
export const getPendingInvitations = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session?.user.id)
      .single();

    if (profile?.role !== 'superadmin') {
      console.error('Only superadmins can view invitations');
      return [];
    }

    const { data, error } = await (supabase
      .from('admin_invitations' as any)
      .select('*')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }) as any);

    return error ? [] : (data || []);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
};

/**
 * Revoke an admin invitation (superadmin only)
 */
export const revokeAdminInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session?.user.id)
      .single();

    if (profile?.role !== 'superadmin') {
      console.error('Only superadmins can revoke invitations');
      return false;
    }

    const { error } = await (supabase
      .from('admin_invitations' as any)
      .delete()
      .eq('id', invitationId) as any);

    return !error;
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return false;
  }
};
