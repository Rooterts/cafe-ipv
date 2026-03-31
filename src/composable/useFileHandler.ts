import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 *
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]!;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 *
 */
export function useFileHandler() {
  const isAndroid =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  /**
   * Download a file crossplatform
   */
  const saveToDevice = async (blob: Blob, fileName: string) => {
    if (isAndroid) {
      await Filesystem.writeFile({
        path: fileName,
        data: await blobToBase64(blob),
        directory: Directory.Documents,
      });
      return `${Directory.Documents}/${fileName}`;
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  /**
   *
   */
  const shareFile = async (blob: Blob, fileName: string) => {
    if (!isAndroid) throw new Error('Share file is only supported in android');

    const base64 = await blobToBase64(blob);
    const tempFileName = `temp_${Date.now()}_${fileName}`;
    await Filesystem.writeFile({
      path: tempFileName,
      data: base64,
      directory: Directory.Cache,
    });
    const uri = await Filesystem.getUri({
      path: tempFileName,
      directory: Directory.Cache,
    });
    await Share.share({
      title: 'Compartir archivo',
      url: uri.uri,
      dialogTitle: 'Compartir archivo',
    });
    await Filesystem.deleteFile({
      path: tempFileName,
      directory: Directory.Cache,
    });
  };

  return {
    isAndroid,
    saveToDevice,
    shareFile,
  };
}
