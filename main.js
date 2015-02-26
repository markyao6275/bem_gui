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

function init(){
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
    $('#regp_btn').click(function() {restoreGroup()});
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
    Mousetrap.bind('e', function() {editCurrGroup()});
    Mousetrap.bind('g', function() {restoreGroup()});
    Mousetrap.bind('p', function() {initPan()});
    Mousetrap.bind('s', function() {saveToCSV()});
    Mousetrap.bind('l', function() {loadCSV()});
    Mousetrap.bind('backspace', function() {deleteSelection()});
    
    Mousetrap.bind('shift+t', function() {test()});

    // currently not needed since we're not explicitly entering values
    // Mousetrap.bind('enter', function() {initLine();});

}

function initDraw(line_type)
{
    // kill any existing LineDrawer
    if (undefined != curLineDrawer){
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

        else {
            canvas.forEachObject(function(obj){
                if (obj.isType("group") && !endSet){
                    var line = obj.item(0);
                    var boundary = obj.item(1);

                    var groupCenter = obj.getCenterPoint();

                    var adjLine = dispCoords(obj, line);
                    var adjBoundary = dispCoords(obj, boundary);

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
        }

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
        });

        // create a group with the line and the boundary and draw it
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
FOR EDITING ALREADY CREATED LINES
*/

function editCurrGroup(){
    var currGroup = canvas.getActiveObject();
    var items = currGroup._objects;
    currGroup._restoreObjectsState();
    canvas.remove(currGroup);
    var groupCenter = currGroup.getCenterPoint();
    
    for(var i = 0; i < 2; i++) {
        items[i].left += groupCenter.x - currGroup.left;
        items[i].top += groupCenter.y - currGroup.top;
        canvas.add(items[i]);
    }
    canvas.renderAll();
}

function restoreGroup(){
    var objects = canvas.getActiveGroup();

    var line;
    var boundary;

    objects.forEachObject(function(obj){
        canvas.remove(obj);       
    });

    var group = new fabric.Group(objects._objects, {
        left: objects.getBoundingRect().left,
        top: objects.getBoundingRect().top,
    });

    canvas.add(group);
    
    group.forEachObject(function(obj){
        if (obj.opacity == 0.9){
            boundary = obj;
        }
        else if (obj.opacity == 1){
            line = obj;
        }

        obj.set({
            left: obj.left - objects.left,
            top: obj.top - objects.top,
        });     
    })   

    if (boundary.x1 != (line.x1 + line.x2)/2 || boundary.y1 != (line.y1 + line.y2)/2){
        boundary.set({
            x1: (line.x1 + line.x2)/2,
            y1: (line.y1 + line.y2)/2
        })
    }



    group.setCoords();
    canvas.renderAll();
}


function dispCoords(obj, points){
    var objCenter = obj.getCenterPoint();
    var objAngle = obj.getAngle() * Math.PI/180;
    var itemAngle1 = Math.atan2(points.y1, points.x1);
    var itemDist1 = Math.pow(Math.pow(points.x1, 2) + Math.pow(points.y1, 2), 0.5);
    var itemAngle2 = Math.atan2(points.y2, points.x2);
    var itemDist2 = Math.pow(Math.pow(points.x2, 2) + Math.pow(points.y2, 2), 0.5);

    var rotatedx1 = itemDist1 * Math.cos(itemAngle1 + objAngle);
    var rotatedy1 = itemDist1 * Math.sin(itemAngle1 + objAngle);
    var rotatedx2 = itemDist2 * Math.cos(itemAngle2 + objAngle);
    var rotatedy2 = itemDist2 * Math.sin(itemAngle2 + objAngle);

    var adjustedPoints = {
        x1: CURR_ZOOM * rotatedx1 + objCenter.x,
        y1: CURR_ZOOM * rotatedy1 + objCenter.y,
        x2: CURR_ZOOM * rotatedx2 + objCenter.x,
        y2: CURR_ZOOM * rotatedy2 + objCenter.y,
    };

    return adjustedPoints;
}

function test(){
    var testline1 = new fabric.Line([50, 50, 100, 100], {
        stroke: "#6600CC",
        strokeWidth: LINE_WIDTH,
    });

    var testline2 = new fabric.Line([30, 70, 150, 200], {
        stroke: "#96705C",
        strokeWidth: LINE_WIDTH,
    });
    
    var group = new fabric.Group([testline1, testline2]);

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


