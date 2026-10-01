import * as Linking from 'expo-linking';

/**
 * Link that opens the Styx app straight to a bet.
 * - In Expo Go (development) this is an exp://… link that only works while your dev server runs.
 * - In the real app (TestFlight / App Store) it's styx://bet/<id>.
 */
export const betLink = (betId: string) => Linking.createURL(`/bet/${betId}`);

/** Pulls the bet id out of a Styx link, or null. */
export function betIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const { path } = Linking.parse(url);
  const m = path?.match(/(?:^|\/)bet\/([\w-]+)/);
  return m ? m[1] : null;
}
