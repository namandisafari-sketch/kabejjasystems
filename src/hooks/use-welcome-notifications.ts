import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to handle welcome notifications.
 * Requests permission on mount and sends a welcome notification if granted for the first time.
 * Only works in native app environments (iOS/Android).
 */
export function useWelcomeNotifications() {
    useEffect(() => {
        const handleNotifications = async () => {
            try {
                // Only run in native app environments (not in browser)
                if (!Capacitor.isNativePlatform()) {
                    console.log('Skipping notifications - not running in native app');
                    return;
                }

                // Dynamically import LocalNotifications only when needed
                const { LocalNotifications } = await import('@capacitor/local-notifications');

                // 1. Check current status
                const status = await LocalNotifications.checkPermissions();

                // 2. If already granted, we might have already sent the welcome message
                // We use a flag in localStorage to track if we've sent the "first time" greeting
                const hasSentWelcome = localStorage.getItem('kabejja_welcome_sent');

                if (status.display === 'granted') {
                    if (!hasSentWelcome) {
                        await sendWelcomeNotification();
                    }
                    return;
                }

                // 3. If it's the first time (prompt status), request permissions
                if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
                    const requestStatus = await LocalNotifications.requestPermissions();

                    if (requestStatus.display === 'granted' && !hasSentWelcome) {
                        await sendWelcomeNotification();
                    }
                }
            } catch (error) {
                console.error('Error in welcome notifications:', error);
            }
        };

        handleNotifications();
    }, []);

    const sendWelcomeNotification = async () => {
        try {
            // Dynamically import LocalNotifications
            const { LocalNotifications } = await import('@capacitor/local-notifications');

            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: "Welcome to Kabejja Systems! 🚀",
                        body: "Earn Frank Says hi to you 👋",
                        id: 1,
                        schedule: { at: new Date(Date.now() + 1000) }, // Send 1 second later
                        sound: 'default',
                        attachments: [],
                        actionTypeId: "",
                        extra: null
                    }
                ]
            });

            // Mark as sent so we don't spam the user every time they open the app
            localStorage.setItem('kabejja_welcome_sent', 'true');
            console.log('✅ Welcome notification sent from Earn Frank');
        } catch (error) {
            console.error('Failed to send welcome notification:', error);
        }
    };
}
