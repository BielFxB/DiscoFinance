$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$ShortcutPath = Join-Path $DesktopPath "DiscFinanci.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "c:\Users\Gabriel\Documents\DiscFinanci\start.bat"
$Shortcut.WorkingDirectory = "c:\Users\Gabriel\Documents\DiscFinanci"
$Shortcut.Description = "Iniciar Sistema DiscFinanci (Backend e Frontend)"
$Shortcut.Save()
Write-Host "Atalho criado com sucesso: $ShortcutPath"

