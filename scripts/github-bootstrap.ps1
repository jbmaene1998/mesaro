# Bootstrap GitHub repo settings for Mesaro (run after first push).
# Requires: gh auth login, repo remote origin set.
# Usage:  .\scripts\github-bootstrap.ps1

$ErrorActionPreference = "Stop"

$repo = gh repo view --json nameWithOwner -q .nameWithOwner
Write-Host "Configuring $repo ..."

# --- Merge methods ---
gh api -X PATCH "repos/$repo" `
  -f allow_merge_commit=false `
  -f allow_squash_merge=true `
  -f allow_rebase_merge=false `
  -f delete_branch_on_merge=true `
  -f squash_merge_commit_title=PR_TITLE `
  -f squash_merge_commit_message=PR_BODY `
  -f allow_auto_merge=true `
  -f has_wiki=false | Out-Null

Write-Host "Merge settings updated."

# --- Labels ---
$labels = @(
  @{ name = "release-notes:feature";  color = "0E8A16"; description = "Appears under Features in release notes" },
  @{ name = "release-notes:fix";      color = "D73A4A"; description = "Appears under Bug Fixes in release notes" },
  @{ name = "release-notes:breaking"; color = "B60205"; description = "Appears under Breaking Changes" },
  @{ name = "release-notes:security"; color = "5319E7"; description = "Appears under Security" },
  @{ name = "release-notes:docs";     color = "0075CA"; description = "Appears under Documentation" },
  @{ name = "release-notes:chore";    color = "C5DEF5"; description = "Appears under Maintenance" },
  @{ name = "skip-release-notes";     color = "EDEDED"; description = "Omit from generated release notes" },
  @{ name = "type:bug";               color = "D73A4A"; description = "Bug" },
  @{ name = "type:feature";           color = "A2EEEF"; description = "Feature" },
  @{ name = "area:api";               color = "1D76DB"; description = "Backend API" },
  @{ name = "area:web";               color = "1D76DB"; description = "Frontend" },
  @{ name = "area:billing";           color = "FBCA04"; description = "Stripe / billing" },
  @{ name = "area:booking";           color = "FBCA04"; description = "Booking engine" },
  @{ name = "area:ops";               color = "BFDADC"; description = "Deploy / infra / ops" },
  @{ name = "priority:p0";            color = "B60205"; description = "Prod money/data/booking fire" },
  @{ name = "priority:p1";            color = "D93F0B"; description = "Core floor path broken" },
  @{ name = "priority:p2";            color = "FBCA04"; description = "Workaround exists" }
)

foreach ($l in $labels) {
  gh label create $l.name --color $l.color --description $l.description --force | Out-Null
}
Write-Host "Labels upserted."

# --- Branch protection via ruleset (dev + main; needs GitHub Pro on private repos) ---
$ruleset = @{
  name        = "dev-and-main"
  target      = "branch"
  enforcement = "active"
  conditions  = @{
    ref_name = @{
      include = @("refs/heads/dev", "refs/heads/main")
      exclude = @()
    }
  }
  rules = @(
    @{ type = "deletion" },
    @{ type = "non_fast_forward" },
    @{
      type = "pull_request"
      parameters = @{
        # Solo founder: PR required, reviews not blocking.
        # When a second engineer joins, set count=1 and require_code_owner_review=$true.
        required_approving_review_count     = 0
        dismiss_stale_reviews_on_push       = $true
        require_code_owner_review           = $false
        require_last_push_approval          = $false
        required_review_thread_resolution   = $true
      }
    }
  )
  # RepositoryRole actor_id 5 = Admin — bypass review gates on PRs only (still no direct push).
  bypass_actors = @(
    @{
      actor_id    = 5
      actor_type  = "RepositoryRole"
      bypass_mode = "pull_request"
    }
  )
}

$rulesetJson = $ruleset | ConvertTo-Json -Depth 10 -Compress
$tmp = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tmp -Value $rulesetJson -Encoding utf8

try {
  foreach ($name in @("main", "dev-and-main")) {
    $existing = gh api "repos/$repo/rulesets" --jq ".[] | select(.name==`"$name`") | .id" 2>$null
    if ($existing) {
      gh api -X DELETE "repos/$repo/rulesets/$existing" | Out-Null
    }
  }
  gh api -X POST "repos/$repo/rulesets" --input $tmp | Out-Null
  Write-Host "Ruleset 'dev-and-main' applied (PR required on both branches)."
}
catch {
  Write-Warning "Ruleset API failed (often Free private plan). Use require-pull-request.yml until Pro; trying legacy protection."
  $legacy = @{
    required_status_checks        = $null
    enforce_admins                = $true
    required_pull_request_reviews = @{
      dismiss_stale_reviews           = $true
      require_code_owner_reviews      = $false
      required_approving_review_count = 0
      require_last_push_approval      = $false
    }
    restrictions                  = $null
    allow_force_pushes            = $false
    allow_deletions               = $false
    required_conversation_resolution = $true
  } | ConvertTo-Json -Depth 8 -Compress
  Set-Content -Path $tmp -Value $legacy -Encoding utf8
  foreach ($branch in @("main", "dev")) {
    try {
      gh api -X PUT "repos/$repo/branches/$branch/protection" `
        -H "Accept: application/vnd.github+json" `
        --input $tmp | Out-Null
      Write-Host "Legacy branch protection applied on $branch."
    }
    catch {
      Write-Warning "Could not protect $branch (upgrade to GitHub Pro for private repos)."
    }
  }
}
finally {
  Remove-Item $tmp -ErrorAction SilentlyContinue
}

try {
  gh api -X PUT "repos/$repo/private-vulnerability-reporting" | Out-Null
  Write-Host "Private vulnerability reporting enabled."
}
catch {
  Write-Warning "Could not enable private vulnerability reporting (plan/permission)."
}

Write-Host "Done. Review: https://github.com/$repo/settings"
