# Busca la instalación de IC / ICAM, sus carpetas de postprocesador y las referencias a
# M128/M129/M136/M137 y al brillo dentro de sus ficheros (también en binarios compilados).
# SOLO LEE: no modifica nada. Deja el informe en el Escritorio: informe_postprocesador.txt
#
# Uso (clic derecho > "Ejecutar con PowerShell", o desde una consola):
#   powershell -ExecutionPolicy Bypass -File buscar_postprocesador.ps1

$ErrorActionPreference = 'SilentlyContinue'
$informe = Join-Path ([Environment]::GetFolderPath('Desktop')) 'informe_postprocesador.txt'
$patron  = 'M12[89]\b|M13[67]\b|abrill|brill|lucid|assorb|corrent|amper|pression|adattiv|adaptat'
$out = New-Object System.Collections.Generic.List[string]
function Log($t) { $out.Add($t); Write-Host $t }

Log "Informe generado: $(Get-Date)  -  Equipo: $env:COMPUTERNAME"

# 1) Carpetas de instalación candidatas (IC, ICAM, Intermac, Biesse) en los discos locales
$raices = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Free -ne $null } | ForEach-Object { $_.Root }
$nombres = '^(IC|ICAM|iCam.*|Intermac.*|Biesse.*|bSolid.*|Genesis.*)$'
$instal = foreach ($r in $raices) {
  foreach ($base in @($r, (Join-Path $r 'Program Files'), (Join-Path $r 'Program Files (x86)'), (Join-Path $r 'ProgramData'))) {
    Get-ChildItem -LiteralPath $base -Directory | Where-Object { $_.Name -match $nombres }
  }
}
$instal = $instal | Sort-Object FullName -Unique
Log "`n=== Carpetas de instalación encontradas ==="
$instal | ForEach-Object { Log $_.FullName }
if (-not $instal) { Log "(ninguna; edita `$nombres o pasa la ruta a mano)" }

# 2) Carpetas de postprocesador dentro de ellas
$post = foreach ($d in $instal) {
  Get-ChildItem -LiteralPath $d.FullName -Directory -Recurse | Where-Object { $_.Name -match 'post' }
}
$post = $post | Sort-Object FullName -Unique
Log "`n=== Carpetas de postprocesador ==="
foreach ($p in $post) {
  Log "`n[$($p.FullName)]"
  Get-ChildItem -LiteralPath $p.FullName -File | ForEach-Object {
    Log ("  {0,-50} {1,12:N0} bytes  {2:yyyy-MM-dd}" -f $_.Name, $_.Length, $_.LastWriteTime)
  }
}

# 3) Cadenas legibles de cada fichero (ASCII y UTF-16) que coincidan con el patrón, con contexto
function Cadenas([byte[]]$b) {
  $l1 = [Text.Encoding]::GetEncoding(28591).GetString($b)
  $u16 = [Text.Encoding]::Unicode.GetString($b)
  $re = [regex]'[\x20-\x7E\xC0-\xFF]{4,}'
  @($re.Matches($l1) | ForEach-Object Value) + @($re.Matches($u16) | ForEach-Object Value)
}
$ficheros = foreach ($p in $post) { Get-ChildItem -LiteralPath $p.FullName -File -Recurse | Where-Object { $_.Length -lt 60MB } }
Log "`n=== Coincidencias (3 cadenas de contexto antes y después) ==="
foreach ($f in $ficheros) {
  $s = Cadenas ([IO.File]::ReadAllBytes($f.FullName))
  $hits = for ($i = 0; $i -lt $s.Count; $i++) { if ($s[$i] -match $patron) { $i } }
  if (-not $hits) { continue }
  Log "`n##### $($f.FullName)  ($($hits.Count) coincidencias)"
  $hechas = @{}
  foreach ($i in $hits | Select-Object -First 200) {
    $a = [Math]::Max(0, $i - 3); $z = [Math]::Min($s.Count - 1, $i + 3)
    if ($hechas.ContainsKey($a)) { continue }; $hechas[$a] = 1
    Log "  ---"
    for ($k = $a; $k -le $z; $k++) { Log ("  {0}{1}" -f ($(if ($k -eq $i) { '>> ' } else { '   ' })), $s[$k]) }
  }
}

$out | Set-Content -LiteralPath $informe -Encoding UTF8
Write-Host "`nInforme guardado en: $informe"
Read-Host "Pulsa Intro para cerrar"
