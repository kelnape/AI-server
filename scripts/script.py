import nidaqmx
from nidaqmx.constants import LineGrouping

# Konfigurace DAQ zařízení
with nidaqmx.Task() as task:
    # Přidání digitální výstupní kanálu pro relé
    task.do_channels.add_do_chan('Dev1/port0/line0', name_to_assign_to_channel='RelayOutput')
    # Přidání digitální vstupní kanály pro HR a HOME
    task.di_channels.add_di_chan('Dev1/port0/line1', name_to_assign_to_channel='HRInput')
    task.di_channels.add_di_chan('Dev1/port0/line2', name_to_assign_to_channel='HomeInput')

    # Spuštění motoru
    task.write([1], auto_start=True)  # Spustí motor

    # Čekání na signál HR (1-0)
    while True:
        hr_signal = task.read()
        if hr_signal[0] == 0:  # Zastavit motor při HR 1-0
            task.write([0])  # Zastaví motor
            break

    # Spuštění reverzního výstupu
    task.write([1])  # Spustí reverzní motor

    # Čekání na signál HOME (0-1)
    while True:
        home_signal = task.read()
        if home_signal[0] == 1:  # Zastavit motor při HOME 0-1
            task.write([0])  # Zastaví motor
            break

# Konec skriptu