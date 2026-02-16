' Hide command prompt and run PowerShell script
Set objShell = CreateObject("WScript.Shell")
strScriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\ServerManager.ps1"
objShell.Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & strScriptPath & """", 0, False
