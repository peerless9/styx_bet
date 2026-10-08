import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { PUBLIC_WEB_URL } from '@/lib/firebase';

/**
 * Shareable link to a bet. It's a normal https link to the Styx web app, so it works for
 * anyone — they can open it in any phone browser, sign up and accept.
 * (In the browser we use the current site, so links also work when testing locally.)
 */
export function betLink(betId: string): string {
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : PUBLIC_WEB_URL;
  return `${origin}/bet/${betId}`;
}

/** Pulls the bet id out of a Styx link (https://…/bet/<id>, styx://bet/<id> or exp://…/--/bet/<id>), or null. */
export function betIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const { path } = Linking.parse(url);
  const m = path?.match(/(?:^|\/)bet\/([\w-]+)/);
  return m ? m[1] : null;
}
