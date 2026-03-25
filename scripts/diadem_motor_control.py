import nidaqmx
from nidaqmx.constants import Edge

# Konfigurace DAQ zařízení
with nidaqmx.Task() as task:
    # Nastavení kanálu pro čtení signálu HR
    task.ai_channels.add_ai_voltage_chan('Dev1/ai0')
    # Nastavení kanálu pro čtení signálu HOME
    task.ai_channels.add_ai_voltage_chan('Dev1/ai1')

    # Nastavení kanálu pro výstup na relé
    relay_task = nidaqmx.Task()
    relay_task.do_channels.add_do_chan('Dev1/port0/line0')  # Změňte podle potřeby

    # Spuštění motoru
    relay_task.write(True)  # Aktivace relé pro spuštění motoru

    while True:
        hr_signal = task.read()
        if hr_signal < 0.5:  # Změna signálu HR z 1 na 0
            relay_task.write(False)  # Zastavení motoru
            break

    # Reverzní výstup
    relay_task.write(True)  # Aktivace relé pro reverzní směr

    while True:
        home_signal = task.read()
        if home_signal > 0.5:  # Změna signálu HOME z 0 na 1
            relay_task.write(False)  # Zastavení motoru
            break

relay_task.close()