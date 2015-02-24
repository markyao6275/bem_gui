line_colors = {
    trac: "#6600CC",
    disp: "#457a91",
    ct: "#459966",
    cd: "#990000"
};

boundary_colors = {
    trac: "#A366E0",
    disp: "#72b7d4",
    ct: "#72de9d",
    cd: "#C26666"
};

// GLOBAL VARIABLES
var canvas;
var curLineDrawer;
var LINE_WIDTH = 2;
var NORM_VEC_MAGNITUDE = 50;
var ARROW_WIDTH = 15;
var ARROW_HEIGHT = 15;
var ZOOM_SCALE = 1.2;
var CURR_ZOOM = 1;
var canvasScale = 1;
var PAN_MODE = false;
var SNAP_DISTANCE = 30;
var ANGLE_SNAP_DISTANCE = 15;
var DRAWING_MODE = false;

function init()
{
    // Setup the fabric.js canvas
    canvas = new fabric.Canvas('c', {
        backgroundColor : "#DCDCDC",
        selection: true,
        isDrawingMode: false
    });
    canvas.isDrawingMode = false;
    canvas.selection = true;

    // Bind the click functions to the buttons
    $('#trac_btn').click(function() {initDraw("trac")});
    $('#disp_btn').click(function() {initDraw("disp")});
    $('#ct_btn').click(function() {initDraw("ct")});
    $('#cd_btn').click(function() {initDraw("cd")});
    $('#comp_btn').click(function() {compute()});
    $('#edit_gp_btn').click(function() {editCurrGroup()});
    $('#img_btn').click(function() {showBackgroundUploader()});
    $('#zoomIn_btn').click(function() {zoom(ZOOM_SCALE)});
    $('#zoomOut_btn').click(function() {zoom(1/ZOOM_SCALE)});
    $('#pan_btn').click(function(){initPan()})
    $('#save_btn').click(function() {saveToCSV()});
    $('#load_btn').click(function() {showCSVUploader()});

    // Set the key bindings
    Mousetrap.bind('shift', function() {straightenLine(true)});
    Mousetrap.bind('shift', function() {straightenLine(false)}, 'keyup');
    Mousetrap.bind('d', function() {initDraw("disp")});
    Mousetrap.bind('t', function() {initDraw("trac")});
    Mousetrap.bind('c', function() {initDraw("ct")});
    Mousetrap.bind('f', function() {initDraw("cd")});
    Mousetrap.bind('p', function() {initPan()});
    Mousetrap.bind('s', function() {saveToCSV()});
    Mousetrap.bind('l', function() {loadCSV()});
    Mousetrap.bind('backspace', function() {deleteSelection()});
    
    // currently not needed since we're not explicitly entering values
    // Mousetrap.bind('enter', function() {initLine();});

}

function initDraw(line_type)
{
    // kill any existing LineDrawer
    if (undefined != curLineDrawer)
    {
        curLineDrawer.kill();
    }

    // Initialize the new line drawer. It won't do anything until the click
    // handlers are initialized when the textbox is filled.
    canvas.forEachObject(function(obj){
        obj.selectable = false;
    });
    curLineDrawer = new LineDrawer(line_type);
    DRAWING_MODE = true;
    initLine()

    // currently not needed since we're not explicitly entering values
    // $('#value_input_wrapper').show();
    // $('#value_input').focus();

}

/*
FOR DRAWING LINES
 */


function initLine()
{
    // currently not needed since we're not explicitly entering values
    
    // if (!$('#value_input_wrapper').is(":visible"))
    // {
    //     return;
    // }
    // $('#value_input_wrapper').hide();

    // Set the line drawer to listen;
    canvas.on('mouse:down', function(o) {curLineDrawer.startLine(o)});
}

function LineDrawer(line_type)
{
    this.lineStarted = false;
    this.drawingBoundary = false;
    this.line_type = line_type;
    this.straightenLine = false;
}

