param(
    [switch]$ForceRecreate,
    [switch]$Down
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"
$composeFile = Join-Path $backendDir "docker-compose.infra.yml"

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
            Write-Host "$ServiceName is reachable on port $Port."
            return $true
        }
        Start-Sleep -Seconds 2
    }

    return $false
}

function Wait-ForKibanaApiReady {
    param(
        [string]$KibanaUrl = "http://localhost:5601",
        [int]$TimeoutSeconds = 180
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $status = Invoke-RestMethod -Method Get -Uri "$KibanaUrl/api/status" -TimeoutSec 15
            if ($null -ne $status) {
                Write-Host "Kibana API is ready."
                return $true
            }
        }
        catch {
            # Keep waiting until Kibana finishes startup.
        }
        Start-Sleep -Seconds 3
    }

    return $false
}

function Ensure-KibanaApiActionDataView {
    param(
        [string]$KibanaUrl = "http://localhost:5601",
        [string]$DataViewTitle = "mesaro-api-actions*",
        [string]$DataViewName = "Mesaro API Actions",
        [string]$TimeFieldName = "@timestamp"
    )

    $headers = @{ "kbn-xsrf" = "true" }
    $listUri = "$KibanaUrl/api/data_views/data_views"

    try {
        $existing = Invoke-RestMethod -Method Get -Uri $listUri -Headers $headers -TimeoutSec 20
        $match = @($existing.data_view | Where-Object { $_.title -eq $DataViewTitle })
        if ($match.Count -gt 0) {
            Write-Host "Kibana data view '$DataViewTitle' already exists."
            return
        }
    }
    catch {
        Write-Warning "Could not check existing Kibana data views. Will try creating one anyway. $($_.Exception.Message)"
    }

    $payload = @{
        data_view = @{
            title = $DataViewTitle
            name = $DataViewName
            timeFieldName = $TimeFieldName
            allowNoIndex = $true
        }
    } | ConvertTo-Json -Depth 5

    try {
        Invoke-RestMethod `
            -Method Post `
            -Uri "$KibanaUrl/api/data_views/data_view" `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payload `
            -TimeoutSec 20 | Out-Null
        Start-Sleep -Seconds 1
        $verify = Invoke-RestMethod -Method Get -Uri $listUri -Headers $headers -TimeoutSec 20
        $verifyMatch = @($verify.data_view | Where-Object { $_.title -eq $DataViewTitle })
        if ($verifyMatch.Count -gt 0) {
            Write-Host "Created Kibana data view '$DataViewTitle'."
            return
        }
        throw "Data view was not found after creation."
    }
    catch {
        $errorMessage = $_.Exception.Message
        if ($errorMessage -match "409" -or $errorMessage -match "conflict" -or $errorMessage -match "already exists") {
            Write-Host "Kibana data view '$DataViewTitle' already exists."
            return
        }
        Write-Warning "Failed to create Kibana data view '$DataViewTitle'. $errorMessage"
    }
}

if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found: $backendDir"
}

if (-not (Test-Path $composeFile)) {
    throw "Compose file not found: $composeFile"
}

Push-Location $backendDir
try {
    if ($Down) {
        Write-Host "Stopping backend infra containers..."
        docker compose -f docker-compose.infra.yml down
        Write-Host "Infra containers stopped."
        exit 0
    }

    if ($ForceRecreate) {
        Write-Host "Starting backend infra containers (force recreate enabled)..."
        docker compose -f docker-compose.infra.yml up -d --force-recreate
    }
    else {
        Write-Host "Starting backend infra containers..."
        docker compose -f docker-compose.infra.yml up -d
    }

    Write-Host "Waiting for PostgreSQL..."
    if (-not (Wait-ForPort -Port 5432 -ServiceName "PostgreSQL" -TimeoutSeconds 90)) {
        throw "PostgreSQL is not reachable on localhost:5432."
    }

    Write-Host "Waiting for Redis..."
    if (-not (Wait-ForPort -Port 6379 -ServiceName "Redis" -TimeoutSeconds 60)) {
        throw "Redis is not reachable on localhost:6379."
    }

    Write-Host "Waiting for Elasticsearch..."
    if (-not (Wait-ForPort -Port 9200 -ServiceName "Elasticsearch" -TimeoutSeconds 120)) {
        throw "Elasticsearch is not reachable on localhost:9200."
    }

    Write-Host "Waiting for Kibana..."
    if (-not (Wait-ForPort -Port 5601 -ServiceName "Kibana" -TimeoutSeconds 180)) {
        throw "Kibana is not reachable on localhost:5601."
    }
    if (-not (Wait-ForKibanaApiReady -KibanaUrl "http://localhost:5601" -TimeoutSeconds 180)) {
        throw "Kibana API is not ready on http://localhost:5601."
    }
    Ensure-KibanaApiActionDataView

    Write-Host ""
    Write-Host "Infra services are up."
    Write-Host "Kibana:  http://localhost:5601"
    Write-Host "Elastic: http://localhost:9200"
    docker compose -f docker-compose.infra.yml ps
}
finally {
    Pop-Location
}
