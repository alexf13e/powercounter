
let dvCSV = document.getElementById("dvCSV");
let aSaveFile = document.getElementById("aSaveFile");
let inpUnitCostDay = document.getElementById("inpUnitCostDay");
let inpUnitCostNight = document.getElementById("inpUnitCostNight");
let inpStandingCharge = document.getElementById("inpStandingCharge");
let inpEnableNightRate = document.getElementById("inpEnableNightRate");
let inpEnableChargeTimes = document.getElementById("inpEnableChargeTimes");
let inpNightRateStart = document.getElementById("inpNightRateStart");
let inpNightRateEnd = document.getElementById("inpNightRateEnd");
let inpDate = document.getElementById("inpDate");

let currentFileDate;
let validFileDates = [];
let currentJSONRows = [];
let chargeTimes = {};

const PERIOD_COST_TITLE = "period cost pence";
const PROJECTED_COST_TITLE = "1h projected cost £";
const CUMULATIVE_COST_TITLE = "cumulative cost £";

let reloadFileTimeout;

window.addEventListener("load", async () => {
    loadLocalStorage();
    if (await createLogList() == false) return;

    if (await loadChargeTimes() == false)
    {
        inpEnableChargeTimes.checked = false;
        inpEnableChargeTimes.disabled = true;
        inpEnableChargeTimes.title = "chargetimes.csv not present";
    }

    //automatically show the most recent file
    await reloadMostRecentFile();
});

inpUnitCostDay.addEventListener("change", () => {
    if (inpUnitCostDay.value == "") inpUnitCostDay.value = 0;
    updateJSONCosts();
    setLocalStorage("pencePerKWHDay", inpUnitCostDay.value);
});

inpUnitCostNight.addEventListener("change", () => {
    if (inpUnitCostNight.value == "") inpUnitCostNight.value = 0;
    updateJSONCosts();
    setLocalStorage("pencePerKWHDay", inpUnitCostNight.value);
});

inpStandingCharge.addEventListener("change", () => {
    if (inpStandingCharge.value == "") inpStandingCharge.value = 0;
    updateJSONCosts();
    setLocalStorage("penceStandingCharge", inpStandingCharge.value);
});

inpNightRateStart.addEventListener("change", () => {
    if (inpEnableNightRate.checked || inpEnableChargeTimes.checked)
    {
        updateJSONCosts();
    }

    setLocalStorage("nightRateStart", inpNightRateStart.value);
});

inpNightRateEnd.addEventListener("change", () => {
    if (inpEnableNightRate.checked || inpEnableChargeTimes.checked)
    {
        updateJSONCosts();
    }
    setLocalStorage("nightRateEnd", inpNightRateEnd.value);
});

inpEnableNightRate.addEventListener("change", () => {
    updateJSONCosts();
    setLocalStorage("enableNightRate", inpEnableNightRate.checked);
});

inpEnableChargeTimes.addEventListener("change", () => {
    updateJSONCosts();
    setLocalStorage("enableChargeTimes", inpEnableChargeTimes.checked);
});

inpDate.addEventListener("change", async () => {
    clearTimeout(reloadFileTimeout);
    let filename = inpDate.value + ".csv";

    if (inpDate.value == validFileDates[0])
    {
        await reloadMostRecentFile();
    }
    else if (validFileDates.includes(inpDate.value))
    {
        await readCSVtoJSON(filename);
        updateJSONCosts();
        updateDownloadLink(filename);
    }
    else
    {
        dvCSV.replaceChildren();
        let p = document.createElement("p");
        p.innerHTML = filename + " does not exist";
        dvCSV.appendChild(p);
    }
});


function loadLocalStorage()
{
    //load saved input values
    let pencePerKWHDay = getLocalStorage("pencePerKWHDay");
    if (pencePerKWHDay)
    {
        inpUnitCostDay.value = pencePerKWHDay;
    }

    let pencePerKWHNight = getLocalStorage("pencePerKWHNight");
    if (pencePerKWHNight)
    {
        inpUnitCostNight.value = pencePerKWHNight;
    }

    let penceStandingCharge = getLocalStorage("penceStandingCharge");
    if (penceStandingCharge)
    {
        inpStandingCharge.value = penceStandingCharge;
    }

    let nightRateStart = getLocalStorage("nightRateStart");
    if (nightRateStart)
    {
        inpNightRateStart.value = nightRateStart;
    }

    let nightRateEnd = getLocalStorage("nightRateEnd");
    if (nightRateEnd)
    {
        inpNightRateEnd.value = nightRateEnd;
    }

    let enableNightRate = getLocalStorage("enableNightRate");
    if (enableNightRate == false)
    {
        inpEnableNightRate.checked = false;
    }

    let enableChargeTimes = getLocalStorage("enableChargeTimes");
    if (enableChargeTimes == false)
    {
        inpEnableChargeTimes.checked = false;
    }
}

