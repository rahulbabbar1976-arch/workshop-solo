const fs = require("fs");
const path = require("path");

const pdfPath = "C:/Users/rahul/OneDrive/Desktop/New folder/CARDS BABBARSONS 2.pdf";
const outputDir = "C:/Users/rahul/OneDrive/Desktop/workshop-solo/public/uploads";
const outputPath = path.join(outputDir, "babbarsons_logo.png");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Polyfill DOMMatrix if not available globally
if (typeof global.DOMMatrix === 'undefined') {
  console.log("Polyfilling global.DOMMatrix...");
  try {
    // @napi-rs/canvas does not export DOMMatrix directly sometimes, but let's check
    const canvas = require("@napi-rs/canvas");
    if (canvas.DOMMatrix) {
      global.DOMMatrix = canvas.DOMMatrix;
    } else {
      // Simple fallback DOMMatrix implementation if needed, or check if another library has it
      // Let's create a minimal mockup of DOMMatrix since pdf.js just needs basic matrix ops
      class DOMMatrix {
        constructor() {
          this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
      }
      global.DOMMatrix = DOMMatrix;
    }
  } catch (e) {
    console.log("Canvas require failed:", e);
  }
}

async function renderPdf() {
  console.log("Loading legacy pdfjs-dist...");
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = require("@napi-rs/canvas");

  console.log("Reading PDF file...");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  
  console.log("Parsing PDF...");
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  console.log(`PDF loaded. Total pages: ${pdf.numPages}`);

  const page = await pdf.getPage(1);
  console.log("Page 1 loaded. Rendering to canvas...");
  
  const viewport = page.getViewport({ scale: 3.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };

  await page.render(renderContext).promise;
  console.log("Page rendered. Encoding to PNG...");

  const pngData = await canvas.encode("png");
  fs.writeFileSync(outputPath, pngData);
  console.log(`SUCCESS: Logo saved to ${outputPath} (${pngData.length} bytes)`);
}

renderPdf().catch(e => {
  console.error("Error during rendering:", e);
  process.exit(1);
});
