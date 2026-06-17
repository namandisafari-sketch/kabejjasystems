import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.tennahub.app',
    appName: 'TennaHub',
    webDir: 'dist',
    server: {
        allowMixedContent: true,
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#005bc4',
            androidSplashResourceName: 'splash',
            iosSplashResourceName: 'Splash',
            showSpinner: false,
        },
    },
};

export default config;
