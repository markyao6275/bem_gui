line_colors = {
    trac: "#024A68",
    disp: "#63AFD0",
    ct: "#63DB93",
    cd: "#007730"
};

var canvas;
var curLineDrawer;

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
    $('#save_btn').click(function() {save()});
    $('#load_btn').click(function() {load()});

    // Set the key bindings
    Mousetrap.bind('d', function() {initDraw("disp")});
    Mousetrap.bind('t', function() {initDraw("trac")});
    Mousetrap.bind('c', function() {initDraw("ct")});
    Mousetrap.bind('f', function() {initDraw("cd")});
    Mousetrap.bind('enter', function() {initLine();});

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
    $('#value_input_wrapper').show();
    $('#value_input').focus();
}

function initLine()
{
    if (!$('#value_input_wrapper').is(":visible"))
    {
        return;
    }
    $('#value_input_wrapper').hide();

    // Set the line drawer to listen;
    canvas.on('mouse:down', function(o) {curLineDrawer.startLine(o)});
}

function LineDrawer(line_type)
{
    this.lineStarted = false;
    this.line_type = line_type;
}

LineDrawer.prototype.updateLine = function(o){
    if (!this.lineStarted) 
    {
        return;
    }
    var pointer = canvas.getPointer(o.e);
    this.line.set({ x2: pointer.x, y2: pointer.y });
    canvas.renderAll();
    this.line.setCoords();
}

LineDrawer.prototype.finishLine = function(o) {
    this.lineStarted = false;
    canvas.off('mouse:move');
    canvas.off('mouse:up');
}

LineDrawer.prototype.startLine = function(o) {
    this.lineStarted = true;
    var pointer = canvas.getPointer(o.e);
    var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];
    this.line = new fabric.Line(points, {
        stroke: line_colors[this.line_type],
        strokeWidth: 4,
        originX: 'center',
        originY: 'center'
    });
    canvas.add(this.line);
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

