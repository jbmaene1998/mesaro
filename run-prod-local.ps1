param(
    [switch]$Down,
    [switch]$SkipFrontendBuild,
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$envExample = Join-Path $backendDir ".env.prod.local.example"
$envFile = Join-Path $backendDir ".env.prod.local"
$frontendDist = Join-Path $backendDir "frontend-dist"
$composeFiles = @(
    "-f", "docker-compose.prod.yml",
    "-f", "docker-compose.prod.local.yml"
)

function Assert-Docker {
    try {
        docker version | Out-Null
    }
    catch {
        throw "Docker is not available. Start Docker Desktop and retry."
    }
}

function Ensure-EnvFile {
    if (Test-Path $envFile) {
        Write-Host "Using existing $envFile"
        return
    }
    if (-not (Test-Path $envExample)) {
        throw "Missing $envExample"
    }
    Copy-Item $envExample $envFile
    Write-Host "Created $envFile from example (edit Stripe keys when you need billing)."
}

function Import-ProdLocalEnv {
    # Host shell vars (e.g. from run-dev.ps1) win over --env-file during compose
    # interpolation. Force .env.prod.local into this process first.
    Write-Host "Loading compose interpolation env from $envFile..."
    Get-Content -Path $envFile | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            return
        }
        $parts = $line -split "=", 2
        if ($parts.Count -ne 2) {
            return
        }
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if (-not [string]::IsNullOrWhiteSpace($key)) {
            Set-Item -Path "Env:$key" -Value $value
        }
    }
}

function Build-Frontend {
    Write-Host "Building frontend for https://api.mesaro.localhost:9443 ..."
    Push-Location $frontendDir
    try {
        $env:VITE_API_URL = "https://api.mesaro.localhost:9443/api"
        if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
            npm ci
        }
        # Vite-only: full `npm run build` also runs tsc and currently fails on unrelated type debts.
        npx vite build
        if ($LASTEXITCODE -ne 0) {
            throw "vite build failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
        Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
    }

    $distDir = Join-Path $frontendDir "dist"
    if (-not (Test-Path (Join-Path $distDir "index.html"))) {
        throw "Frontend build did not produce dist/index.html"
    }

    if (Test-Path $frontendDist) {
        Remove-Item $frontendDist -Recurse -Force
    }
    New-Item -ItemType Directory -Path $frontendDist | Out-Null
    Copy-Item -Path (Join-Path $distDir "*") -Destination $frontendDist -Recurse -Force
    Write-Host "Frontend copied to $frontendDist"
}

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$ComposeArgs)
    Push-Location $backendDir
    try {
        & docker compose @composeFiles --env-file ".env.prod.local" @ComposeArgs
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

function Wait-Healthy {
    $deadline = (Get-Date).AddMinutes(8)
    # Prefer direct container publish (no TLS) for readiness; Caddy may still be warming up.
    $urls = @(
        "http://127.0.0.1:19090/actuator/health/readiness",
        "http://127.0.0.1:18080/api/health"
    )
    do {
        foreach ($url in $urls) {
            try {
                if ($url.StartsWith("https://") -and $PSVersionTable.PSVersion.Major -ge 7) {
                    $response = Invoke-WebRequest -Uri $url -SkipCertificateCheck -UseBasicParsing -TimeoutSec 5
                }
                elseif ($url.StartsWith("http://")) {
                    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
                }
                else {
                    continue
                }
                if ($response.StatusCode -eq 200) {
                    return
                }
            }
            catch {
                # retry
            }
        }
        Start-Sleep -Seconds 5
    } while ((Get-Date) -lt $deadline)

    throw "API readiness check timed out. From backend/: docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod.local logs app-prod"
}

Assert-Docker
Ensure-EnvFile
Import-ProdLocalEnv

if ($Down) {
    Invoke-Compose down
    Write-Host "Local prod stack stopped."
    exit 0
}

if (-not $SkipFrontendBuild) {
    Build-Frontend
}
elseif (-not (Test-Path (Join-Path $frontendDist "index.html"))) {
    throw "No frontend-dist/index.html. Run without -SkipFrontendBuild once."
}

$upArgs = @("up", "-d", "--build")

Write-Host "Starting local production stack..."
Invoke-Compose @upArgs

Write-Host "Waiting for API readiness..."
Wait-Healthy

Write-Host ""
Write-Host "Local production mimic is up."
Write-Host "  App:       https://app.mesaro.localhost:9443"
Write-Host "  API:       https://api.mesaro.localhost:9443/api"
Write-Host "  Readiness: http://127.0.0.1:19090/actuator/health/readiness"
Write-Host "  Mailpit:   http://127.0.0.1:8025"
Write-Host "  API plain: http://127.0.0.1:18080/api"
Write-Host ""
Write-Host "Browser may warn about Caddy local certificate; accept/trust once for mesaro.localhost."
Write-Host "Stop with: .\run-prod-local.ps1 -Down"
