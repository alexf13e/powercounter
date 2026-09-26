
const aSaveFile = document.getElementById("aSaveFile");
const inpDate = document.getElementById("inpDate");
const btnDateLeft = document.getElementById("btnDateLeft");
const btnDateRight = document.getElementById("btnDateRight");
const inpUnitCostDay = document.getElementById("inpUnitCostDay");
const inpUnitCostNight = document.getElementById("inpUnitCostNight");
const inpUnitCostExport = document.getElementById("inpUnitCostExport");
const inpStandingCharge = document.getElementById("inpStandingCharge");
const inpNightRateStart = document.getElementById("inpNightRateStart");
const inpNightRateEnd = document.getElementById("inpNightRateEnd");
const inpEnableNightRate = document.getElementById("inpEnableNightRate");
const inpEnableChargeTimes = document.getElementById("inpEnableChargeTimes");
const btnToggleGraph = document.getElementById("btnToggleGraph");
const dvColumnVisibilityInputs = document.getElementById("dvColumnVisibilityInputs");
const dvColumnsVisible = document.getElementById("dvColumnsVisible");
const dvGraphInputs = document.getElementById("dvGraphInputs");
const inpGraphData = document.getElementById("inpGraphData");
const inpEnableGraphValueOnHover = document.getElementById("inpEnableGraphValueOnHover");
const dvGraph = document.getElementById("dvGraph");
const dvTable = document.getElementById("dvTable");

let validFileDates = [];
let tableColumns = {};
let chargeTimes = {};
let csvFileVersion;

let reloadFileTimeout;
let columnHideTimeout;

//column headers from file
const STR_TIME_PERIOD = "time period";
const STR_PERIOD_IMPORT_KWH = "import kWh";
const STR_CUMULATIVE_IMPORT_KWH = "cumulative import kWh";
const STR_AVERAGE_IMPORT_KW = "average import kW";
const STR_PERIOD_EXPORT_KWH = "export kWh";
const STR_CUMULATIVE_EXPORT_KWH = "cumulative export kWh";
const STR_AVERAGE_EXPORT_KW = "average export kW";
const STR_BATTERY_CHARGE = "battery charge %";
const STR_LINE_VOLTAGE = "line voltage V"
const STR_LINE_FREQUENCY = "line frequency Hz";

let presentColumns = {};
let minMaxColumns = [STR_PERIOD_IMPORT_KWH, STR_PERIOD_EXPORT_KWH, STR_LINE_VOLTAGE, STR_LINE_FREQUENCY];

//column headers generated on file load
const STR_PERIOD_IMPORT_COST = "import cost p";
const STR_CUMULATIVE_IMPORT_COST = "cumulative import cost £";
const STR_PERIOD_EXPORT_EARN = "export earn p";
const STR_CUMULATIVE_EXPORT_EARN = "cumulative export earn £";
const STR_CUMULATIVE_NET_EARN = "cumulative net earn £";
const STR_PERIOD_TYPE = "period type";

const TABLE_COLUMN_ORDER = [STR_TIME_PERIOD, STR_PERIOD_IMPORT_KWH, STR_CUMULATIVE_IMPORT_KWH, STR_AVERAGE_IMPORT_KW, STR_PERIOD_EXPORT_KWH, STR_CUMULATIVE_EXPORT_KWH, STR_AVERAGE_EXPORT_KW, STR_PERIOD_IMPORT_COST, STR_CUMULATIVE_IMPORT_COST, STR_PERIOD_EXPORT_EARN, STR_CUMULATIVE_EXPORT_EARN, STR_CUMULATIVE_NET_EARN, STR_BATTERY_CHARGE, STR_LINE_VOLTAGE, STR_LINE_FREQUENCY, STR_PERIOD_TYPE];

const GT_BAR = "bar";
const GT_LINE_INSTANT = "lineInstant";
const GT_LINE_CUMULATIVE = "lineCumulative";

