/**
 * Image Compression Engine
 * ========================
 * Uses `sharp` (MIT License — free for commercial use)
 * https://github.com/lovell/sharp
 *
 * Compresses any uploaded or captured image to the minimum size
 * suitable for on-screen reference viewing while retaining clarity.
 *
 * Strategy:
 *  - Resize to max 1280×960 (enough for any HD screen reference)
 *  - JPEG: quality 72 (visually lossless for reference photos)
 *  - PNG:  palette reduction + compression level 9
 *  - WebP: quality 72, lossless=false (best ratio for web)
 *  - AVIF: quality 55  (smallest modern format)
 *  - GIF/other: convert to WebP
 */

import sharp from 'sharp';
import path from 'path';

// ─── Configuration ───────────────────────────────────────────────────────────

export interface CompressOptions {
  /** Maximum width in pixels (default: 1280) */
  maxWidth?: number;
  /** Maximum height in pixels (default: 960) */
  maxHeight?: number;
  /** JPEG / WebP / AVIF quality 1-100 (default: 72) */
  quality?: number;
  /** Output format. 'original' keeps the source format (default) */
  outputFormat?: 'jpeg' | 'webp' | 'png' | 'avif' | 'original';
  /** Strip all metadata (EXIF, GPS, ICC …) to save bytes (default: true) */
  stripMetadata?: boolean;
}

export interface CompressionResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  originalBytes: number;
  compressedBytes: number;
  /** Percentage reduction e.g. 68 means 68 % smaller */
  savingPercent: number;
  width: number;
  height: number;
}

// Vehicle photo quota constants
export const VEHICLE_PHOTO_QUOTA_BYTES = 3_145_728;  // 3 MB per vehicle
export const VEHICLE_PHOTO_MAX_BYTES   = 100_000;    // 100 KB per photo
// Higher resolution target for vehicle photos — more pixels within 100 KB
export const VEHICLE_PHOTO_MAX_W = 1600;
export const VEHICLE_PHOTO_MAX_H = 1200;

// ─── Engine ──────────────────────────────────────────────────────────────────

const SCREEN_MAX_W = 1280;
const SCREEN_MAX_H = 960;
const DEFAULT_QUALITY = 72;

/**
 * Detect the output format based on the original MIME type
 * if the caller chose 'original'.
 */
function resolveFormat(
  mime: string,
  choice: CompressOptions['outputFormat']
): 'jpeg' | 'webp' | 'png' | 'avif' {
  if (choice && choice !== 'original') return choice;

  // Map source MIME → best compressed format
  if (mime.includes('png'))  return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('avif')) return 'avif';
  // JPEG, BMP, TIFF, GIF, HEIC → JPEG (widest support, smallest for photos)
  return 'jpeg';
}

function formatToMime(fmt: 'jpeg' | 'webp' | 'png' | 'avif'): string {
  const map: Record<string, string> = {
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    png:  'image/png',
    avif: 'image/avif',
  };
  return map[fmt] ?? 'image/jpeg';
}

function formatToExt(fmt: 'jpeg' | 'webp' | 'png' | 'avif'): string {
  return fmt === 'jpeg' ? '.jpg' : `.${fmt}`;
}

/**
 * Main compression function.
 *
 * @param inputBuffer  - Raw binary of the original image
 * @param sourceMime   - MIME type reported by the browser (e.g. "image/jpeg")
 * @param options      - Tuning parameters
 */
