line_colors = {
    trac: "#024A68",
    disp: "#63AFD0",
    ct: "#63DB93",
    cd: "#007730"
};

var canvas;
var curLineDrawer;
var LINE_WIDTH = 2;
var NORM_VEC_MAGNITUDE = 50;

function init()
{
    // Setup the fabric.js canvas
    canvas = new fabric.Canvas('c');
    canvas.isDrawingMode = false;
    canvas.selection = true;

    // Bind the click functions to the buttons
    $('#trac_btn').click(function() {initDraw("trac")});
    $('#disp_btn').click(function() {initDraw("disp")});
    $('#ct_btn').click(function() {initDraw("ct")});
    $('#cd_btn').click(function() {initDraw("cd")});
    $('#comp_btn').click(function() {compute()});
    $('#img_btn').click(function() {uploadBackground()});
    $('#save_btn').click(function() {save()});
    $('#load_btn').click(function() {load()});

    // Set the key bindings
    Mousetrap.bind('d', function() {initDraw("disp")});
    Mousetrap.bind('t', function() {initDraw("trac")});
    Mousetrap.bind('c', function() {initDraw("ct")});
    Mousetrap.bind('f', function() {initDraw("cd")});
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
    curLineDrawer = new LineDrawer(line_type);
    initLine()

    // currently not needed since we're not explicitly entering values
    // $('#value_input_wrapper').show();
    // $('#value_input').focus();

}

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
    //this.lineBoundaryGroup = new fabric.Group();
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
        this.boundary.setCoords();
    }
    else
    {
        this.line.set({ x2: pointer.x, y2: pointer.y });
        this.line.setCoords();
    }
    canvas.renderAll();
}

LineDrawer.prototype.finishLine = function(o) {
    if (!this.drawingBoundary)
    {   
        this.drawingBoundary = true;
        var midPoint = this.line.getCenterPoint();
        var boundaryPoints = [midPoint.x, midPoint.y, midPoint.x, midPoint.y]
        this.boundary = new fabric.Line(boundaryPoints, {
            stroke: line_colors[this.line_type],
            strokeWidth: LINE_WIDTH,
            originX: 'center',
            originY: 'center'
        });
        canvas.add(this.boundary);
        me = this;
        canvas.off('mouse:up');
        canvas.on('mouse:move', function(o) {me.updateLine(o)});
        canvas.on('mouse:down', function(o) {me.finishLine(o);});
    }
    else
    {
        // the below method of handling line drawing can probably still be improved

        canvas.remove(this.line)
        canvas.remove(this.boundary);
        var boundaryHeight = this.boundary.y2 - this.boundary.y1;
        var boundaryWidth = this.boundary.x2 - this.boundary.x1;

        // calculate the scaling constant to normalize the boundary condition
        var scalingConstant = NORM_VEC_MAGNITUDE/Math.sqrt((Math.pow(boundaryWidth, 2) + Math.pow(boundaryHeight, 2)));

        // normalize the boundary vector
        this.boundary.set({x2 : this.boundary.x1 + scalingConstant*boundaryWidth, y2: this.boundary.y1 + scalingConstant*boundaryHeight});

        // create a group with the line and the boundary and draw it
        var group = new fabric.Group([this.line, this.boundary],{
            left: Math.min(this.line.x1, this.line.x2, this.boundary.x2),
            top: Math.min(this.line.y1, this.line.y2, this.boundary.y2)
        });
        group.line_type = this.line_type;
        canvas.add(group);

        // set the correct modes
        this.lineStarted = false;
        this.drawingBoundary = false;
        canvas.off('mouse:move');
        canvas.off('mouse:up');
        canvas.off('mouse:down');
        canvas.selection = true;
    }
}

LineDrawer.prototype.startLine = function(o) {
    canvas.selection = false;
    this.lineStarted = true;
    var pointer = canvas.getPointer(o.e);
    var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];
    
    this.line = new fabric.Line(points, {
        stroke: line_colors[this.line_type],
        strokeWidth: LINE_WIDTH,
        originX: 'center',
        originY: 'center'
    });
    //canvas.add(lineBoundaryGroup);
    canvas.add(this.line);
    //lineBoundaryGroup.add(this.line);
    me = this;
    canvas.off('mouse:down');
    canvas.on('mouse:move', function(o) {me.updateLine(o)});
    canvas.on('mouse:up', function(o) {me.finishLine(o);});
}

LineDrawer.prototype.kill = function() {
    canvas.off('mouse:down');    
    canvas.off('mouse:move');
    canvas.off('mouse:up');
}

function uploadBackground(){
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

function deleteSelection(){
    if (canvas.getActiveGroup()){
        canvas.getActiveGroup().forEachObject(function(obj){ canvas.remove(obj)});
        canvas.discardActiveGroup.renderAll();
    } else {
        canvas.remove(canvas.getActiveObject());
    }
}


function save() {
    objects = canvas.getObjects();

    // each element of csvContentArray is one line of the CSV
    var csvContentArray = [];
    
    // enter the column headers
    var csvHeaders = ['LineType', 'Line_x1', 'Line_y1', 'Line_x2', 'Line_y2', 'Boundary_x1', 'Boundary_y1', 'Boundary_x2', 'Boundary_y2'];
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

function load(){
    // TO DO
}

function compute(){
    // ASK BEN HOW TO DO
}


