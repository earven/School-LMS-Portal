import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blobToBase64, compressImage, uploadMediaWithFallback, deleteMedia } from './mediaStorage';

// Mock browser-image-compression
vi.mock('browser-image-compression', () => {
  return {
    default: vi.fn(async (file, options) => {
      // Return a simulated compressed file/blob
      return new Blob(['compressed content'], { type: options.fileType || 'image/webp' });
    })
  };
});

// Mock firebase/storage
const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();
const mockDeleteObject = vi.fn();
const mockRef = vi.fn((storage, path) => ({ fullPath: path }));

vi.mock('firebase/storage', () => ({
  ref: (storage, path) => mockRef(storage, path),
  uploadBytes: (...args) => mockUploadBytes(...args),
  getDownloadURL: (...args) => mockGetDownloadURL(...args),
  deleteObject: (...args) => mockDeleteObject(...args)
}));

// Mock ../firebase
vi.mock('../firebase', () => ({
  storage: { app: { name: '[DEFAULT]' } }
}));

describe('mediaStorage utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('blobToBase64', () => {
    it('converts a blob to a data URL string', async () => {
      const blob = new Blob(['hello world'], { type: 'text/plain' });
      const result = await blobToBase64(blob);
      expect(result).toMatch(/^data:/);
    });
  });

  describe('compressImage', () => {
    it('compresses an image file with default options', async () => {
      const file = new File(['image dummy bytes'], 'test.png', { type: 'image/png' });
      const compressed = await compressImage(file);
      expect(compressed).toBeInstanceOf(Blob);
    });
  });

  describe('uploadMediaWithFallback', () => {
    it('throws an error if no file is provided', async () => {
      await expect(uploadMediaWithFallback({ file: null, storagePath: 'test.webp' }))
        .rejects.toThrow('No file provided for upload.');
    });

    it('throws an error if the file is not an image', async () => {
      const pdfFile = new File(['pdf dummy'], 'doc.pdf', { type: 'application/pdf' });
      await expect(uploadMediaWithFallback({ file: pdfFile, storagePath: 'test.webp' }))
        .rejects.toThrow('Selected file is not an image.');
    });

    it('uploads to Firebase Cloud Storage and returns download URL when successful', async () => {
      const imageFile = new File(['fake image data'], 'logo.png', { type: 'image/png' });
      const fakeUrl = 'https://firebasestorage.googleapis.com/v0/b/school-lms.appspot.com/o/settings%2Flogo.webp?alt=media';
      
      mockUploadBytes.mockResolvedValueOnce({ metadata: {} });
      mockGetDownloadURL.mockResolvedValueOnce(fakeUrl);

      const result = await uploadMediaWithFallback({
        file: imageFile,
        storagePath: 'settings/logo.webp'
      });

      expect(mockUploadBytes).toHaveBeenCalled();
      expect(mockGetDownloadURL).toHaveBeenCalled();
      expect(result.url).toBe(fakeUrl);
      expect(result.storageType).toBe('cloud');
    });

    it('gracefully falls back to compressed Base64 when Cloud Storage upload fails', async () => {
      const imageFile = new File(['fake image data'], 'logo.png', { type: 'image/png' });
      
      mockUploadBytes.mockRejectedValueOnce(new Error('Storage bucket not found / offline'));

      const result = await uploadMediaWithFallback({
        file: imageFile,
        storagePath: 'settings/logo.webp'
      });

      expect(result.storageType).toBe('base64');
      expect(result.url).toMatch(/^data:/);
    });
  });

  describe('deleteMedia', () => {
    it('calls deleteObject for Firebase Storage URLs', async () => {
      const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/school/o/settings%2Flogo.webp';
      mockDeleteObject.mockResolvedValueOnce();

      const success = await deleteMedia(storageUrl);
      expect(mockDeleteObject).toHaveBeenCalled();
      expect(success).toBe(true);
    });

    it('ignores Base64 data URLs without calling deleteObject', async () => {
      const base64Url = 'data:image/webp;base64,UklGRk...';
      const success = await deleteMedia(base64Url);
      expect(mockDeleteObject).not.toHaveBeenCalled();
      expect(success).toBe(false);
    });

    it('handles deletion errors gracefully', async () => {
      const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/school/o/settings%2Fmissing.webp';
      mockDeleteObject.mockRejectedValueOnce(new Error('Object not found'));

      const success = await deleteMedia(storageUrl);
      expect(success).toBe(false);
    });
  });
});
