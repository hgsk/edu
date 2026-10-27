[CmdletBinding()]
param([switch]$Watch)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Set-Location -LiteralPath $root
function Invoke-Checked([string]$program,[string[]]$arguments) {
    & $program @arguments
    if($LASTEXITCODE -ne 0){throw "$program failed: exit $LASTEXITCODE"}
}
function Update-Course {
    $project=Join-Path $root 'unity/project'
    $normalized=$project.Replace('\','/')
    if(Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" | Where-Object {
        $_.CommandLine -and $_.CommandLine.Replace('\','/').Contains($normalized) -and $_.CommandLine -notmatch 'AssetImportWorker'
    }) {throw '教材用Unity Editorを保存して閉じてください。自動終了はしません。'}
    $before=(& python unity/scripts/webgl_artifact.py fingerprint)
    if($LASTEXITCODE -ne 0){throw 'Input fingerprint failed'}
    $settings=@{}
    Get-ChildItem -LiteralPath (Join-Path $project 'ProjectSettings') -File | ForEach-Object {$settings[$_.FullName]=[IO.File]::ReadAllBytes($_.FullName)}
    $resource=Join-Path $project 'Assets/Resources/WebCourseCatalog.json'
    if(Test-Path -LiteralPath $resource){throw 'Reserved generated catalog already exists; inspect it before retrying.'}
    $lock=Join-Path $root 'test-results/unity-course-update.lock'
    $null=New-Item -ItemType Directory -Path (Split-Path $lock) -Force
    $handle=[IO.File]::Open($lock,'OpenOrCreate','ReadWrite','None')
    try {
    try {
        $null=New-Item -ItemType Directory -Path (Join-Path $root 'test-results') -Force
        Invoke-Checked unity @('run',$project,'--timeout','1800','--','-buildTarget','WebGL','-executeMethod','WebCourseBuild.Build','-logFile',(Join-Path $root 'test-results/unity-webgl-build.log'))
    } finally {
        foreach($path in $settings.Keys){[IO.File]::WriteAllBytes($path,$settings[$path])}
        foreach($path in @($resource,($resource+'.meta'))){if(Test-Path -LiteralPath $path){Remove-Item -LiteralPath $path}}
    }
    $after=(& python unity/scripts/webgl_artifact.py fingerprint)
    if($before -ne $after){throw '教材がビルド中に変わりました。旧掲載データを維持します。保存を終えて再実行してください。'}
    $built=Join-Path $project 'Builds/WebGL'
    Invoke-Checked python @('unity/scripts/webgl_artifact.py','record','--directory',$built)
    # Smoke-test the candidate before replacing the currently listed version.
    $env:UNITY_WEBGL_DIRECTORY=$built
    try {Invoke-Checked node @('unity/scripts/verify_webgl.cjs')} finally {Remove-Item Env:UNITY_WEBGL_DIRECTORY -ErrorAction SilentlyContinue}
    $target=Join-Path $root 'unity/webgl'
    $backup=Join-Path $root 'unity/webgl.previous'
    foreach($publishPath in @($target,$backup)) {
        if((Split-Path ([IO.Path]::GetFullPath($publishPath)) -Parent) -ne (Join-Path $root 'unity')){throw 'Unexpected publish path'}
    }
    $html=Join-Path $root 'unity/index.html'
    $previousHtml=[IO.File]::ReadAllBytes($html)
    if(Test-Path -LiteralPath $backup){throw 'Previous backup exists; inspect unity/webgl.previous before retrying.'}
    if(Test-Path -LiteralPath $target){Move-Item -LiteralPath $target -Destination $backup}
    try {
        Copy-Item -LiteralPath $built -Destination $target -Recurse
        Invoke-Checked python @('unity/scripts/build_course.py','--html-only')
        Invoke-Checked python @('unity/scripts/webgl_artifact.py','check')
    } catch {
        # Only these fixed, resolved output directories may be removed.
        if((Split-Path $target -Parent) -ne (Join-Path $root 'unity')){throw 'Unexpected output path'}
        if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target -Recurse -Force}
        if(Test-Path -LiteralPath $backup){Move-Item -LiteralPath $backup -Destination $target}
        [IO.File]::WriteAllBytes($html,$previousHtml)
        throw
    }
    if(Test-Path -LiteralPath $backup){Remove-Item -LiteralPath $backup -Recurse -Force}
    Write-Output 'PASS: WebGL build, 72-scene browser verification, workbook listing'
    } finally {$handle.Dispose()}
}
try {
    if(!$Watch){Update-Course;exit 0}
    Write-Output '教材の保存を監視します。終了はCtrl+C。起動中の教材Editorは保存して閉じてください。'
    $last=''
    while($true){
        $now=(& python unity/scripts/webgl_artifact.py fingerprint)
        if($LASTEXITCODE -ne 0){throw 'Fingerprint failed'}
        if($now -ne $last){
            Start-Sleep -Seconds 3
            $stable=(& python unity/scripts/webgl_artifact.py fingerprint)
            if($stable -eq $now){
                for($attempt=0;$attempt -lt 3;$attempt++) {
                    try{Update-Course;break}catch{Write-Warning $_;if($attempt -lt 2){Start-Sleep -Seconds 15}}
                }
                $last=$now
                Write-Output '次の保存を待ちます。失敗理由を解消した後、保存するか更新タスクを再実行してください。'
            }
        }
        Start-Sleep -Seconds 3
    }
} catch {Write-Error $_ -ErrorAction Continue;exit 1}
