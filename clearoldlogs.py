
import os
import time
import datetime

days_to_keep_logs = 365
deletion_date = datetime.date.today() - datetime.timedelta(days=days_to_keep_logs)
logdir = "/home/pi/powercounter/logs"
loglist = os.listdir(logdir)

for log in loglist:
    logdatestring = os.path.splitext(log)[0]
    elements = logdatestring.split("-")
    logdate = datetime.date(int(elements[0]), int(elements[1]), int(elements[2]))
    if logdate < deletion_date:
        try:
            os.remove(f"{logdir}/{log}")
        except Exception as e:
            print(e)
