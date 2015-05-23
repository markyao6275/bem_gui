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
var currLineDrawer;
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

var canvasElts = []


function init(){
    // Setup the fabric.js canvas
    canvas = new fabric.Canvas('c', {
        backgroundColor : "#DCDCDC",
        selection: true,
        isDrawingMode: false
    });

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
    $('#test_srv').click(function(){testServer()})
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
    

    Mousetrap.bind('backspace', function() {deleteSelection()});
    
    Mousetrap.bind('shift+t', function() {test()});

    // currently not needed since we're not explicitly entering values
    // Mousetrap.bind('enter', function() {initLine();});

}

/*
FOR TESTING
*/

function test(){
    var testline1 = new fabric.Line([150, 150, 100, 100], {
        stroke: "#6600CC",
        strokeWidth: LINE_WIDTH,
        originX: "right",
        originY: "bottom",
    });
    var testline2 = new fabric.Line([300, 200, 200, 200], {
        stroke: "#6600CC",
        strokeWidth: 4*LINE_WIDTH,
        originX: "right",
        originY: "bottom",
    });

    var group = new fabric.Group([testline1, testline2]).set({
        left: 100,
        top: 100,
    })

    canvas.add(group)

    canvas.renderAll()
}

function testServer(){
    $('#testForm').show();
}


/*
FOR MAINTAINING THE DATA MODEL
*/

// creates a new boundary elt object
function boundaryElt(lineCoords, boundaryCoords, type)
{
    // assume line & boundary coordinates are given as (x1, y1, x2, y2)
    console.assert(lineCoords.length == 4, "line coordinates wrong size")
    console.assert(boundaryCoords.length == 4, "boundary coordinates wrong size")

    boundaryElt = {line: lineCoords, boundary: boundaryCoords, type: type}

    return boundaryElt
}

/*
FOR DRAWING
*/


function initDraw(line_type)
{
    // kill any existing LineDrawer
    if (undefined != currLineDrawer){
        currLineDrawer.kill();
    }

    // Initialize the new line drawer. It won't do anything until the click
    // handlers are initialized when the textbox is filled.
    canvas.forEachObject(function(obj){
        obj.selectable = false;
    });
    currLineDrawer = new LineDrawer(line_type);
    DRAWING_MODE = true;
    
    // Set the line drawer to listen
    canvas.on('mouse:down', function(o) {currLineDrawer.startLine(o)});

    // currently not needed since we're not explicitly entering values
    // $('#value_input_wrapper').show();
    // $('#value_input').focus();

}

/*
FOR DRAWING LINES
 */

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

    var pointer = canvas.getPointer(o.e);
    var lineInitialEndpoints = [ pointer.x, pointer.y, pointer.x, pointer.y ];

    canvas._objects.some(function(currentObj, index, array){
        if (currentObj.isType("group")){
            nearbyEndpoint = checkLineSnap(currentObj, pointer, SNAP_DISTANCE)
            if (nearbyEndpoint != null){
                lineInitialEndpoints = [nearbyEndpoint.x, nearbyEndpoint.y, nearbyEndpoint.x, nearbyEndpoint.y]
                return true
            }
        }
        return false  
    })
    
    this.line = new fabric.Line(lineInitialEndpoints, {
        stroke: line_colors[this.line_type],
        strokeWidth: LINE_WIDTH,
        originX: 'center',
        originY: 'center',
        opacity: 1
    });

    canvas.add(this.line);
    me = this;
    
    canvas.on('mouse:move', function(o) {me.updateLine(o)});
    canvas.on('mouse:down', function(o) {me.finishLine(o);});
}

LineDrawer.prototype.updateLine = function(o){
    if (!this.lineStarted) return;

    var pointer = canvas.getPointer(o.e);

    if (this.drawingBoundary) {  
        this.boundary.set({ x2: pointer.x, y2: pointer.y });

        if (this.straightenLine){
            var straightenedCoords = getStraightenedCoords(this.boundary, this.line)

            this.boundary.set({
                x2: straightenedCoords.x,
                y2: straightenedCoords.y
            })
        }
        this.boundary.setCoords()
    
    }
    else {
        this.line.set({ x2: pointer.x, y2: pointer.y });

        // WHY DOES THIS NEED TO HAPPEN?
        currLine = this.line

        if (this.straightenLine){
            var straightenedCoords = getStraightenedCoords(currLine)

            currLine.set({
                x2: straightenedCoords.x,
                y2: straightenedCoords.y
            })
        }

        else {
            canvas._objects.some(function(currentObj, index, array){
                if(currentObj.isType("group")){
                    nearbyEndpoint = checkLineSnap(currentObj, pointer, SNAP_DISTANCE)
                    
                    if (nearbyEndpoint != null) {
                        currLine.set({ x2: nearbyEndpoint.x, y2: nearbyEndpoint.y})
                        return true
                    }
                }
                return false
            })

        }

        currLine.setCoords()
    }
    canvas.renderAll();
}