LineDrawer.prototype.startLine = function(o) {
    canvas.off('mouse:down');
    this.lineStarted = true;

    var startSet = false;
    var pointer = canvas.getPointer(o.e);
    var points = [];

    canvas.forEachObject(function(obj){
        if (obj.isType("group") && !startSet){
            var line = obj.item(0);
            var boundary = obj.item(1);

            var groupCenter = obj.getCenterPoint();

            var adjLine = dispCoords(obj, line);
            var adjBoundary = dispCoords(obj,boundary);

            var distFromLineEnd1 = Math.abs(pointer.x - adjLine.x1) + Math.abs(pointer.y - adjLine.y1);
            var distFromLineEnd2 = Math.abs(pointer.x - adjLine.x2) + Math.abs(pointer.y - adjLine.y2);
            
            var distFromBoundaryEnd1 = Math.abs(pointer.x - adjBoundary.x1) + Math.abs(pointer.y - adjBoundary.y1);
            var distFromBoundaryEnd2 = Math.abs(pointer.x - adjBoundary.x2) + Math.abs(pointer.y - adjBoundary.y2);
            
            if (distFromLineEnd1 < SNAP_DISTANCE){
                points = [ adjLine.x1, adjLine.y1, adjLine.x1, adjLine.y1 ];
                startSet = true;
            }
            else if (distFromLineEnd2 < SNAP_DISTANCE) {
                points = [ adjLine.x2, adjLine.y2, adjLine.x2, adjLine.y2 ];
                startSet = true;
            }
            else if (distFromBoundaryEnd1 < SNAP_DISTANCE) {
                points = [ adjBoundary.x1, adjBoundary.y1, adjBoundary.x1, adjBoundary.y1 ];
                startSet = true;
            }
            else if (distFromBoundaryEnd2 < SNAP_DISTANCE) {
                points = [ adjBoundary.x2, adjBoundary.y2, adjBoundary.x2, adjBoundary.y2 ];
                startSet = true;
            }
        }
    });
    
    if (!startSet){
        points = [ pointer.x, pointer.y, pointer.x, pointer.y ];
    }
    
    this.line = new fabric.Line(points, {
        stroke: line_colors[this.line_type],
        strokeWidth: LINE_WIDTH,
        originX: 'center',
        originY: 'center',
        centeredScaling: true,
    });

    canvas.add(this.line);
    me = this;
    
    canvas.on('mouse:move', function(o) {me.updateLine(o)});
    canvas.on('mouse:down', function(o) {me.finishLine(o);});
}

