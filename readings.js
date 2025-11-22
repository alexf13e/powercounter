
const aSaveFile = document.getElementById("aSaveFile");
const inpDate = document.getElementById("inpDate");
const btnDateLeft = document.getElementById("btnDateLeft");
const btnDateRight = document.getElementById("btnDateRight");
const inpUnitCostDay = document.getElementById("inpUnitCostDay");
const inpUnitCostNight = document.getElementById("inpUnitCostNight");
const inpStandingCharge = document.getElementById("inpStandingCharge");
const inpNightRateStart = document.getElementById("inpNightRateStart");
const inpNightRateEnd = document.getElementById("inpNightRateEnd");
const inpEnableNightRate = document.getElementById("inpEnableNightRate");
const inpEnableChargeTimes = document.getElementById("inpEnableChargeTimes");
const btnToggleGraph = document.getElementById("btnToggleGraph");
const dvGraphInputs = document.getElementById("dvGraphInputs");
const inpGraphData = document.getElementById("inpGraphData");
const inpEnableGraphValueOnHover = document.getElementById("inpEnableGraphValueOnHover");
const pGraphDataDescription = document.getElementById("pGraphDataDescription");
const pGraphDataEquation = document.getElementById("pGraphDataEquation");
const dvGraph = document.getElementById("dvGraph");
const dvTable = document.getElementById("dvTable");

let validFileDates = [];
let tableColumns = {};
let chargeTimes = {};

let halfHourTotalUsage = [];
let halfHourTotalCost = [];
let halfHourPeriodTypes = [];
let halfHourTimePeriods = [];

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

//options which will be given in the graph data drop down for what data to display
const STR_HALF_HOUR_TOTAL_USAGE = "half hour total usage kWh";
const STR_HALF_HOUR_TOTAL_COST = "half hour total cost £";
const STR_PERIOD_AVERAGE_RATE = "period usage rate kW";
const graphDataOptions = [STR_PERIOD_AVERAGE_RATE, TH_PERIOD_USAGE, TH_PERIOD_COST, STR_HALF_HOUR_TOTAL_USAGE, STR_HALF_HOUR_TOTAL_COST,
    TH_CUMULATIVE_USAGE, TH_CUMULATIVE_COST];

//this is the order the columns will be displayed
const tableHeaders = [TH_TIME_PERIOD, TH_COUNT, TH_PERIOD_USAGE, TH_PERIOD_COST, TH_PROJECTED_USAGE, TH_PROJECTED_COST,
    TH_CUMULATIVE_USAGE, TH_CUMULATIVE_COST];

//extra values stored in table data but not used as columns
const STR_PERIOD_TYPE = "periodType";

//different categories for each period, used for colouring and price calculation
const PERIOD_TYPE_NORMAL = 0;
const PERIOD_TYPE_CHARGING = 1;
const PERIOD_TYPE_NIGHT = 2;

//descriptions of the data
const STR_DATA_DESC_USAGE_RATE = "Period usage rate is the average rate of energy usage (kW) over the time period. We cannot measure instantaneous rate, so it is approximated by assuming the total period usage amount was at a constant rate.";
const STR_DATA_DESC_PERIOD_USAGE = "Period usage is the total amount of energy used (kWh) in each one-minute period, derived from the number of LED pulses counted in that minute. The meter states the number of pulses per kWh (e.g. 4000).";
const STR_DATA_DESC_PERIOD_COST = "Period cost (pence) is the cost of the period's energy usage, based on the input prices and accounting for night rate and charge times if enabled."
const STR_DATA_DESC_HALF_HOUR_USAGE = "Half hour total usage (kWh) is the sum of each minute's usage within a given 30 minutes.";
const STR_DATA_DESC_HALF_HOUR_COST = "Half hour total cost (£) is the sum of costs for each minute in the given 30 minute period, accounting for night rate and charging times which may have been active at any point in those 30 minutes.";
const STR_DATA_DESC_CUMULATIVE_USAGE = "Cumulative usage (kWh) is the total usage so far since the day started. It is the sum of each minute's usage up to and including the one at that time.";
const STR_DATA_DESC_CUMULATIVE_COST = "Cumulative cost (£) is the total cost so far since the day started. This includes the daily standing charge (which is applied to the first minute's cumulative cost), and accounts for price changes from night rate and charging.";

