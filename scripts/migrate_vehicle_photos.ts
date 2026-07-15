/**
 * Apply VehiclePhoto migration directly via the DIRECT_URL connection.
 * This bypasses pgBouncer (which blocks schema DDL).
 */
import 'dotenv/config';
import { Client } from 'pg';

const sql = `
CREATE TABLE IF NOT EXISTS "VehiclePhoto" (
  "id"            TEXT NOT NULL,
  "vehicleId"     TEXT NOT NULL,
  "jobcardId"     TEXT,
  "fileUrl"       TEXT NOT NULL,
  "fileName"      TEXT,
  "mimeType"      TEXT,
  "fileSizeBytes" INTEGER NOT NULL,
  "captureLabel"  TEXT,
  "phase"         TEXT,
  "capturedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VehiclePhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehiclePhoto_vehicleId_fkey"
    FOREIGN KEY ("vehicleId")
    REFERENCES "Vehicle"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "VehiclePhoto_vehicleId_idx" ON "VehiclePhoto"("vehicleId");
CREATE INDEX IF NOT EXISTS "VehiclePhoto_createdAt_idx"  ON "VehiclePhoto"("createdAt");
`;

async function main() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) throw new Error('DIRECT_URL not set in .env');

  const client = new Client({ connectionString: directUrl });
  await client.connect();
  console.log('Connected to Supabase (direct)');

  await client.query(sql);
  console.log('✔ VehiclePhoto table created / already exists');

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
