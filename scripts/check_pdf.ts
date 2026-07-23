import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import * as path from "path";

const pdfPath = "C:/Users/rahul/OneDrive/Desktop/New folder/CARDS BABBARSONS 2.pdf";

async function main() {
  if (!existsSync(pdfPath)) {
    console.log("❌ PDF not found at:", pdfPath);
    process.exit(1);
  }
  
  const buf = readFileSync(pdfPath);
  console.log("✅ File read — Size:", buf.length, "bytes");
  console.log("   Header:", buf.slice(0, 8).toString("ascii"));
  
  // Check if pdfjs-dist is available
  try {
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    console.log("✅ pdfjs-dist loaded");
    
    const pdfData = new Uint8Array(buf);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    console.log("   Pages:", pdf.numPages);
    
  } catch (e: any) {
    console.log("❌ pdfjs-dist not available:", e.code || e.message?.slice(0, 80));
  }

  // Check if canvas is available
  try {
    const { createCanvas } = require("canvas");
    console.log("✅ canvas available");
  } catch (e: any) {
    console.log("❌ canvas not available:", e.code || e.message?.slice(0, 80));
  }
}

main().catch(console.error);
