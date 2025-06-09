
let resizeTimeout;

class Graph
{
    constructor(container)
    {
        this.DEFAULT_VIEW_WIDTH = 1440; //for each minute in the day to be 1 pixel wide
        this.AXIS_FONT_SIZE = "8mm";

        this.yDecimalPlaces = 3;

        this.container = container
        this.plot = document.createElement("canvas");
        this.xAxis = document.createElement("canvas");
        this.yAxis = document.createElement("canvas");

        this.container.appendChild(this.plot);
        this.container.appendChild(this.xAxis);
        this.container.appendChild(this.yAxis);

        this.plot.id = "cnvPlot";
        this.xAxis.id = "cnvXAxis";
        this.yAxis.id = "cnvYAxis";

        this.container.style.display = "grid";
        this.initCtx();
        wgl_init(this.plot);
        this.container.style.display = "none";

        let colours = [
            0.2, 0.7, 0.9, 1.0, //normal
            0.5647, 0.9333, 0.5647, 1.0, //charging
            0.125, 0.125, 0.5, 1.0 //night
        ];
        wgl_setColours(new Float32Array(colours));


        this.container.addEventListener("mousedown", (e) => this.mouseDown(e));
        window.addEventListener("mouseup", (e) => this.mouseUp(e)); //events on window so can still drag when cursor leaves graph area
        window.addEventListener("mousemove", (e) => this.mouseMoved(e));
        this.plot.addEventListener("wheel", (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.mouseTarget = this.plot;
            this.scrolled(e);
        });

        this.xAxis.addEventListener("wheel", (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.mouseTarget = this.xAxis;
            this.scrolled(e);
        });

        this.yAxis.addEventListener("wheel", (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.mouseTarget = this.yAxis;
            this.scrolled(e);
        });

        window.addEventListener("resize", () => {
            window.clearTimeout(resizeTimeout);
            resizeTimeout = window.setTimeout(() => {
                this.container.style.display = "grid";
                this.initCtx();
                wgl_onResize();
                this.container.style.display = showGraph ? "grid" : "none";
                this.update();
            }, 200);
        });


        this.viewWindow = { x1: 0, y1: 0, x2: this.DEFAULT_VIEW_WIDTH, y2: this.yMax };
        
        this.zoomX = 1;
        this.zoomY = 1;
        this.maxZoom = 48;
        wgl_setViewWindow(this.viewWindow);

        this.mouseHeld = false;
        this.mouseTarget = null;
        this.prevMousePos = { x: 0, y: 0 };
    }

    initCtx()
    {
        const yResolution = 1000;

        let br = this.plot.getBoundingClientRect();
        let ar = br.width / br.height;
        this.plot.width = ar * yResolution;
        this.plot.height = yResolution;

        br = this.xAxis.getBoundingClientRect();
        ar = br.height / br.width;
        this.xAxis.width = this.plot.width;
        this.xAxis.height = ar * this.xAxis.width;

        br = this.yAxis.getBoundingClientRect();
        ar = br.width / br.height;
        this.yAxis.height = this.plot.height;
        this.yAxis.width = ar * this.plot.height;

        this.xAxisCtx = this.xAxis.getContext("2d");
        this.yAxisCtx = this.yAxis.getContext("2d");

        this.xAxisCtx.textAlign = "center";
        this.xAxisCtx.textBaseline = "top";
        this.xAxisCtx.font = this.AXIS_FONT_SIZE + " sans-serif";

        this.yAxisCtx.textAlign = "right";
        this.yAxisCtx.textBaseline = "middle";
        this.yAxisCtx.font = this.AXIS_FONT_SIZE + " sans-serif";
    }

    setBarData(yValues, periodTypes)
    {
        wgl_setBarData(yValues, periodTypes);
    }

    setLineData(yValues, periodTypes)
    {
        wgl_setLineData(yValues, periodTypes);
    }

    setYAxisRange(yMax)
    {
        this.yMax = yMax;
        this.viewWindow.y1 = 0;
        this.viewWindow.y2 = yMax;
        this.zoomY = 1;
    }

    setYDecimalPlaces(n)
    {
        this.yDecimalPlaces = n;
    }

