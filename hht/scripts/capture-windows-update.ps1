# Run only in an isolated Windows CI desktop; never against a student's folder.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class UpdateWindow {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
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
  "editor.fontSize": 14,
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
  # Use Git for the clone; native Explorer and VS Code show the actual destination.
  $shell = New-Object -ComObject Shell.Application
  $shell.Open($parent)
  Start-Sleep -Seconds 5
  $explorer = @($shell.Windows()) | Where-Object { $_.Document.Folder.Self.Path -eq $parent } | Select-Object -First 1
  if (-not $explorer) { throw 'Destination Explorer window was not opened' }
  [UpdateWindow]::ShowWindow([IntPtr]$explorer.HWND, 3) | Out-Null
  [UpdateWindow]::SetForegroundWindow([IntPtr]$explorer.HWND) | Out-Null
  Start-Sleep -Seconds 2
  Capture '01-separate-destination.png'
  git clone --branch docs/windows-safe-update https://github.com/hgsk/edu.git $target
  if ($LASTEXITCODE) { throw 'Clone failed' }
  git -C $target fetch origin $env:GITHUB_SHA
  if ($LASTEXITCODE) { throw 'Fetch failed' }
  git -C $target checkout --detach FETCH_HEAD
  if ($LASTEXITCODE) { throw 'Checkout failed' }
  OpenCode @('--user-data-dir', $profile, '--disable-extensions', '--disable-gpu', '--disable-workspace-trust', '--new-window', $target, (Join-Path $target 'README.md'))
  Start-Sleep -Seconds 15
  $window = Get-Process Code | Where-Object MainWindowHandle -ne 0 | Select-Object -First 1
  if (-not $window) { throw 'VS Code window was not opened' }
  $activator = New-Object -ComObject WScript.Shell
  $activator.AppActivate($window.Id) | Out-Null
  [UpdateWindow]::ShowWindow($window.MainWindowHandle, 3) | Out-Null
  [UpdateWindow]::SetForegroundWindow($window.MainWindowHandle) | Out-Null
  Start-Sleep -Seconds 3
  # Dismiss the first-run sign-in dialog using its visible "Continue without Signing In" control.
  # Coordinates verified against the 1024x768 hosted desktop capture from run 40868647844.
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  if ($bounds.Width -ne 1024 -or $bounds.Height -ne 768) { throw 'Recheck first-run dialog coordinates for this desktop size' }
  [UpdateWindow]::SetCursorPos(850, 610) | Out-Null
  [UpdateWindow]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
  [UpdateWindow]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Seconds 3
  # Second observed first-run page: finish with the visible Get Started button.
  [UpdateWindow]::SetCursorPos(900, 610) | Out-Null
  [UpdateWindow]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
  [UpdateWindow]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Seconds 5
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
    if ($exit) { throw "Validation failed: $exe $arguments" }
  }
  $result = Join-Path $output 'validation-results.txt'
  $summary | Set-Content $result -Encoding utf8
  OpenCode @('--user-data-dir', $profile, '--reuse-window', $result)
  Start-Sleep -Seconds 5
  $activator.AppActivate($window.Id) | Out-Null
  [UpdateWindow]::SetForegroundWindow($window.MainWindowHandle) | Out-Null
  Keys '^b'
  Capture '03-validation-results.png'
} finally {
  Set-Location $original
  # All Code instances in this hosted job were started by this capture script.
  Get-Process Code -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 2
  if (Get-Process Code -ErrorAction SilentlyContinue) { throw 'VS Code cleanup failed' }
  if ($explorer) { $explorer.Quit() }
}
