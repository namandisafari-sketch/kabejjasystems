import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DeviceFingerprint {
    deviceId: string;
    model: string;
    platform: string;
    osVersion: string;
    manufacturer?: string;
}

export interface TrialStatus {
    isValid: boolean;
    daysRemaining: number;
    isBlocked: boolean;
    message: string;
    deviceFingerprint?: DeviceFingerprint;
}

/**
 * Hook to manage device fingerprinting and trial protection
 * Prevents users from abusing free trials by tracking device IDs
 */
export function useDeviceFingerprint() {
    const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
    const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeDeviceFingerprint();
    }, []);

    const initializeDeviceFingerprint = async () => {
        try {
            // Currently only browser fingerprint is supported
            // TODO: Add @capacitor/device package for native app support
            const deviceFingerprint = await getBrowserFingerprint();

            setFingerprint(deviceFingerprint);

            // TEMP DISABLED: Trial checking until database function exists
            // await checkTrialStatus(deviceFingerprint);
            setLoading(false);

        } catch (error) {
            console.error('Error getting device fingerprint:', error);
            setLoading(false);
        }
    };

    const getBrowserFingerprint = async (): Promise<DeviceFingerprint> => {
        // Generate a stable browser fingerprint
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';

        // Create a unique ID from browser characteristics
        const browserData = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}-${renderer}`;
        const deviceId = await hashString(browserData);

        return {
            deviceId,
            model: 'Browser',
            platform: 'web',
            osVersion: navigator.userAgent,
            manufacturer: 'Browser',
        };
    };

    const hashString = async (str: string): Promise<string> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const checkTrialStatus = async (fp: DeviceFingerprint) => {
        try {
            // Call database function to check trial status
            const { data, error } = await supabase
                .rpc('check_device_trial_status', {
                    p_device_id: fp.deviceId
                }) as { data: { exists: boolean; blocked: boolean; tenant_id?: string; trial_started_at?: string } | null; error: any };

            if (error) throw error;

            if (data) {
                const isBlocked = data.blocked || false;
                const exists = data.exists || false;
                
                setTrialStatus({
                    isValid: exists && !isBlocked,
                    daysRemaining: exists ? 14 : 0, // Default 14 days trial
                    isBlocked: isBlocked,
                    message: exists ? (isBlocked ? 'Device blocked' : 'Trial active') : 'New device',
                    deviceFingerprint: fp,
                });

                // If device not registered yet, register it
                if (!exists) {
                    await registerDevice(fp);
                } else {
                    // Update last_seen_at
                    await updateDeviceLastSeen(fp.deviceId);
                }
            }
        } catch (error) {
            console.error('Error checking trial status:', error);
        } finally {
            setLoading(false);
        }
    };

    const registerDevice = async (fp: DeviceFingerprint) => {
        try {
            const { error } = await supabase
                .from('device_fingerprints')
                .insert({
                    device_id: fp.deviceId,
                    platform: fp.platform,
                    user_agent: fp.osVersion,
                } as any);

            if (error) throw error;
            console.log('✅ Device registered for trial');
        } catch (error) {
            console.error('Error registering device:', error);
        }
    };

    const updateDeviceLastSeen = async (deviceId: string) => {
        try {
            await (supabase
                .from('device_fingerprints')
                .update({
                    last_seen_at: new Date().toISOString(),
                } as any)
                .eq('device_id', deviceId) as any);
        } catch (error) {
            console.error('Error updating device last seen:', error);
        }
    };

    const activatePaidSubscription = async (tenantId: string) => {
        if (!fingerprint) return;

        try {
            const { error } = await (supabase
                .from('device_fingerprints')
                .update({
                    tenant_id: tenantId,
                } as any)
                .eq('device_id', fingerprint.deviceId) as any);

            if (error) throw error;

            // Refresh trial status
            await checkTrialStatus(fingerprint);

            return true;
        } catch (error) {
            console.error('Error activating paid subscription:', error);
            return false;
        }
    };

    const blockDevice = async (reason: string) => {
        if (!fingerprint) return;

        try {
            const { error } = await (supabase
                .from('device_fingerprints')
                .update({
                    is_blocked: true,
                    blocked_at: new Date().toISOString(),
                    block_reason: reason,
                } as any)
                .eq('device_id', fingerprint.deviceId) as any);

            if (error) throw error;

            // Refresh trial status
            await checkTrialStatus(fingerprint);
        } catch (error) {
            console.error('Error blocking device:', error);
        }
    };

    return {
        fingerprint,
        trialStatus,
        loading,
        activatePaidSubscription,
        blockDevice,
        refreshTrialStatus: () => fingerprint && checkTrialStatus(fingerprint),
    };
}
