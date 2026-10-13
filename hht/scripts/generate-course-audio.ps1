param(
  [string]$CatalogPath = (Join-Path $PSScriptRoot '..\typing-app\audio\catalog.json'),
  [string]$VoicevoxRoot = (Join-Path $env:USERPROFILE '.cache\hht-voicevox-0.17'),
  [string]$PythonPath,
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
if (-not $PythonPath) { $PythonPath = Join-Path $VoicevoxRoot 'venv\Scripts\python.exe' }
if (-not (Test-Path -LiteralPath $PythonPath)) { throw 'VOICEVOX authoring Python environment not found.' }
$taskCatalogFile = (Resolve-Path -LiteralPath $CatalogPath).Path
$taskCatalog = Get-Content -LiteralPath $taskCatalogFile -Raw -Encoding utf8 | ConvertFrom-Json
$taskEntries = @($taskCatalog.PSObject.Properties)
if ($taskEntries.Count -ne 200) { throw 'Audio catalog must contain 200 entries.' }
$taskFfmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$taskPartsRoot = Join-Path $VoicevoxRoot 'parts'
New-Item -ItemType Directory -Path $taskPartsRoot -Force | Out-Null
Add-Type -AssemblyName System.Speech
$taskSynth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $taskSynth.SelectVoice('Microsoft Zira Desktop')
  $taskFormat = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  foreach ($taskEntry in $taskEntries) {
    foreach ($taskPart in $taskEntry.Value.parts) {
      if ($taskPart.voice -ne 'Microsoft Zira Desktop') { continue }
      if ($taskPart.file -notmatch '^zira-[a-f0-9]{16}\.wav$') { throw 'Invalid English part filename.' }
      $taskPartPath = Join-Path $taskPartsRoot $taskPart.file
      if (-not $Force -and (Test-Path -LiteralPath $taskPartPath)) { continue }
      $taskTemp = $taskPartPath + '.tmp'
      try {
        $taskSynth.SetOutputToWaveFile($taskTemp, $taskFormat)
        $taskPrompt = $taskSynth.SpeakAsync($taskPart.text)
        $taskDeadline = [DateTime]::UtcNow.AddSeconds(90)
        while (-not $taskPrompt.IsCompleted) {
          if ([DateTime]::UtcNow -gt $taskDeadline) { $taskSynth.SpeakAsyncCancelAll(); throw 'English synthesis timed out.' }
          Start-Sleep -Milliseconds 20
        }
        $taskSynth.SetOutputToNull()
        Move-Item -LiteralPath $taskTemp -Destination $taskPartPath -Force
      } finally {
        if (Test-Path -LiteralPath $taskTemp) { Remove-Item -LiteralPath $taskTemp }
      }
    }
  }
} finally { $taskSynth.Dispose() }
$taskArgs = @((Join-Path $PSScriptRoot 'synthesize-aier-parts.py'), '--catalog', $taskCatalogFile, '--voicevox-root', $VoicevoxRoot, '--ffmpeg', $taskFfmpeg)
if ($Force) { $taskArgs += '--force' }
& $PythonPath @taskArgs
if ($LASTEXITCODE -ne 0) { throw 'VOICEVOX generation failed. Existing runtime catalog was not changed.' }
