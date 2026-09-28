import { Capacitor } from '@capacitor/core';

/** True when running inside the native iOS (Capacitor) app shell. */
export const isNativeApp = Capacitor.isNativePlatform();

/** True when launched from the iOS home screen as an installed web app. */
export const isStandalonePWA =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true);

export const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const env = (import.meta as any).env || {};

/**
 * Public web origin used for invite / share links.
 * Inside the native app, window.location.origin is `capacitor://localhost`,
 * which is useless to friends, so fall back to the hosted web URL.
 */
export const publicOrigin: string =
  env.VITE_PUBLIC_URL ||
  (isNativeApp
    ? 'https://ai-studio-00d96413-2d17-4cda-86e5-25399e358b7c.web.app'
    : window.location.origin);
