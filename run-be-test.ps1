param(
    [switch]$UnitOnly,
    [switch]$ContainerOnly,
    [switch]$UseLocalRepo
)

$ErrorActionPreference = "Stop"

if ($UnitOnly -and $ContainerOnly) {
    throw "Use either -UnitOnly or -ContainerOnly, not both."
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"

if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found: $backendDir"
}

$mvnBaseArgs = @()
if ($UseLocalRepo) {
    $mvnBaseArgs += "-Dmaven.repo.local=.m2repo"
}

function Get-UsableDockerHost {
    $dockerHostCandidates = @()
    if (-not [string]::IsNullOrWhiteSpace($env:DOCKER_HOST)) {
        $dockerHostCandidates += $env:DOCKER_HOST
    }
    $dockerHostCandidates += @(
        "npipe:////./pipe/docker_cli",
        "npipe:////./pipe/dockerDesktopLinuxEngine",
        "npipe:////./pipe/docker_engine"
    )

    foreach ($candidate in $dockerHostCandidates | Select-Object -Unique) {
        try {
            $info = docker --host $candidate info --format "{{.ID}}|{{.ServerVersion}}" 2>$null
            if (-not [string]::IsNullOrWhiteSpace($info)) {
                $parts = $info -split "\|", 2
                if ($parts.Count -eq 2 -and -not [string]::IsNullOrWhiteSpace($parts[0]) -and -not [string]::IsNullOrWhiteSpace($parts[1])) {
                    return $candidate
                }
            }
        }
        catch {
            # Try next candidate.
        }
    }

    throw "No usable Docker pipe found. Checked: $($dockerHostCandidates -join ', ')"
}

function Assert-DockerReachable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DockerHost
    )

    try {
        $serverVersion = docker --host $DockerHost version --format "{{.Server.Version}}" 2>$null
        if ([string]::IsNullOrWhiteSpace($serverVersion)) {
            throw "Docker server version was empty."
        }
        Write-Host "Docker reachable on $DockerHost. Server version: $serverVersion"
    }
    catch {
        throw "Docker is not reachable on $DockerHost for this shell."
    }
}

function Start-IntegrationPostgresContainer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DockerHost,
        [Parameter(Mandatory = $true)]
        [string]$ContainerName
    )

    $existing = docker --host $DockerHost ps -aq --filter "name=^/$ContainerName$" 2>$null
    if (-not [string]::IsNullOrWhiteSpace($existing)) {
        docker --host $DockerHost rm -f $ContainerName | Out-Null
    }

    Write-Host "Starting integration Postgres container..."
    & docker --host $DockerHost run -d `
        --name $ContainerName `
        -e POSTGRES_DB=mesaro `
        -e POSTGRES_USER=mesaro `
        -e POSTGRES_PASSWORD=mesaro `
        -p 55432:5432 `
        postgres:15-alpine | Out-Null

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start integration Postgres container."
    }

    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        & docker --host $DockerHost exec $ContainerName pg_isready -U mesaro -d mesaro 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }

    if (-not $ready) {
        & docker --host $DockerHost logs $ContainerName --tail 200
        throw "Integration Postgres container did not become ready in time."
    }

    Write-Host "Integration Postgres is ready on localhost:55432."
}

function Stop-IntegrationPostgresContainer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DockerHost,
        [Parameter(Mandatory = $true)]
        [string]$ContainerName
    )

    $existing = docker --host $DockerHost ps -aq --filter "name=^/$ContainerName$" 2>$null
    if (-not [string]::IsNullOrWhiteSpace($existing)) {
        docker --host $DockerHost rm -f $ContainerName | Out-Null
    }
}

Push-Location $backendDir
try {
    if (-not $ContainerOnly) {
        Write-Host "Running backend unit tests..."
        & .\mvnw.cmd @mvnBaseArgs "test"
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    }

    if (-not $UnitOnly) {
        $dockerHost = Get-UsableDockerHost
        Assert-DockerReachable -DockerHost $dockerHost

        $itPostgresContainerName = "mesaro-it-postgres"
        Start-IntegrationPostgresContainer -DockerHost $dockerHost -ContainerName $itPostgresContainerName
        try {
            Write-Host "Running backend container tests (docker profile with external Postgres container)..."
            & .\mvnw.cmd @mvnBaseArgs `
                "-Dmesaro.it.datasource.url=jdbc:postgresql://localhost:55432/mesaro" `
                "-Dmesaro.it.datasource.username=mesaro" `
                "-Dmesaro.it.datasource.password=mesaro" `
                "-Pdocker-tests" `
                "test-compile" `
                "failsafe:integration-test" `
                "failsafe:verify"
            exit $LASTEXITCODE
        }
        finally {
            Stop-IntegrationPostgresContainer -DockerHost $dockerHost -ContainerName $itPostgresContainerName
        }
    }

    exit 0
}
finally {
    Pop-Location
}
