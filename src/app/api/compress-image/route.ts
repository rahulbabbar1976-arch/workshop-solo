/**
 * POST /api/compress-image
 * ========================
 * Accepts a multipart form upload, compresses the image through the
 * image-compressor engine, and returns the compressed binary.
 *
 * Form fields:
 *   file         {File}    required — the image to compress
 *   maxWidth     {number}  optional — default 1280
 *   maxHeight    {number}  optional — default 960
 *   quality      {number}  optional — default 72  (1-100)
 *   outputFormat {string}  optional — 'original' | 'jpeg' | 'webp' | 'png' | 'avif'
 *
 * Returns a JSON envelope when saving fails, or the raw compressed
 * binary (with appropriate Content-Type) on success.
 */

import { NextRequest, NextResponse } from 'next/server';
import { compressFile, CompressOptions } from '@/lib/image-compressor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are supported' },
        { status: 415 }
      );
    }

    const options: CompressOptions = {
      maxWidth:     Number(formData.get('maxWidth'))  || 1280,
      maxHeight:    Number(formData.get('maxHeight')) || 960,
      quality:      Number(formData.get('quality'))   || 72,
      outputFormat: (formData.get('outputFormat') as CompressOptions['outputFormat']) || 'original',
      stripMetadata: true,
    };

    const result = await compressFile(file, options);

    // Return the compressed image binary directly
    // Cast Buffer → Uint8Array for BodyInit compatibility
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type':   result.mimeType,
        'Content-Length': String(result.compressedBytes),
        // Pass stats as headers so callers can log them
        'X-Original-Bytes':    String(result.originalBytes),
        'X-Compressed-Bytes':  String(result.compressedBytes),
        'X-Saving-Percent':    String(result.savingPercent),
        'X-Image-Width':       String(result.width),
        'X-Image-Height':      String(result.height),
        'X-Image-Format':      result.mimeType,
      },
    });
  } catch (error: any) {
    console.error('[compress-image] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Compression failed' },
      { status: 500 }
    );
  }
}
