/**
 * POST /api/upload
 * ================
 * Accepts a multipart form upload and saves the file to /public/uploads.
 * All image files are automatically compressed via the image-compressor
 * engine before saving — reducing storage & load times with zero effort
 * from the caller.
 *
 * Non-image files (PDF, etc.) are saved as-is.
 */

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { compressFile } from '@/lib/image-compressor';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const isImage      = file.type.startsWith('image/');

    let buffer: Buffer;
    let extension: string;
    let mimeType: string;
    let compressionStats: Record<string, number | string> = {};

    if (isImage) {
      // ── Compress image before saving ──────────────────────────────────
      const result = await compressFile(file, {
        maxWidth:     1280,
        maxHeight:    960,
        quality:      72,
        outputFormat: 'original',  // keep source format (JPEG→JPEG, PNG→PNG …)
        stripMetadata: true,
      });

      buffer    = result.buffer;
      extension = result.extension;
      mimeType  = result.mimeType;

      compressionStats = {
        originalBytes:   result.originalBytes,
        compressedBytes: result.compressedBytes,
        savingPercent:   result.savingPercent,
        width:           result.width,
        height:          result.height,
      };
    } else {
      // ── Non-image: save raw ───────────────────────────────────────────
      const bytes = await file.arrayBuffer();
      buffer    = Buffer.from(bytes);
      extension = path.extname(file.name) || '';
      mimeType  = file.type;
    }

    const filename = isImage
      ? `img-${uniqueSuffix}${extension}`
      : `file-${uniqueSuffix}${extension}`;

    const filepath = path.join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: filename,
      mimeType,
      fileSizeBytes: buffer.byteLength,
      ...(isImage ? { compression: compressionStats } : {}),
    });
  } catch (error: any) {
    console.error('[upload] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
