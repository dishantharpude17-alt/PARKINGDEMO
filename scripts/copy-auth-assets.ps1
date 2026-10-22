$ErrorActionPreference = 'Stop'
$destDir = Join-Path $PSScriptRoot '..\public\auth'
$destFile = Join-Path $destDir 'parking-garage-hero.jpg'
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

$sourceFiles = @(
  (Join-Path $PSScriptRoot '..\assets\parking-garage-hero.jpg'),
  (Join-Path $env:USERPROFILE '.cursor\projects\c-Users-Admin-Desktop-PARKINGDEMO\assets\parking-garage-hero.jpg')
)

foreach ($source in $sourceFiles) {
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $destFile -Force
    $size = (Get-Item -LiteralPath $destFile).Length
    Write-Host "Copied parking-garage-hero.jpg ($size bytes) to $destDir"
    exit 0
  }
}

Write-Error "parking-garage-hero.jpg not found. Tried:`n$($sourceFiles -join "`n")"
