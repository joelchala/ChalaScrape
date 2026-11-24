# Empaqueta la extensión en dist/ChalaScrape-<version>.zip (Chrome/Edge) y dist/ChalaScrape-<version>-firefox.zip (Firefox AMO).
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

# Firefox AMO: transformar dinámicamente manifest.json sin duplicar código fuente
$tmp = Join-Path $dist 'firefox-tmp'
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $tmp | Out-Null
foreach ($f in $files) {
  Copy-Item (Join-Path $root $f) (Join-Path $tmp $f) -Recurse -Force
}

$manifestRaw = Get-Content (Join-Path $tmp 'manifest.json') -Raw -Encoding UTF8
$manifest = $manifestRaw | ConvertFrom-Json
$ffPerms = @($manifest.permissions | Where-Object { $_ -ne 'sidePanel' })

$ffManifest = [ordered]@{
  manifest_version = $manifest.manifest_version
  name             = $manifest.name
  short_name       = $manifest.short_name
  description      = $manifest.description
  version          = $manifest.version
  default_locale   = $manifest.default_locale
  icons            = $manifest.icons
  action           = $manifest.action
  background       = [ordered]@{
    scripts = @('background.js')
  }
  sidebar_action   = [ordered]@{
    default_panel = $manifest.side_panel.default_path
    default_title = '__MSG_extName__'
    default_icon  = $manifest.icons
  }
  permissions      = $ffPerms
  browser_specific_settings = [ordered]@{
    gecko = [ordered]@{
      id                        = 'chalascrape@chaladev.site'
      strict_min_version        = '115.0'
      data_collection_permissions = [ordered]@{
        required = @('authenticationInfo')
      }
    }
  }
}

$ffJson = ($ffManifest | ConvertTo-Json -Depth 10) + "`n"
[System.IO.File]::WriteAllText((Join-Path $tmp 'manifest.json'), $ffJson, [System.Text.UTF8Encoding]::new($false))

$firefoxZip = Join-Path $dist "ChalaScrape-$version-firefox.zip"
Remove-Item $firefoxZip -ErrorAction SilentlyContinue
& $tar -a -c -f $firefoxZip -C $tmp @files
if ($LASTEXITCODE -ne 0) { throw 'tar falló al crear el zip de Firefox' }
Remove-Item $tmp -Recurse -Force

Get-Item $zip, $firefoxZip | Select-Object Name, Length
