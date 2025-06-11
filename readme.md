# What is it
A set of python scripts for collecting electricity usage data, along with a webpage for browsing the data in a table and downloading the CSV files which store it.
A sensor is used to detect flashes from the LED on the electricity metre, which is then fed into the Raspberry PI via GPIO. The `powercounter.py` script will detect and count how many pulses occur each minute, writing the result out to a CSV for each day.
![image](https://github.com/user-attachments/assets/0ddd8c76-e364-4226-ba52-0751085b5f5d)


# How to use
1. Clone the repository (or download as a zip and extract)
2. Edit `config.py` so that `ROOT_DIR` is the directory to the `powercounter` folder containing the python files etc. This should be the full path if using crontab to automatically run the scripts.
    * Other fields may be edited as appropriate
    * You may also wish to edit the GPIO pin being used to detect LED flashes, which is specified in `powercounter.py` with the variable `PIN_LED_READ` near the bottom.
3. Create a file called `api_secrets.py` in the `powercounter` folder. This will need to contain two values: `ACCOUNT_NUMBER` and `API_KEY`. These can be obtained from Octopus's webpage.
    * The account number is found (as of writing) at the top of the accounts page under the line saying "Hi (your name)"; this link should redirect you to it if you are logged in: https://octopus.energy/dashboard/new/accounts/
    * The API key is found here: https://octopus.energy/dashboard/new/accounts/personal-details/api-access (or click the "personal details" link on the accounts page, then in a box titled "Developer settings" click the "API access" button). Generate an API key and copy and paste it into the `api_secrets.py` file.
    * REMINDER to never share your API key with anyone, as it allows anyone who has it to perform actions with your account.
    * The file should look something like the following (include the quotes around your account number and API key):
```
ACCOUNT_NUMBER = "abc123"
API_KEY = "a_really_long_series_of_letters_and_numbers"
```
4. The python scripts rely on some libraries which may not be installed by default. The following steps show how to get an environment set up:
    1. In the `powercounter` folder, run `python3 -m venv .env`
    2. Run `.env/bin/pip install dateutils requests pytz` to install the libraries to the environment
    3. The program should be run using the `python` in the `.env/bin` folder. E.g. `.env/bin/python powercounter.py`
5. To run the scripts and web server automatically, I use crontab. Examples of my files are below, note that the web server requires being run as root and that you should edit the file paths as appropriate for where you have placed the `powercounter` folder.

`crontab -e`
```
@reboot sleep 30; /home/pi/powercounter/.env/bin/python /home/pi/powercounter/powercounter.py
10 0 * * * /home/pi/powercounter/.env/bin/python /home/pi/powercounter/clearoldlogs.py
15 0 * * 1 /home/pi/powercounter/.env/bin/python /home/pi/powercounter/updatemonthtotals.py
5 0 * * * /home/pi/powercounter/.env/bin/python /home/pi/powercounter/findchargetimes.py
5 4 * * * /home/pi/powercounter/.env/bin/python /home/pi/powercounter/findchargetimes.py
5 8 * * * /home/pi/powercounter/.env/bin/python /home/pi/powercounter/findchargetimes.py
5 12 * * * /home/pi/powercounter/.env/bin/python /home/pi/powercounter/findchargetimes.py
5 16 * * * /home/pi/powercounter/.env/bin/python /home/pi/powercounter/findchargetimes.py
5 20 * * * /home/pi/powercounter/.env/bin/python /home/pi/powercounter/findchargetimes.py
```

`sudo crontab -e`
```
@reboot sleep 45; python -m http.server 80 --directory /home/pi/powercounter
```

The webpage can be accessed by typing the IP address of your Raspberry PI in a web browser and going to the `readings.html` page, e.g. `192.168.1.100/readings.html`
