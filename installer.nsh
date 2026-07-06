!macro customInit
  ; Kill any running instances of the app before installation
  ${if} ${isUpdated}
    DetailPrint "Closing running SyncDemo instances..."
    nsExec::ExecToLog 'taskkill /F /IM "SyncDemo.exe" /T'
    Sleep 2000
    
    ; Also kill any node.exe processes that might be child processes
    nsExec::ExecToLog 'wmic process where "commandline like '%%SyncDemo%%' and name='node.exe'" delete'
    Sleep 1000
  ${endif}
!macroend

!macro customUnInstall
  ; Kill the app before uninstalling
  DetailPrint "Stopping SyncDemo..."
  nsExec::ExecToLog 'taskkill /F /IM "SyncDemo.exe" /T'
  Sleep 2000
!macroend

!macro customInstall
  ; After installation, ensure any leftover processes are cleaned
  DetailPrint "Cleaning up leftover processes..."
  nsExec::ExecToLog 'taskkill /F /IM "SyncDemo.exe" /T'
  Sleep 1000
!macroend