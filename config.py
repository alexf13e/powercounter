
import pytz

# where the root folder of the project is
ROOT_DIR = "/home/pi/web/powercounter"

# time period for each recording of power consumption
READING_INTERVAL_MINUTES = 1

# should be noted on the smart metre next to LED
COUNTS_PER_KWH = 4000

# used for converting ev charging time periods from UTC
TIME_ZONE = pytz.timezone("Europe/London")

# MUST be 24 hour time with leading 0
NIGHT_RATE_START = "23:30"
NIGHT_RATE_END = "05:30"
