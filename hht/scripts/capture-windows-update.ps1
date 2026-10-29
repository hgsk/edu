# Run only in an isolated Windows CI desktop; never against a student's folder.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class UpdateWindow {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@
$original = (Get-Location).Path
$output = Join-Path $env:RUNNER_TEMP 'windows-update-screenshots'
New-Item -ItemType Directory -Force $output | Out-Null
$parent = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'edu-update-20261029'
if (Test-Path $parent) { throw 'Capture requires a new, unused destination' }
New-Item -ItemType Directory $parent | Out-Null
$target = Join-Path $parent 'edu'
$code = Get-Command code -ErrorAction SilentlyContinue
if ($code) { $codePath = $code.Source } else {
  $archive = Join-Path $env:RUNNER_TEMP 'vscode.zip'
  Invoke-WebRequest 'https://update.code.visualstudio.com/latest/win32-x64-archive/stable' -OutFile $archive
  $install = Join-Path $env:RUNNER_TEMP 'vscode-update-capture'
  Expand-Archive $archive $install
  $codePath = Join-Path $install 'Code.exe'
}
$profile = Join-Path $env:RUNNER_TEMP 'vscode-update-profile'
New-Item -ItemType Directory -Force (Join-Path $profile 'User') | Out-Null
@'
{
  "window.title": "${folderPath} - Visual Studio Code",
  "window.zoomLevel": 0,
  "workbench.startupEditor": "none",
  "security.workspace.trust.enabled": false,
  "git.openRepositoryInParentFolders": "never",
  "editor.fontSize": 16,
  "editor.minimap.enabled": false
}
'@ | Set-Content (Join-Path $profile 'User/settings.json') -Encoding utf8
function Capture($name) {
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save((Join-Path $output $name), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $graphics.Dispose(); $bitmap.Dispose() }
}
function OpenCode($arguments) {
  $quoted = $arguments | ForEach-Object { '"' + $_ + '"' }
  Start-Process -FilePath $codePath -ArgumentList ($quoted -join ' ') | Out-Null
}
function Keys($keys) { [System.Windows.Forms.SendKeys]::SendWait($keys); Start-Sleep -Seconds 2 }
function Paste($text) { Set-Clipboard $text; Keys '^v' }
try {
  OpenCode @('--user-data-dir', $profile, '--disable-extensions', '--disable-workspace-trust', '--new-window')
  Start-Sleep -Seconds 15
  $window = Get-Process Code | Where-Object MainWindowHandle -ne 0 | Select-Object -First 1
  if (-not $window) { throw 'VS Code window was not opened' }
  [UpdateWindow]::SetForegroundWindow($window.MainWindowHandle) | Out-Null
  Keys '^+p'
  Paste 'Git: Clone'
  Keys '{ENTER}'
  Paste 'https://github.com/hgsk/edu.git'
  Keys '{ENTER}'
  Start-Sleep -Seconds 3
  # The native destination picker is open; navigate to the new empty parent.
  Keys '%d'
  Paste $parent
  Keys '{ENTER}'
  Capture '01-separate-destination.png'
  Keys '%s'
  $deadline = (Get-Date).AddSeconds(90)
  while (-not (Test-Path (Join-Path $target '.git/HEAD')) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 2 }
  if (-not (Test-Path (Join-Path $target '.git/HEAD'))) { throw 'VS Code clone did not complete' }
  # Validate the reviewed PR head rather than main until the PR is merged.
  git -C $target fetch origin $env:GITHUB_SHA
  if ($LASTEXITCODE) { throw 'Fetch failed' }
  git -C $target checkout --detach FETCH_HEAD
  if ($LASTEXITCODE) { throw 'Checkout failed' }
  OpenCode @('--user-data-dir', $profile, '--reuse-window', $target, (Join-Path $target 'README.md'))
  Start-Sleep -Seconds 8
  Capture '02-new-working-folder.png'
  Set-Location $target
  $summary = [System.Collections.Generic.List[string]]::new()
  $summary.Add("Working folder: $target")
  $summary.Add("Commit: $(git rev-parse HEAD)")
  $summary.Add('')
  $commands = @(
    @('git', @('check-attr', 'text', '--', 'hht/day01/index.html')),
    @('python', @('hht/scripts/validate-course.py')),
    @('python', @('unity/scripts/build_course.py', '--check')),
    @('python', @('-m', 'unittest', 'discover', '-s', 'unity/scripts', '-p', 'test_*.py')),
    @('python', @('-m', 'unittest', 'discover', '-s', 'hht/scripts', '-p', 'test_*.py'))
  )
  foreach ($command in $commands) {
    $exe = $command[0]; $arguments = $command[1]
    $summary.Add('> ' + $exe + ' ' + ($arguments -join ' '))
    $lines = & $exe @arguments 2>&1
    $exit = $LASTEXITCODE
    $lines | Out-String | Add-Content (Join-Path $output 'full-validation.log')
    $summary.AddRange([string[]]($lines | ForEach-Object { "$_" } | Where-Object { $_ -match 'text:|COURSE VALIDATION:|^PASS:|^Ran |^OK|^FAILED' }))
    $summary.Add("Exit code: $exit")
    $summary.Add('')
    if ($exit) { throw "Validation failed: $exe $arguments" }
  }
  $result = Join-Path $output 'validation-results.txt'
  $summary | Set-Content $result -Encoding utf8
  OpenCode @('--user-data-dir', $profile, '--reuse-window', $result)
  Start-Sleep -Seconds 5
  Keys '^b'
  Capture '03-validation-results.png'
} finally {
  Set-Location $original
  # All Code instances in this hosted job were started by this capture script.
  Get-Process Code -ErrorAction SilentlyContinue | Stop-Process -Force
  if (Get-Process Code -ErrorAction SilentlyContinue) { throw 'VS Code cleanup failed' }
}
