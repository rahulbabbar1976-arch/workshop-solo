/**
 * useImageCompressor — React hook
 * ================================
 * Client-side helper that compresses an image in the browser BEFORE
 * uploading it, using the Canvas API (zero dependencies, fully free).
 *
 * Two modes:
 *  1. `compressInBrowser(file)`   — compress locally using canvas (instant,
 *     no network round-trip, good for camera captures)
 *  2. `uploadCompressed(file)`    — send raw file to /api/upload which will
 *     run sharp server-side (higher quality, handles all formats including HEIC)
 *
 * Use mode 1 for camera captures.
 * Use mode 2 for file uploads where quality matters more.
 */

'use client';

import { useState, useCallback } from 'react';

export interface CompressResult {
  dataUrl:        string;   // base64 data URL for <img src=…>
  blob:           Blob;     // Blob for form submission
  originalKB:     number;
  compressedKB:   number;
  savingPercent:  number;
  width:          number;
  height:         number;
}

export interface UploadResult {
  fileUrl:        string;
  fileName:       string;
  mimeType:       string;
  fileSizeBytes:  number;
  compression?:   {
    originalBytes:   number;
    compressedBytes: number;
    savingPercent:   number;
    width:           number;
    height:          number;
  };
}

const MAX_W  = 1280;
const MAX_H  = 960;
const QUALITY = 0.72; // 0-1 for canvas API

/**
 * Resize + compress in the browser using the Canvas API.
 * Outputs a JPEG blob regardless of input format.
 */
export function compressInBrowser(
  file: File,
  maxWidth  = MAX_W,
  maxHeight = MAX_H,
  quality   = QUALITY
): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img  = new Image();

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.onload  = () => {
      URL.revokeObjectURL(url);

      // Calculate target dimensions (fit inside maxW×maxH, never upscale)
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob returned null')); return; }

          const reader = new FileReader();
          reader.onload = () => {
            const originalKB    = Math.round(file.size / 1024);
            const compressedKB  = Math.round(blob.size / 1024);
            const savingPercent = Math.max(0, Math.round((1 - blob.size / file.size) * 100));

            resolve({
              dataUrl:       reader.result as string,
              blob,
              originalKB,
              compressedKB,
              savingPercent,
              width:  w,
              height: h,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.src = url;
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useImageCompressor() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading,   setIsUploading]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  /**
   * Compress in browser then upload the compressed blob to /api/upload.
   * Returns the server's upload result (fileUrl, etc.)
   */
  const compressAndUpload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setError(null);
    setIsCompressing(true);

    try {
      // Step 1 — compress locally first (fast, immediate preview)
      const compressed = await compressInBrowser(file);
      setIsCompressing(false);
      setIsUploading(true);

      // Step 2 — upload the compressed blob
      const form = new FormData();
      form.append('file', compressed.blob, file.name.replace(/\.[^.]+$/, '.jpg'));

      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      const json = await res.json();

      if (!json.success) throw new Error(json.error || 'Upload failed');
      return json as UploadResult;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsCompressing(false);
      setIsUploading(false);
    }
  }, []);

  /**
   * Upload raw file to /api/upload — server will compress via sharp.
   * Better quality, handles HEIC, but requires a server round-trip.
   */
  const uploadWithServerCompression = useCallback(async (file: File): Promise<UploadResult | null> => {
    setError(null);
    setIsUploading(true);

    try {
      const form = new FormData();
      form.append('file', file);

      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      const json = await res.json();

      if (!json.success) throw new Error(json.error || 'Upload failed');
      return json as UploadResult;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    isCompressing,
    isUploading,
    isBusy: isCompressing || isUploading,
    error,
    compressInBrowser,
    compressAndUpload,
    uploadWithServerCompression,
  };
}
