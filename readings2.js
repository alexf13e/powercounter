
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
const dvTableHead = document.getElementById("dvTableHead");
const dvTableContent = document.getElementById("dvTableContent");

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

//column headers generated on file load
const STR_PERIOD_IMPORT_COST = "import cost p";
const STR_CUMULATIVE_IMPORT_COST = "cumulative import cost £";
const STR_PERIOD_EXPORT_EARN = "export earn p";
const STR_CUMULATIVE_EXPORT_EARN = "cumulative export earn £";
const STR_CUMULATIVE_NET_EARN = "cumulative net earn £";
const STR_PERIOD_TYPE = "period type";

const TABLE_COLUMN_ORDER = [STR_TIME_PERIOD, STR_PERIOD_IMPORT_KWH, STR_CUMULATIVE_IMPORT_KWH, STR_AVERAGE_IMPORT_KW, STR_PERIOD_EXPORT_KWH, STR_CUMULATIVE_EXPORT_KWH, STR_AVERAGE_EXPORT_KW, STR_PERIOD_IMPORT_COST, STR_CUMULATIVE_IMPORT_COST, STR_PERIOD_EXPORT_EARN, STR_CUMULATIVE_EXPORT_EARN, STR_CUMULATIVE_NET_EARN, STR_BATTERY_CHARGE, STR_LINE_VOLTAGE, STR_PERIOD_TYPE];


//additional properties for each data type used when displaying their values
const DTP_PERIOD_KWH =          { yMin: 0,      yMax: 0.2,    decimalPlaces: 3,   unit: "kWh",    graphType: "bar"  };
const DTP_CUMULATIVE_KWH =      { yMin: 0,      yMax: 50,     decimalPlaces: 2,   unit: "kWh",    graphType: "line" };
const DTP_AVERAGE_KWH =         { yMin: 0,      yMax: 10,     decimalPlaces: 3,   unit: "kW",     graphType: "bar"  };
const DTP_PERIOD_COST =         { yMin: 0,      yMax: 5,      decimalPlaces: 3,   unit: "p",      graphType: "bar"  };
const DTP_CUMULATIVE_COST =     { yMin: 0,      yMax: 5,      decimalPlaces: 2,   unit: "£",      graphType: "line" };
const DTP_CUMULATIVE_NET_COST = { yMin: -1.5,   yMax: 5,      decimalPlaces: 2,   unit: "£",      graphType: "line" };
const DTP_BATTERY =             { yMin: 0,      yMax: 100,    decimalPlaces: 2,   unit: "%",      graphType: "line" };
const DTP_VOLTAGE =             { yMin: 0,      yMax: 300,    decimalPlaces: 1,   unit: "V",      graphType: "line" };

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

const PERIOD_TYPE_NORMAL = 0;
const PERIOD_TYPE_NIGHT = 1;
const PERIOD_TYPE_CHARGING = 2;

//very almost the same as table columns
const GRAPH_DATA_OPTIONS = [STR_PERIOD_IMPORT_KWH, STR_CUMULATIVE_IMPORT_KWH, STR_AVERAGE_IMPORT_KW, STR_PERIOD_EXPORT_KWH, STR_CUMULATIVE_EXPORT_KWH, STR_AVERAGE_EXPORT_KW, STR_PERIOD_IMPORT_COST, STR_CUMULATIVE_IMPORT_COST, STR_PERIOD_EXPORT_EARN, STR_CUMULATIVE_EXPORT_EARN, STR_CUMULATIVE_NET_EARN, STR_BATTERY_CHARGE, STR_LINE_VOLTAGE];

let showGraph = false; //toggle between showing the graph or table
let forceHideGraph = false; //force the graph to be hidden when a file is not found and a message wants to be displayed
let rememberedScrollHeight = null;

let graph;