LineDrawer.prototype.updateLine = function(o){
    if (!this.lineStarted) 
    {
        return;
    }
    var pointer = canvas.getPointer(o.e);

    if (this.drawingBoundary) {  
        this.boundary.set({ x2: pointer.x, y2: pointer.y });

        if (this.straightenLine){
            var lineHeight = this.line.y2 - this.line.y1;
            var lineWidth = this.line.x2 - this.line.x1;
            var boundaryHeight = this.boundary.y2 - this.boundary.y1;
            var boundaryWidth = this.boundary.x2 - this.boundary.x1;
            
            // given in radians
            var lineAngle = Math.atan2(lineHeight, lineWidth);
            var boundaryAngle = Math.atan2(boundaryHeight, boundaryWidth);

            var lineLength = Math.pow(Math.pow(lineWidth, 2) + Math.pow(lineHeight, 2), 0.5);
            var boundaryLength = Math.pow(Math.pow(boundaryWidth, 2) + Math.pow(boundaryHeight, 2), 0.5);
            var boundaryProjLength = boundaryLength * Math.cos(boundaryAngle - lineAngle);
            var boundaryPerpProjLength = boundaryLength * Math.sin(boundaryAngle - lineAngle);  

            var xSide = Math.cos(boundaryAngle - lineAngle - 45) > 0 ? 1 : -1;
            var ySide = Math.sin(boundaryAngle - lineAngle - 45) > 0 ? 1 : -1;

            if (xSide * ySide > 0) {
                this.boundary.set({
                    x2: this.boundary.x1 + boundaryPerpProjLength/lineLength * lineHeight * (-1),
                    y2: this.boundary.y1 + boundaryPerpProjLength/lineLength * lineWidth
                });
            }
            else {
                this.boundary.set({
                    x2: this.boundary.x1 + boundaryProjLength/lineLength * lineWidth,
                    y2: this.boundary.y1 + boundaryProjLength/lineLength * lineHeight
                });
            }
        }
    }
    else {
        this.line.set({ x2: pointer.x, y2: pointer.y });

        var endSet = false;
        var currLine = this.line;

        if (this.straightenLine){
            var lineHeight = currLine.y2 - currLine.y1;
            var lineWidth = currLine.x2 - currLine.x1;
            var lineAngle = Math.atan2(lineHeight, lineWidth) * (180/Math.PI);
        
            var lineLength = Math.pow(Math.pow(lineWidth, 2) + Math.pow(lineHeight, 2), 0.5);
            var lineProjXLength = lineLength * Math.cos(Math.PI/180 * lineAngle);
            var lineProjYLength = lineLength * Math.sin(Math.PI/180 * lineAngle);       

            var xSide = Math.cos(Math.PI/180 * lineAngle - 45) > 0 ? 1 : -1;
            var ySide = Math.sin(Math.PI/180 * lineAngle - 45) > 0 ? 1 : -1;
 
            if (xSide * ySide > 0) {
                currLine.set({
                    x2: currLine.x1,
                    y2: currLine.y1 + lineProjYLength,
                });
            }
            else {
                currLine.set({
                    x2: currLine.x1 + lineProjXLength,
                    y2: currLine.y1,
                });
            }


            endSet = true;
        }

        canvas.forEachObject(function(obj){
            if (obj.isType("group") && !endSet){
                var line = obj.item(0);
                var boundary = obj.item(1);

                var groupCenter = obj.getCenterPoint();

                var adjLine = dispCoords(obj, line);
                var adjBoundary = dispCoords(obj,boundary);

                var distFromLineEnd1 = Math.abs(pointer.x - adjLine.x1) + Math.abs(pointer.y - adjLine.y1);
                var distFromLineEnd2 = Math.abs(pointer.x - adjLine.x2) + Math.abs(pointer.y - adjLine.y2);
                
                var distFromBoundaryEnd1 = Math.abs(pointer.x - adjBoundary.x1) + Math.abs(pointer.y - adjBoundary.y1);
                var distFromBoundaryEnd2 = Math.abs(pointer.x - adjBoundary.x2) + Math.abs(pointer.y - adjBoundary.y2);      

                // for point snapping
                if (distFromLineEnd1 < SNAP_DISTANCE){
                    currLine.set({ x2: adjLine.x1, y2: adjLine.y1 });
                    endSet = true;
                }
                else if (distFromLineEnd2 < SNAP_DISTANCE) {
                    currLine.set({ x2: adjLine.x2, y2: adjLine.y2 });
                    endSet = true;
                }
                else if (distFromBoundaryEnd1 < SNAP_DISTANCE) {
                    currLine.set({ x2: adjBoundary.x1, y2: adjBoundary.y1 });
                    endSet = true;
                }
                else if (distFromBoundaryEnd2 < SNAP_DISTANCE) {
                    currLine.set({ x2: adjBoundary.x2, y2: adjBoundary.y2 });
                    endSet = true;
                }
            }
        });

        if (!endSet){
            this.line.set({ x2: pointer.x, y2: pointer.y });
        }
    }
    canvas.renderAll();
}

