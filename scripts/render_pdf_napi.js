const fs = require("fs");
const path = require("path");

const pdfPath = "C:/Users/rahul/OneDrive/Desktop/New folder/CARDS BABBARSONS 2.pdf";
const outputDir = "C:/Users/rahul/OneDrive/Desktop/workshop-solo/public/uploads";
const outputPath = path.join(outputDir, "babbarsons_logo.png");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function renderPdf() {
  console.log("Loading pdfjs-dist and @napi-rs/canvas...");
  
  // Dynamic imports / requires
  let pdfjsLib;
  try {
    pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
  } catch (e) {
    console.log("pdfjs-dist/legacy/build/pdf.js not found, trying import...");
    pdfjsLib = require("pdfjs-dist");
  }
  
  const { createCanvas } = require("@napi-rs/canvas");

  console.log("Reading PDF file...");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  
  console.log("Parsing PDF...");
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  console.log(`PDF loaded. Total pages: ${pdf.numPages}`);

  const page = await pdf.getPage(1);
  console.log("Page 1 loaded. Rendering to canvas...");
  
  // Set scale (3.0 for high resolution)
  const viewport = page.getViewport({ scale: 3.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  // Render context
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
