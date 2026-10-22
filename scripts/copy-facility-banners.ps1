$ErrorActionPreference = 'Stop'
$destDir = Join-Path $PSScriptRoot '..\public\facility-banners'
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

$sourceDirs = @(
  (Join-Path $PSScriptRoot '..\assets'),
  (Join-Path $env:USERPROFILE '.cursor\projects\c-Users-Admin-Desktop-PARKINGDEMO\assets')
)

$files = @('shopping-mall.jpg', 'railway-station.jpg', 'parking-facility.jpg')

foreach ($file in $files) {
  $copied = $false
  foreach ($dir in $sourceDirs) {
    $source = Join-Path $dir $file
    if (Test-Path -LiteralPath $source) {
      Copy-Item -LiteralPath $source -Destination (Join-Path $destDir $file) -Force
      $copied = $true
      break
    }
  }
  if (-not $copied) {
    Write-Error "Missing source for $file"
  }
}

Write-Host "Copied facility banner photos to $destDir"