LineDrawer.prototype.finishLine = function(o) {
    me.kill();

    if (!this.drawingBoundary)
    {   
        this.drawingBoundary = true;
        var midPoint = this.line.getCenterPoint();
        var boundaryPoints = [midPoint.x, midPoint.y, midPoint.x, midPoint.y]
        this.boundary = new fabric.Line(boundaryPoints, {
            stroke: boundary_colors[this.line_type],
            strokeWidth: LINE_WIDTH,
            originX: 'center',
            originY: 'center',
            centeredScaling: true,
            opacity: 0.9
        });
        canvas.add(this.boundary);
        me = this;
        canvas.on('mouse:move', function(o) {me.updateLine(o)});
        canvas.on('mouse:down', function(o) {me.finishLine(o);});
    }
    else
    // the below method of handling line drawing can probably still be improved
    {
        // set the correct modes
        this.lineStarted = false;
        this.drawingBoundary = false;
        DRAWING_MODE = false;

        canvas.remove(this.line)
        canvas.remove(this.boundary);
        
        var lineHeight = this.line.y2 - this.line.y1;
        var lineWidth = this.line.x2 - this.line.x1;
        var boundaryHeight = this.boundary.y2 - this.boundary.y1;
        var boundaryWidth = this.boundary.x2 - this.boundary.x1;
        
        var lineAngle = Math.atan2(lineHeight, lineWidth) * (180/Math.PI);
        var boundaryAngle = Math.atan2(boundaryHeight, boundaryWidth)* (180/Math.PI);

        this.lineArrow = new fabric.Triangle({
            width: ARROW_WIDTH,
            height: ARROW_HEIGHT,
            fill: this.line.stroke,
            angle: 90 + lineAngle,
            left: this.line.x2,
            top: this.line.y2,
            originX: 'center',
            originY: 'center',
            centeredScaling: true
        });

        this.normalVector = new fabric.Triangle({
            width: ARROW_WIDTH,
            height: ARROW_HEIGHT,
            fill: this.line.stroke,
            angle: lineAngle,
            left: this.boundary.x1,
            top: this.boundary.y1,
            originX: 'center',
            originY: 'bottom',
            centeredScaling: true
        });

        this.boundaryArrow = new fabric.Triangle({
            width: ARROW_WIDTH,
            height: ARROW_HEIGHT,
            fill: this.boundary.stroke,
            angle: 90 + boundaryAngle,
            left: this.boundary.x2,
            top: this.boundary.y2,
            originX: 'center',
            originY: 'center',
            centeredScaling: true
        });

        // create a group with the line and the boundary and draw i
        var group = new fabric.Group([this.line, this.boundary, this.lineArrow, this.boundaryArrow, this.normalVector],{
            left: Math.min(this.line.x1,
                        this.lineArrow.getBoundingRect().left,
                        this.boundaryArrow.getBoundingRect().left,
                        this.normalVector.getBoundingRect().left),
            top: Math.min(this.line.y1,
                        this.lineArrow.getBoundingRect().top,
                        this.boundaryArrow.getBoundingRect().top,
                        this.normalVector.getBoundingRect().top),
        });
        group.line_type = this.line_type;

        groupCenter = group.getCenterPoint();

        this.line.set({
            x1: this.line.x1 - groupCenter.x,
            y1: this.line.y1 - groupCenter.y,
            x2: this.line.x2 - groupCenter.x,
            y2: this.line.y2 - groupCenter.y,
        });

        this.boundary.set({
            x1: this.boundary.x1 - groupCenter.x,
            y1: this.boundary.y1 - groupCenter.y,
            x2: this.boundary.x2 - groupCenter.x,
            y2: this.boundary.y2 - groupCenter.y,
        });

        group.setCoords();
        canvas.add(group);

        canvas.forEachObject(function(obj){
            obj.selectable = true;
        });
    }
}

LineDrawer.prototype.kill = function() {
    canvas.off('mouse:down');    
    canvas.off('mouse:move');
    canvas.off('mouse:up');
}


function straightenLine(bool){
    if (DRAWING_MODE)
        curLineDrawer.straightenLine = bool;
}

/*
FOR LOADING BACKGROUND IMAGES
*/

function showBackgroundUploader(){
    // show dialog box that asks for an image upload
    $('#image_uploader_wrapper').show();
}

function loadBackground(event) {
    // hide image upload dialog box
    $('#image_uploader_wrapper').hide();

    var input = event.target;
    var imgReader = new FileReader();

    // run the function when an image is uploaded
    imgReader.onload = function(){
        var uploadedImg = new Image();

        // set this to the uploaded image
        uploadedImg.src = imgReader.result;

        // created new fabric.Image object that is scaled to the canvas properly
        var fabricImg = new fabric.Image(uploadedImg, {
            scaleX: canvas.width/uploadedImg.width,
            scaleY: canvas.height/uploadedImg.height
        });

        // set the canvas's background image
        canvas.setBackgroundImage(fabricImg, canvas.renderAll.bind(canvas));
    };

    imgReader.readAsDataURL(input.files[0]);
}