LineDrawer.prototype.finishLine = function(o) {
    me.kill();

    if (!this.drawingBoundary)
    {   
        this.drawingBoundary = true;

        // start boundary vector at midpoint of line
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

        var arrowheads = makeArrowheads(this.line, this.boundary)

        // create a group with the line and the boundary and draw it
        var group = new fabric.Group([this.line, this.boundary].concat(arrowheads),{
            left: Math.min(this.line.x1,
                        arrowheads[0].getBoundingRect().left,
                        arrowheads[1].getBoundingRect().left,
                        arrowheads[2].getBoundingRect().left),
            top: Math.min(this.line.y1,
                        arrowheads[0].getBoundingRect().top,
                        arrowheads[1].getBoundingRect().top,
                        arrowheads[2].getBoundingRect().top),
            line_type: this.line_type
        });

        groupCenter = group.getCenterPoint();

        this.line.set(getCentralisedCoords(this.line, groupCenter));
        this.boundary.set(getCentralisedCoords(this.boundary, groupCenter));

        group.setCoords();
        canvas.add(group);

        canvas.deactivateAll().renderAll()
    }
}

LineDrawer.prototype.kill = function() {
    canvas.off('mouse:down');    
    canvas.off('mouse:move');
    canvas.off('mouse:up');
}

function getStraightenedCoords(line, reference){
    var lineHeight = line.y2 - line.y1
    var lineWidth = line.x2 - line.x1

    var lineAngle = Math.atan2(lineHeight, lineWidth);
    var lineLength = Math.pow(Math.pow(lineWidth, 2) + Math.pow(lineHeight, 2), 0.5);

    if (typeof(reference) === 'undefined'){
        var refHeight = 0
        var refWidth = 1
    }
    else {
        var refHeight = reference.y2 - reference.y1
        var refWidth = reference.x2 - reference.x1
    }

    var refAngle = Math.atan2(refHeight, refWidth)
    var refLength = Math.pow(Math.pow(refHeight, 2) + Math.pow(refWidth, 2), 0.5)
    var lineParallelLength = lineLength * Math.cos(lineAngle - refAngle)
    var linePerpLength = lineLength * Math.sin(lineAngle - refAngle)

    var xSide = Math.cos(lineAngle - refAngle - Math.PI/4) > 0 ? 1 : -1;
    var ySide = Math.sin(lineAngle - refAngle - Math.PI/4) > 0 ? 1 : -1;

    if (xSide * ySide > 0){
        return {x : line.x1 - linePerpLength/refLength * refHeight , y : line.y1 + linePerpLength/refLength * refWidth}
    }
    else {
        return {x : line.x1 + lineParallelLength/refLength * refWidth , y : line.y1 + lineParallelLength/refLength * refHeight}
    }

}

function getCentralisedCoords(line, objCenter){
    return {x1 : line.x1 - objCenter.x,
            y1 : line.y1 - objCenter.y,
            x2 : line.x2 - objCenter.x,
            y2 : line.y2 - objCenter.y}
}

function checkLineSnap(obj, pointer, snapDistance){
    var line = obj.item(0);
    var boundary = obj.item(1);

    var groupCenter = obj.getCenterPoint();

    var adjLine = dispCoords(obj, line);
    var adjBoundary = dispCoords(obj,boundary);

    var distFromLineEnd1 = Math.abs(pointer.x - adjLine.x1) + Math.abs(pointer.y - adjLine.y1);
    var distFromLineEnd2 = Math.abs(pointer.x - adjLine.x2) + Math.abs(pointer.y - adjLine.y2);
    
    var distFromBoundaryEnd1 = Math.abs(pointer.x - adjBoundary.x1) + Math.abs(pointer.y - adjBoundary.y1);
    var distFromBoundaryEnd2 = Math.abs(pointer.x - adjBoundary.x2) + Math.abs(pointer.y - adjBoundary.y2);
    
    if (distFromLineEnd1 < snapDistance){
        points = { x : adjLine.x1, y : adjLine.y1 };
    }
    else if (distFromLineEnd2 < snapDistance) {
        points = { x : adjLine.x2, y : adjLine.y2 };
    }
    else if (distFromBoundaryEnd1 < snapDistance) {
        points = { x : adjBoundary.x1, y : adjBoundary.y1 };
    }
    else if (distFromBoundaryEnd2 < snapDistance) {
        points = { x : adjBoundary.x2, y : adjBoundary.y2 };
    }
    else {
        points = null
    }
    return points
}

