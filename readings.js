
const dvTable = document.getElementById("dvTable");
const aSaveFile = document.getElementById("aSaveFile");
const inpUnitCostDay = document.getElementById("inpUnitCostDay");
const inpUnitCostNight = document.getElementById("inpUnitCostNight");
const inpStandingCharge = document.getElementById("inpStandingCharge");
const inpEnableNightRate = document.getElementById("inpEnableNightRate");
const inpEnableChargeTimes = document.getElementById("inpEnableChargeTimes");
const inpNightRateStart = document.getElementById("inpNightRateStart");
const inpNightRateEnd = document.getElementById("inpNightRateEnd");
const inpDate = document.getElementById("inpDate");

let validFileDates = [];
let tableColumns = {};
let chargeTimes = {};

let reloadFileTimeout;

//these should match the csv file being loaded
const TH_TIME_PERIOD = "time period";
const TH_COUNT = "count";
const TH_PERIOD_USAGE = "period usage kWh";
const TH_PROJECTED_USAGE = "1h projected kWh";
const TH_CUMULATIVE_USAGE = "cumulative kWh";

const fileTableHeaders = [TH_TIME_PERIOD, TH_COUNT, TH_PERIOD_USAGE, TH_PROJECTED_USAGE, TH_CUMULATIVE_USAGE];

//costs are generated at runtime and not stored in csv
const TH_PERIOD_COST = "period cost pence";
const TH_PROJECTED_COST = "1h projected cost £";
const TH_CUMULATIVE_COST = "cumulative cost £";

//this is the order the columns will be displayed
const tableHeaders = [TH_TIME_PERIOD, TH_COUNT, TH_PERIOD_USAGE, TH_PERIOD_COST, TH_PROJECTED_USAGE, TH_PROJECTED_COST,
    TH_CUMULATIVE_USAGE, TH_CUMULATIVE_COST];

//extra values stored in table data but not used as columns
const STR_IS_CHARGING = "isCharging";
const STR_IS_NIGHT = "isNight";


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
    updateCosts();
    setLocalStorage("pencePerKWHDay", inpUnitCostDay.value);
});

inpUnitCostNight.addEventListener("change", () => {
    if (inpUnitCostNight.value == "") inpUnitCostNight.value = 0;
    updateCosts();
    setLocalStorage("pencePerKWHDay", inpUnitCostNight.value);
});

inpStandingCharge.addEventListener("change", () => {
    if (inpStandingCharge.value == "") inpStandingCharge.value = 0;
    updateCosts();
    setLocalStorage("penceStandingCharge", inpStandingCharge.value);
});

inpNightRateStart.addEventListener("change", () => {
    if (inpEnableNightRate.checked)
    {
        updateCosts();
    }

    setLocalStorage("nightRateStart", inpNightRateStart.value);
});

inpNightRateEnd.addEventListener("change", () => {
    if (inpEnableNightRate.checked)
    {
        updateCosts();
    }
    setLocalStorage("nightRateEnd", inpNightRateEnd.value);
});

inpEnableNightRate.addEventListener("change", () => {
    updateCosts();
    setLocalStorage("enableNightRate", inpEnableNightRate.checked);
});

inpEnableChargeTimes.addEventListener("change", () => {
    updateCosts();
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
        await buildTableColumns(filename);
        updateCosts();
        updateDownloadLink(filename);
    }
    else
    {
        showError(filename + " does not exist");
        updateDownloadLink("");
    }
});


function showError(message)
{
    dvTable.replaceChildren();
    let p = document.createElement("p");
    p.innerHTML = message;
    dvTable.appendChild(p);
}

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
    //runs once on page load

    let response = await fetch("./logindex.txt", {cache: "no-store"});
    if (!response.ok)
    {
        let p = document.createElement("p");
        p.innerHTML = "No log files available (logindex.txt missing)";
        dvTable.appendChild(p);
        return false;
    }

    let text = await response.text();
    text = text.trim();

    //if no log files available, show message in place of table
    if (text.length == 0)
    {
        let p = document.createElement("p");
        p.innerHTML = "No log files available";
        dvTable.appendChild(p);
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
    //get a list of time periods when charging occurred
    //runs once on page load

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
    inpDate.value = validFileDates[0];
    let currentFile = validFileDates[0] + ".csv";

    if (await buildTableColumns(currentFile) == false) return;

    updateCosts();
    updateDownloadLink(currentFile);

    //set file to be automatically reloaded each minute
    //wait until 5 seconds past the minute to give time for file to be updated and saved
    let d = new Date();
    let timeUntilNextMinute = (60 - d.getSeconds() + 5) * 1000;
    reloadFileTimeout = setTimeout(reloadMostRecentFile, timeUntilNextMinute);
}