function zoom(scale){
    
    if (!DRAWING_MODE){
        canvasScale = canvasScale * scale;
        
        CURR_ZOOM = CURR_ZOOM * scale;

        var objects = canvas.getObjects();
        
        for (i = 0; i < objects.length; i++) {
            objects[i].scaleX = objects[i].scaleX * scale;
            objects[i].scaleY = objects[i].scaleY * scale;
            objects[i].left = objects[i].left * scale;
            objects[i].top = objects[i].top * scale;
            
            objects[i].setCoords();
        }
            
        canvas.renderAll();
    }
}

function initPan(){

    if (!DRAWING_MODE){
        
        if (PAN_MODE){
            canvas.off('mouse:down');
            canvas.off('mouse:move');
            canvas.off('mouse:up');
            canvas.selection = true;
            canvas.forEachObject(function(o) {
              o.selectable = true;
            });
            PAN_MODE = false;
        }
        else {
            PAN_MODE = true;
            canvas.selection = false;
            canvas.forEachObject(function(o) {
                o.selectable = false;
            });
            canvas.off('mouse:down');
            canvas.on('mouse:down', function(o) {startPan(o)});
        }
    }
}

function startPan(o){
    canvas.off('mouse:down');
    var startPoint = canvas.getPointer(o.e);
    canvas.on('mouse:move', function(o) {updatePan(o, startPoint)});
    canvas.on('mouse:up', function(o) {endPan(o)});
}

function updatePan(o, startPoint){
    canvas.off('mouse:move');
    var currPoint = canvas.getPointer(o.e);
    var panX = currPoint.x - startPoint.x;
    var panY = currPoint.y - startPoint.y; 

    var objects = canvas.getObjects();
   
    for (i = 0; i < objects.length; i++) {
        objects[i].left = objects[i].left + panX;
        objects[i].top = objects[i].top + panY;

        objects[i].setCoords();
    }
    canvas.renderAll();

    canvas.on('mouse:move', function(o) {updatePan(o, currPoint)});
}

function endPan(o){
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    
    canvas.on('mouse:down', function(o) {startPan(o)});
    canvas.renderAll();
}

/*
FOR EDITING ALREADY CREATED LINES
*/


function dispCoords(obj, points){
    var objCenter = obj.getCenterPoint();

    var adjustedPoints = {
        x1: CURR_ZOOM * points.x1 + objCenter.x,
        y1: CURR_ZOOM * points.y1 + objCenter.y,
        x2: CURR_ZOOM * points.x2 + objCenter.x,
        y2: CURR_ZOOM * points.y2 + objCenter.y,
    };

    return adjustedPoints;
}


/*
FOR SAVING THE LINES & OBJECTS
 */

function saveToCSV() {
    objects = canvas.getObjects();

    // each element of csvContentArray is one line of the CSV
    var csvContentArray = [];
    
    // enter the column headers
    var csvHeaders = ['LineType', 'Line_x1', 'Line_y1', 'Line_x2', 'Line_y2',
                    'Boundary_x1', 'Boundary_y1', 'Boundary_x2', 'Boundary_y2'];
    csvContentArray.push(csvHeaders);

    // for each objects
    // this assumes the only objects on the canvas are lines
    objects.forEach(function(obj){

        // turn them into JSON for easy access
        info = obj.toJSON().objects;

        var groupCenter = obj.getCenterPoint();

        // get line_data and boundary_data
        line_data = [info[0].x1 + groupCenter.x,
                    info[0].y1 + groupCenter.y,
                    info[0].x2 + groupCenter.x,
                    info[0].y2 + groupCenter.y];
        boundary_data = [info[1].x1 + groupCenter.x,
                    info[1].y1 + groupCenter.y,
                    info[1].x2 + groupCenter.x,
                    info[1].y2 + groupCenter.y];


        // concatenate line_data and boundary_data
        all_data = line_data.concat(boundary_data);

        // add the type of line
        data_with_label = [obj.line_type,].concat(all_data);

        // turn this data into a CSV string
        var dataString = data_with_label.join(',');

        // add this to the content array
        csvContentArray.push(dataString);
    });

    // add all the entries in csvContentArray, with newline characters
    var csvContent = "data:text/csv;charset=utf-8," + csvContentArray.join("\n");

    // download the CSV file
    var encodedUri = encodeURI(csvContent);
    window.open(encodedUri);
}

