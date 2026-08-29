Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
strPath = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

' Comprobar si ya esta en ejecucion en el puerto 5000
Set oExec = WshShell.Exec("cmd /c netstat -ano | findstr :5000 | findstr LISTENING")
output = oExec.StdOut.ReadAll()

If InStr(output, "LISTENING") = 0 Then
    If FSO.FileExists(strPath & "\.venv\Scripts\pythonw.exe") Then
        WshShell.Run """" & strPath & "\.venv\Scripts\pythonw.exe"" server.py", 0, False
    Else
        WshShell.Run "pythonw server.py", 0, False
    End If
    WScript.Sleep 1200
End If

WshShell.Run "http://127.0.0.1:5000"
