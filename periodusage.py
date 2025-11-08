
import datetime
import argparse

import config


def is_night(time):
    if config.NIGHT_RATE_START > config.NIGHT_RATE_END:
        # everything after start time and everything before end time
        return (time >= config.NIGHT_RATE_START) or (time < config.NIGHT_RATE_END)
    else:
        # everything between start and end time
        return (time >= config.NIGHT_RATE_START) and (time < config.NIGHT_RATE_END)


def is_cheap(date, time):
    # check for history of daytime charging periods
    if date in cheap_day_periods:
        full_time_string = date + "_" + time
        for (start_time, end_time) in cheap_day_periods[date]:
            if start_time < full_time_string and full_time_string < end_time:
                return True
    return False


# load data for cheap daytime charges
cheap_day_periods = {}
with open(f"{config.ROOT_DIR}/chargetimes.csv", "r") as f:
    lines = f.readlines()
    for i in range(1, len(lines)): # skip first line with headers
        line = lines[i]
        start_time, end_time = line.split(",")
        start_date = start_time.split("_")[0]
        if start_time in cheap_day_periods:
            cheap_day_periods[start_date].append((start_time, end_time))
        else:
            cheap_day_periods[start_date] = [(start_time, end_time)]


parser = argparse.ArgumentParser("python3 periodusage.py")
parser.add_argument("start_date", help="The inclusive start date of the time period to be measured in YYYY-MM-DD format", type=str)
parser.add_argument("end_date", help="The inclusive end date of the time period to be measured in YYYY-MM-DD format", type=str)
args = parser.parse_args()

arg_start_year, arg_start_month, arg_start_day = args.start_date.split("-")
arg_end_year, arg_end_month, arg_end_day = args.end_date.split("-")

start_date = datetime.date(int(arg_start_year), int(arg_start_month), int(arg_start_day))
end_date = datetime.date(int(arg_end_year), int(arg_end_month), int(arg_end_day))

cumulative_period_count_day = 0
cumulative_period_count_day_cheap = 0
cumulative_period_count_night = 0

while start_date <= end_date:
    str_start_date = start_date.strftime('%Y-%m-%d')
    filename = f"{config.ROOT_DIR}/logs/{str_start_date}.csv"

    with open(filename, "r") as f:
        lines = f.readlines()

        for i in range(1, len(lines)):
            parts = lines[i].split(",")
            time_period_start = parts[0].split(" - ")[0]
            count = int(parts[1])

            if is_night(time_period_start):
                cumulative_period_count_night += count
            elif is_cheap(str_start_date, time_period_start):
                cumulative_period_count_day_cheap += count
            else:
                cumulative_period_count_day += count
    start_date += datetime.timedelta(days=1)

kwh_day = cumulative_period_count_day / config.COUNTS_PER_KWH
kwh_day_cheap = cumulative_period_count_day_cheap / config.COUNTS_PER_KWH
kwh_night = cumulative_period_count_night / config.COUNTS_PER_KWH

print(f"day: {kwh_day}")
print(f"day cheap: {kwh_day_cheap}")
print(f"night: {kwh_night}")
print(f"total: {kwh_day + kwh_day_cheap + kwh_night}")
