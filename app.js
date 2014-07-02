// set up SVG for D3
var width  = 960,
    height = 500,
    colors = d3.scale.category10();

var svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
//    .attr("pointer-events", "all")
    .attr('version', "1.1")
    .attr('xmlns', "http://www.w3.org/2000/svg")
    .attr('xlink', "http://www.w3.org/1999/xlink")
    .attr('unselectable', "on")
    .attr('style', "-webkit-user-select: none;");

// allow pan and zoom
var vis = svg
    .append('svg:g')
    .call(function() {
        Mindmap.zoom = d3.behavior.zoom().on("zoom", Mindmap.rescale);
        return Mindmap.zoom;
    }())
    .on("dblclick.zoom", null)
        .append('svg:g')
    .attr("class", "vis")
    .on("mousemove", Mindmap.mousemove)
    .on("mousedown", Mindmap.mousedown)
    .on("mouseup", Mindmap.mouseup)
    .on("click", Mindmap.click);

vis.append('svg:rect')
    .attr('width', 20000)
    .attr('height', 10000)
    .attr("class", "mouseevents")
    .on("dblclick.zoom", null);


// init D3 force layout
var force = d3.layout.force()
    .nodes(Mindmap.nodes)
    .links(Mindmap.links)
    .size([width, height])
    .linkDistance(function(d) {
        return (d.source.size + d.target.size)/400 + 100;
    })
    .charge(function(d) {
        return -d.size / 10;
    })
    .on('tick', tick);

var forceDrag = force.drag().on("dragend", Cell.dragged);

// define arrow markers for graph links
vis.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

//vis.append('svg:defs').append('svg:marker')
//    .attr('id', 'start-arrow')
//    .attr('viewBox', '0 -5 10 10')
//    .attr('refX', 4)
//    .attr('markerWidth', 3)
//    .attr('markerHeight', 3)
//    .attr('orient', 'auto')
//    .append('svg:path')
//    .attr('d', 'M10,-5L0,0L10,5')
//    .attr('fill', '#000');

// line displayed when dragging new nodes
var drag_line = vis.append('svg:path')
    .attr('class', 'link dragline hidden')
    .attr('d', 'M0,0L0,0');

// handles to link and node element groups
var paths = vis.append('svg:g').selectAll('path'),
    nodes = vis.append('svg:g').selectAll('g.node');

// update force layout (called automatically each iteration)
function tick() {
    nodes.attr('transform', function(d) {
        var node = d3.select("[node-id='" + d.id + "']").select("rect.node"); // TODO will 'this' work here?
        var nodeWidht = node.attr("width");
        var nodeHeight = node.attr("height");
        return 'translate(' + (d.x - nodeWidht/2) + ',' + (d.y - nodeHeight/2) + ')';
    });

    // draw directed edges with proper padding from node centers
    paths.attr('d', function(d) {
        var deltaX = d.target.x - d.source.x,
            deltaY = d.target.y - d.source.y,
            dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            normX = deltaX / dist,
            normY = deltaY / dist,
            sourcePadding = 12,// d.left ? 17 : 12,
            targetPadding = 17,// d.right ? 17 : 12,
            sourceX = d.source.x + (sourcePadding * normX * 0),
            sourceY = d.source.y + (sourcePadding * normY * 0),
            targetX = d.target.x - (targetPadding * normX * 0),
            targetY = d.target.y - (targetPadding * normY * 0);
        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    });
}

// update graph (called when needed)
function restart() {
    // path (link) group
    paths = paths.data(Mindmap.links);

    // update existing links
//    path.style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });
        //.classed('selected', function(d) { return d === Mindmap.selected_link; })
        //.style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })

    // add new links
    paths.enter().append('svg:path')
        .attr('class', 'link')
//        .classed('selected', function(d) { return d === Mindmap.selected_link; })
//        .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
        .style('marker-end', 'url(#end-arrow)')
        .on('mousedown', function(d) {
            if(d3.event.ctrlKey) return;

            // select link
            Mindmap.mousedown_link = d;
            if(Mindmap.mousedown_link === Mindmap.selected_link) Mindmap.selected_link = null;    // TODO refactor to ternary
            else Mindmap.selected_link = Mindmap.mousedown_link;
            Mindmap.selected_node = null;
            restart();
        });

    // remove old links
    paths.exit().remove();


    // node (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    nodes = nodes.data(Mindmap.nodes, function(d) { return d.id; });

    // update existing nodes (reflexive & selected visual states)
    nodes.selectAll('rect.node')
        .style('fill', function(d) { return (d === Mindmap.selected_node) ? "#C9C9C9" : "#B2B2B2"; }); // TODO implement as 'selected' class
//        .classed('reflexive', function(d) { return d.reflexive; });

    // add new nodes
    var node = nodes.enter()
        .append('svg:g')
        .attr('class', 'node')
        .attr('node-id', function(d) {return d.id;});

    node.append('svg:rect')
        .attr('class', 'node')
        .attr('width', Mindmap.nodeWidth)
        .attr('height', Mindmap.nodeHeight)
        .attr('rx', 10)
        .attr('ry', 10);

    node.on('mouseover', Cell.mouseover)
        .on('mouseout', Cell.mouseout)
        .on('mousedown', Cell.mousedown)
        .on('mouseup', Cell.mouseup)
        .on('dblclick', Cell.dblclick);

    Cell.appendResizeHandle(node);

    Cell.appendPinButton(node);

    // attach text field
    Cell.appendTextField(node, "write here", true);

    // remove old nodes
    nodes.exit().remove();

    // set the graph in motion
    force.start();
}

// app starts here
//svg.on('mousedown', Mindmap.mousedown)
//    .on('mousemove', Mindmap.mousemove)
//    .on('mouseup', Mindmap.mouseup);
d3.select(window)
    .on('keydown', Mindmap.keydown)
    .on('keyup', Mindmap.keyup)
    .on('mousedown', function() {Mindmap.textBeingEdited = null}); // when clicked anywhere outside text
restart();

$(window).on("load resize", function() {
    var width = $(window).width()-5,
        height = $(window).height()-5;
    d3.select("svg").attr("width", width).attr("height", height);
    force.size([width, height]).start();

});
