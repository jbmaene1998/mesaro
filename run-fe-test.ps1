param(
    [switch]$E2E,
    [switch]$UI,
    [switch]$Install,
    [string]$Filter
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $repoRoot "frontend"

if (-not (Test-Path $frontendDir)) {
    throw "Frontend directory not found: $frontendDir"
}

Push-Location $frontendDir
try {
    if ($Install) {
        Write-Host "Installing frontend dependencies..."
        npm.cmd install
    }

    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        throw "Missing node_modules in frontend/. Run .\run-fe-test.ps1 -Install first."
    }

    if ($E2E) {
        if ($UI) {
            Write-Host "Running Playwright in UI mode..."
            npm.cmd run e2e:ui
        }
        elseif ($Filter) {
            Write-Host "Running Playwright e2e tests (filter: $Filter)..."
            npm.cmd run e2e -- --grep $Filter
        }
        else {
            Write-Host "Running Playwright e2e tests..."
            npm.cmd run e2e
        }

        exit $LASTEXITCODE
    }

    if ($UI) {
        Write-Host "Ignoring -UI because it only applies with -E2E."
    }

    if ($Filter) {
        Write-Host "Running Vitest unit/integration tests (filter: $Filter)..."
        npm.cmd run test -- src $Filter
    }
    else {
        Write-Host "Running Vitest unit/integration tests..."
        npm.cmd run test -- src
    }

    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
