
param()

$pdfPath = "C:\Users\rahul\OneDrive\Desktop\New folder\CARDS BABBARSONS 2.pdf"
$outputPath = "C:\Users\rahul\OneDrive\Desktop\workshop-solo\public\uploads\babbarsons_logo.png"
$outputDir = Split-Path $outputPath -Parent
if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }

# Helper to await WinRT async ops
function Await($WinRtTask, $ResultType) {
    $asTask = [System.WindowsRuntimeSystemExtensions]::AsTask($WinRtTask, [System.Threading.CancellationToken]::None)
    $null = $asTask.ConfigureAwait($false)
    $asTask.Wait()
    $asTask.Result
}

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$async = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType=WindowsRuntime]
$async = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
$async = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime]
$async = [Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType=WindowsRuntime]

# Load WinRT extensions
$null = [System.Runtime.InteropServices.WindowsRuntime.WindowsRuntimeMarshal]

try {
    $storageFileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfPath)
    $storageFile = Await $storageFileTask ([Windows.Storage.StorageFile])
    Write-Host "Loaded: $($storageFile.Name)"

    $pdfDocTask = [Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($storageFile)
    $pdfDoc = Await $pdfDocTask ([Windows.Data.Pdf.PdfDocument])
    Write-Host "Pages: $($pdfDoc.PageCount)"

    $page = $pdfDoc.GetPage(0)
    $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
    
    $options = New-Object Windows.Data.Pdf.PdfPageRenderOptions
    $options.DestinationWidth = 2480  # A4 at 300dpi width

    $renderTask = $page.RenderToStreamAsync($stream, $options)
    $null = Await $renderTask ([System.Object])
    Write-Host "Rendered page 0 — stream size: $($stream.Size) bytes"

    # Read bytes from stream
    $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
    $loadTask = $reader.LoadAsync([uint32]$stream.Size)
    $null = Await $loadTask ([System.UInt32])
    
    $bytes = New-Object byte[] $stream.Size
    $reader.ReadBytes($bytes)

    [System.IO.File]::WriteAllBytes($outputPath, $bytes)
    Write-Host "✅ Saved: $outputPath ($($bytes.Length) bytes)"
}
catch {
    Write-Host "❌ Error: $_"
}
