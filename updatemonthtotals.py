
import os
import calendar
import datetime
import dateutils

def get_last_sunday_in_month(year, month):
    weeks = calendar.monthcalendar(year, month) # matrix of date numbers for each week in month (days outside of month are 0)
    max_sunday_date = 0
    for week in weeks:
        max_sunday_date = max(week[-1], max_sunday_date) # last day of week is sunday
    return datetime.date(year=year, month=month, day=max_sunday_date)


def is_night(time_period):
    period_start = time_period.split(" - ")[0]
    parts = period_start.split(":")
    hour = int(parts[0])
    minute = int(parts[1])
    if hour < 5 or (hour == 5 and minute < 30) or (hour == 23 and minute >= 30):
        return True
    else:
        return False



today = datetime.date.today()
yesterday = today - datetime.timedelta(days=1)

# script only wants to run the day after the last sunday of the month. easier to check here and just run every monday with cron
if yesterday != get_last_sunday_in_month(yesterday.year, yesterday.month):
    exit()

this_month = yesterday
last_month = this_month + dateutils.relativedelta(months=-1)

start_date = get_last_sunday_in_month(last_month.year, last_month.month) + datetime.timedelta(days=1)
end_date = get_last_sunday_in_month(this_month.year, this_month.month)

cumulative_period_count_day = 0
cumulative_period_count_night = 0
while start_date <= end_date:
    filename = f"/home/pi/powercounter/logs/{start_date.strftime('%Y-%m-%d')}.csv"
    with open(filename, "r") as f:
        lines = f.readlines()
        for i in range(1, len(lines)):
            parts = lines[i].split(",")
            time_period = parts[0]
            count = int(parts[1])
            if is_night(time_period):
                cumulative_period_count_night += count
            else:
                cumulative_period_count_day += count
    start_date += datetime.timedelta(days=1)

kwh_day = cumulative_period_count_day / 4000
kwh_night = cumulative_period_count_night / 4000

with open("/home/pi/powercounter/monthtotals.csv", "a") as f:
    f.write(f"{this_month.year}-{this_month.month},{kwh_day + kwh_night},{kwh_day},{kwh_night}\n")

