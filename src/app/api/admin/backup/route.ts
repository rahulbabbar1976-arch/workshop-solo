import { NextRequest, NextResponse } from 'next/server';
import { getPrismaForDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// GET /api/admin/backup?scope=full|users|settings
export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get('scope') || 'full';
    const db = getPrismaForDb('dev.db');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    // ── Collect data based on scope ──────────────────────────────────────
    const manifest: Record<string, unknown> = {
      version: '1.0',
      scope,
      exportedAt: new Date().toISOString(),
      generator: 'AutoBot Workshop System',
    };

    const exportData: Record<string, unknown> = { manifest };

    if (scope === 'full' || scope === 'users') {
      // Export all users (no password hashes)
      const users = await db.user.findMany({
        select: {
          id: true, fullName: true, email: true, mobile: true,
          isActive: true, lastLoginAt: true, createdAt: true,
          skillCategory: true, team: true,
          roles: { include: { role: { select: { roleKey: true, roleName: true } } } }
        }
      });
      exportData.users = users;
      manifest.userCount = users.length;

      // Export workshop profiles
      const profiles = await db.workshopProfile.findMany();
      exportData.workshopProfiles = profiles;
      manifest.profileCount = profiles.length;
    }

    if (scope === 'full' || scope === 'settings') {
      const taxSettings      = await db.taxSettings.findMany();
      const printSettings    = await db.printSettings.findMany();
      const numberingSettings = await db.numberingSettings.findMany();
      const documentTemplates = await db.documentTemplate.findMany();

      exportData.taxSettings       = taxSettings;
      exportData.printSettings     = printSettings;
      exportData.numberingSettings = numberingSettings;
      exportData.documentTemplates = documentTemplates;
    }

    if (scope === 'full') {
      // Include tenant DB list
      const dbDir = process.cwd();
      const tenantFiles = fs.readdirSync(dbDir).filter(f => f.endsWith('.db') && f !== 'dev.db');
      manifest.tenantDatabases = tenantFiles;
      exportData.tenantDatabaseList = tenantFiles;
    }

    // ── Build a simple JSON export (ZIP would require archiver package) ──
    // For now, export as a comprehensive JSON file. 
    // After adding 'archiver' package, this will be a real ZIP.
    const jsonContent = JSON.stringify(exportData, null, 2);
    const filename = `autobot-backup-${scope}-${timestamp}.json`;

    return new NextResponse(jsonContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      }
    });

  } catch (err: any) {
    console.error('Backup error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
