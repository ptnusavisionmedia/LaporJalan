$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifest = Get-Content -LiteralPath (Join-Path $assetRoot 'manifest.json') -Raw | ConvertFrom-Json
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path -LiteralPath $edgePath)) { throw 'Microsoft Edge tidak ditemukan.' }
$profilePath = Join-Path $env:TEMP 'laporjalan-icon-export-profile'
foreach ($variant in @('berwarna', 'satu-warna')) {
  $atlasPath = Join-Path $env:TEMP "laporjalan-atlas-$variant.png"
  $atlasUrl = ([Uri](Join-Path $PSScriptRoot "atlas-$variant.html")).AbsoluteUri
  $edgeArguments = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', '--default-background-color=00000000', ('--user-data-dir="' + $profilePath + '"'), '--window-size=2048,3072', ('--screenshot="' + $atlasPath + '"'), $atlasUrl)
  $process = Start-Process -FilePath $edgePath -ArgumentList $edgeArguments -WindowStyle Hidden -PassThru -Wait
  if ($process.ExitCode -ne 0) { throw "Ekspor atlas gagal: $($process.ExitCode)" }
  $atlas = [Drawing.Bitmap]::new($atlasPath)
  try {
    if ($atlas.Width -ne 2048 -or $atlas.Height -ne 3072) { throw 'Ukuran atlas tidak sesuai.' }
    $index = 0
    foreach ($icon in $manifest.icons) {
      $directory = Join-Path $assetRoot "png\$variant\$($icon.group)"
      [IO.Directory]::CreateDirectory($directory) | Out-Null
      $rectangle = [Drawing.Rectangle]::new(($index % 8) * 256, [Math]::Floor($index / 8) * 256, 256, 256)
      $image = $atlas.Clone($rectangle, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try { $image.Save((Join-Path $directory "$($icon.id).png"), [Drawing.Imaging.ImageFormat]::Png) } finally { $image.Dispose() }
      $index++
    }
  } finally { $atlas.Dispose() }
}
# Render the presentation sheet separately; this does not alter the master SVG assets.
$previewPath = Join-Path $assetRoot 'pratinjau.png'
$previewUrl = ([Uri](Join-Path $assetRoot 'pratinjau.svg')).AbsoluteUri
$edgeArguments = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', ('--user-data-dir="' + $profilePath + '"'), '--window-size=1440,2858', ('--screenshot="' + $previewPath + '"'), $previewUrl)
$process = Start-Process -FilePath $edgePath -ArgumentList $edgeArguments -WindowStyle Hidden -PassThru -Wait
if ($process.ExitCode -ne 0) { throw 'Ekspor pratinjau gagal.' }
Write-Output "PNG: $($manifest.count * 2) file transparan 256 x 256; pratinjau diperbarui."
