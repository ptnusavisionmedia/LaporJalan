$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifest = Get-Content -LiteralPath (Join-Path $assetRoot 'manifest.json') -Raw | ConvertFrom-Json
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path -LiteralPath $edgePath)) { throw 'Microsoft Edge tidak ditemukan.' }
$profilePath = Join-Path $env:TEMP 'laporjalan-icon-export-profile'
$tileSize = 512
$atlasWidth = 8 * $tileSize
$atlasHeight = [Math]::Ceiling($manifest.count / 8) * $tileSize
foreach ($variant in @('berwarna', 'satu-warna')) {
  $atlasPath = Join-Path $env:TEMP "laporjalan-atlas-$variant.png"
  $atlasUrl = ([Uri](Join-Path $PSScriptRoot "atlas-$variant.html")).AbsoluteUri
  $edgeArguments = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', '--default-background-color=00000000', ('--user-data-dir="' + $profilePath + '"'), "--window-size=$atlasWidth,$atlasHeight", ('--screenshot="' + $atlasPath + '"'), $atlasUrl)
  $process = Start-Process -FilePath $edgePath -ArgumentList $edgeArguments -WindowStyle Hidden -PassThru -Wait
  if ($process.ExitCode -ne 0) { throw "Ekspor atlas gagal: $($process.ExitCode)" }
  $atlas = [Drawing.Bitmap]::new($atlasPath)
  try {
    if ($atlas.Width -ne $atlasWidth -or $atlas.Height -ne $atlasHeight) { throw 'Ukuran atlas tidak sesuai.' }
    $index = 0
    foreach ($icon in $manifest.icons) {
      $directory = Join-Path $assetRoot "png\$variant\$($icon.group)"
      [IO.Directory]::CreateDirectory($directory) | Out-Null
      $rectangle = [Drawing.Rectangle]::new(($index % 8) * $tileSize, [Math]::Floor($index / 8) * $tileSize, $tileSize, $tileSize)
      $image = $atlas.Clone($rectangle, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try { $image.Save((Join-Path $directory "$($icon.id).png"), [Drawing.Imaging.ImageFormat]::Png) } finally { $image.Dispose() }
      $index++
    }
  } finally { $atlas.Dispose() }
}
# Render the presentation sheet separately; this does not alter the master SVG assets.
$previewPath = Join-Path $assetRoot 'pratinjau.png'
$previewUrl = ([Uri](Join-Path $assetRoot 'pratinjau.svg')).AbsoluteUri
$previewXml = [xml](Get-Content -LiteralPath (Join-Path $assetRoot 'pratinjau.svg') -Raw)
$previewSize = "--window-size=$($previewXml.svg.width),$($previewXml.svg.height)"
$edgeArguments = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', ('--user-data-dir="' + $profilePath + '"'), $previewSize, ('--screenshot="' + $previewPath + '"'), $previewUrl)
$process = Start-Process -FilePath $edgePath -ArgumentList $edgeArguments -WindowStyle Hidden -PassThru -Wait
if ($process.ExitCode -ne 0) { throw 'Ekspor pratinjau gagal.' }
$samplePath = Join-Path $assetRoot 'contoh-konsep.png'
$sampleUrl = ([Uri](Join-Path $assetRoot 'contoh-konsep.svg')).AbsoluteUri
$edgeArguments = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', ('--user-data-dir="' + $profilePath + '"'), '--window-size=1070,690', ('--screenshot="' + $samplePath + '"'), $sampleUrl)
$process = Start-Process -FilePath $edgePath -ArgumentList $edgeArguments -WindowStyle Hidden -PassThru -Wait
if ($process.ExitCode -ne 0) { throw 'Ekspor contoh konsep gagal.' }
Write-Output "PNG: $($manifest.count * 2) file transparan $tileSize x $tileSize; pratinjau diperbarui."
