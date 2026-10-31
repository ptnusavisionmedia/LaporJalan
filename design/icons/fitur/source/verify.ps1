$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifest = Get-Content -LiteralPath (Join-Path $assetRoot 'manifest.json') -Raw | ConvertFrom-Json
$svgCount = 0
$pngCount = 0
foreach ($icon in $manifest.icons) {
  foreach ($key in @('svg', 'mono')) {
    $svgFile = Join-Path $assetRoot $icon.$key
    $markup = Get-Content -LiteralPath $svgFile -Raw
    $xml = [xml]$markup
    if ($xml.DocumentElement.LocalName -ne 'svg' -or -not $markup.Contains('C34.25 8 15 26.8 15 50.3')) { throw "Pin concept missing: $svgFile" }
    if ($markup -cmatch 'SOFT|CREAM|ACCENT|undefined|NaN') { throw "Unresolved SVG tokens: $svgFile" }
    $ids = @($xml.SelectNodes('//*[@id]') | ForEach-Object { $_.id })
    if (@($ids | Sort-Object -Unique).Count -ne $ids.Count) { throw "Duplicate SVG IDs: $svgFile" }
    foreach ($match in [regex]::Matches($markup, 'url\(#([^)]+)\)')) {
      if ($match.Groups[1].Value -notin $ids) { throw "Broken mask/clip reference: $svgFile" }
    }
    $svgCount++
  }
  foreach ($key in @('png', 'pngMono')) {
    $file = Join-Path $assetRoot $icon.$key
    $bitmap = [Drawing.Bitmap]::new($file)
    try {
      if ($bitmap.Width -ne 512 -or $bitmap.Height -ne 512) { throw "Wrong dimensions: $file" }
      for ($n = 0; $n -lt 512; $n++) {
        if ($bitmap.GetPixel($n,0).A -ne 0 -or $bitmap.GetPixel($n,511).A -ne 0 -or $bitmap.GetPixel(0,$n).A -ne 0 -or $bitmap.GetPixel(511,$n).A -ne 0) { throw "Cropped or nontransparent edge: $file" }
      }
      $visible = 0
      for ($y = 16; $y -lt 496; $y += 16) { for ($x = 16; $x -lt 496; $x += 16) { if ($bitmap.GetPixel($x,$y).A -gt 0) { $visible++ } } }
      if ($visible -lt 40) { throw "Blank icon: $file" }
      $pngCount++
    } finally { $bitmap.Dispose() }
  }
}
$report = @{ version = $manifest.version; iconDesigns = $manifest.count; svgFiles = $svgCount; pngFiles = $pngCount; pngSize = '512 x 512'; concept = 'Approved custom green pin, cream inset and yellow badge'; allSvgUsePinConcept = $true; transparentUncroppedEdges = $true; nonEmptyRasters = $true; svgXmlAndReferencesValid = $true }
$report | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'QA.json') -Encoding utf8
$report | ConvertTo-Json
