
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


def night_rate_through_midnight():
    if config.NIGHT_RATE_START_HOUR > config.NIGHT_RATE_END_HOUR:
        return True

    # i doubt this will ever happen but will irk me to not check
    if config.NIGHT_RATE_START_HOUR == config.NIGHT_RATE_END_HOUR and config.NIGHT_RATE_START_MINUTE > config.NIGHT_RATE_END_MINUTE:
        return True

    return False


def is_night_rate(dt):
    if (night_rate_through_midnight()):
        # everything after start time and everything before end time
        return (dt.hour >= config.NIGHT_RATE_START_HOUR and dt.minute >= config.NIGHT_RATE_START_MINUTE) or (dt.hour <= config.NIGHT_RATE_END_HOUR and dt.minute < config.NIGHT_RATE_END_MINUTE)
    else:
        # everything between start and end time
        return (dt.hour >= config.NIGHT_RATE_START_HOUR and dt.minute >= config.NIGHT_RATE_START_MINUTE) and (dt.hour <= config.NIGHT_RATE_END_HOUR and dt.minute < config.NIGHT_RATE_END_MINUTE)


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
        f.write("start_date,start_time,end_date,end_time\n")

with open(charge_times_dir, "a") as f:
    # see long winded note about UTC and daylight savings
    for dispatch in dispatches:
        dt1 = datetime.datetime.fromisoformat(dispatch["start"])
        dt2 = datetime.datetime.fromisoformat(dispatch["end"])
        if not is_night_rate(dt1):
            if is_dst(dt1):
                dt1 += datetime.timedelta(hours=1)
                dt2 += datetime.timedelta(hours=1)
            f.write(f"{dt1.strftime('%Y-%m-%d')},{dt1.strftime('%H:%M:%S')},{dt2.strftime('%Y-%m-%d')},{dt2.strftime('%H:%M:%S')}\n")


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
