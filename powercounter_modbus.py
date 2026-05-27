
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


def get_battery_capacity_kwh():
    return instrument.read_register(registeraddress=37632, number_of_decimals=0, functioncode=4, signed=False) / 100


def get_line_voltage():
    return instrument.read_long(registeraddress=38802, functioncode=4, signed=True) / 10


def record_values():
    timestamp = datetime.now()
    filename = f"{config.ROOT_DIR}/logs/{timestamp.strftime('%Y-%m-%d')}.csv"
    
    cumulative_import_kwh = get_day_total_import_kwh()
    cumulative_export_kwh = get_day_total_export_kwh()
    battery_capacity = get_battery_capacity_kwh()
    line_voltage = get_line_voltage()

    file_exists = os.path.isfile(filename)

    with open(filename, "a") as f:
        if not file_exists:
            f.write("v2\n") # make it easier to change file contents in future
            f.write("time,cumulative import kWh,cumulative export kWh,battery capacity kWh,line voltage V\n")
        f.write(f"{timestamp},{cumulative_import_kwh},{cumulative_export_kwh},{battery_capacity},{line_voltage}\n")

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

while True:
    time.sleep(get_seconds_until_next_record())
    record_values()

instrument.serial.close()
