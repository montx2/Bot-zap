' Inicia o bot em segundo plano SEM abrir janela preta.
' Duplo clique neste arquivo depois de ter rodado install.bat
' e configurado o config.js.
'
' Observacao: na PRIMEIRA vez (QR Code) use start.bat ou
' start-pm2.bat + "pm2 logs", porque o QR precisa aparecer.
' Este .vbs e ideal DEPOIS que a sessao (auth_info) ja existe.

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = folder

' Roda node de forma oculta (0 = hidden window)
shell.Run "cmd /c node index.js", 0, False
