param(
    [switch]$SkipInfra,
    [switch]$WithInfra,
    [switch]$NoDocker
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$powershellExe = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
$cmdExe = Join-Path $env:WINDIR "System32\cmd.exe"
$backendEnvFile = Join-Path $backendDir ".env.dev"

function Import-DotEnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        Write-Host "No env file found at $Path, skipping env import."
        return
    }

    Write-Host "Loading backend env from $Path..."
    Get-Content -Path $Path | ForEach-Object {
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

function Test-PortOpen {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    try {
        return [bool](Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)
    }
    catch {
        return $false
    }
}

function Test-DockerAvailable {
    try {
        docker version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Wait-ForPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [Parameter(Mandatory = $true)]
        [string]$ServiceName,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortOpen -Port $Port) {
            Write-Host "$ServiceName is ready on port $Port."
            return $true
        }
        Start-Sleep -Seconds 2
    }

    return $false
}

function Stop-ProcessListeningOnPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [Parameter(Mandatory = $true)]
        [string]$ServiceName
    )

    if (-not (Test-PortOpen -Port $Port)) {
        return
    }

    Write-Host "$ServiceName running on port $Port. Stopping existing process..."
    try {
        $proc = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -First 1 |
            ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue }
        if ($proc) {
            Stop-Process -Id $proc.Id -Force
            Start-Sleep -Seconds 2
        }
    }
    catch {
        Write-Host "Could not stop existing process on port ${Port}: $_"
    }
}

function Stop-DockerContainersPublishingPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [Parameter(Mandatory = $true)]
        [string]$ServiceName
    )

    if (-not (Test-DockerAvailable)) {
        return
    }

    try {
        $containers = @(docker ps --filter "publish=$Port" --format "{{.Names}}" 2>$null) |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

        if ($containers.Count -eq 0) {
            return
        }

        Write-Host "$ServiceName port $Port is published by Docker container(s): $($containers -join ', '). Stopping container(s)..."
        foreach ($container in $containers) {
            docker stop $container | Out-Null
        }
    }
    catch {
        Write-Host "Could not inspect or stop Docker container(s) publishing port ${Port}: $_"
    }
}

if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found: $backendDir"
}

if (-not (Test-Path $frontendDir)) {
    throw "Frontend directory not found: $frontendDir"
}

Import-DotEnvFile -Path $backendEnvFile

if ($NoDocker) {
    Write-Host "NoDocker mode enabled. Skipping Docker infra startup."
}
elseif (-not $SkipInfra) {
    if (-not (Test-DockerAvailable)) {
        throw "Docker is not available. Start Docker Desktop, then run .\run-dev.ps1 again."
    }

    Write-Host "Starting backend infra (Postgres + Redis + Elasticsearch)..."
    Push-Location $backendDir
    try {
        docker compose -f docker-compose.infra.yml up -d
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "Skipping infra startup (-SkipInfra)."
}

Write-Host "Waiting for PostgreSQL..."
if (-not (Wait-ForPort -Port 5432 -ServiceName "PostgreSQL" -TimeoutSeconds 90)) {
    if ($NoDocker) {
        throw "PostgreSQL is not reachable on localhost:5432. Start your local PostgreSQL service and retry."
    }
    throw "PostgreSQL is not reachable on localhost:5432. Run .\run-infra.ps1 and retry."
}

Write-Host "Waiting for Elasticsearch..."
if (-not (Wait-ForPort -Port 9200 -ServiceName "Elasticsearch" -TimeoutSeconds 120)) {
    if ($NoDocker) {
        throw "Elasticsearch is not reachable on localhost:9200. Start your local Elasticsearch service and retry."
    }
    throw "Elasticsearch is not reachable on localhost:9200. Run .\run-infra.ps1 and retry."
}

Write-Host "Waiting for Kibana..."
if (-not (Wait-ForPort -Port 5601 -ServiceName "Kibana" -TimeoutSeconds 180)) {
    if ($NoDocker) {
        throw "Kibana is not reachable on localhost:5601. Start your local Kibana service and retry."
    }
    throw "Kibana is not reachable on localhost:5601. Run .\run-infra.ps1 and retry."
}

Stop-ProcessListeningOnPort -Port 8080 -ServiceName "Backend"
Stop-DockerContainersPublishingPort -Port 8080 -ServiceName "Backend"

Write-Host "Launching backend..."
$backendCommand = 'set "MAVEN_USER_HOME=.m2repo" && .\mvnw.cmd -Dmaven.repo.local=.m2repo -Dmaven.test.skip=true spring-boot:run'
Start-Process -FilePath $cmdExe `
    -WorkingDirectory $backendDir `
    -ArgumentList @("/k", $backendCommand) | Out-Null

Stop-ProcessListeningOnPort -Port 3000 -ServiceName "Frontend"

Write-Host "Launching frontend..."
$frontendCommand = 'npm.cmd run dev'
Start-Process -FilePath $cmdExe `
    -WorkingDirectory $frontendDir `
    -ArgumentList @("/k", $frontendCommand) | Out-Null

Write-Host ""
Write-Host "Dev services launched."
Write-Host "Backend:  http://localhost:8080"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Kibana:   http://localhost:5601"
Write-Host "Elastic:  http://localhost:9200"
Write-Host "Use -SkipInfra to avoid restarting Postgres/Redis/Elasticsearch."
Write-Host "Use -NoDocker to run against Windows-native PostgreSQL (no Docker)."
