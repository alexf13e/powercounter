
from datetime import datetime, timedelta
import time
import os
import minimalmodbus

import config


# https://github.com/user-attachments/files/24958455/FoxESS.Modbus.Protocol--20251215.V1.05.04.00.pdf
def get_day_total_import_kwh():
    return instrument.read_long(registeraddress=39619, functioncode=4, signed=False) / 100


def get_day_total_export_kwh():
    return instrument.read_long(registeraddress=39615, functioncode=4, signed=False) / 100


def get_battery_soc_kwh():
    return instrument.read_register(registeraddress=37612, number_of_decimals=0, functioncode=4, signed=False)


def get_line_voltage():
    return instrument.read_long(registeraddress=38802, functioncode=4, signed=True) / 10


def record_values():
    global timeperiod_start
    global prev_import_kwh
    global prev_export_kwh

    timeperiod_end = datetime.now()
    filename = f"{config.ROOT_DIR}/logs/{timeperiod_start.strftime('%Y-%m-%d')}.csv"
    record_interval = (timeperiod_end - timeperiod_start).seconds
    display_period = f"{timeperiod_start.strftime('%H:%M')} - {timeperiod_end.strftime('%H:%M')}"
    timeperiod_start = timeperiod_end

    cumulative_import_kwh = get_day_total_import_kwh()
    period_import_kwh = cumulative_import_kwh - prev_import_kwh
    average_import_kW = period_import_kwh * 3600 / record_interval
    
    cumulative_export_kwh = get_day_total_export_kwh()
    period_export_kwh = cumulative_export_kwh - prev_export_kwh
    average_export_kW = period_export_kwh * 3600 / record_interval
    
    battery_soc = get_battery_soc_kwh()
    line_voltage = get_line_voltage()

    prev_import_kwh = cumulative_import_kwh
    prev_export_kwh = cumulative_export_kwh

    file_exists = os.path.isfile(filename)
    with open(filename, "a") as f:
        if not file_exists:
            f.write("time period,import kWh,cumulative import kWh,average import kW,export kWh,cumulative export kWh,average export kW,battery charge %,line voltage V\n")
        f.write(f"{display_period},{period_import_kwh},{cumulative_import_kwh},{average_import_kW},{period_export_kwh},{cumulative_export_kwh},{average_export_kW},{battery_soc},{line_voltage}\n")

    if not file_exists:
        # file has just been created, so update log list file
        loglist = os.listdir(f"{config.ROOT_DIR}/logs")
        loglist.sort(reverse=True) # sort newest first
        with open(f"{config.ROOT_DIR}/logindex.txt", "w") as f:
            for log in loglist:
                f.write(f"{log}\n")


def get_seconds_until_next_record():
    delta = timedelta(minutes=config.READING_INTERVAL_MINUTES)
    now = datetime.now()
    # record just after the minute to ensure at midnight the reading goes on the next day
    next_record = (now + delta).replace(microsecond=0, second=3)
    return (next_record - now).seconds


instrument = minimalmodbus.Instrument(config.MODBUS_DEVICE_PATH, config.MODBUS_SERVER_ADDRESS, minimalmodbus.MODE_RTU)
instrument.serial.baudrate = config.MODBUS_BAUDRATE

timeperiod_start = datetime.now()
prev_import_kwh = get_day_total_import_kwh()
prev_export_kwh = get_day_total_export_kwh()

try:
    while True:
        time.sleep(get_seconds_until_next_record())
        record_values()
except KeyboardInterrupt:
    print(" exiting...")

instrument.serial.close()
