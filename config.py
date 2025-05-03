
import pytz

# where the root folder of the project is
ROOT_DIR = "/home/pi/powercounter"

# should be noted on the smart metre next to LED
COUNTS_PER_KWH = 4000

# used for converting ev charging time periods from UTC
TIME_ZONE = pytz.timezone("Europe/London")

NIGHT_RATE_START_HOUR = 23
NIGHT_RATE_START_MINUTE = 30
NIGHT_RATE_END_HOUR = 5
NIGHT_RATE_END_MINUTE = 30