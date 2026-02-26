' Launch nw.js Server Manager (no console window)
Set objShell = CreateObject("WScript.Shell")
strLaunchPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\manager\launch.bat"
objShell.Run """" & strLaunchPath & """", 0, False