    changeZoom(amount)
    {
        let mouseBefore = this.screenToGraphPos(this.prevMousePos);

        if (this.mouseTarget == this.plot || this.mouseTarget == this.xAxis)
        {
            this.zoomX *= Math.pow(1.25, amount);
            this.zoomX = Math.max(Math.min(this.zoomX, this.maxZoom), 1);
            this.viewWindow.x2 = this.viewWindow.x1 + this.DEFAULT_VIEW_WIDTH / this.zoomX;
        }
        
        if (this.mouseTarget == this.plot || this.mouseTarget == this.yAxis)
        {
            this.zoomY *= Math.pow(1.25, amount);
            this.zoomY = Math.max(Math.min(this.zoomY, this.maxZoom), 1);
            this.viewWindow.y2 = this.viewWindow.y1 + this.yMax / this.zoomY;
        }

        let mouseAfter = this.screenToGraphPos(this.prevMousePos);
        let delta = { x: mouseAfter.x - mouseBefore.x, y: mouseAfter.y - mouseBefore.y};

        this.panView(delta);
        this.restrictView();
    }

    panView(delta)
    {
        this.viewWindow.x1 -= delta.x;
        this.viewWindow.y1 -= delta.y;
        this.viewWindow.x2 -= delta.x;
        this.viewWindow.y2 -= delta.y;
    }

    restrictView()
    {
        let delta = { x: 0, y: 0 };
        if (this.viewWindow.x1 < 0) delta.x = this.viewWindow.x1;
        if (this.viewWindow.y1 < 0) delta.y = this.viewWindow.y1;
        if (this.viewWindow.x2 > this.DEFAULT_VIEW_WIDTH) delta.x = this.viewWindow.x2 - this.DEFAULT_VIEW_WIDTH;
        if (this.viewWindow.y2 > this.yMax) delta.y = this.viewWindow.y2 - this.yMax;

        this.panView(delta);
    }

    resetPos()
    {
        this.zoomX = 1;
        this.zoomY = 1;
        this.viewWindow = { x1: 0, y1: 0, x2: this.DEFAULT_VIEW_WIDTH, y2: this.yMax };
    }

    screenToGraphPos(p)
    {
        let bounds = this.plot.getBoundingClientRect();

        //screen pos relative to canvas's top left corner on screen
        let canvasZeroed = { x: p.x - bounds.x, y: p.y - bounds.y };

        //canvas pixels per viewport pixel
        let cpvx = this.plot.width / bounds.width;
        let cpvy = this.plot.height / bounds.height;
        let c = { x: canvasZeroed.x * cpvx, y: canvasZeroed.y * cpvy }; //canvas position

        //return position in graph space relative to graph's origin
        return this.canvasToGraphPos(c)
    }

    canvasToGraphPos(c)
    {
        //graph units per canvas pixel
        let gpcx = (this.viewWindow.x2 - this.viewWindow.x1) / this.plot.width;
        let gpcy = (this.viewWindow.y2 - this.viewWindow.y1) / this.plot.height;

        //position in graph space relative to view window position. y gets flipped here as graph has positive y upwards
        let g = { x: c.x * gpcx, y: (this.plot.height - c.y) * gpcy };

        //position in graph space relative to graph origin
        return { x: g.x + this.viewWindow.x1, y: g.y + this.viewWindow.y1 };
    }

    graphToScreenPos(p)
    {
        //reverse of screen to graph
    
        //position in canvas pixels relative to canvas top left
        let c = this.graphToCanvasPos(p);
        
        let bounds = this.plot.getBoundingClientRect();
        let cpvx = this.plot.width / bounds.width;
        let cpvy = this.plot.height / bounds.height;

        //position in viewport space relative to canvas top left
        let canvasZeroed = { x: c.x / cpvx, y: c.y / cpvy };

        //return position in viewport space relative to viewport top left
        return { x: canvasZeroed.x + bounds.x, y: canvasZeroed.y + bounds.y };
    }

    graphToCanvasPos(p)
    {
        //p is position in graph space relative to graph origin
        
        //g is graph space position relative to view window bottom left corner
        let g = { x: p.x - this.viewWindow.x1, y: p.y - this.viewWindow.y1 };
        
        let gpcx = (this.viewWindow.x2 - this.viewWindow.x1) / this.plot.width;
        let gpcy = (this.viewWindow.y2 - this.viewWindow.y1) / this.plot.height;

        //return position in canvas pixels relative to canvas top left
        return { x: g.x / gpcx, y: this.plot.height - (g.y / gpcy) };
    }

    mouseDown(event)
    {
        this.mouseHeld = true;
        this.prevMousePos = { x: event.x, y: event.y };
    }

    mouseUp(event)
    {
        this.mouseHeld = false;
        this.mouseTarget = null;
    }

