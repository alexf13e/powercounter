
import calendar
import datetime
import dateutils

import config


def get_last_sunday_in_month(year, month):
    weeks = calendar.monthcalendar(year, month) # matrix of date numbers for each week in month (days outside of month are 0)
    max_sunday_date = 0
    for week in weeks:
        max_sunday_date = max(week[-1], max_sunday_date) # last day of week is sunday
    return datetime.date(year=year, month=month, day=max_sunday_date)


def is_night(time):
    if config.NIGHT_RATE_START > config.NIGHT_RATE_END:
        # everything after start time and everything before end time
        return (time >= config.NIGHT_RATE_START) or (time < config.NIGHT_RATE_END)
    else:
        # everything between start and end time
        return (time >= config.NIGHT_RATE_START) and (time < config.NIGHT_RATE_END)


def is_cheap(date, time):
    if is_night(time):
        return True

    # check for history of daytime charging periods
    if date in cheap_day_periods:
        full_time_string = date + "_" + time
        for (start_time, end_time) in cheap_day_periods[date]:
            if start_time < full_time_string and full_time_string < end_time:
                return True
    return False


today = datetime.date.today()
#today = datetime.date(year=2025, month=6, day=30)
yesterday = today - datetime.timedelta(days=1)

# script only wants to run the day after the last sunday of the month. easier to check here and just run every monday with cron
if yesterday != get_last_sunday_in_month(yesterday.year, yesterday.month):
    exit()


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

this_month = yesterday
last_month = this_month + dateutils.relativedelta(months=-1)

start_date = get_last_sunday_in_month(last_month.year, last_month.month) + datetime.timedelta(days=1)
end_date = get_last_sunday_in_month(this_month.year, this_month.month)

cumulative_period_count_day = 0
cumulative_period_count_night = 0

while start_date <= end_date:
    str_start_date = start_date.strftime('%Y-%m-%d')
    filename = f"{config.ROOT_DIR}/logs/{str_start_date}.csv"

    try:
        with open(filename, "r") as f:
            lines = f.readlines()

            for i in range(1, len(lines)):
                parts = lines[i].split(",")
                time_period_start = parts[0].split(" - ")[0]
                count = int(parts[1])

                if is_cheap(str_start_date, time_period_start):
                    cumulative_period_count_night += count
                else:
                    cumulative_period_count_day += count
    except:
        print(f"failed to read file {filename}")

    start_date += datetime.timedelta(days=1)


kwh_day = cumulative_period_count_day / config.COUNTS_PER_KWH
kwh_night = cumulative_period_count_night / config.COUNTS_PER_KWH

with open(f"{config.ROOT_DIR}/monthtotals.csv", "a") as f:
    f.write(f"{this_month.year}-{this_month.month},{kwh_day + kwh_night},{kwh_day},{kwh_night}\n")