async function createLogList()
{
    //get a list of existing log files
    let response = await fetch("./logindex.txt", {cache: "no-store"});
    if (!response.ok)
    {
        let p = document.createElement("p");
        p.innerHTML = "No log files available (logindex.txt missing)";
        dvCSV.appendChild(p);
        return false;
    }

    let text = await response.text();
    text = text.trim();

    //if no log files available, show message in place of table
    if (text.length == 0)
    {
        let p = document.createElement("p");
        p.innerHTML = "No log files available";
        dvCSV.appendChild(p);
        return false;
    }

    //store list of valid log dates for use when selecting date
    let lines = text.split("\n");
    for (let filename of lines)
    {
        if (filename == "") continue; //in case stray blank line left in list of log files
        let date = filename.split(".")[0];
        validFileDates.push(date);
    }

    return true;
}

async function loadChargeTimes()
{
    let response = await fetch("./chargetimes.csv", {cache: "no-store"});
    if (!response.ok)
    {
        return false;
    }

    let text = await response.text();
    text = text.trim();

    //create json indexed by start date of charge period (only ever in 30 minute chunks, so doesn't run through
    //multiple days)
    let lines = text.split("\n");
    for (let i = 1; i < lines.length; i++)
    {
        let line = lines[i];
        if (line == "") continue;

        let parts = line.split(",");
        let chargeTime = {
            start: parts[0],
            end: parts[1]
        };

        let start_date = parts[0].split("_")[0];

        if (start_date in chargeTimes)
        {
            chargeTimes[start_date].push(chargeTime);
        }
        else
        {
            chargeTimes[start_date] = [chargeTime];
        }
    }
}

async function reloadMostRecentFile()
{
    currentFileDate = validFileDates[0];
    inpDate.value = currentFileDate;

    let currentFile = currentFileDate + ".csv";
    await readCSVtoJSON(currentFile);
    updateJSONCosts();
    updateDownloadLink(currentFile);

    //set file to be automatically reloaded each minute
    //wait until 5 seconds past the minute to give time for file to be updated and saved
    let d = new Date();
    let timeUntilNextMinute = (60 - d.getSeconds() + 5) * 1000;
    reloadFileTimeout = setTimeout(reloadMostRecentFile, timeUntilNextMinute);
}

async function readCSVtoJSON(filename)
{
    //first read the csv into a json object to make modifying values easier
    let response = await fetch("./logs/" + filename);
    if (!response.ok)
    {
        console.error(response);
        alert("failed to load csv file: " + filename);
        return;
    }

    let text = await response.text();
    text = text.trim();

    let lines = text.split("\n");
    let titleLine = lines[0]; //first line in csv contains column titles
    let valueLines = lines.slice(1); //remaining lines contain values

    let newJSONRows = [];
    let titleRow = {};
    let titles = titleLine.split(",");
    for (let title of titles)
    {
        titleRow[title] = title;
    }

    titleRow[PERIOD_COST_TITLE] = PERIOD_COST_TITLE;
    titleRow[PROJECTED_COST_TITLE] = PROJECTED_COST_TITLE;
    titleRow[CUMULATIVE_COST_TITLE] = CUMULATIVE_COST_TITLE;

    newJSONRows.push(titleRow);

    for (let line of valueLines)
    {
        let valueRow = {};
        let values = line.split(",");
        for (let i = 0; i < titles.length; i++)
        {
            valueRow[titles[i]] = values[i];
            if (titles[i] != "time period") valueRow[titles[i]] = parseFloat(valueRow[titles[i]]);
        }

        //costs will be calculated and updated based on unit cost input box
        valueRow[PERIOD_COST_TITLE] = 0;
        valueRow[CUMULATIVE_COST_TITLE] = 0;
        valueRow[PROJECTED_COST_TITLE] = 0;

        newJSONRows.push(valueRow);
    }

    currentJSONRows = newJSONRows;
    currentFileDate = filename.split(".")[0];

    return;
}

function isNightRate(time)
{
    let NRstart = inpNightRateStart.value;
    let NRend = inpNightRateEnd.value;

    //check if time is during night rate
    if (NRstart > NRend)
    {
        return (time >= NRstart || time < NRend)
    }
    else
    {
        return (time >= NRstart && time < NRend)
    }
}

