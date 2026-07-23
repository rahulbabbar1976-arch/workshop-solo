Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType=WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime]

function Await {
    param($Task)
    $t = [System.WindowsRuntimeSystemExtensions]::AsTask($Task)
    $t.Wait()
    return $t.Result
}

$pdfPath = 'C:\Users\rahul\OneDrive\Desktop\New folder\CARDS BABBARSONS 2.pdf'
$outputPath = 'C:\Users\rahul\OneDrive\Desktop\workshop-solo\public\uploads\babbarsons_logo.png'
$outputDir = Split-Path $outputPath
if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }

$f = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfPath))
Write-Host 'Loaded file'
$doc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($f))
Write-Host ('Pages: ' + $doc.PageCount)
$page = $doc.GetPage(0)
$stream = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
$opts = [Windows.Data.Pdf.PdfPageRenderOptions]::new()
$opts.DestinationWidth = 2480
Await ($page.RenderToStreamAsync($stream, $opts)) | Out-Null
$dr = [Windows.Storage.Streams.DataReader]::new($stream.GetInputStreamAt(0))
Await ($dr.LoadAsync([uint32]$stream.Size)) | Out-Null
$bytes = New-Object byte[] $stream.Size
$dr.ReadBytes($bytes)
[System.IO.File]::WriteAllBytes($outputPath, $bytes)
Write-Host ('DONE: ' + $outputPath + ' (' + $bytes.Length + ' bytes)')