const STR_DATA_EQN_USAGE_RATE = "period usage rate (kW) = period usage (kWh per minute) * 60 (minutes per hour)";
const STR_DATA_EQN_PERIOD_USAGE = "period usage (kWh) = counts / counts per kWh";
const STR_DATA_EQN_PERIOD_COST = "period cost (pence) = period usage (kWh) * cost (pence per kWh)";

//additional properties for each data type used when displaying their values
const DATA_TYPE_PROPERTIES = {};
DATA_TYPE_PROPERTIES[STR_PERIOD_AVERAGE_RATE] = { yMax: 10, decimalPlaces: 3, description: STR_DATA_DESC_USAGE_RATE, equation: STR_DATA_EQN_USAGE_RATE };
DATA_TYPE_PROPERTIES[TH_PERIOD_USAGE] = { yMax: 0.2, decimalPlaces: 3, description: STR_DATA_DESC_PERIOD_USAGE, equation: STR_DATA_EQN_PERIOD_USAGE };
DATA_TYPE_PROPERTIES[TH_PERIOD_COST] = { yMax: 5, decimalPlaces: 3, description: STR_DATA_DESC_PERIOD_COST, equation: STR_DATA_EQN_PERIOD_COST };
DATA_TYPE_PROPERTIES[STR_HALF_HOUR_TOTAL_USAGE] = { yMax: 5, decimalPlaces: 3, description: STR_DATA_DESC_HALF_HOUR_USAGE, equation: "" };
DATA_TYPE_PROPERTIES[STR_HALF_HOUR_TOTAL_COST] = { yMax: 3, decimalPlaces: 2, description: STR_DATA_DESC_HALF_HOUR_COST, equation: "" };
DATA_TYPE_PROPERTIES[TH_PROJECTED_USAGE] = { yMax: 10, decimalPlaces: 2 };
DATA_TYPE_PROPERTIES[TH_PROJECTED_COST] = { yMax: 3, decimalPlaces: 2 };
DATA_TYPE_PROPERTIES[TH_CUMULATIVE_USAGE] = { yMax: 50, decimalPlaces: 2, description: STR_DATA_DESC_CUMULATIVE_USAGE, equation: "" };
DATA_TYPE_PROPERTIES[TH_CUMULATIVE_COST] = { yMax: 20, decimalPlaces: 2, description: STR_DATA_DESC_CUMULATIVE_COST, equation: "" };

let showGraph = false; //toggle between showing the graph or table
let forceHideGraph = false; //force the graph to be hidden when a file is not found and a message wants to be displayed
let rememberedScrollHeight = null;

let graph;


window.addEventListener("load", async () => {
    createGraphDataOptions();
    loadLocalStorage();

    graph = new Graph(inpEnableGraphValueOnHover.checked, dvGraph);
    inpGraphData.value = STR_HALF_HOUR_TOTAL_USAGE;
    graph.setYAxisRange(DATA_TYPE_PROPERTIES[inpGraphData.value].yMax);
    graph.setYDecimalPlaces(DATA_TYPE_PROPERTIES[inpGraphData.value].decimalPlaces);
    pGraphDataDescription.innerHTML = DATA_TYPE_PROPERTIES[inpGraphData.value].description;
    pGraphDataEquation.innerHTML = DATA_TYPE_PROPERTIES[inpGraphData.value].equation;

    if (await createLogList() == false) return;

    if (await loadChargeTimes() == false)
    {
        inpEnableChargeTimes.checked = false;
        inpEnableChargeTimes.disabled = true;
        inpEnableChargeTimes.title = "chargetimes.csv not present";
    }

    initHalfHourlyTotals();

    //automatically show the most recent file
    await reloadMostRecentFile();
});

inpDate.addEventListener("change", async () => {
    onLogDateChanged();
});

