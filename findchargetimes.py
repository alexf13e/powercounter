
import requests
import json
import os
import datetime

import api_secrets
import config


URL = "https://api.octopus.energy/v1/graphql/"


def print_JSON(object):
    print(json.dumps(object, indent=4))


def is_dst(dt):
    aware_dt = config.TIME_ZONE.localize(dt)
    return aware_dt.dst() != datetime.timedelta(0, 0)


# first need to obtain a kraken token
m_obtainKrakenToken = '''
mutation {
    obtainKrakenToken(input: { APIKey: "''' + api_secrets.API_KEY + '''" }) {
        token
    }
}'''

headers = {
    'Content-Type': 'application/json'
}

response = requests.post(URL, json={'query': m_obtainKrakenToken}, headers=headers)
response_json = response.json()

if "errors" in response_json:
    print("error getting kraken token: ")
    print_JSON(response_json)
    exit()

TOKEN = response_json["data"]["obtainKrakenToken"]["token"]


# now the token can be used to query "dispatches" which (for us) mean time periods of EV charging
q_completedDispatches = '''
query {
    completedDispatches(accountNumber: "''' + api_secrets.ACCOUNT_NUMBER + '''") {
        start
        end
        start
        end
        delta
    }
}
'''

headers = {
    'Content-Type': 'application/json',
    'Authorization': TOKEN
}

response = requests.post(URL, json={'query': q_completedDispatches}, headers=headers)
response_json = response.json()

if "errors" in response_json:
    print("error getting completed dispatches: ")
    print_JSON(response_json)
    exit()

dispatches = response_json["data"]["completedDispatches"]


# dispatches have been found, save them to file
charge_times_dir = f"{config.ROOT_DIR}/chargetimes.csv"
file_exists = os.path.isfile(charge_times_dir)
if not file_exists:
    with open(charge_times_dir, "w") as f:
        f.write("start,end\n")


# load existing data for charge times
cheap_day_periods = {}
with open(charge_times_dir, "r") as f:
    lines = f.readlines()
    for i in range(1, len(lines)): # skip first line with headers
        line = lines[i]
        start_time, end_time = line.split(",")
        start_date = start_time.split("_")[0]
        if start_date in cheap_day_periods:
            cheap_day_periods[start_date].append((start_time, end_time))
        else:
            cheap_day_periods[start_date] = [(start_time, end_time)]


with open(charge_times_dir, "a") as f:
    # see long winded note about UTC and daylight savings
    for dispatch in dispatches:
        dt1 = datetime.datetime.fromisoformat(dispatch["start"])
        dt2 = datetime.datetime.fromisoformat(dispatch["end"])

        if is_dst(dt1):
            dt1 += datetime.timedelta(hours=1)
        
        if is_dst(dt2):
            dt2 += datetime.timedelta(hours=1)

        #check dispatch hasn't already been saved
        str_dt1 = dt1.strftime('%Y-%m-%d_%H:%M:%S')
        str_dt2 = dt2.strftime('%Y-%m-%d_%H:%M:%S')
        start_date = str_dt1.split("_")[0]
        dispatch_present = False
        if start_date in cheap_day_periods:
            for (start_time, end_time) in cheap_day_periods[start_date]:
                if start_time == str_dt1:
                    dispatch_present = True
                    break
        
        if dispatch_present:
            continue
        
        f.write(f"{str_dt1},{str_dt2}\n")


# long-winded note about UTC and daylight savings:
# octopus api uses UTC for all recorded time periods, but we record times using local time on the pi.
# this means that during daylight savings, the octopus times are 1 hour behind those on the pi, so this needs to be
# corrected so that the cheaper rate periods match up locally.
# doing this correction means that there are issues on the nights of daylight savings changing:
#   when entering daylight savings, 1am-2am is skipped - not an issue as can just add 1 hour to UTC time
#   when exiting daylight savings, 1am-2am is repeated - is an issue, since if octopus says 1am-2am is cheaper time,
#   there will be 2 local hours considered to be cheap when only 1 was
# 
# HOWEVER - 23:30 to 05:30 will always be cheap regardless of dispatches, so I have decided I don't care and we will
# just convert octopus time to local (instead of storing UTC locally, invalidating/adjusting all existing files and
# requiring the webpage to convert times to daylight savings when applicable and fetching readings from more than one
# file, and then the downloaded csv will be confusing to work with...)
