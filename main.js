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
var canvasScale = 1;
var PAN_MODE = false;

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
    $('#img_btn').click(function() {showBackgroundUploader()});
    $('#zoomIn_btn').click(function() {zoom(ZOOM_SCALE)});
    $('#zoomOut_btn').click(function() {zoom(1/ZOOM_SCALE)});
    $('#pan_btn').click(function(){initPan()})
    $('#save_btn').click(function() {saveToCSV()});
    $('#load_btn').click(function() {showCSVUploader()});

    // Set the key bindings
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
}

LineDrawer.prototype.startLine = function(o) {
    canvas.off('mouse:down');
    this.lineStarted = true;
    var pointer = canvas.getPointer(o.e);
    var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];
    
    this.line = new fabric.Line(points, {
        stroke: line_colors[this.line_type],
        strokeWidth: LINE_WIDTH,
        originX: 'center',
        originY: 'center',
        centeredScaling: true
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

    if (this.drawingBoundary)
    {
        this.boundary.set({ x2: pointer.x, y2: pointer.y });
    }
    else
    {
        this.line.set({ x2: pointer.x, y2: pointer.y });
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
            centeredScaling: true
        });
        canvas.add(this.boundary);
        me = this;
        canvas.on('mouse:move', function(o) {me.updateLine(o)});
        canvas.on('mouse:down', function(o) {me.finishLine(o);});
    }
    else
    // the below method of handling line drawing can probably still be improved
    {
        canvas.remove(this.line)
        canvas.remove(this.boundary);
        
        var lineHeight = this.line.y2 - this.line.y1;
        var lineWidth = this.line.x2 - this.line.x1;
        var boundaryHeight = this.boundary.y2 - this.boundary.y1;
        var boundaryWidth = this.boundary.x2 - this.boundary.x1;

        // calculate the scaling constant to normalize the boundary condition
        // var scalingConstant = NORM_VEC_MAGNITUDE/Math.sqrt((Math.pow(boundaryWidth, 2) + Math.pow(boundaryHeight, 2)));

        // // normalize the boundary vector
        // this.boundary.set({
        //     x2: this.boundary.x1 + scalingConstant*boundaryWidth,
        //     y2: this.boundary.y1 + scalingConstant*boundaryHeight
        // });

        // draw arrowheads
        
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
        canvas.add(group);

        // set the correct modes
        this.lineStarted = false;
        this.drawingBoundary = false;

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
    
    canvasScale = canvasScale * scale;
    
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

function initPan(){
    
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

        // get line_data and boundary_data
        line_data = [info[0].x1, info[0].y1, info[0].x2, info[0].y2];
        boundary_data = [info[1].x1, info[1].y1, info[1].x2, info[1].y2];

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


