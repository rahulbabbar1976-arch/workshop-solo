const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const pdfPath = "C:/Users/rahul/OneDrive/Desktop/New folder/CARDS BABBARSONS 2.pdf";
const outputDir = "C:/Users/rahul/OneDrive/Desktop/workshop-solo/public/uploads";
const outputPath = path.join(outputDir, "babbarsons_logo.png");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
  // Try pdfjs-dist approach via temp install check
  try {
    // Install pdfjs-dist + canvas locally for one-time use
    console.log("Installing pdfjs-dist + canvas...");
    execSync("npm install --save-dev pdfjs-dist@4 canvas@2", {
      cwd: "C:/Users/rahul/OneDrive/Desktop/workshop-solo",
      stdio: "inherit",
      timeout: 120000,
    });
    console.log("Dependencies installed.");
  } catch (e) {
    console.log("Install failed:", e.message.slice(0, 100));
  }

  try {
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    const { createCanvas } = require("canvas");
    
    const pdfData = fs.readFileSync(pdfPath);
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfData) }).promise;
    console.log("PDF pages:", pdf.numPages);
    
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 3.0 });
    
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outputPath, buffer);
    console.log("SUCCESS: Saved", outputPath, "(" + buffer.length + " bytes)");
  } catch (e) {
    console.log("Render error:", e.message?.slice(0, 200));
  }
}

run().catch(console.error);