btnDateLeft.addEventListener("click", async() => {
    let date = new Date(inpDate.value);
    date.setDate(date.getDate() - 1);
    inpDate.value = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-" + date.getDate().toString().padStart(2, "0");
    onLogDateChanged();
});

btnDateRight.addEventListener("click", async() => {
    let date = new Date(inpDate.value);
    date.setDate(date.getDate() + 1);
    inpDate.value = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-" + date.getDate().toString().padStart(2, "0");
    onLogDateChanged();
});

inpUnitCostDay.addEventListener("change", () => {
    if (inpUnitCostDay.value == "") inpUnitCostDay.value = 0;
    updateCosts(true);
    setLocalStorage("pencePerKWHDay", inpUnitCostDay.value);
});

inpUnitCostNight.addEventListener("change", () => {
    if (inpUnitCostNight.value == "") inpUnitCostNight.value = 0;
    updateCosts(true);
    setLocalStorage("pencePerKWHDay", inpUnitCostNight.value);
});

inpStandingCharge.addEventListener("change", () => {
    if (inpStandingCharge.value == "") inpStandingCharge.value = 0;
    updateCosts(true);
    setLocalStorage("penceStandingCharge", inpStandingCharge.value);
});

inpNightRateStart.addEventListener("change", () => {
    if (inpEnableNightRate.checked)
    {
        updateCosts(true);
    }

    setLocalStorage("nightRateStart", inpNightRateStart.value);
});

inpNightRateEnd.addEventListener("change", () => {
    if (inpEnableNightRate.checked)
    {
        updateCosts(true);
    }
    setLocalStorage("nightRateEnd", inpNightRateEnd.value);
});

inpEnableNightRate.addEventListener("change", () => {
    updateCosts(true);
    setLocalStorage("enableNightRate", inpEnableNightRate.checked);
});

inpEnableChargeTimes.addEventListener("change", () => {
    updateCosts(true);
    setLocalStorage("enableChargeTimes", inpEnableChargeTimes.checked);
});

btnToggleGraph.addEventListener("click", () => {
    if (!showGraph)
    {
        rememberedScrollHeight = window.scrollY;
    }

    showGraph = !showGraph;
    btnToggleGraph.innerHTML = showGraph ? "Show table" : "Show graph";
    updateGraphVisibility();

    if (!showGraph && rememberedScrollHeight != null)
    {
        window.scrollTo(0, rememberedScrollHeight);
    }
});

inpGraphData.addEventListener("change", () => {
    graph.setYAxisRange(DATA_TYPE_PROPERTIES[inpGraphData.value].yMax);
    graph.setYDecimalPlaces(DATA_TYPE_PROPERTIES[inpGraphData.value].decimalPlaces);
    pGraphDataDescription.innerHTML = DATA_TYPE_PROPERTIES[inpGraphData.value].description;
    pGraphDataEquation.innerHTML = DATA_TYPE_PROPERTIES[inpGraphData.value].equation;

    if (!forceHideGraph)
    {
        updateGraph();
    }
});

