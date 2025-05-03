
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


def night_rate_through_midnight():
    if config.NIGHT_RATE_START_HOUR > config.NIGHT_RATE_END_HOUR:
        return True
    
    # i doubt this will ever happen but will irk me to not check
    if config.NIGHT_RATE_START_HOUR == config.NIGHT_RATE_END_HOUR and config.NIGHT_RATE_START_MINUTE > config.NIGHT_RATE_END_MINUTE:
        return True
    
    return False


def is_night(time_period):
    period_start = time_period.split(" - ")[0]
    parts = period_start.split(":")
    hour = int(parts[0])
    minute = int(parts[1])
    if (night_rate_through_midnight()):
        # everything after start time and everything before end time
        return (hour >= config.NIGHT_RATE_START_HOUR and minute >= config.NIGHT_RATE_START_MINUTE) or (hour <= config.NIGHT_RATE_END_HOUR and minute < config.NIGHT_RATE_END_MINUTE)
    else:
        # everything between start and end time
        return (hour >= config.NIGHT_RATE_START_HOUR and minute >= config.NIGHT_RATE_START_MINUTE) and (hour <= config.NIGHT_RATE_END_HOUR and minute < config.NIGHT_RATE_END_MINUTE)


def create_datetime(str_date, str_time):
    year, month, day = str_date.split("-")
    hour, minute, _ = str_time.split(":")
    return datetime.datetime(int(year), int(month), int(day), int(hour), int(minute))


def is_cheap(date, time_period):
    if is_night(time_period):
        return True
    
    # check for history of daytime charging periods
    if date in cheap_day_periods:
        time_period_start = time_period.split(" - ")[0]
        hour, minute, second = time_period_start.split(":")
        t = datetime.time(hour, minute, second)
        for (dt1, dt2) in cheap_day_periods[date]:
            if (dt1.time() < t and t < dt2.time()):
                return True
    
    return False            


today = datetime.date.today()
yesterday = today - datetime.timedelta(days=1)

# script only wants to run the day after the last sunday of the month. easier to check here and just run every monday with cron
if yesterday != get_last_sunday_in_month(yesterday.year, yesterday.month):
    exit()


# load data for cheap daytime charges
cheap_day_periods = {}
with open(f"{config.ROOT_DIR}/chargetimes.csv", "r") as f:
    lines = f.readlines()
    for line in lines:
        start_date, start_time, end_date, end_time = line.split(",")
        dt1 = create_datetime(start_date, start_time)
        dt2 = create_datetime(end_date, end_time)
        if start_date in cheap_day_periods:
            cheap_day_periods[start_date].append((dt1, dt2))
        else:
            cheap_day_periods[start_date] = [(dt1, dt2)]
            

this_month = yesterday
last_month = this_month + dateutils.relativedelta(months=-1)

start_date = get_last_sunday_in_month(last_month.year, last_month.month) + datetime.timedelta(days=1)
end_date = get_last_sunday_in_month(this_month.year, this_month.month)

cumulative_period_count_day = 0
cumulative_period_count_night = 0
while start_date <= end_date:
    str_start_date = start_date.strftime('%Y-%m-%d')
    filename = f"{config.ROOT_DIR}/logs/{str_start_date}.csv"
    with open(filename, "r") as f:
        lines = f.readlines()
        for i in range(1, len(lines)):
            parts = lines[i].split(",")
            time_period = parts[0]
            count = int(parts[1])
            if is_cheap(str_start_date, time_period):
                cumulative_period_count_night += count
            else:
                cumulative_period_count_day += count
    start_date += datetime.timedelta(days=1)

kwh_day = cumulative_period_count_day / config.COUNTS_PER_KWH
kwh_night = cumulative_period_count_night / config.COUNTS_PER_KWH

with open(f"{config.ROOT_DIR}/monthtotals.csv", "a") as f:
    f.write(f"{this_month.year}-{this_month.month},{kwh_day + kwh_night},{kwh_day},{kwh_night}\n")

