/**
 * Vehicle Photo Store — Quota-managed image API
 * ==============================================
 *
 * GET    /api/vehicles/:id/photos          List all photos + quota stats
 * POST   /api/vehicles/:id/photos          Upload + compress to ≤100 KB + enforce 1 MB quota
 * DELETE /api/vehicles/:id/photos/:photoId Delete one photo
 *
 * Quota rules (defaults from image-compressor constants):
 *  - Each photo is compressed to ≤ VEHICLE_PHOTO_MAX_BYTES (100 KB)
 *  - Total per vehicle is ≤ VEHICLE_PHOTO_QUOTA_BYTES (1 MB = 10 photos max)
 *  - When adding a photo would exceed the quota, oldest photos are deleted
 *    one-by-one (by createdAt ASC) until there is room for the new one.
 *
 * POST form fields:
 *   file         {File}   required
 *   jobcardId    {string} optional — job card context
 *   captureLabel {string} optional — "front" / "rear" / "engine" etc.
 *   phase        {string} optional — "intake" / "work" / "delivery"
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import {
  compressToMaxBytes,
  VEHICLE_PHOTO_QUOTA_BYTES,
  VEHICLE_PHOTO_MAX_BYTES,
} from '@/lib/image-compressor';

const PHOTO_DIR = path.join(process.cwd(), 'public', 'uploads', 'v-photos');

// ─── GET — list photos + quota stats ─────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vehicleId } = await params;

  try {
    const photos = await prisma.vehiclePhoto.findMany({
      where:   { vehicleId },
      orderBy: { createdAt: 'desc' },
    });

    const usedBytes  = photos.reduce((sum, p) => sum + p.fileSizeBytes, 0);
    const quotaBytes = VEHICLE_PHOTO_QUOTA_BYTES;
    const usedPct    = Math.round((usedBytes / quotaBytes) * 100);

    return NextResponse.json({
      success: true,
      photos,
      quota: {
        usedBytes,
        quotaBytes,
        usedPercent: usedPct,
        remainingBytes: Math.max(0, quotaBytes - usedBytes),
        maxPerPhotoBytes: VEHICLE_PHOTO_MAX_BYTES,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST — compress + quota-enforce + save ───────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vehicleId } = await params;

  try {
    // 1. Validate vehicle exists
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }

    const formData    = await req.formData();
    const file        = formData.get('file') as File | null;
    const jobcardId   = formData.get('jobcardId')   as string | null;
    const captureLabel = formData.get('captureLabel') as string | null;
    const phase        = formData.get('phase')        as string | null;

    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'A valid image file is required' },
        { status: 400 }
      );
    }

    // 2. Compress to ≤ 100 KB at highest possible resolution
    const raw    = Buffer.from(await file.arrayBuffer());
    const result = await compressToMaxBytes(raw, file.type);

    // 3. Enforce 1 MB quota — evict oldest photos one-by-one until there is room
    const evictCandidate = async () => {
      const oldest = await prisma.vehiclePhoto.findFirst({
        where:   { vehicleId },
        orderBy: { createdAt: 'asc' },
      });
      if (!oldest) return;
      await prisma.vehiclePhoto.delete({ where: { id: oldest.id } });
    };

    // Loop until there is enough room
    while (true) {
      const photos = await prisma.vehiclePhoto.findMany({ where: { vehicleId } });
      const used   = photos.reduce((s, p) => s + p.fileSizeBytes, 0);
      if (used + result.compressedBytes <= VEHICLE_PHOTO_QUOTA_BYTES) break;
      await evictCandidate();
    }

    // 4. Bypass Vercel read-only filesystem by converting the tiny 100KB image to Base64
    const fileUrl = `data:${result.mimeType};base64,${result.buffer.toString('base64')}`;
    const filename = `vp-${vehicleId.slice(0, 8)}-${Date.now()}.jpg`;

    // 5. Persist DB record
    const photo = await prisma.vehiclePhoto.create({
      data: {
        vehicleId,
        jobcardId:    jobcardId   || null,
        fileUrl,
        fileName:     filename,
        mimeType:     result.mimeType,
        fileSizeBytes: result.compressedBytes,
        captureLabel: captureLabel || null,
        phase:        phase        || null,
      },
    });

    // 6. Return with updated quota stats
    const allPhotos  = await prisma.vehiclePhoto.findMany({ where: { vehicleId } });
    const usedBytes  = allPhotos.reduce((s, p) => s + p.fileSizeBytes, 0);

    return NextResponse.json({
      success: true,
      photo,
      compression: {
        originalBytes:   result.originalBytes,
        compressedBytes: result.compressedBytes,
        savingPercent:   result.savingPercent,
        width:           result.width,
        height:          result.height,
      },
      quota: {
        usedBytes,
        quotaBytes:      VEHICLE_PHOTO_QUOTA_BYTES,
        usedPercent:     Math.round((usedBytes / VEHICLE_PHOTO_QUOTA_BYTES) * 100),
        remainingBytes:  Math.max(0, VEHICLE_PHOTO_QUOTA_BYTES - usedBytes),
      },
    });
  } catch (err: any) {
    console.error('[vehicle-photos] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE — remove one photo ────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vehicleId } = await params;

  try {
    const { photoId } = await req.json();
    if (!photoId) {
      return NextResponse.json({ success: false, error: 'photoId required' }, { status: 400 });
    }

    const photo = await prisma.vehiclePhoto.findFirst({
      where: { id: photoId, vehicleId },
    });

    if (!photo) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    await prisma.vehiclePhoto.delete({ where: { id: photoId } });

    // Return updated quota
    const allPhotos = await prisma.vehiclePhoto.findMany({ where: { vehicleId } });
    const usedBytes = allPhotos.reduce((s, p) => s + p.fileSizeBytes, 0);

    return NextResponse.json({
      success: true,
      quota: {
        usedBytes,
        quotaBytes:     VEHICLE_PHOTO_QUOTA_BYTES,
        usedPercent:    Math.round((usedBytes / VEHICLE_PHOTO_QUOTA_BYTES) * 100),
        remainingBytes: Math.max(0, VEHICLE_PHOTO_QUOTA_BYTES - usedBytes),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PATCH — update print selection flags ────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vehicleId } = await params;

  try {
    const { photoId, printOnJobcard, printOnEstimate } = await req.json();
    if (!photoId) {
      return NextResponse.json({ success: false, error: 'photoId required' }, { status: 400 });
    }

    const photo = await prisma.vehiclePhoto.findFirst({
      where: { id: photoId, vehicleId },
    });

    if (!photo) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    const updated = await prisma.vehiclePhoto.update({
      where: { id: photoId },
      data: {
        printOnJobcard: printOnJobcard !== undefined ? printOnJobcard : photo.printOnJobcard,
        printOnEstimate: printOnEstimate !== undefined ? printOnEstimate : photo.printOnEstimate,
      },
    });

    return NextResponse.json({ success: true, photo: updated });
  } catch (err: any) {
    console.error('[vehicle-photos] PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
