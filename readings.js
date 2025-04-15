
let dvFiles = document.getElementById("dvFiles");
let dvCSV = document.getElementById("dvCSV");
let aSaveFile = document.getElementById("aSaveFile");
let inpUnitCostDay = document.getElementById("inpUnitCostDay");
let inpUnitCostNight = document.getElementById("inpUnitCostNight");
let inpStandingCharge = document.getElementById("inpStandingCharge");
let inpEnableNightRate = document.getElementById("inpEnableNightRate");

let currentJSONRows = [];

const PERIOD_COST_TITLE = "period cost pence";
const PROJECTED_COST_TITLE = "1h projected cost £";
const CUMULATIVE_COST_TITLE = "cumulative cost £";

let reloadFileTimeout;

window.addEventListener("load", async () => {
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

    let enableNightRate = getLocalStorage("enableNightRate");
    if (enableNightRate == false)
    {
        inpEnableNightRate.checked = false;
    }

    //get a list of existing log files
    let response = await fetch("./logs.txt", {cache: "no-store"});
    if (!response.ok)
    {
        console.log(response);
        alert("failed to find available logs");
        return;
    }

    let text = await response.text();
    text = text.trim();

    //if no log files available, show message in place of table
    if (text.length == 0)
    {
        let p = document.createElement("p");
        p.innerHTML = "No log files available";
        dvCSV.appendChild(p);
        return;
    }

    //create log file list at side of page
    let lines = text.split("\n");
    for (let i = 0; i < lines.length; i++)
    {
        let line = lines[i];
        if (line == "") continue; //in case stray blank line left in list of log files

        let p = document.createElement("p");
        p.innerHTML = line;
        p.addEventListener("click", async () => {
            clearTimeout(reloadFileTimeout);
            if (i != 0)
            {
                await readCSVtoJSON(line);
                updateJSONCosts();
                displayJSON();
                updateDownloadLink(line);
                highlightSelectedFile(p);
            }
            else
            {
                reloadMostRecentFile();
            }
        });

        dvFiles.appendChild(p);
    }

    //automatically show the most recent file
    await reloadMostRecentFile();
});

inpUnitCostDay.addEventListener("change", () => {
    if (inpUnitCostDay.value == "") inpUnitCostDay.value = 0;
    updateJSONCosts();
    displayJSON();
    setLocalStorage("pencePerKWHDay", inpUnitCostDay.value);
});


inpUnitCostNight.addEventListener("change", () => {
    if (inpUnitCostNight.value == "") inpUnitCostNight.value = 0;
    updateJSONCosts();
    displayJSON();
    setLocalStorage("pencePerKWHDay", inpUnitCostDayNight.value);
});

inpStandingCharge.addEventListener("change", () => {
    if (inpStandingCharge.value == "") inpStandingCharge.value = 0;
    updateJSONCosts();
    displayJSON();
    setLocalStorage("penceStandingCharge", inpStandingCharge.value);
});

inpEnableNightRate.addEventListener("change", () => {
    updateJSONCosts();
    displayJSON();
    setLocalStorage("enableNightRate", inpEnableNightRate.checked);
});

async function reloadMostRecentFile()
{
    let recent = dvFiles.children[0];
    await readCSVtoJSON(recent.innerHTML);
    updateJSONCosts();
    displayJSON();
    updateDownloadLink(recent.innerHTML);
    highlightSelectedFile(recent);

    //set file to be automatically reloaded each minute
    let d = new Date();
    let timeUntilNextMinute = (60 - d.getSeconds() + 5) * 1000; //wait until 5 seconds past the minute to give time for file to be updated and saved
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
        let timeParts = startTime.split(":");
        let hour = parseInt(timeParts[0]);
        let minute = parseInt(timeParts[1]);
        let cost;

        if (inpEnableNightRate.checked && (
           hour < 5 ||
           (hour == 5 && minute < 30) ||
           (hour == 23 && minute >= 30)
        ))
        {
            cost = pencePerKWHNight;
            row["night"] = true;
        }
        else
        {
            row["night"] = false;
            cost = pencePerKWHDay;
        }

        let periodCost = row["period usage kWh"] * cost;
        cumulativeCost += periodCost;
        row[PERIOD_COST_TITLE] = periodCost;
        row[PROJECTED_COST_TITLE] = row["1h projected kWh"] * cost / 100; //projected and cumulative cost wishes to be in £
        row[CUMULATIVE_COST_TITLE] = (cumulativeCost + standingCharge) / 100;
    }
}

function displayJSON()
{
    //clear existing table data if there were any
    dvCSV.replaceChildren();

    let table = document.createElement("table");
    let titleRow = document.createElement("thead");
    let titles = currentJSONRows[0];

    let columnOrder = ["time period", "count", "period usage kWh", PERIOD_COST_TITLE, "1h projected kWh", PROJECTED_COST_TITLE, "cumulative kWh", CUMULATIVE_COST_TITLE];

    for (let key of columnOrder)
    {
        let title = titles[key];
        let th = document.createElement("th");
        th.innerHTML = title;
        th.classList.add("sticky");
        titleRow.appendChild(th);
    }

    table.appendChild(titleRow);

    let trMin, trMax;
    let countMin = Infinity;
    let countMax = 0;
    let columns2dp = [PERIOD_COST_TITLE, "1h projected kWh", PROJECTED_COST_TITLE, "cumulative kWh", CUMULATIVE_COST_TITLE];

    //values want to be displayed in reverse order, so iterate from end to start
    for (let i = currentJSONRows.length - 1; i > 0; i--)
    {
        let JSONrow = currentJSONRows[i];
        let tr = document.createElement("tr");
        if (inpEnableNightRate.checked && JSONrow["night"]) tr.classList.add("trNight");

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

function highlightSelectedFile(element)
{
    //set the currently displayed file's element in the log list to be shown in bold
    for (let el of dvFiles.children)
    {
        el.classList.remove("selectedcsv");
    }
    element.classList.add("selectedcsv");
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