    mouseMoved(event)
    {
        var currentMouse = { x: event.x, y: event.y };

        if (this.mouseHeld)
        {
            let currentMouseWorld = this.screenToGraphPos(currentMouse);
            let prevMouseWorld = this.screenToGraphPos(this.prevMousePos);

            let delta = { x: currentMouseWorld.x - prevMouseWorld.x, y: currentMouseWorld.y - prevMouseWorld.y };
            this.panView(delta);
            this.restrictView();
            this.update();
        }

        this.prevMousePos = currentMouse;
    }

    scrolled(event)
    {
        this.prevMousePos = { x: event.x, y: event.y };

        const sens = 0.05;

        //smooth scroll wheels and touchpad gestures want to do lots of little scrolls by a little amount.
        //chunky scroll wheels want to scroll in fewer bigger amounts.
        //sens was tuned to feel good on my laptop touchpad, but on chunky scroll wheels it jumps immediately to fully
        //zoomed in or out.
        //so cap the max zoom amount so that it takes at least a few scroll clicks to reach max zoom no matter the
        //scroll method.
        const zoomMag = Math.min(Math.abs(event.deltaY * sens), 1);
        
        //deltaY is positive for scroll down, which should zoom out. zooming out is considered a negative direction by zoom code.
        const zoomDir = -Math.sign(event.deltaY);

        this.changeZoom(zoomMag * zoomDir);
        this.update()

        if (!this.mouseHeld) this.mouseTarget = null;
    }

    getTickIntervalX(viewWidth)
    {
        //viewWidth is number of minutes visible
        //returned interval is how many minutes between each tick mark

        if (viewWidth < 120) return 5;
        if (viewWidth < 6 * 60) return 15;
        if (viewWidth < 12 * 60) return 30;
        return 60;
    }

    getTickIntervalY(viewHeight)
    {
        let viewProportion = viewHeight / this.yMax;

        if (viewProportion < 0.1) return this.yMax * 0.005;
        if (viewProportion < 0.5) return this.yMax * 0.025;
        return this.yMax * 0.05;
    }

    drawTickMarks()
    {
        //x axis tick marks
        this.xAxisCtx.clearRect(0, 0, this.xAxis.width, this.xAxis.height);
        this.xAxisCtx.beginPath();
            let interval = this.getTickIntervalX(this.viewWindow.x2 - this.viewWindow.x1);
            let x1 = Math.max(Math.floor(this.viewWindow.x1 / interval), 1) * interval; //a bit cheaty but didnt want to deal with making the canvas wider to fit edge timestamps
            for (let xGraph = x1; xGraph < this.viewWindow.x2 - 0.1; xGraph += interval)
            {
                let xCanvas = this.graphToCanvasPos({ x: xGraph, y: 0 }).x;
                this.xAxisCtx.moveTo(xCanvas, 0);
                this.xAxisCtx.lineTo(xCanvas, 10);

                let hour = Math.floor(xGraph / 60) % 24;
                hour = hour.toString().padStart(2, "0");

                let minute = xGraph % 60;
                minute = minute.toString().padStart(2, "0");

                let maxWidth = this.graphToCanvasPos({x: interval, y: 0}).x - this.graphToCanvasPos({x: 0, y: 0}).x - 5;

                this.xAxisCtx.fillText(hour + ":" + minute, xCanvas, 15, maxWidth);
            }
        this.xAxisCtx.stroke();


        //y axis tick marks
        this.yAxisCtx.clearRect(0, 0, this.yAxis.width, this.yAxis.height);
        this.yAxisCtx.beginPath();
            interval = this.getTickIntervalY(this.viewWindow.y2 - this.viewWindow.y1);
            let y1 = Math.max(Math.floor(this.viewWindow.y1 / interval), 1) * interval;
            for (let yGraph = y1; yGraph < this.viewWindow.y2; yGraph += interval)
            {
                let yCanvas = this.graphToCanvasPos({ x: 0, y: yGraph }).y;
                this.yAxisCtx.moveTo(this.yAxis.width, yCanvas);
                this.yAxisCtx.lineTo(this.yAxis.width - 10, yCanvas);

                this.yAxisCtx.fillText(yGraph.toFixed(this.yDecimalPlaces), this.yAxis.width - 15, yCanvas);
            }
        this.yAxisCtx.stroke();
    }

    update()
    {
        wgl_setViewWindow(this.viewWindow);
        wgl_clear();
        wgl_draw();
        this.drawTickMarks();
    }

    clear()
    {
        wgl_clear();
    }
}