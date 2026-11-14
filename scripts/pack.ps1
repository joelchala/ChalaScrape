# Empaqueta la extensión en dist/ChalaScrape-<version>.zip (el mismo zip sirve para Chrome Web Store y Edge Add-ons).
# Uso (desde la raíz del repo): powershell -ExecutionPolicy Bypass -File scripts\pack.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$version = (Get-Content (Join-Path $root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
# Solo lo que necesita la extensión: server/, test/, store/, scripts/ y .claude/ quedan fuera.
$files = @('manifest.json', 'background.js', '_locales', 'icons', 'content', 'sidepanel', 'lib', 'THIRD_PARTY_NOTICES.md')

New-Item -ItemType Directory -Force $dist | Out-Null

# tar.exe de Windows (bsdtar) escribe rutas con "/" como exigen las tiendas; Compress-Archive de PS 5.1 usa "\".
# Ruta fija: el tar de Git no sabe crear .zip y puede ir antes en el PATH.
$tar = Join-Path $env:SystemRoot 'System32/tar.exe'
$zip = Join-Path $dist "ChalaScrape-$version.zip"
Remove-Item $zip -ErrorAction SilentlyContinue
& $tar -a -c -f $zip -C $root @files
if ($LASTEXITCODE -ne 0) { throw 'tar falló al crear el zip' }

Get-Item $zip | Select-Object Name, Length
