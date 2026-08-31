param(
  [Parameter(Mandatory = $true)][string]$Bundle,
  [Parameter(Mandatory = $true)][string]$Binary
)

$bundlePath = (Resolve-Path $Bundle).Path
$env:GRINDFESTA_NO_OPEN = "1"
$process = Start-Process -FilePath "$bundlePath/$Binary" `
  -WorkingDirectory $bundlePath -PassThru `
  -RedirectStandardOutput "$bundlePath/engine.out.log" `
  -RedirectStandardError "$bundlePath/engine.err.log"

try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    & curl.exe --fail --silent --max-time 2 --output NUL http://localhost:9002/health
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) {
    Get-Content "$bundlePath/engine.out.log", "$bundlePath/engine.err.log"
    throw "Engine did not become ready"
  }

  $editorPath = "$bundlePath/editor-smoke.html"
  & curl.exe --fail --silent --max-time 5 --output $editorPath http://localhost:9002/
  if ($LASTEXITCODE -ne 0 -or (Get-Content $editorPath -Raw) -notmatch '<title>Grindfesta Engine</title>') {
    throw "Editor HTML was not served"
  }
} finally {
  if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    $process.WaitForExit()
  }
  Remove-Item "$bundlePath/db", "$bundlePath/db-shm", "$bundlePath/db-wal", `
    "$bundlePath/engine.out.log", "$bundlePath/engine.err.log", `
    "$bundlePath/editor-smoke.html" -Force -ErrorAction SilentlyContinue
  Remove-Item "$bundlePath/projects" -Recurse -Force -ErrorAction SilentlyContinue
}
