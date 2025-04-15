
from datetime import date, datetime, timedelta
#from gpiozero import DigitalInputDevice as Pin
import RPi.GPIO as GPIO
import time
import threading
import os

def count_led(_channel):
    global count
    with count_lock:
        count = count + 1


def record_count(value):
    global timeperiod_start
    filename = f"/home/pi/powercounter/logs/{timeperiod_start.strftime('%Y-%m-%d')}.csv"
    timeperiod_end = datetime.now()
    record_interval = (timeperiod_end - timeperiod_start).seconds
    display_period = f"{timeperiod_start.strftime('%H:%M:%S')} - {timeperiod_end.strftime('%H:%M:%S')}"
    timeperiod_start = timeperiod_end

    k_watt_hours = value / 4000
    extrapolated_hourly_usage = k_watt_hours * 3600 / record_interval
    cumulative = k_watt_hours

    file_exists = os.path.isfile(filename)
    if file_exists:
        with open(filename, "r") as f:
            lines = f.readlines()
            lastline = lines[-1]
            lastcumulative = float(lastline.split(",")[4])
            cumulative = lastcumulative + cumulative

    with open(filename, "a") as f:
        if not file_exists:
            f.write("time period,count,period usage kWh,1h projected kWh,cumulative kWh\n")
        f.write(f"{display_period},{value},{k_watt_hours},{extrapolated_hourly_usage},{cumulative}\n")

    if not file_exists:
        # file just been created, so update log list file
        loglist = os.listdir("/home/pi/powercounter/logs")
        loglist.sort(reverse=True) # sort newest first
        with open("/home/pi/powercounter/logs.txt", "w") as f:
            for log in loglist:
                f.write(f"{log}\n")


def get_seconds_until_next_record():
    delta = timedelta(minutes=1)
    now = datetime.now()
    next_record = (now + delta).replace(microsecond=0, second=3)
    return (next_record - now).seconds


PIN_LED_READ = 11
GPIO.setmode(GPIO.BOARD)
GPIO.setwarnings(False)
GPIO.setup(PIN_LED_READ, GPIO.IN)
GPIO.add_event_detect(PIN_LED_READ, GPIO.RISING, count_led, 10)

#pin_led_read = Pin(17)
#pin_led_read.when_activated = count_led

count = 0
count_lock = threading.Lock()

timeperiod_start = datetime.now()

try:
    while True:
        time.sleep(get_seconds_until_next_record())
        with count_lock:
            count_copy = count
            count = 0
        record_count(count_copy)
except KeyboardInterrupt:
    with count_lock:
        record_count(count)