/*
FOR DRAWING LINES FROM AN UPLOADED CSV
 */

function showCSVUploader(){
    $('#csv_uploader_wrapper').show();
}

function loadCSV(event){
    $('#csv_uploader_wrapper').hide();

    var input = event.target;
    var csvReader = new FileReader();

    // run the function when a CSV is uploaded
    csvReader.onload = function(){
        var uploadedCSV = csvReader.result;
        
        var lines = $.csv.toObjects(uploadedCSV);
        
        var numLines = lines.length;

        for (i = 0; i < numLines; i++){
            drawLineFromObj(lines[i]);
        }
    };

    csvReader.readAsText(input.files[0]);
}

function drawLineFromObj(obj){

    // wrapper for parseInt that only takes one argument
    var intParse = function(string){
        return parseInt(string);
    }
    
    // seems to be a bug that with fabric.Line that sometimes flips coordinates when given as strings
    // investigate this bug further later
    var lineCoords = [obj.Line_x1, obj.Line_y1, obj.Line_x2, obj.Line_y2].map(intParse);
    var boundaryCoords = [obj.Boundary_x1, obj.Boundary_y1, obj.Boundary_x2, obj.Boundary_y2].map(intParse);

    var lineHeight = obj.Line_y2 - obj.Line_y1;
    var lineWidth = obj.Line_x2 - obj.Line_x1;
    var boundaryHeight = obj.Boundary_y2 - obj.Boundary_y1;
    var boundaryWidth = obj.Boundary_x2 - obj.Boundary_x1;

    var lineAngle = Math.atan2(lineHeight, lineWidth) * (180/Math.PI);
    var boundaryAngle = Math.atan2(boundaryHeight, boundaryWidth)* (180/Math.PI);


    var line = new fabric.Line(lineCoords, {
        stroke: line_colors[obj.LineType],
        strokeWidth: LINE_WIDTH,
        originX: 'center',
        originY: 'center'
    });

    var boundary = new fabric.Line(boundaryCoords,{
        stroke: line_colors[obj.LineType],
        strokeWidth: LINE_WIDTH,
        originX: 'center',
        originY: 'center'
    });

    var lineArrow = new fabric.Triangle({
            width: ARROW_WIDTH,
            height: ARROW_HEIGHT,
            fill: line.stroke,
            angle: 90 + lineAngle,
            left: line.x2,
            top: line.y2,
            originX: 'center',
            originY: 'center',
            centeredScaling: true
        });

    var boundaryArrow = new fabric.Triangle({
            width: ARROW_WIDTH,
            height: ARROW_HEIGHT,
            fill: boundary.stroke,
            angle: 90 + boundaryAngle,
            left: boundary.x2,
            top: boundary.y2,
            originX: 'center',
            originY: 'center',
            centeredScaling: true
        });

    var group = new fabric.Group([line, boundary, lineArrow, boundaryArrow],{
        left: Math.min(line.x1, lineArrow.getBoundingRect().left, boundaryArrow.getBoundingRect().left),
        top: Math.min(line.y1, lineArrow.getBoundingRect().top, boundaryArrow.getBoundingRect().top)
    });

    group.line_type = obj.LineType;
    canvas.add(group);
}

/*
FOR DELETING LINES & OBJECTS
 */

function deleteSelection(){
    if (canvas.getActiveGroup()){
        canvas.getActiveGroup().forEachObject(function(obj){ canvas.remove(obj)});
        canvas.discardActiveGroup.renderAll();
    } else {
        canvas.remove(canvas.getActiveObject());
    }
}

/*
STUFF THAT STILL NEEDS TO BE DONE
 */

function compute(){
    // ASK BEN HOW TO DO
}


