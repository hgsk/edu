[CmdletBinding()]
param(
    [ValidateSet('Inspect','Verify')] [string]$Action = 'Inspect',
    [string]$UnityCommand = 'unity',
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '../evidence')
)
$ErrorActionPreference = 'Stop'
try {
    $cli = (Get-Command $UnityCommand -ErrorAction Stop).Source
    $project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../project'))
    if(-not (Test-Path -LiteralPath (Join-Path $project 'ProjectSettings/ProjectVersion.txt'))) { throw 'Unity course project not found' }
    $out = [IO.Path]::GetFullPath($OutputDirectory)
    $null = New-Item -ItemType Directory -Path $out -Force
    $lines = [Collections.Generic.List[string]]::new()
    $lines.Add('Unity course / actual CLI session')
    $lines.Add('')
    $lines.Add('> unity --version')
    $version = & $cli --version 2>&1
    if($LASTEXITCODE -ne 0) { throw 'unity --version failed' }
    $lines.Add(($version -join "`n"))
    $lines.Add('')
    $lines.Add('> unity editors --installed --format json')
    $editors = & $cli editors --installed --format json 2>&1
    if($LASTEXITCODE -ne 0) { throw 'unity editors failed' }
    $null = ($editors -join "`n") | ConvertFrom-Json
    $lines.Add(($editors -join "`n"))
    if($Action -eq 'Verify') {
        $normalized=$project.Replace('\','/')
        $running=Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" | Where-Object {
            $_.CommandLine -and $_.CommandLine.Replace('\','/').Contains($normalized) -and $_.CommandLine -notmatch 'AssetImportWorker'
        }
        if($running) { throw 'Close the course Editor after saving; this script never closes an existing Editor.' }
        $report=Join-Path $project 'lesson-samples-report.json'
        # Remove only this generated report, so an old PASS can never satisfy a failed run.
        if(Test-Path -LiteralPath $report) { Remove-Item -LiteralPath $report }
        $log=Join-Path $out '22-cli-editor.log'
        $lines.Add('')
        $lines.Add('> unity run unity/project --timeout 180 -- -executeMethod LessonSamples.Verify -logFile <editor-log>')
        $run = & $cli run $project --timeout 180 -- -executeMethod LessonSamples.Verify -logFile $log 2>&1
        $exitCode=$LASTEXITCODE
        $lines.Add(($run -join "`n"));$lines.Add("CLI exit code: $exitCode")
        if($exitCode -ne 0) { throw "Unity verification failed (exit $exitCode); see editor log" }
        if(-not (Test-Path -LiteralPath $report)) { throw 'Unity returned without a verification report' }
        $result=Get-Content -LiteralPath $report -Raw | ConvertFrom-Json
        if($result.status -ne 'PASS' -or $result.startScenes -ne 36 -or $result.completedScenes -ne 36) { throw 'Sample inventory verification failed' }
        $lines.Add((Get-Content -LiteralPath $report -Raw))
    }
    $lines.Add('');$lines.Add('RESULT: PASS')
    $name=if($Action -eq 'Verify'){'22-cli-verify.txt'}else{'22-cli-inspect.txt'}
    $record=Join-Path $out $name
    [IO.File]::WriteAllText($record,($lines -join "`n")+"`n",[Text.UTF8Encoding]::new($false))
    Write-Output "PASS: $Action; $record"
    exit 0
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
