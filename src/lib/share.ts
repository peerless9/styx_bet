import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNativeApp, isIOS } from './platform';

/**
 * Save / share a PNG (as a data URL).
 * - Native iOS app: write to cache and open the iOS share sheet (Save Image, Messages, etc.)
 * - iPhone Safari / home-screen app: Web Share API with a file, which also offers "Save Image"
 * - Desktop: regular download
 */
export async function shareImage(dataUrl: string, filename: string, title = 'Styx Bet'): Promise<void> {
  if (isNativeApp) {
    const base64 = dataUrl.split(',')[1];
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({ title, files: [written.uri] });
    return;
  }

  if (isIOS && typeof navigator.share === 'function') {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: 'image/png' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // user closed the sheet
    }
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
