param(
    [int]$Iterations = 10,
    [switch]$UseLocalRepo
)

$ErrorActionPreference = "Stop"

if ($Iterations -lt 1) {
    throw "Iterations must be >= 1."
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"

if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found: $backendDir"
}

$mvnArgs = @()
if ($UseLocalRepo) {
    $mvnArgs += "-Dmaven.repo.local=.m2repo"
}

Push-Location $backendDir
try {
    for ($i = 1; $i -le $Iterations; $i++) {
        Write-Host "Soak iteration $i / $Iterations"
        & .\mvnw.cmd @mvnArgs `
            "-Dtest=BookingConcurrencyIntegrationTest" `
            "test"
        if ($LASTEXITCODE -ne 0) {
            throw "Soak failed at iteration $i."
        }
    }
    Write-Host "Soak completed: $Iterations/$Iterations successful iterations."
}
finally {
    Pop-Location
}
