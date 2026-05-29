param(
  [string]$RepoPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path,
  [string]$Remote = 'origin',
  [string]$Branch = 'main',
  [string]$LogPath = ''
)

$ErrorActionPreference = 'Stop'

function Write-SyncLog {
  param([string]$Message)

  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Write-Output $line
  if ($script:ResolvedLogPath) {
    Add-Content -LiteralPath $script:ResolvedLogPath -Value $line -Encoding UTF8
  }
}

function Invoke-Git {
  param([string[]]$Arguments)

  $output = & git -C $RepoPath @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ($output -join [Environment]::NewLine)
  }
  return $output
}

$RepoPath = (Resolve-Path -LiteralPath $RepoPath).Path
$script:ResolvedLogPath = $LogPath

try {
  Invoke-Git @('rev-parse', '--is-inside-work-tree') | Out-Null
} catch {
  Write-SyncLog "skip: not a git repository: $RepoPath"
  exit 1
}

$currentBranch = (Invoke-Git @('branch', '--show-current') | Select-Object -First 1).Trim()
if ($currentBranch -ne $Branch) {
  Write-SyncLog "skip: current branch is '$currentBranch', expected '$Branch'"
  exit 0
}

$status = Invoke-Git @('status', '--porcelain')
if ($status.Count -gt 0) {
  Write-SyncLog 'skip: working tree has local changes'
  exit 0
}

Write-SyncLog "fetch: $Remote/$Branch"
Invoke-Git @('fetch', '--prune', $Remote, $Branch) | Out-Null

$local = (Invoke-Git @('rev-parse', 'HEAD') | Select-Object -First 1).Trim()
$upstream = (Invoke-Git @('rev-parse', "$Remote/$Branch") | Select-Object -First 1).Trim()
$base = (Invoke-Git @('merge-base', 'HEAD', "$Remote/$Branch") | Select-Object -First 1).Trim()

if ($local -eq $upstream) {
  Write-SyncLog 'ok: already up to date'
  exit 0
}

if ($local -eq $base) {
  Write-SyncLog "pull: fast-forward to $Remote/$Branch"
  Invoke-Git @('pull', '--ff-only', $Remote, $Branch) | Out-Null
  Write-SyncLog 'ok: pulled latest changes'
  exit 0
}

if ($upstream -eq $base) {
  Write-SyncLog 'skip: local branch is ahead of remote'
  exit 0
}

Write-SyncLog 'skip: local and remote branches diverged'
exit 0
