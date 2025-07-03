
const vsBar = `#version 300 es

in vec2 vs_pos;
in uint vs_periodType;

flat out uint fs_periodType;

uniform vec4 viewWindow;

void main()
{    
    vec2 p_transformed = vec2((vs_pos.x - viewWindow.x) / (viewWindow.z - viewWindow.x), (vs_pos.y - viewWindow.y) / (viewWindow.w - viewWindow.y)) * 2.0f - vec2(1.0f);
    gl_Position = vec4(p_transformed, 0, 1);

    fs_periodType = vs_periodType;
}
`;

const vsLine = `#version 300 es

in vec2 vs_pos;
in uint vs_periodType;
in vec2 vs_normal;
in float vs_offsetDir;

flat out uint fs_periodType;

uniform vec4 viewWindow;
uniform float thickness;
uniform vec2 resolution;

void main()
{
    vec2 p_transformed = vec2((vs_pos.x - viewWindow.x) / (viewWindow.z - viewWindow.x), (vs_pos.y - viewWindow.y) / (viewWindow.w - viewWindow.y)) * 2.0f - vec2(1.0f);

    //normal is in world space, need to convert to screen space
    vec2 normalTransformed = normalize(vec2(vs_normal.x * (viewWindow.z - viewWindow.x), vs_normal.y * (viewWindow.w - viewWindow.y)));

    //thickness is in pixels, want to convert to normalised units, so divide by resolution and multiply by 2.
    //only half thickness wants to be applied in each direction, so cancels with multiply by 2.
    p_transformed += thickness * vs_offsetDir * normalTransformed / resolution;
    gl_Position = vec4(p_transformed, 0, 1);

    fs_periodType = vs_periodType;
}
`;

const fragmentShaderSource = `#version 300 es

precision highp float;

flat in uint fs_periodType;

out vec4 out_colour;

uniform vec4 periodColours[3];

void main()
{
    out_colour = periodColours[fs_periodType];
}
`;


let gl;
let prg_bars, prg_lines;
let vao_graph, vbo_dataVerts, vbo_periodTypes, vbo_lineNormals, vbo_lineOffsetDirs;
let numDataVerts;
let timePeriodToXValue = {};
let drawMode;
const DRAWMODE_BAR = 0;
const DRAWMODE_LINE = 1;


function wgl_createShader(type, source)
{
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success)
    {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return undefined;
}

function wgl_createProgram(vertexShader, fragmentShader)
{
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success)
    {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return undefined;
}

function wgl_setBarData(timePeriods, yValues, periodTypes)
{
    //yValues is an array of y values, which whill be drawn as bars with width of 1 unit
    //the whole graph will have width of 1440 units (one for each minute in the day)
    //need to convert from y values to verts for bars

    let numBars = yValues.length; //1 bar per y values
    numDataVerts = 6 * numBars; //6 verts per bar
    let vertPositions = new Float32Array(numDataVerts * 2); //2 values (x,y) per vert
    let vertTypes = new Uint32Array(numDataVerts);
    for (let i = 0; i < numBars; i++)
    {
        const parts = timePeriods[i].split(":");
        const time = parts[0] + parts[1];
        const x = timePeriodToXValue[time];

        //bottom left
        vertPositions[i * 12] = x;
        vertPositions[i * 12 + 1] = 0;

        //top left
        vertPositions[i * 12 + 2] = x;
        vertPositions[i * 12 + 3] = yValues[i];

        //top right
        vertPositions[i * 12 + 4] = x + 1;
        vertPositions[i * 12 + 5] = yValues[i];

        //top right
        vertPositions[i * 12 + 6] = x + 1;
        vertPositions[i * 12 + 7] = yValues[i];

        //bottom right
        vertPositions[i * 12 + 8] = x + 1;
        vertPositions[i * 12 + 9] = 0;

        //bottom left
        vertPositions[i * 12 + 10] = x;
        vertPositions[i * 12 + 11] = 0;

        vertTypes[i * 6] = periodTypes[i];
        vertTypes[i * 6 + 1] = periodTypes[i];
        vertTypes[i * 6 + 2] = periodTypes[i];
        vertTypes[i * 6 + 3] = periodTypes[i];
        vertTypes[i * 6 + 4] = periodTypes[i];
        vertTypes[i * 6 + 5] = periodTypes[i];
    }

    gl.bindVertexArray(vao_graph);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_dataVerts);
    gl.bufferData(gl.ARRAY_BUFFER, vertPositions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_periodTypes);
    gl.bufferData(gl.ARRAY_BUFFER, vertTypes, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    gl.useProgram(null);

    drawMode = DRAWMODE_BAR;
}

