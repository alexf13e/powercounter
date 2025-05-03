
import os
import datetime

import config

days_to_keep_logs = 365
logdir = f"{config.ROOT_DIR}/logs"
loglist = os.listdir(logdir)
deletion_date = datetime.date.today() - datetime.timedelta(days=days_to_keep_logs)

for log in loglist:
    logdatestring = os.path.splitext(log)[0]
    elements = logdatestring.split("-")
    logdate = datetime.date(int(elements[0]), int(elements[1]), int(elements[2]))
    if logdate < deletion_date:
        try:
            os.remove(f"{logdir}/{log}")
        except Exception as e:
            print(e)
