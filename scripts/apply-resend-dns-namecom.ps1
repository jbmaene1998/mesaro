# Applies Resend DNS records for mesaro.com via the Name.com Core API.
# Requires: NAMECOM_USERNAME, NAMECOM_API_TOKEN
#
# Usage:
#   $env:NAMECOM_USERNAME = "your-namecom-user"
#   $env:NAMECOM_API_TOKEN = "your-api-token"
#   .\scripts\apply-resend-dns-namecom.ps1

$ErrorActionPreference = "Stop"

$username = $env:NAMECOM_USERNAME
$token = $env:NAMECOM_API_TOKEN
$domain = "mesaro.com"
$apiBase = "https://api.name.com/core/v1"

if ([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($token)) {
    throw "Set NAMECOM_USERNAME and NAMECOM_API_TOKEN before running."
}

$pair = "${username}:${token}"
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{
    Authorization = "Basic $basic"
    Accept        = "application/json"
}

function New-NameComRecord {
    param(
        [string]$HostName,
        [string]$Type,
        [string]$Answer,
        [int]$Ttl = 300,
        [Nullable[int]]$Priority = $null
    )

    $body = @{
        host = $HostName
        type = $Type
        answer = $Answer
        ttl = $Ttl
    }
    if ($null -ne $Priority) {
        $body.priority = $Priority
    }

    $json = $body | ConvertTo-Json -Compress
    $uri = "$apiBase/domains/$domain/records"
    Write-Host "Creating $Type $HostName.$domain -> $Answer"
    Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "application/json" -Body $json | Out-Null
}

# Exact records from Resend domain 9abb186e-1e3f-46b5-acde-312c88c7d842 (eu-west-1)
$dkim = "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD48u92/DuJiaxQ7ZvcsM2pY1D4m4lCp3MlWyNjZICbq4xZ0vaOTHejiPbO+VI0rcxNZajI20Bkza8SqP//ydZ1SMEfPk/rBiCEiRqZKuTG11q6GcbNmlIXUJNxhkuMy2E7WPzEENRu4Tmflbc5Gg+T0A8bloBhqiJYmbBbUnMdmwIDAQAB"

New-NameComRecord -HostName "resend._domainkey" -Type "TXT" -Answer $dkim
New-NameComRecord -HostName "send" -Type "MX" -Answer "feedback-smtp.eu-west-1.amazonses.com" -Priority 10
New-NameComRecord -HostName "send" -Type "TXT" -Answer "v=spf1 include:amazonses.com ~all"
New-NameComRecord -HostName "rsend" -Type "CNAME" -Answer "send.forge.rmta.net."

Write-Host ""
Write-Host "DNS records submitted to Name.com for $domain."
Write-Host "Wait a few minutes, then verify in Resend (or ask the agent to run verify-domain)."
