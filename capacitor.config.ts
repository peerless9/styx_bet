import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.styxbet.app', // change to your own reverse-domain ID before shipping
  appName: 'Styx Bet',
  webDir: 'dist',
  ios: {
    contentInset: 'never', // the web layout handles safe areas itself
    backgroundColor: '#F8FAFC',
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true, // we sign into the JS SDK with the returned credential
      providers: ['google.com'],
    },
    Keyboard: {
      resize: 'native',
    },
  },
  experimental: {
    ios: {
      spm: {
        swiftToolsVersion: '6.1',
        // avoids a SwiftPM package-identity collision with the Firebase SDK
        packageOptions: {
          '@capacitor-firebase/authentication': { symlink: true },
        },
        // only link the Google Sign-In SDK (not Facebook)
        packageTraits: {
          '@capacitor-firebase/authentication': ['Google'],
        },
      },
    },
  },
};

export default config;