inpEnableGraphValueOnHover.addEventListener("change", () => {
    setLocalStorage("enableGraphValueOnHover", inpEnableGraphValueOnHover.checked);
    graph.enableValueOnHover = inpEnableGraphValueOnHover.checked;
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

    let enableGraphValueOnHover = getLocalStorage("enableGraphValueOnHover");
    if (enableGraphValueOnHover == true)
    {
        inpEnableGraphValueOnHover.checked = true;
    }
}

function createGraphDataOptions()
{
    for (let optionText of graphDataOptions)
    {
        let o = document.createElement("option");
        o.value = optionText;
        o.innerHTML = optionText;
        inpGraphData.appendChild(o);
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

function initHalfHourlyTotals()
{
    for (let t = 0; t < 48; t++)
    {
        halfHourTotalUsage.push(0);
        halfHourTotalCost.push(0);
        halfHourPeriodTypes.push(PERIOD_TYPE_NORMAL);

        let hour = Math.floor(t / 2).toString().padStart(2, "0");
        let minute = (t % 2 == 0) ? ":00" : ":30";

        let time = hour + minute;
        halfHourTimePeriods.push(time);
    }
}

async function onLogDateChanged()
{
    clearTimeout(reloadFileTimeout);
    let filename = inpDate.value + ".csv";

    if (inpDate.value == validFileDates[0])
    {
        await reloadMostRecentFile();
    }
    else if (validFileDates.includes(inpDate.value))
    {
        await loadNewFile(filename);
    }
    else
    {
        showError(filename + " does not exist");
        updateDownloadLink("");
        forceHideGraph = true;
        updateGraphVisibility();
        graph.clear();
    }
}

async function loadNewFile(filename)
{
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

    if (buildTableColumns(text) == false) return;

    updateHalfHourUsageTotals();
    updateCosts(false);
    updateGraph();
    updateDownloadLink(filename);
}

async function reloadMostRecentFile()
{
    inpDate.value = validFileDates[0];
    let currentFile = validFileDates[0] + ".csv";

    await loadNewFile(currentFile);

    //set file to be automatically reloaded each minute
    //wait until 5 seconds past the minute to give time for file to be updated and saved
    let d = new Date();
    let timeUntilNextMinute = (60 - d.getSeconds() + 5) * 1000;
    reloadFileTimeout = setTimeout(reloadMostRecentFile, timeUntilNextMinute);
}

async function buildTableColumns(fileText)
{
    let lines = fileText.split("\n");
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
    tableColumns[STR_PERIOD_TYPE] = [];

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
        tableColumns[STR_PERIOD_TYPE].push(PERIOD_TYPE_NORMAL)
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

function updateCosts(doUpdateGraph)
{
    let pencePerKWHDay = parseFloat(inpUnitCostDay.value);
    let pencePerKWHNight = parseFloat(inpUnitCostNight.value);
    let standingCharge = parseFloat(inpStandingCharge.value);
    let cumulativeCost = 0;

    for (let t = 0; t < 48; t++)
    {
        halfHourTotalCost[t] = 0;
        halfHourPeriodTypes[t] = PERIOD_TYPE_NORMAL;
    }

    for (let i = 0; i < tableColumns[TH_TIME_PERIOD].length; i++)
    {
        let timePeriod = tableColumns[TH_TIME_PERIOD][i];
        let startTime = timePeriod.split(" - ")[0];
        let cost = pencePerKWHDay;

        tableColumns[STR_PERIOD_TYPE][i] = PERIOD_TYPE_NORMAL;

        if (inpEnableChargeTimes.checked && isCharging(startTime))
        {
            cost = pencePerKWHNight;
            tableColumns[STR_PERIOD_TYPE][i] = PERIOD_TYPE_CHARGING;
        }
        else if (inpEnableNightRate.checked && isNightRate(startTime)) //prioritise charging over night
        {
            cost = pencePerKWHNight;
            tableColumns[STR_PERIOD_TYPE][i] = PERIOD_TYPE_NIGHT;
        }

        let periodCost = tableColumns[TH_PERIOD_USAGE][i] * cost;
        cumulativeCost += periodCost;
        tableColumns[TH_PERIOD_COST][i] = periodCost;
        tableColumns[TH_PROJECTED_COST][i] = tableColumns[TH_PROJECTED_USAGE][i] * cost / 100; //projected and cumulative cost to be in £
        tableColumns[TH_CUMULATIVE_COST][i] = (cumulativeCost + standingCharge) / 100;


        let timeParts = tableColumns[TH_TIME_PERIOD][i].split(":");
        let hour = parseInt(timeParts[0]);
        let minute = parseInt(timeParts[1]);
        let t = hour * 2 + (minute < 30 ? 0 : 1);
        halfHourTotalCost[t] += periodCost / 100;

        if (tableColumns[STR_PERIOD_TYPE][i] == PERIOD_TYPE_CHARGING || halfHourPeriodTypes[t] == PERIOD_TYPE_NORMAL) //priority is charging > night > normal
        {
            halfHourPeriodTypes[t] = tableColumns[STR_PERIOD_TYPE][i];
        }
    }

    updateTable();

    if (doUpdateGraph && (
        inpGraphData.value == TH_PERIOD_COST ||
        inpGraphData.value == TH_CUMULATIVE_COST ||
        inpGraphData.value == STR_HALF_HOUR_TOTAL_COST))
    {
        updateGraph();
    }
}

function updateHalfHourUsageTotals()
{
    for (let t = 0; t < 48; t++)
    {
        halfHourTotalUsage[t] = 0;
    }

    for (let i = 0; i < tableColumns[TH_TIME_PERIOD].length; i++)
    {
        let timeParts = tableColumns[TH_TIME_PERIOD][i].split(":");
        let hour = parseInt(timeParts[0]);
        let minute = parseInt(timeParts[1]);
        let t = hour * 2 + (minute < 30 ? 0 : 1);
        halfHourTotalUsage[t] += tableColumns[TH_PERIOD_USAGE][i];
    }
}

function updateTable()
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

    //values want to be displayed in reverse order, so iterate from end to start
    for (let i = tableColumns[TH_TIME_PERIOD].length - 1; i >= 0; i--)
    {
        let tr = document.createElement("tr");
        if (inpEnableChargeTimes.checked && tableColumns[STR_PERIOD_TYPE][i] == PERIOD_TYPE_CHARGING)
        {
            tr.classList.add("trCharging");
        }
        else if (inpEnableNightRate.checked && tableColumns[STR_PERIOD_TYPE][i] == PERIOD_TYPE_NIGHT)
        {
            tr.classList.add("trNight");
        }

        //for each column in row i, create the table elements
        for (let headerName of tableHeaders)
        {
            let val = tableColumns[headerName][i];

            let td = document.createElement("td");
            if (headerName in DATA_TYPE_PROPERTIES)
            {

                td.innerHTML = val.toFixed(DATA_TYPE_PROPERTIES[headerName].decimalPlaces);
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

    forceHideGraph = false;
    updateGraphVisibility();
}

function updateGraph()
{
    if (inpGraphData.value == TH_PERIOD_USAGE)
    {
        graph.setBarData(tableColumns[TH_TIME_PERIOD], tableColumns[TH_PERIOD_USAGE], tableColumns[STR_PERIOD_TYPE], 1, "kWh");
    }

    if (inpGraphData.value == TH_PERIOD_COST)
    {
        graph.setBarData(tableColumns[TH_TIME_PERIOD], tableColumns[TH_PERIOD_COST], tableColumns[STR_PERIOD_TYPE], 1, "p");
    }

    if (inpGraphData.value == STR_HALF_HOUR_TOTAL_USAGE)
    {
        graph.setBarData(halfHourTimePeriods, halfHourTotalUsage, halfHourPeriodTypes, 30, "kWh");
    }

    if (inpGraphData.value == STR_HALF_HOUR_TOTAL_COST)
    {
        graph.setBarData(halfHourTimePeriods, halfHourTotalCost, halfHourPeriodTypes, 30, "£");
    }

    if (inpGraphData.value == STR_PERIOD_AVERAGE_RATE)
    {
        graph.setBarData(tableColumns[TH_TIME_PERIOD], tableColumns[TH_PROJECTED_USAGE], tableColumns[STR_PERIOD_TYPE], 1, "kW");
    }

    if (inpGraphData.value == TH_CUMULATIVE_USAGE)
    {
        graph.setLineData(tableColumns[TH_TIME_PERIOD], tableColumns[TH_CUMULATIVE_USAGE], tableColumns[STR_PERIOD_TYPE], 1, "kWh");
    }

    if (inpGraphData.value == TH_CUMULATIVE_COST)
    {
        graph.setLineData(tableColumns[TH_TIME_PERIOD], tableColumns[TH_CUMULATIVE_COST], tableColumns[STR_PERIOD_TYPE], 1, "£");
    }

    graph.draw();
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
        aSaveFile.href = "logs/" + filename;
    }
}

function updateGraphVisibility()
{
    let visible = showGraph && !forceHideGraph;
    dvTable.style.display = visible ? "none" : "block";
    dvGraph.style.display = visible ? "grid" : "none";
    dvGraphInputs.style.display = visible ? "grid" : "none";
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