function wgl_setLineData(timePeriods, yValues, periodTypes)
{
    //cannot set line thickness, so have to manually create quads for each line segment
    let numLines = yValues.length; //1 line for each y value to the next, with additional start point at 0,0
    numDataVerts = 6 * numLines; //4 verts per line segment

    let vertPositions = new Float32Array(numDataVerts * 2); //2 values (x,y) per vert
    let vertTypes = new Uint32Array(numDataVerts);
    let vertNormals = new Float32Array(numDataVerts * 2);
    let vertOffsetDirs = new Float32Array(numDataVerts);

    let createLineSegment = (lineIndex, periodType, x1, y1, x2, y2) => {
        let lineDir = { x: x2 - x1, y: y2 - y1 };
        let lineMag = Math.sqrt(lineDir.x * lineDir.x + lineDir.y * lineDir.y);
        lineDir.x /= lineMag;
        lineDir.y /= lineMag;
        let lineNormal = { x: -lineDir.y, y: lineDir.x };

        //top and bottom share same position, will be offset by normal in vertex shader
        //bottom left
        vertPositions[lineIndex * 12] = x1;
        vertPositions[lineIndex * 12 + 1] = y1;
        vertNormals[lineIndex * 12] = lineNormal.x;
        vertNormals[lineIndex * 12 + 1] = lineNormal.y;
        vertTypes[lineIndex * 6] = periodType;
        vertOffsetDirs[lineIndex * 6] = -1;

        //top left
        vertPositions[lineIndex * 12 + 2] = x1;
        vertPositions[lineIndex * 12 + 3] = y1;
        vertNormals[lineIndex * 12 + 2] = lineNormal.x;
        vertNormals[lineIndex * 12 + 3] = lineNormal.y;
        vertTypes[lineIndex * 6 + 1] = periodType;
        vertOffsetDirs[lineIndex * 6 + 1] = 1;

        //top right
        vertPositions[lineIndex * 12 + 4] = x2;
        vertPositions[lineIndex * 12 + 5] = y2;
        vertNormals[lineIndex * 12 + 4] = lineNormal.x;
        vertNormals[lineIndex * 12 + 5] = lineNormal.y;
        vertTypes[lineIndex * 6 + 2] = periodType;
        vertOffsetDirs[lineIndex * 6 + 2] = 1;

        //top right
        vertPositions[lineIndex * 12 + 6] = x2;
        vertPositions[lineIndex * 12 + 7] = y2;
        vertNormals[lineIndex * 12 + 6] = lineNormal.x;
        vertNormals[lineIndex * 12 + 7] = lineNormal.y;
        vertTypes[lineIndex * 6 + 3] = periodType;
        vertOffsetDirs[lineIndex * 6 + 3] = 1;

        //bottom right
        vertPositions[lineIndex * 12 + 8] = x2;
        vertPositions[lineIndex * 12 + 9] = y2;
        vertNormals[lineIndex * 12 + 8] = lineNormal.x;
        vertNormals[lineIndex * 12 + 9] = lineNormal.y;
        vertTypes[lineIndex * 6 + 4] = periodType;
        vertOffsetDirs[lineIndex * 6 + 4] = -1;

        //bottom left
        vertPositions[lineIndex * 12 + 10] = x1;
        vertPositions[lineIndex * 12 + 11] = y1;
        vertNormals[lineIndex * 12 + 10] = lineNormal.x;
        vertNormals[lineIndex * 12 + 11] = lineNormal.y;
        vertTypes[lineIndex * 6 + 5] = periodType;
        vertOffsetDirs[lineIndex * 6 + 5] = -1;
    };

    for (let i = 0; i < numLines; i++)
    {
        const parts = timePeriods[i].split(":");
        const time = parts[0] + parts[1];
        const x = timePeriodToXValue[time];

        let y1 = (i == 0) ? 0 : yValues[i - 1];
        let y2 = yValues[i];

        createLineSegment(i, periodTypes[i], x, y1, x + 1, y2);
    }

    gl.bindVertexArray(vao_graph);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_dataVerts);
    gl.bufferData(gl.ARRAY_BUFFER, vertPositions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_periodTypes);
    gl.bufferData(gl.ARRAY_BUFFER, vertTypes, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_lineNormals);
    gl.bufferData(gl.ARRAY_BUFFER, vertNormals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_lineOffsetDirs);
    gl.bufferData(gl.ARRAY_BUFFER, vertOffsetDirs, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    gl.useProgram(null);

    drawMode = DRAWMODE_LINE;
}