function isCharging(time)
{
    //check if time was during a charging period
    if (currentFileDate in chargeTimes)
    {
        let dateAndTime = currentFileDate + "_" + time;
        for (let chargeTime of chargeTimes[currentFileDate])
        {
            if (chargeTime.start < dateAndTime && dateAndTime < chargeTime.end)
            {
                return true;
            }
        }
    }

    return false;
}

function updateJSONCosts()
{
    let pencePerKWHDay = parseFloat(inpUnitCostDay.value);
    let pencePerKWHNight = parseFloat(inpUnitCostNight.value);
    let standingCharge = parseFloat(inpStandingCharge.value);
    let cumulativeCost = 0;

    for (let i = 1; i < currentJSONRows.length; i++)
    {
        let row = currentJSONRows[i];
        let timePeriod = row["time period"];
        let startTime = timePeriod.split(" - ")[0];
        let cost = pencePerKWHDay;

        row["night"] = false;
        row["charging"] = false;

        if (inpEnableChargeTimes.checked && isCharging(startTime))
        {
            cost = pencePerKWHNight;
            row["charging"] = true;
        }
        
        if (inpEnableNightRate.checked && isNightRate(startTime))
        {
            cost = pencePerKWHNight;
            row["night"] = true;
        }

        let periodCost = row["period usage kWh"] * cost;
        cumulativeCost += periodCost;
        row[PERIOD_COST_TITLE] = periodCost;
        row[PROJECTED_COST_TITLE] = row["1h projected kWh"] * cost / 100; //projected and cumulative cost to be in £
        row[CUMULATIVE_COST_TITLE] = (cumulativeCost + standingCharge) / 100;
    }

    displayJSON();
}

function displayJSON()
{
    //clear existing table data if there were any
    dvCSV.replaceChildren();

    let table = document.createElement("table");
    let titleRow = document.createElement("thead");
    let titles = currentJSONRows[0];

    let columnOrder = ["time period", "count", "period usage kWh", PERIOD_COST_TITLE, "1h projected kWh",
        PROJECTED_COST_TITLE, "cumulative kWh", CUMULATIVE_COST_TITLE];

    for (let key of columnOrder)
    {
        let title = titles[key];
        let th = document.createElement("th");
        th.innerHTML = title;
        titleRow.appendChild(th);
    }

    table.appendChild(titleRow);

    let trMin, trMax;
    let countMin = Infinity;
    let countMax = 0;
    let columns2dp = [PERIOD_COST_TITLE, "1h projected kWh", PROJECTED_COST_TITLE, "cumulative kWh",
        CUMULATIVE_COST_TITLE];

    //values want to be displayed in reverse order, so iterate from end to start
    for (let i = currentJSONRows.length - 1; i > 0; i--)
    {
        let JSONrow = currentJSONRows[i];
        let tr = document.createElement("tr");
        if (inpEnableChargeTimes.checked && JSONrow["charging"])
        {
            tr.classList.add("trCharging");
        }
        else if (inpEnableNightRate.checked && JSONrow["night"])
        {
            tr.classList.add("trNight");
        }

        for (let key of columnOrder)
        {
            let val = JSONrow[key]
            let td = document.createElement("td");
            if (columns2dp.includes(key))
            {
                td.innerHTML = val.toFixed(2);
            }
            else
            {
                td.innerHTML = val;
            }
            tr.appendChild(td);

            if (key == "count")
            {
                if (val < countMin)
                {
                    countMin = val;
                    trMin = tr;
                }
                if (val > countMax)
                {
                    countMax = val;
                    trMax = tr;
                }
            }
        }

        table.appendChild(tr);
    }

    trMin.classList.add("trMin");
    trMax.classList.add("trMax");

    dvCSV.appendChild(table);
}

function updateDownloadLink(filename)
{
    //update the "download current csv" link for the currently displayed file
    aSaveFile.classList.remove("saveFileHidden");
    aSaveFile.classList.add("saveFileShown");
    aSaveFile.href = "/logs/" + filename;
}

function getLocalStorage(key)
{
    let ls = localStorage.getItem("powerReadings");
    if (ls === null) return null;

    ls = JSON.parse(ls);
    value = ls[key];

    if (value === undefined) return null;
    return value;
}

function setLocalStorage(key, value)
{
    let ls = localStorage.getItem("powerReadings");
    if (ls === null) ls = {};
    else ls = JSON.parse(ls);

    ls[key] = value;
    localStorage.setItem("powerReadings", JSON.stringify(ls));
}