window.addEventListener("load", async () => {
    createGraphDataOptions();
    loadLocalStorage();

    graph = new Graph(inpEnableGraphValueOnHover.checked, dvGraph);
    inpGraphData.value = STR_PERIOD_IMPORT_KWH;
    graph.setYAxisRange(DATA_TYPE_PROPERTIES[inpGraphData.value].yMin, DATA_TYPE_PROPERTIES[inpGraphData.value].yMax);
    graph.setYDecimalPlaces(DATA_TYPE_PROPERTIES[inpGraphData.value].decimalPlaces);

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

function createGraphDataOptions()
{
    for (let optionText of GRAPH_DATA_OPTIONS)
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

    if (createDataFromCSV(text) == false) return;

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

async function createDataFromCSV(fileText)
{
    let lines = fileText.split("\n");
    if (lines.length == 0) return false;

    let headerLine = lines[0]; //first line in csv contains column titles
    let valueLines = lines.slice(1); //remaining lines contain values
    
    //clear table data and recreate columns
    tableColumns = {};
    let headers = headerLine.split(",");

    //create temporary columns before sorting
    for (let header of headers)
    {
        tableColumns[header] = null;
    }

    tableColumns[STR_PERIOD_IMPORT_COST] = null;
    tableColumns[STR_CUMULATIVE_IMPORT_COST] = null;
    tableColumns[STR_PERIOD_EXPORT_EARN] = null;
    tableColumns[STR_CUMULATIVE_EXPORT_EARN] = null;
    tableColumns[STR_CUMULATIVE_NET_EARN] = null;
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
        tableColumns[STR_PERIOD_IMPORT_COST].push(0);
        tableColumns[STR_CUMULATIVE_IMPORT_COST].push(0);
        tableColumns[STR_PERIOD_EXPORT_EARN].push(0);
        tableColumns[STR_CUMULATIVE_EXPORT_EARN].push(0);
        tableColumns[STR_CUMULATIVE_NET_EARN].push(0);
        tableColumns[STR_PERIOD_TYPE].push(PERIOD_TYPE_NORMAL);
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

        let periodImportCost = tableColumns[STR_PERIOD_IMPORT_KWH][i] * importCost;
        cumulativeImportCost += periodImportCost;
        
        let periodExportEarn = tableColumns[STR_PERIOD_EXPORT_KWH][i] * pencePerKWHExport;
        cumulativeExportEarn += periodExportEarn;

        let cumulativeNetEarn = cumulativeExportEarn - cumulativeImportCost;

        tableColumns[STR_PERIOD_IMPORT_COST][i] = periodImportCost;
        tableColumns[STR_CUMULATIVE_IMPORT_COST][i] = cumulativeImportCost / 100; //convert p to £

        tableColumns[STR_PERIOD_EXPORT_EARN][i] = periodExportEarn;
        tableColumns[STR_CUMULATIVE_EXPORT_EARN][i] = cumulativeExportEarn / 100;

        tableColumns[STR_CUMULATIVE_NET_EARN][i] = cumulativeNetEarn / 100;
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

    //jump through hoops to have a sticky header with horizontal overflow
    let dvTableHead = document.createElement("div")
    let dvTableContent = document.createElement("div")

    dvTableHead.id = "dvTableHead";
    dvTableContent.id = "dvTableContent";
    dvTableContent.classList.add("scrollShadowVertical");

    let tableHead = document.createElement("table");
    let tableContent = document.createElement("table");
    let headerRow = document.createElement("thead");

    dvColumnVisibilityInputs.replaceChildren();

    let columnVisibility = getLocalStorage("columnVisibility");
    if (columnVisibility == null) columnVisibility = {};
    let columnIndex = 1;
    for (let header in tableColumns)
    {
        if (!(header in columnVisibility))
        {
            columnVisibility[header] = true;
        }

        if (header == STR_TIME_PERIOD) columnVisibility[header] = true;
        if (header == STR_PERIOD_TYPE) columnVisibility[header] = false;

        let hiddenClassName = "colHidden" + columnIndex.toString();
        let fullyHiddenClassName = "colHiddenFully" + columnIndex.toString();
        if (columnVisibility[header] == false)
        {
            tableHead.classList.add(fullyHiddenClassName);
            tableContent.classList.add(fullyHiddenClassName);
        }

        if (header != STR_TIME_PERIOD && header != STR_PERIOD_TYPE)
        {
            let inpSetVisible = document.createElement("input");
            inpSetVisible.id = "inpSetVisible" + header;
            inpSetVisible.type = "checkbox";
            inpSetVisible.checked = columnVisibility[header];

            inpSetVisible.addEventListener("change", () => {
                let columnVisibility = getLocalStorage("columnVisibility");
                if (inpSetVisible.checked == false)
                {
                    columnVisibility[header] = false;
                    tableHead.classList.add(hiddenClassName);
                    tableContent.classList.add(hiddenClassName);

                    columnHideTimeout = setTimeout(() => {
                        tableHead.classList.add(fullyHiddenClassName);
                        tableContent.classList.add(fullyHiddenClassName);
                    }, 300);
                }
                else
                {
                    clearTimeout(columnHideTimeout);

                    columnVisibility[header] = true;
                    tableHead.classList.remove(fullyHiddenClassName);
                    tableContent.classList.remove(fullyHiddenClassName);

                    setTimeout(() => {
                        tableHead.classList.remove(hiddenClassName);
                        tableContent.classList.remove(hiddenClassName);
                    }, 10);
                }

                setLocalStorage("columnVisibility", columnVisibility);
            });

            let lbSetVisible = document.createElement("label");
            lbSetVisible.htmlFor = inpSetVisible.id;
            lbSetVisible.innerHTML = header;

            dvColumnVisibilityInputs.append(lbSetVisible);
            dvColumnVisibilityInputs.appendChild(inpSetVisible);
        }
        

        columnIndex++;
    }

    setLocalStorage("columnVisibility", columnVisibility);

    for (let headerName in tableColumns)
    {
        let th = document.createElement("th");
        th.innerHTML = headerName;
        headerRow.appendChild(th);
    }

    tableHead.appendChild(headerRow);
    dvTableHead.appendChild(tableHead);

    let tdMinImport, tdMaxImport, tdMinExport, tdMaxExport, tdMinVoltage, tdMaxVoltage;
    let minImport = Infinity; let minExport = Infinity; let minVoltage = Infinity;
    let maxImport = -Infinity; let maxExport = -Infinity; let maxVoltage = -Infinity;

    //values want to be displayed in reverse order, so iterate from end to start
    for (let i = tableColumns[STR_TIME_PERIOD].length - 1; i >= 0; i--)
    {
        let tr = document.createElement("tr");
        if (inpEnableChargeTimes.checked && tableColumns[STR_PERIOD_TYPE][i] == PERIOD_TYPE_CHARGING)
        {
            tr.classList.add("tdCharging");
        }
        else if (inpEnableNightRate.checked && tableColumns[STR_PERIOD_TYPE][i] == PERIOD_TYPE_NIGHT)
        {
            tr.classList.add("tdNight");
        }

        //for each column in row i, create the table elements
        for (let headerName in tableColumns)
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

            if (headerName == STR_PERIOD_IMPORT_COST)
            {
                if (inpEnableChargeTimes.checked && tableColumns[STR_PERIOD_TYPE][i] == PERIOD_TYPE_CHARGING)
                {
                    td.classList.add("tdCharging");
                }
                else if (inpEnableNightRate.checked && tableColumns[STR_PERIOD_TYPE][i] == PERIOD_TYPE_NIGHT)
                {
                    td.classList.add("tdNight");
                }
            }

            tr.appendChild(td);

            if (headerName == STR_PERIOD_IMPORT_KWH)
            {
                if (val < minImport) { minImport = val; tdMinImport = td; }
                if (val > maxImport) { maxImport = val; tdMaxImport = td; }
            }

            if (headerName == STR_PERIOD_EXPORT_KWH)
            {
                if (val < minExport) { minExport = val; tdMinExport = td; }
                if (val > maxExport) { maxExport = val; tdMaxExport = td; }
            }

            if (headerName == STR_LINE_VOLTAGE)
            {
                if (val < minVoltage) { minVoltage = val; tdMinVoltage = td; }
                if (val > maxVoltage) { maxVoltage = val; tdMaxVoltage = td; }
            }
        }

        tableContent.appendChild(tr);
    }

    if (tdMinImport != undefined) tdMinImport.classList.add("tdMin"); 
    if (tdMaxImport != undefined) tdMaxImport.classList.add("tdMax"); 
    if (tdMinExport != undefined) tdMinExport.classList.add("tdMin"); 
    if (tdMaxExport != undefined) tdMaxExport.classList.add("tdMax"); 
    if (tdMinVoltage != undefined) tdMinVoltage.classList.add("tdMin"); 
    if (tdMaxVoltage != undefined) tdMaxVoltage.classList.add("tdMax");

    dvTableContent.appendChild(tableContent);

    dvTable.appendChild(dvTableHead);
    dvTable.appendChild(dvTableContent);

    forceHideGraph = false;
    updateGraphVisibility();
}

function updateGraph()
{
    if (DATA_TYPE_PROPERTIES[inpGraphData.value].graphType == "bar")
    {
        graph.setBarData(tableColumns[STR_TIME_PERIOD], tableColumns[inpGraphData.value], tableColumns[STR_PERIOD_TYPE], 10, DATA_TYPE_PROPERTIES[inpGraphData.value].unit);
    }
    else
    {
        graph.setLineData(tableColumns[STR_TIME_PERIOD], tableColumns[inpGraphData.value], tableColumns[STR_PERIOD_TYPE], 10, DATA_TYPE_PROPERTIES[inpGraphData.value].unit);
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
    dvTable.style.display = visible ? "none" : "flex";
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