function wgl_setViewWindow(w)
{
    gl.useProgram(prg_bars);
    gl.uniform4f(gl.getUniformLocation(prg_bars, "viewWindow"), w.x1, w.y1, w.x2, w.y2);
    gl.useProgram(prg_lines);
    gl.uniform4f(gl.getUniformLocation(prg_lines, "viewWindow"), w.x1, w.y1, w.x2, w.y2);
    gl.useProgram(null);
}

function wgl_setColours(colours)
{
    gl.useProgram(prg_bars);
    gl.uniform4fv(gl.getUniformLocation(prg_bars, "periodColours"), colours);
    gl.useProgram(prg_lines);
    gl.uniform4fv(gl.getUniformLocation(prg_lines, "periodColours"), colours);
    gl.useProgram(null);
}

function wgl_onResize()
{
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(prg_lines);
    gl.uniform2f(gl.getUniformLocation(prg_lines, "resolution"), gl.canvas.width, gl.canvas.height);
    gl.useProgram(null)
}

function wgl_init(canvas)
{
    gl = canvas.getContext("webgl2");
    if (!gl)
    {
        alert("webgl2 not available");
        return false;
    }

    let vertexShader = wgl_createShader(gl.VERTEX_SHADER, vsBar);
    const fragmentShader = wgl_createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    prg_bars = wgl_createProgram(vertexShader, fragmentShader);

    vertexShader = wgl_createShader(gl.VERTEX_SHADER, vsLine);
    prg_lines = wgl_createProgram(vertexShader, fragmentShader);

    vao_graph = gl.createVertexArray();
    gl.bindVertexArray(vao_graph);
    vbo_dataVerts = gl.createBuffer();
    vbo_periodTypes = gl.createBuffer();
    vbo_lineNormals = gl.createBuffer();
    vbo_lineOffsetDirs = gl.createBuffer();
    
    let loc = gl.getAttribLocation(prg_bars, "vs_pos");
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_dataVerts);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    loc = gl.getAttribLocation(prg_bars, "vs_periodType");
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_periodTypes);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribIPointer(loc, 1, gl.UNSIGNED_INT, 0, 0);

    loc = gl.getAttribLocation(prg_lines, "vs_pos");
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_dataVerts);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    loc = gl.getAttribLocation(prg_lines, "vs_periodType");
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_periodTypes);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribIPointer(loc, 1, gl.UNSIGNED_INT, 0, 0);

    loc = gl.getAttribLocation(prg_lines, "vs_normal");
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_lineNormals);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    loc = gl.getAttribLocation(prg_lines, "vs_offsetDir");
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_lineOffsetDirs);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    gl.clearColor(0.95, 0.95, 0.95, 1);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    gl.useProgram(prg_lines);
    gl.uniform1f(gl.getUniformLocation(prg_lines, "thickness"), 5);
    gl.uniform2f(gl.getUniformLocation(prg_lines, "resolution"), gl.canvas.width, gl.canvas.height);
    gl.useProgram(null);

    let x = 0;
    for (let h = 0; h < 24; h++)
    {
        for (let m = 0; m < 60; m++)
        {
            let time = h.toString().padStart(2, "0") + m.toString().padStart(2, "0");
            timePeriodToXValue[time] = x;
            x++;
        }
    }

    return true;
}

function wgl_clear()
{
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function wgl_draw()
{
    switch (drawMode)
    {
    case DRAWMODE_BAR:
        gl.useProgram(prg_bars);
        break;
        
    case DRAWMODE_LINE:
        gl.useProgram(prg_lines);
        break;
    }

    gl.bindVertexArray(vao_graph);
    gl.drawArrays(gl.TRIANGLES, 0, numDataVerts);
    gl.bindVertexArray(null);
    gl.useProgram(null);
}
