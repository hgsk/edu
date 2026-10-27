[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 15)]
    [int]$Day,
    [string]$RepositoryRoot = (Join-Path $PSScriptRoot '../..')
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$number = '{0:00}' -f $Day
$source = Join-Path $root "hht/lessons/$number/start"
$practice = [IO.Path]::GetFullPath((Join-Path $root 'hht/practice'))
$destination = Join-Path $practice "day$number"
if (-not (Test-Path -LiteralPath (Join-Path $root 'README.md')) -or
    -not (Test-Path -LiteralPath (Join-Path $source 'index.html'))) {
    throw '教材フォルダーと、このDAYの開始データを確認してください。'
}
if (Test-Path -LiteralPath $destination) {
    throw "既存の作業を保護して停止しました。再開するときは $destination を開いてください。"
}
if ((Get-Item -LiteralPath $source).Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw '開始データの場所がリンクになっています。講師へ確認してください。'
}
if ((Test-Path -LiteralPath $practice) -and
    ((Get-Item -LiteralPath $practice).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw '作業フォルダーの場所がリンクになっています。講師へ確認してください。'
}
if (Get-ChildItem -LiteralPath $source -Recurse -Force |
    Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) {
    throw '開始データにリンクが含まれています。講師へ確認してください。'
}
New-Item -ItemType Directory -Path $practice -Force | Out-Null
$staging = Join-Path $practice ('.day' + $number + '-' + [guid]::NewGuid().ToString('N'))
$prefix = $practice.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
try {
    Copy-Item -LiteralPath $source -Destination $staging -Recurse
    # Move only our newly created directory, within this repository's practice folder.
    $resolved = (Resolve-Path -LiteralPath $staging).Path
    if (-not $resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw '準備先が作業フォルダーの外にあります。'
    }
    Move-Item -LiteralPath $resolved -Destination $destination
    Write-Output "DAY $number の準備ができました: hht/practice/day$number"
    Write-Output 'この開始状態をGitへ記録してから、今回の課題に取り組みます。'
}
catch {
    if (Test-Path -LiteralPath $staging) {
        $resolved = (Resolve-Path -LiteralPath $staging).Path
        if ($resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $resolved -Recurse -Force
        }
    }
    throw
}