//additional properties for each data type used when displaying their values
const DTP_PERIOD_KWH =          { yMin: 0,      yMax: 1.5,  decimalPlaces: 3,   unit: "kWh",    graphType: GT_BAR               };
const DTP_CUMULATIVE_KWH =      { yMin: 0,      yMax: 40,   decimalPlaces: 2,   unit: "kWh",    graphType: GT_LINE_CUMULATIVE   };
const DTP_AVERAGE_KWH =         { yMin: 0,      yMax: 10,   decimalPlaces: 3,   unit: "kW",     graphType: GT_BAR               };
const DTP_PERIOD_COST =         { yMin: 0,      yMax: 15,   decimalPlaces: 3,   unit: "p",      graphType: GT_BAR               };
const DTP_CUMULATIVE_COST =     { yMin: 0,      yMax: 7,    decimalPlaces: 2,   unit: "£",      graphType: GT_LINE_CUMULATIVE   };
const DTP_CUMULATIVE_NET_COST = { yMin: -1.5,   yMax: 7,    decimalPlaces: 2,   unit: "£",      graphType: GT_LINE_CUMULATIVE   };
const DTP_BATTERY =             { yMin: 0,      yMax: 110,  decimalPlaces: 2,   unit: "%",      graphType: GT_LINE_INSTANT      };
const DTP_VOLTAGE =             { yMin: 200,    yMax: 300,  decimalPlaces: 1,   unit: "V",      graphType: GT_LINE_INSTANT      };
const DTP_FREQUENCY =           { yMin: 30,     yMax: 70,   decimalPlaces: 1,   unit: "Hz",     graphType: GT_LINE_INSTANT      };

const DATA_TYPE_PROPERTIES = {};
DATA_TYPE_PROPERTIES[STR_PERIOD_IMPORT_KWH] = DTP_PERIOD_KWH;
DATA_TYPE_PROPERTIES[STR_CUMULATIVE_IMPORT_KWH] = DTP_CUMULATIVE_KWH;
DATA_TYPE_PROPERTIES[STR_AVERAGE_IMPORT_KW] = DTP_AVERAGE_KWH;
DATA_TYPE_PROPERTIES[STR_PERIOD_IMPORT_COST] = DTP_PERIOD_COST;
DATA_TYPE_PROPERTIES[STR_CUMULATIVE_IMPORT_COST] = DTP_CUMULATIVE_COST;

DATA_TYPE_PROPERTIES[STR_PERIOD_EXPORT_KWH] = DTP_PERIOD_KWH;
DATA_TYPE_PROPERTIES[STR_CUMULATIVE_EXPORT_KWH] = DTP_CUMULATIVE_KWH;
DATA_TYPE_PROPERTIES[STR_AVERAGE_EXPORT_KW] = DTP_AVERAGE_KWH;
DATA_TYPE_PROPERTIES[STR_PERIOD_EXPORT_EARN] = DTP_PERIOD_COST;
DATA_TYPE_PROPERTIES[STR_CUMULATIVE_EXPORT_EARN] = DTP_CUMULATIVE_COST;

DATA_TYPE_PROPERTIES[STR_CUMULATIVE_NET_EARN] = DTP_CUMULATIVE_NET_COST;
DATA_TYPE_PROPERTIES[STR_BATTERY_CHARGE] = DTP_BATTERY;
DATA_TYPE_PROPERTIES[STR_LINE_VOLTAGE] = DTP_VOLTAGE;
DATA_TYPE_PROPERTIES[STR_LINE_FREQUENCY] = DTP_FREQUENCY;

const PERIOD_TYPE_NORMAL = 0;
const PERIOD_TYPE_NIGHT = 1;
const PERIOD_TYPE_CHARGING = 2;

//names of columns which can be shown
const GRAPH_DATA_OPTIONS = [STR_PERIOD_IMPORT_KWH, STR_CUMULATIVE_IMPORT_KWH, STR_AVERAGE_IMPORT_KW, STR_PERIOD_EXPORT_KWH, STR_CUMULATIVE_EXPORT_KWH, STR_AVERAGE_EXPORT_KW, STR_PERIOD_IMPORT_COST, STR_CUMULATIVE_IMPORT_COST, STR_PERIOD_EXPORT_EARN, STR_CUMULATIVE_EXPORT_EARN, STR_CUMULATIVE_NET_EARN, STR_BATTERY_CHARGE, STR_LINE_VOLTAGE, STR_LINE_FREQUENCY];