function makeArrowheads(line, boundary){      
    console.assert(line.isType("line"), "argument is not line object")
    console.assert(boundary.isType("line"), "argument is not line object")

    var lineHeight = line.y2 - line.y1;
    var lineWidth = line.x2 - line.x1;
    var boundaryHeight = boundary.y2 - boundary.y1;
    var boundaryWidth = boundary.x2 - boundary.x1;

    var lineAngle = Math.atan2(lineHeight, lineWidth) * (180/Math.PI);
    var boundaryAngle = Math.atan2(boundaryHeight, boundaryWidth)* (180/Math.PI);

    lineArrow = new fabric.Triangle({
        width: ARROW_WIDTH,
        height: ARROW_HEIGHT,
        fill: line.stroke,
        angle: 90 + lineAngle,
        left: line.x2,
        top: line.y2,
        originX: 'center',
        originY: 'center',
    });

    normalVector = new fabric.Triangle({
        width: ARROW_WIDTH,
        height: ARROW_HEIGHT,
        fill: line.stroke,
        angle: lineAngle,
        left: boundary.x1,
        top: boundary.y1,
        originX: 'center',
        originY: 'bottom',
    });

    boundaryArrow = new fabric.Triangle({
        width: ARROW_WIDTH,
        height: ARROW_HEIGHT,
        fill: boundary.stroke,
        angle: 90 + boundaryAngle,
        left: boundary.x2,
        top: boundary.y2,
        originX: 'center',
        originY: 'center',
    });

    return [lineArrow, normalVector, boundaryArrow]
}


function straightenLine(bool){
    if (DRAWING_MODE)
        currLineDrawer.straightenLine = bool;
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
    // assume group elements are selected
    // currently buggy if boundary not on line median
    // arrowhead adding is buggy

    canvas.renderOnAddRemove = false
    var objects = canvas.getActiveGroup();

    var line;
    var boundary;

    var arrowheads = makeArrowheads(objects._objects[0], objects._objects[1])

    var group = new fabric.Group(objects._objects.concat(arrowheads), {
        left: objects.getBoundingRect().left,
        top: objects.getBoundingRect().top,
    });

    
    group.forEachObject(function(obj){
        if (obj.isType("line")){
            if (obj.opacity == 0.9){
                console.log("boundary set!")
                boundary = obj;
            }
            else if (obj.opacity == 1){
                console.log("line set!")
                line = obj;
            }

            obj.set({
                left: obj.left - objects.left,
                top: obj.top - objects.top,
            }); 
        }    
    })  

    group.setCoords();
    canvas.deactivateAll().renderAll()

    boundaryGroupX1 = boundary.getCenterPoint().x + boundary.x1
    boundaryGroupY1 = boundary.getCenterPoint().y + boundary.y1
    lineMedianX = (line.x1 + line.x2)/2
    lineMedianY = (line.y1 + line.y2)/2

    console.log(boundary.getCenterPoint().x + ", " + boundary.x1)
    console.log(group._objects[1].getCenterPoint().x)


    console.log("Boundary: (" + boundaryGroupX1 + ", " + boundaryGroupY1 + "); Line Median: (" + lineMedianX + ", " + lineMedianY + ")")

    var boundaryNotOnMidpoint = (boundaryGroupX1 != lineMedianX) || (boundaryGroupY1 != lineMedianY)

    // var boundaryNotOnMidpoint =  (boundary.getCenterPoint().x + boundary.x1 != line.getCenterPoint + (line.x1 + line.x2)/2) || 
    //                      (boundary.getCenterPoint().y + boundary.y1 != line.getCenterPoint + (line.y1 + line.y2)/2)

    if (boundaryNotOnMidpoint){
        console.log("oops!")
        // console.log("Line: (" + line.x1 + ", " + line.y1 + "), (" + line.x2 + ", " + line.y2 + ")")
        // console.log("Boundary: (" + boundary.x1 + ", " + boundary.y1 + "), (" + boundary.x2 + ", " + boundary.y2 + ")")
        

        // group._objects[1].set({
        //     x1: (line.getCenterPoint().x - boundary.getCenterPoint().x) + (line.x1 + line.x2)/2,
        //     //y1: (line.y1 + line.y2)/2
        // })
    }

    objects.forEachObject(function(obj){
        canvas.remove(obj);       
    });

    
    canvas.add(group);
    console.log(group._objects[1].getCenterPoint())
    canvas.deactivateAll().renderAll();
    console.log(group._objects[1].getCenterPoint())
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


