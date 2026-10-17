import imageCompression from 'browser-image-compression';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Converts a Blob or File to a Base64 data URL.
 * @param {Blob|File} blob 
 * @returns {Promise<string>}
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
};

/**
 * Compresses an image file client-side before upload or storage.
 * @param {File} file 
 * @param {Object} options 
 * @returns {Promise<File|Blob>}
 */
export const compressImage = async (file, options = {}) => {
  const defaultOptions = {
    maxSizeMB: options.maxSizeMB || 0.2, // ~200 KB max limit
    maxWidthOrHeight: options.maxWidthOrHeight || 1280,
    useWebWorker: true,
    fileType: options.fileType || 'image/webp'
  };

  try {
    return await imageCompression(file, defaultOptions);
  } catch (error) {
    console.warn('Image compression fallback to original file:', error);
    return file;
  }
};

/**
 * Uploads an image to Firebase Cloud Storage with automatic compression.
 * Falls back gracefully to compressed Base64 if Cloud Storage fails or is unavailable.
 * 
 * @param {Object} params
 * @param {File} params.file - The source image file
 * @param {string} params.storagePath - Target path in Firebase Storage (e.g. 'settings/logo.webp')
 * @param {number} [params.maxWidthOrHeight=1280] - Maximum dimension
 * @param {number} [params.maxSizeMB=0.2] - Maximum file size in MB
 * @param {string} [params.fileType='image/webp'] - Output image mime type
 * @returns {Promise<{ url: string, storageType: 'cloud' | 'base64' }>}
 */
export const uploadMediaWithFallback = async ({
  file,
  storagePath,
  maxWidthOrHeight = 1280,
  maxSizeMB = 0.2,
  fileType = 'image/webp'
}) => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file is not an image.');
  }

  // 1. Compress image client-side
  const compressedBlob = await compressImage(file, {
    maxWidthOrHeight,
    maxSizeMB,
    fileType
  });

  // 2. Attempt Cloud Storage upload
  if (storage && storagePath) {
    try {
      const storageRef = ref(storage, storagePath);
      const metadata = {
        contentType: compressedBlob.type || fileType,
        cacheControl: 'public, max-age=31536000'
      };

      await uploadBytes(storageRef, compressedBlob, metadata);
      const downloadUrl = await getDownloadURL(storageRef);
      return { url: downloadUrl, storageType: 'cloud' };
    } catch (storageError) {
      console.warn('Firebase Storage upload failed, falling back to Base64:', storageError);
    }
  }

  // 3. Graceful fallback: convert compressed image to Base64
  const base64Url = await blobToBase64(compressedBlob);
  return { url: base64Url, storageType: 'base64' };
};

/**
 * Deletes an image from Cloud Storage if it is a Firebase Storage URL.
 * Silently ignores Base64 strings or non-storage URLs.
 * 
 * @param {string} url - URL or Base64 string to delete
 * @returns {Promise<boolean>}
 */
export const deleteMedia = async (url) => {
  if (!url || typeof url !== 'string' || !url.includes('firebasestorage.googleapis.com')) {
    return false;
  }

  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn('Could not delete file from Firebase Storage:', err);
    return false;
  }
};