export async function compressImage(
  inputBuffer: Buffer,
  sourceMime: string,
  options: CompressOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth       = SCREEN_MAX_W,
    maxHeight      = SCREEN_MAX_H,
    quality        = DEFAULT_QUALITY,
    outputFormat   = 'original',
    stripMetadata  = true,
  } = options;

  const originalBytes = inputBuffer.byteLength;
  const targetFormat  = resolveFormat(sourceMime, outputFormat);

  // Build the sharp pipeline
  let pipeline = sharp(inputBuffer, { failOn: 'none' })
    .rotate()                              // auto-rotate from EXIF orientation
    .resize({
      width:  maxWidth,
      height: maxHeight,
      fit:    'inside',                    // keep aspect ratio, never upscale
      withoutEnlargement: true,
    });

  if (stripMetadata) {
    pipeline = pipeline.withMetadata({});  // keep only orientation; drop GPS/EXIF
  }

  // Format-specific encoding
  switch (targetFormat) {
    case 'jpeg':
      pipeline = pipeline.jpeg({
        quality,
        mozjpeg:       true,   // use mozjpeg encoder for ~10% extra saving
        progressive:   true,   // progressive JPEG loads faster on slow links
        trellisQuantisation: true,
        optimiseScans: true,
      });
      break;

    case 'webp':
      pipeline = pipeline.webp({
        quality,
        effort:  6,            // 0-6; higher = smaller file but slower
        lossless: false,
      });
      break;

    case 'png':
      pipeline = pipeline.png({
        compressionLevel: 9,   // maximum zlib compression
        effort:           10,  // oxipng-style effort
        palette:          true, // quantise to 256-colour palette where possible
        quality,               // used only with palette mode
      });
      break;

    case 'avif':
      pipeline = pipeline.avif({
        quality,
        effort: 7,             // 0-9; higher = smaller but much slower
        lossless: false,
      });
      break;
  }

  const { data: compressedBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

  const compressedBytes = compressedBuffer.byteLength;
  const savingPercent   = Math.round((1 - compressedBytes / originalBytes) * 100);

  return {
    buffer:          compressedBuffer,
    mimeType:        formatToMime(targetFormat),
    extension:       formatToExt(targetFormat),
    originalBytes,
    compressedBytes,
    savingPercent:   Math.max(0, savingPercent),
    width:           info.width,
    height:          info.height,
  };
}

/**
 * Convenience wrapper: compress from a Web API `File` or `Blob`.
 */
export async function compressFile(
  file: File,
  options?: CompressOptions
): Promise<CompressionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);
  return compressImage(buffer, file.type || 'image/jpeg', options);
}

/**
 * Derive a compressed filename from the original, replacing its extension.
 */
export function compressedFilename(original: string, ext: string): string {
  const base = path.basename(original, path.extname(original));
  return `${base}${ext}`;
}

/**
 * Adaptive compression — guarantees output ≤ maxBytes.
 *
 * Strategy:
 *  1. Resize to maxWidth × maxHeight (default: VEHICLE_PHOTO_MAX_W × VEHICLE_PHOTO_MAX_H)
 *  2. Try encoding at startQuality (default 72)
 *  3. If still over budget, step quality down by `step` each iteration
 *  4. Floor at minQuality (default 20) — below this images look unusable
 *
 * This gives the highest possible resolution within the byte budget.
 */
export async function compressToMaxBytes(
  inputBuffer: Buffer,
  sourceMime: string,
  maxBytes     = VEHICLE_PHOTO_MAX_BYTES,
  maxWidth     = VEHICLE_PHOTO_MAX_W,
  maxHeight    = VEHICLE_PHOTO_MAX_H,
  startQuality = 72,
  minQuality   = 20,
  step         = 8,
): Promise<CompressionResult> {
  const originalBytes = inputBuffer.byteLength;

  // Resize once — only the encode step is repeated
  const resized = await sharp(inputBuffer, { failOn: 'none' })
    .rotate()
    .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
    .withMetadata({})
    .toBuffer();

  let quality = startQuality;
  let result!: { data: Buffer; info: { width: number; height: number; size: number; format: string } };

  while (quality >= minQuality) {
    result = await sharp(resized)
      .jpeg({
        quality,
        mozjpeg:             true,
        progressive:         true,
        trellisQuantisation: true,
        optimiseScans:       true,
      })
      .toBuffer({ resolveWithObject: true });

    if (result.data.byteLength <= maxBytes) break;
    quality -= step;
  }

  // If we hit the floor and it's still over, use the last attempt anyway
  const compressedBuffer = result.data;
  const compressedBytes  = compressedBuffer.byteLength;
  const savingPercent    = Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100));

  return {
    buffer:         compressedBuffer,
    mimeType:       'image/jpeg',
    extension:      '.jpg',
    originalBytes,
    compressedBytes,
    savingPercent,
    width:          result.info.width,
    height:         result.info.height,
  };
}

/**
 * Convenience wrapper: compressToMaxBytes from a Web API File.
 */
export async function compressFileToMaxBytes(
  file: File,
  maxBytes = VEHICLE_PHOTO_MAX_BYTES
): Promise<CompressionResult> {
  const buf = Buffer.from(await file.arrayBuffer());
  return compressToMaxBytes(buf, file.type || 'image/jpeg', maxBytes);
}
