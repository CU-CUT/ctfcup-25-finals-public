# root

User (SSH)
    |
DeviceIoControl() → HWMonitor.sys
    |
Доступ к памяти out of bound
    |
BSOD
    |
Windows создает C:\Windows\MEMORY.DMP
    |
Перезагрузка
    |
Участник скачивает MEMORY.DMP
    |
Volatility извлекает NT hash из дампа
    |
Pass-the-Hash → Administrator shell
    |

### 

```c
case IOCTL_CALIBRATE_SENSORS:
{
    PCALIBRATION_DATA calibData = (PCALIBRATION_DATA)buffer;
    ULONG sensorCount = calibData->SensorCount;

    if (inputBufferLength >= sizeof(ULONG)) {
        for (ULONG i = 0; i < sensorCount; i++) {
            // sensorCount > 64 -> memory out of bond access
            ULONG calibValue = calibData->CalibrationValues[i];
            // big i -> BSOD
        }
    }
}

```
### 
- При разведке на машине, например с помощью winpeas, можно увидеть драйвер, находящийся по нестандартному пути: `C:\Windows\Drivers`
```powershell
sc query
Get-Service HWMonitor
```
Так же можно увидеть в реестре информацию о создании дампа при краше.
```powershell
AutoReboot           : 1
CrashDumpEnabled     : 1
DisableEmoticon      : 1
DumpFile             : C:\Windows\MEMORY.DMP
DumpLogLevel         : 0
EnableLogFile        : 1
LogEvent             : 1
MinidumpDir          : C:\Windows\Minidump
MinidumpsCount       : 5
Overwrite            : 1
AlwaysKeepMemoryDump : 1
PSPath               : Microsoft.PowerShell.Core\Registry::HKEY_LOCAL_MACHINE\SY 
                       STEM\CurrentControlSet\Control\CrashControl
PSParentPath         : Microsoft.PowerShell.Core\Registry::HKEY_LOCAL_MACHINE\SY 
                       STEM\CurrentControlSet\Control
PSChildName          : CrashControl
PSDrive              : HKLM
PSProvider           : Microsoft.PowerShell.Core\Registry
```

- Эксплуатируем buffer overflow в драйвере и вызываем краш системы, во время которого будет создан полный дамп памяти.
- Достаем из дампа памяти NT Hash c помощью Volatility -> Заходим в Administrator с помощью Pass-the-hash