# Respaldo automatico: si hay cambios en el repo, hace commit y push a GitHub.
# Lo ejecuta el hook "Stop" de Claude Code al terminar cada respuesta.
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$git = 'C:\Program Files\Git\cmd\git.exe'
Set-Location -LiteralPath $repo

if (-not (& $git status --porcelain)) { exit 0 }

& $git add -A
& $git commit -q -m "Respaldo automatico $(Get-Date -Format 'yyyy-MM-dd HH:mm')" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Output '{"systemMessage": "Respaldo: no se pudo hacer el commit."}'
    exit 0
}

if (& $git remote) {
    & $git push -q origin HEAD *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Output '{"systemMessage": "Respaldo: commit local hecho, pero fallo el push a GitHub."}'
    }
}
exit 0
