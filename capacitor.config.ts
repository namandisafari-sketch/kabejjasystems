import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.kabejja.biztrack',
    appName: 'Kabejja Biz Track',
    webDir: 'dist',
    server: {
        allowMixedContent: true,
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#1e3a5f',
            androidSplashResourceName: 'splash',
            iosSplashResourceName: 'Splash',
            showSpinner: false,
        },
    },
};

export default config;
