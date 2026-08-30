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
    try {
      $health = Invoke-WebRequest http://localhost:9002/health
      if ($health.StatusCode -eq 200) { $ready = $true; break }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $ready) {
    Get-Content "$bundlePath/engine.out.log", "$bundlePath/engine.err.log"
    throw "Engine did not become ready"
  }

  $editor = Invoke-WebRequest http://localhost:9002/
  $editorContent = if ($editor.Content -is [byte[]]) {
    [System.Text.Encoding]::UTF8.GetString($editor.Content)
  } else {
    [string]$editor.Content
  }
  if ($editor.StatusCode -ne 200 -or $editorContent -notmatch '<title>Grindfesta Engine</title>') {
    throw "Editor HTML was not served"
  }
} finally {
  if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    $process.WaitForExit()
  }
  Remove-Item "$bundlePath/db", "$bundlePath/db-shm", "$bundlePath/db-wal", `
    "$bundlePath/engine.out.log", "$bundlePath/engine.err.log" -Force -ErrorAction SilentlyContinue
  Remove-Item "$bundlePath/projects" -Recurse -Force -ErrorAction SilentlyContinue
}