async function buildTableColumns(filename)
{
    //reads data from csv into arrays for each column
    //runs on log file selection

    let response = await fetch("./logs/" + filename);
    if (!response.ok)
    {
        console.error(response);
        showError("failed to load csv file: " + filename);
        return false;
    }

    let text = await response.text();
    text = text.trim();

    inpDate.value = filename.split(".")[0];

    let lines = text.split("\n");
    let headerLine = lines[0]; //first line in csv contains column titles
    let valueLines = lines.slice(1); //remaining lines contain values

    //clear table data and recreate columns
    tableColumns = {};
    let presentHeaders = headerLine.split(",");

    //check that no unexpected headers are present
    for (let header of presentHeaders)
    {
        if (!fileTableHeaders.includes(header))
        {
            showError("csv does not match expected format");
            return false;
        }
    }

    //check that all expected headers are present
    for (let header of fileTableHeaders)
    {
        if (!presentHeaders.includes(header))
        {
            showError("csv does not match expected format");
            return false;
        }
    }

    //add columns arrays to json
    for (let header of tableHeaders)
    {
        tableColumns[header] = [];
    }
    
    //add extra data to be associated with each row
    tableColumns[STR_IS_CHARGING] = [];
    tableColumns[STR_IS_NIGHT] = [];

    //fill out columns
    for (let line of valueLines)
    {
        let values = line.split(",");
        for (let i = 0; i < presentHeaders.length; i++)
        {
            let header = presentHeaders[i];
            if (header == TH_TIME_PERIOD)
            {
                //time period is a string, everything else is a number
                tableColumns[header].push(values[i]);
            }
            else
            {
                tableColumns[header].push(parseFloat(values[i]));
            }
        }

        //costs will be calculated and updated based on unit cost input box
        tableColumns[TH_PERIOD_COST].push(0);
        tableColumns[TH_PROJECTED_COST].push(0);
        tableColumns[TH_CUMULATIVE_COST].push(0);
        tableColumns[STR_IS_CHARGING].push(false);
        tableColumns[STR_IS_NIGHT].push(false);
    }

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
    if (inpDate.value in chargeTimes)
    {
        let dateAndTime = inpDate.value + "_" + time;
        for (let chargeTime of chargeTimes[inpDate.value])
        {
            if (chargeTime.start < dateAndTime && dateAndTime < chargeTime.end)
            {
                return true;
            }
        }
    }

    return false;
}

function updateCosts()
{
    let pencePerKWHDay = parseFloat(inpUnitCostDay.value);
    let pencePerKWHNight = parseFloat(inpUnitCostNight.value);
    let standingCharge = parseFloat(inpStandingCharge.value);
    let cumulativeCost = 0;

    for (let i = 0; i < tableColumns[TH_TIME_PERIOD].length; i++)
    {
        let timePeriod = tableColumns[TH_TIME_PERIOD][i];
        let startTime = timePeriod.split(" - ")[0];
        let cost = pencePerKWHDay;

        tableColumns[STR_IS_CHARGING][i] = false;
        tableColumns[STR_IS_NIGHT][i] = false;

        if (inpEnableChargeTimes.checked && isCharging(startTime))
        {
            cost = pencePerKWHNight;
            tableColumns[STR_IS_CHARGING][i] = true;
        }
        
        if (inpEnableNightRate.checked && isNightRate(startTime))
        {
            cost = pencePerKWHNight;
            tableColumns[STR_IS_NIGHT][i] = true;
        }

        let periodCost = tableColumns[TH_PERIOD_USAGE][i] * cost;
        cumulativeCost += periodCost;
        tableColumns[TH_PERIOD_COST][i] = periodCost;
        tableColumns[TH_PROJECTED_COST][i] = tableColumns[TH_PROJECTED_USAGE][i] * cost / 100; //projected and cumulative cost to be in £
        tableColumns[TH_CUMULATIVE_COST][i] = (cumulativeCost + standingCharge) / 100;
    }

    displayTable();
}

function displayTable()
{
    //clear existing table data if there were any
    dvTable.replaceChildren();

    let table = document.createElement("table");
    let headerRow = document.createElement("thead");

    for (let headerName of tableHeaders)
    {
        let th = document.createElement("th");
        th.innerHTML = headerName;
        headerRow.appendChild(th);
    }

    table.appendChild(headerRow);

    let trMin, trMax;
    let countMin = Infinity;
    let countMax = 0;
    let columns2dp = [TH_PERIOD_COST, TH_PROJECTED_USAGE, TH_PROJECTED_COST, TH_CUMULATIVE_USAGE, TH_CUMULATIVE_COST];

    //values want to be displayed in reverse order, so iterate from end to start
    for (let i = tableColumns[TH_TIME_PERIOD].length - 1; i >= 0; i--)
    {
        let tr = document.createElement("tr");
        if (inpEnableChargeTimes.checked && tableColumns[STR_IS_CHARGING][i])
        {
            tr.classList.add("trCharging");
        }
        else if (inpEnableNightRate.checked && tableColumns[STR_IS_NIGHT][i])
        {
            tr.classList.add("trNight");
        }

        //for each column in row i, create the table elements
        for (let headerName of tableHeaders)
        {
            let val = tableColumns[headerName][i];

            let td = document.createElement("td");
            if (columns2dp.includes(headerName))
            {
                td.innerHTML = val.toFixed(2);
            }
            else
            {
                td.innerHTML = val;
            }
            tr.appendChild(td);

            if (headerName == TH_COUNT)
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

    dvTable.appendChild(table);
}

function updateDownloadLink(filename)
{
    //update the "download current csv" link for the currently displayed file
    if (filename == "")
    {
        aSaveFile.classList.add("saveFileHidden");
        aSaveFile.classList.remove("saveFileShown");
        aSaveFile.href = "";
    }
    else
    {
        aSaveFile.classList.remove("saveFileHidden");
        aSaveFile.classList.add("saveFileShown");
        aSaveFile.href = "/logs/" + filename;
    }
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
