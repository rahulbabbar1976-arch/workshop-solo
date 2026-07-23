import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

// Use pdfjs-dist to render PDF to canvas then save as PNG
async function extractLogoFromPDF() {
  const pdfPath = "C:/Users/rahul/OneDrive/Desktop/New folder/CARDS BABBARSONS 2.pdf";
  const outputPath = "public/uploads/babbarsons_logo.png";

  // Try dynamic import of pdfjs
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as any);
    console.log("pdfjs-dist available, loading PDF...");
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    const pdf = await loadingTask.promise;
    console.log("PDF loaded, pages:", pdf.numPages);
  } catch (e: any) {
    console.log("pdfjs not available:", e.message);
  }

  // Check if sharp is in workspace node_modules
  try {
    const sharp = (await import("sharp")).default;
    const info = await sharp(pdfPath).metadata();
    console.log("Sharp metadata:", info);
  } catch (e: any) {
    console.log("Sharp cannot read PDF:", e.message);
  }

  console.log("Manual extraction needed - PDF path:", pdfPath);
}

extractLogoFromPDF().catch(console.error);