let showGraph = false; //toggle between showing the graph or table
let forceHideGraph = false; //force the graph to be hidden when a file is not found and a message wants to be displayed
let rememberedScrollHeight = null;

let graph;


window.addEventListener("load", async () => {
    loadLocalStorage();

    graph = new Graph(inpEnableGraphValueOnHover.checked, dvGraph);

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
    setLocalStorage("pencePerKWHNight", inpUnitCostNight.value);
});

inpUnitCostExport.addEventListener("change", () => {
    if (inpUnitCostExport.value == "") inpUnitCostExport.value = 0;
    updateCosts(true);
    setLocalStorage("pencePerKWHExport", inpUnitCostExport.value);
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
    graph.setYAxisRange(DATA_TYPE_PROPERTIES[inpGraphData.value].yMin, DATA_TYPE_PROPERTIES[inpGraphData.value].yMax);
    graph.setYDecimalPlaces(DATA_TYPE_PROPERTIES[inpGraphData.value].decimalPlaces);

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

    let pencePerKWHExport = getLocalStorage("pencePerKWHExport");
    if (pencePerKWHExport)
    {
        inpUnitCostExport.value = pencePerKWHExport;
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

    return true;
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
        showError(filename + " is not in list of existing files");
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
        showError("failed to get csv file: " + filename);
        updateDownloadLink("");
        forceHideGraph = true;
        updateGraphVisibility();
        graph.clear();
        return false;
    }

    let text = await response.text();
    text = text.trim();

    inpDate.value = filename.split(".")[0];

    if (createDataFromCSV(text) == false)
    {
        showError("failed to parse csv, but it can still be downloaded");
        updateDownloadLink(filename);
        forceHideGraph = true;
        updateGraphVisibility();
        graph.clear();
        return false;
    }

    createGraphDataOptions();
    updateCosts(false);
    updateGraph();
    updateDownloadLink(filename);

    return true;
}

async function reloadMostRecentFile()
{
    inpDate.value = validFileDates[0];
    let currentFile = validFileDates[0] + ".csv";

    if (await loadNewFile(currentFile) == false) return;

    //set file to be automatically reloaded each minute
    //wait until 5 seconds past the minute to give time for file to be updated and saved
    let d = new Date();
    let timeUntilNextMinute = (60 - d.getSeconds() + 5) * 1000;
    //reloadFileTimeout = setTimeout(reloadMostRecentFile, timeUntilNextMinute);
}

function createDataFromCSV(fileText)
{
    let lines = fileText.split("\n");
    if (lines.length == 0) return false;

    let headerLine = lines[0]; //first line in csv contains column titles
    let valueLines = lines.slice(1); //remaining lines contain values

    //clear table data and recreate columns
    tableColumns = {};
    let headers = headerLine.split(",");
    if (headers.length == 5) return false; //old file format no longer supported

    //create temporary columns before sorting
    for (let header of headers)
    {
        tableColumns[header] = null;
    }

    if (!(STR_TIME_PERIOD in tableColumns)) return false;

    presentColumns[STR_TIME_PERIOD] = true;
    presentColumns[STR_PERIOD_IMPORT_KWH] = STR_PERIOD_IMPORT_KWH in tableColumns;
    presentColumns[STR_CUMULATIVE_IMPORT_KWH] = STR_CUMULATIVE_IMPORT_KWH in tableColumns;
    presentColumns[STR_AVERAGE_IMPORT_KW] = STR_AVERAGE_IMPORT_KW in tableColumns;
    presentColumns[STR_PERIOD_EXPORT_KWH] = STR_PERIOD_EXPORT_KWH in tableColumns;
    presentColumns[STR_CUMULATIVE_EXPORT_KWH] = STR_CUMULATIVE_EXPORT_KWH in tableColumns;
    presentColumns[STR_AVERAGE_EXPORT_KW] = STR_AVERAGE_EXPORT_KW in tableColumns;
    presentColumns[STR_BATTERY_CHARGE] = STR_BATTERY_CHARGE in tableColumns;
    presentColumns[STR_LINE_VOLTAGE] = STR_LINE_VOLTAGE in tableColumns;
    presentColumns[STR_LINE_FREQUENCY] = STR_LINE_FREQUENCY in tableColumns;

    presentColumns[STR_PERIOD_IMPORT_COST] = presentColumns[STR_PERIOD_IMPORT_KWH];
    presentColumns[STR_CUMULATIVE_IMPORT_COST] = presentColumns[STR_PERIOD_IMPORT_KWH];
    presentColumns[STR_PERIOD_EXPORT_EARN] = presentColumns[STR_PERIOD_EXPORT_KWH];
    presentColumns[STR_CUMULATIVE_EXPORT_EARN] = presentColumns[STR_PERIOD_EXPORT_KWH];
    presentColumns[STR_CUMULATIVE_NET_EARN] = presentColumns[STR_PERIOD_IMPORT_KWH] && presentColumns[STR_PERIOD_EXPORT_KWH];

    if (presentColumns[STR_PERIOD_IMPORT_COST]) tableColumns[STR_PERIOD_IMPORT_COST] = null;
    if (presentColumns[STR_CUMULATIVE_IMPORT_COST]) tableColumns[STR_CUMULATIVE_IMPORT_COST] = null;
    if (presentColumns[STR_PERIOD_EXPORT_EARN]) tableColumns[STR_PERIOD_EXPORT_EARN] = null;
    if (presentColumns[STR_CUMULATIVE_EXPORT_EARN]) tableColumns[STR_CUMULATIVE_EXPORT_EARN] = null;
    if (presentColumns[STR_CUMULATIVE_NET_EARN]) tableColumns[STR_CUMULATIVE_NET_EARN] = null;

    tableColumns[STR_PERIOD_TYPE] = null;


    //created a json containing the columns in the order they wish to be displayed
    let sortedTableColumns = {};
    for (let header of TABLE_COLUMN_ORDER)
    {
        if (!(header in tableColumns)) continue;

        sortedTableColumns[header] = [];
    }

    tableColumns = sortedTableColumns;

    //fill out columns
    for (let line of valueLines)
    {
        let values = line.split(",");
        for (let i = 0; i < headers.length; i++)
        {
            let header = headers[i];
            if (header == STR_TIME_PERIOD)
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
        if (presentColumns[STR_PERIOD_IMPORT_COST]) tableColumns[STR_PERIOD_IMPORT_COST].push(0);
        if (presentColumns[STR_CUMULATIVE_IMPORT_COST]) tableColumns[STR_CUMULATIVE_IMPORT_COST].push(0);
        if (presentColumns[STR_PERIOD_EXPORT_EARN]) tableColumns[STR_PERIOD_EXPORT_EARN].push(0);
        if (presentColumns[STR_CUMULATIVE_EXPORT_EARN]) tableColumns[STR_CUMULATIVE_EXPORT_EARN].push(0);
        if (presentColumns[STR_CUMULATIVE_NET_EARN]) tableColumns[STR_CUMULATIVE_NET_EARN].push(0);

        tableColumns[STR_PERIOD_TYPE].push(PERIOD_TYPE_NORMAL);
    }

    return true;
}

function createGraphDataOptions()
{
    const selectedOption = inpGraphData.value;
    inpGraphData.replaceChildren();

    for (let optionText of GRAPH_DATA_OPTIONS)
    {
        let o = document.createElement("option");
        o.value = optionText;
        o.innerHTML = optionText;
        o.disabled = presentColumns[optionText] == false;
        inpGraphData.appendChild(o);
    }

    let optionFound = false;
    if (presentColumns[selectedOption])
    {
        inpGraphData.value = selectedOption;
        optionFound = true;
    }
    else
    {
        for (let option of GRAPH_DATA_OPTIONS)
        {
            if (presentColumns[option])
            {
                inpGraphData.value = option;
                optionFound = true;
                break;
            }
        }
    }

    btnToggleGraph.disabled = !optionFound;
    forceHideGraph = !optionFound;
    updateGraphVisibility();

    graph.setYAxisRange(DATA_TYPE_PROPERTIES[inpGraphData.value].yMin, DATA_TYPE_PROPERTIES[inpGraphData.value].yMax);
    graph.setYDecimalPlaces(DATA_TYPE_PROPERTIES[inpGraphData.value].decimalPlaces);
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
        let dateAndTime = inpDate.value + "_" + time + ":00";
        for (let chargeTime of chargeTimes[inpDate.value])
        {
            if (chargeTime.start <= dateAndTime && dateAndTime < chargeTime.end)
            {
                return true;
            }
        }
    }

    return false;
}

function updateCosts(refreshCostGraph)
{
    const pencePerKWHDay = parseFloat(inpUnitCostDay.value);
    const pencePerKWHNight = parseFloat(inpUnitCostNight.value);
    const pencePerKWHExport = parseFloat(inpUnitCostExport.value);
    const standingCharge = parseFloat(inpStandingCharge.value);
    let cumulativeImportCost = standingCharge;
    let cumulativeExportEarn = 0;

    for (let i = 0; i < tableColumns[STR_TIME_PERIOD].length; i++)
    {
        let timePeriod = tableColumns[STR_TIME_PERIOD][i];
        let startTime = timePeriod.split(" - ")[0];
        let importCost = pencePerKWHDay;

        tableColumns[STR_PERIOD_TYPE][i] = PERIOD_TYPE_NORMAL;

        if (inpEnableChargeTimes.checked && isCharging(startTime)) //prioritise charging colour over night colour
        {
            importCost = pencePerKWHNight;
            tableColumns[STR_PERIOD_TYPE][i] = PERIOD_TYPE_CHARGING;
        }
        else if (inpEnableNightRate.checked && isNightRate(startTime))
        {
            importCost = pencePerKWHNight;
            tableColumns[STR_PERIOD_TYPE][i] = PERIOD_TYPE_NIGHT;
        }

        if (presentColumns[STR_PERIOD_IMPORT_KWH])
        {
            let periodImportCost = tableColumns[STR_PERIOD_IMPORT_KWH][i] * importCost;
            cumulativeImportCost += periodImportCost;
            tableColumns[STR_PERIOD_IMPORT_COST][i] = periodImportCost;
            tableColumns[STR_CUMULATIVE_IMPORT_COST][i] = cumulativeImportCost / 100; //convert p to £
        }

        if (presentColumns[STR_PERIOD_EXPORT_KWH])
        {
            let periodExportEarn = tableColumns[STR_PERIOD_EXPORT_KWH][i] * pencePerKWHExport;
            cumulativeExportEarn += periodExportEarn;
            tableColumns[STR_PERIOD_EXPORT_EARN][i] = periodExportEarn;
            tableColumns[STR_CUMULATIVE_EXPORT_EARN][i] = cumulativeExportEarn / 100;
        }

        if (presentColumns[STR_PERIOD_IMPORT_KWH] && presentColumns[STR_PERIOD_EXPORT_KWH])
        {
            let cumulativeNetEarn = cumulativeExportEarn - cumulativeImportCost;
            tableColumns[STR_CUMULATIVE_NET_EARN][i] = cumulativeNetEarn / 100;
        }
    }

    updateTable();

    if (refreshCostGraph && (
        inpGraphData.value == STR_PERIOD_IMPORT_COST ||
        inpGraphData.value == STR_CUMULATIVE_IMPORT_COST ||
        inpGraphData.value == STR_PERIOD_EXPORT_EARN ||
        inpGraphData.value == STR_CUMULATIVE_EXPORT_EARN ||
        inpGraphData.value == STR_CUMULATIVE_NET_EARN
    ))
    {
        updateGraph();
    }
}

function updateTable()
{
    //clear existing table data if there were any
    dvTable.replaceChildren();

    let table = document.createElement("table");    
    let headerRow = document.createElement("thead");

    let minTexts = {};
    let maxTexts = {};
    let minVals = {};
    let maxVals = {};
    for (let headerName in tableColumns)
    {
        if (headerName == STR_PERIOD_TYPE) continue;

        let th = document.createElement("th");
        let dvOuter = document.createElement("div");
        let dvBottom = document.createElement("div");

        let pName = document.createElement("p");
        pName.innerHTML = headerName;
        dvOuter.appendChild(pName);

        let pMin = document.createElement("p");
        pMin.classList.add(headerName == STR_TIME_PERIOD || (minMaxColumns.includes(headerName)) ? "tdMin" : "tdInvisible");
        dvBottom.appendChild(pMin);
        minTexts[headerName] = pMin;
    
    
        let pMax = document.createElement("p");
        pMax.classList.add(headerName == STR_TIME_PERIOD || (minMaxColumns.includes(headerName)) ? "tdMax" : "tdInvisible");
        dvBottom.appendChild(pMax);
        maxTexts[headerName] = pMax;

        dvOuter.appendChild(dvBottom);
        th.appendChild(dvOuter);
        headerRow.appendChild(th);


        minVals[headerName] = Infinity;
        maxVals[headerName] = -Infinity;
    }

    table.appendChild(headerRow);

    
    let minTDs = {};
    let maxTDs = {};
    
    //values want to be displayed in reverse order, so iterate from end to start
    for (let i = tableColumns[STR_TIME_PERIOD].length - 1; i >= 0; i--)
    {
        let tr = document.createElement("tr");

        //for each column in row i, create the table elements
        for (let headerName in tableColumns)
        {
            if (headerName == STR_PERIOD_TYPE) continue;

            let val = tableColumns[headerName][i];

            let cell;
            if (headerName == STR_TIME_PERIOD)
            {
                cell = document.createElement("th");

                if (inpEnableChargeTimes.checked && tableColumns[STR_PERIOD_TYPE][i] == PERIOD_TYPE_CHARGING)
                {
                    cell.classList.add("tdCharging");
                }
                else if (inpEnableNightRate.checked && tableColumns[STR_PERIOD_TYPE][i] == PERIOD_TYPE_NIGHT)
                {
                    cell.classList.add("tdNight");
                }
            }
            else
            {
                cell = document.createElement("td");
            }

            if (headerName in DATA_TYPE_PROPERTIES)
            {
                cell.innerHTML = val.toFixed(DATA_TYPE_PROPERTIES[headerName].decimalPlaces);
            }
            else
            {
                cell.innerHTML = val;
            }

            tr.appendChild(cell);

            if (minMaxColumns.includes(headerName))
            {
                if (val < minVals[headerName]) { minVals[headerName] = val; minTDs[headerName] = cell; }
                if (val > maxVals[headerName]) { maxVals[headerName] = val; maxTDs[headerName] = cell; }
            }
        }

        table.appendChild(tr);
    }

    for (headerName in tableColumns)
    {
        if (headerName == STR_PERIOD_TYPE) continue;

        if (minMaxColumns.includes(headerName))
        {
            if (minTDs[headerName] != undefined) minTDs[headerName].classList.add("tdMin");
            if (maxTDs[headerName] != undefined) maxTDs[headerName].classList.add("tdMax");
            minTexts[headerName].innerHTML = minVals[headerName].toFixed(DATA_TYPE_PROPERTIES[headerName].decimalPlaces);
            maxTexts[headerName].innerHTML = maxVals[headerName].toFixed(DATA_TYPE_PROPERTIES[headerName].decimalPlaces);
        }
        else if (headerName == STR_TIME_PERIOD)
        {
            minTexts[headerName].innerHTML = "min";
            maxTexts[headerName].innerHTML = "max";
        }
        else
        {
            minTexts[headerName].innerHTML = "0";
            maxTexts[headerName].innerHTML = "0";
        }

    }

    dvTable.appendChild(table);

    createColumnVisibilityInputs();

    forceHideGraph = false;
    updateGraphVisibility();
}

function createColumnVisibilityInputs()
{
    const STR_COLUMN_NOT_PRESENT_HINT = "column not present in csv";

    dvColumnVisibilityInputs.replaceChildren();
    let table = dvTable.children[0];

    let columnVisibility = getLocalStorage("columnVisibility");
    if (columnVisibility == null) columnVisibility = {};
    let columnIndex = 2;
    for (let header of TABLE_COLUMN_ORDER)
    {
        if (header == STR_TIME_PERIOD || header == STR_PERIOD_TYPE) continue;
        
        if (!(header in columnVisibility))
        {
            columnVisibility[header] = true;
        }

        let hiddenClassName = "colHidden" + columnIndex.toString();
        let fullyHiddenClassName = "colHiddenFully" + columnIndex.toString();
        if (columnVisibility[header] == false && presentColumns[header] == true)
        {
            table.classList.add(hiddenClassName);
            table.classList.add(fullyHiddenClassName);
        }

        let inpSetVisible = document.createElement("input");
        inpSetVisible.id = "inpSetVisible" + header;
        inpSetVisible.type = "checkbox";
        inpSetVisible.checked = presentColumns[header] && columnVisibility[header];
        
        
        if (presentColumns[header] == false)
        {
            inpSetVisible.disabled = true;
            inpSetVisible.title = STR_COLUMN_NOT_PRESENT_HINT;
        }
        
        inpSetVisible.addEventListener("change", () => {
            let columnVisibility = getLocalStorage("columnVisibility");
            if (inpSetVisible.checked == false)
            {
                columnVisibility[header] = false;
                table.classList.add(hiddenClassName);

                columnHideTimeout = setTimeout(() => {
                    table.classList.add(fullyHiddenClassName);
                }, 300);
            }
            else
            {
                clearTimeout(columnHideTimeout);

                columnVisibility[header] = true;
                table.classList.remove(fullyHiddenClassName);

                setTimeout(() => {
                    table.classList.remove(hiddenClassName);
                }, 10);
            }

            setLocalStorage("columnVisibility", columnVisibility);
        });

        let lbSetVisible = document.createElement("label");
        lbSetVisible.htmlFor = inpSetVisible.id;
        lbSetVisible.innerHTML = header;
        if (presentColumns[header] == false)
        {
            lbSetVisible.title = STR_COLUMN_NOT_PRESENT_HINT;
        }

        dvColumnVisibilityInputs.appendChild(lbSetVisible);
        dvColumnVisibilityInputs.appendChild(inpSetVisible);

        if (presentColumns[header]) columnIndex++;
    }

    setLocalStorage("columnVisibility", columnVisibility);
}

function updateGraph()
{
    if (DATA_TYPE_PROPERTIES[inpGraphData.value].graphType == GT_BAR)
    {
        graph.setBarData(tableColumns[STR_TIME_PERIOD], tableColumns[inpGraphData.value], tableColumns[STR_PERIOD_TYPE], 10, DATA_TYPE_PROPERTIES[inpGraphData.value].unit);
    }
    else if (DATA_TYPE_PROPERTIES[inpGraphData.value].graphType == GT_LINE_CUMULATIVE)
    {
        graph.setLineData(tableColumns[STR_TIME_PERIOD], tableColumns[inpGraphData.value], tableColumns[STR_PERIOD_TYPE], 10, DATA_TYPE_PROPERTIES[inpGraphData.value].unit, true);
    }
    else if (DATA_TYPE_PROPERTIES[inpGraphData.value].graphType == GT_LINE_INSTANT)
    {
        graph.setLineData(tableColumns[STR_TIME_PERIOD], tableColumns[inpGraphData.value], tableColumns[STR_PERIOD_TYPE], 10, DATA_TYPE_PROPERTIES[inpGraphData.value].unit, false);
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
    dvColumnsVisible.style.display = visible ? "none" : "grid";
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
