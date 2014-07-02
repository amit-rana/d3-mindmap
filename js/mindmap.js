// general state and behavior
var Mindmap = {

    nodes: [],
    links: [],

    // mouse event vars
    selected_node: null,
    selected_link: null,
    mousedown_link: null,
    mousedown_node: null,
    mouseup_node: null,

    lastNodeId: 0,

    // is truthy when the textfield is active
    // takes the value of the text being edited during typing
    textBeingEdited: null,
    lastClickedNode: null,

    // function for zooming
    zoom: null,

    // is truthy after the vis was dragged
    panned: false,

    // is truthy when the node resizing handle is being dragged
    nodeBeingResized: null,

    // TODO rename this
    start: null,

    nodeWidth: 110,
    nodeHeight: 50,

    mousedown: function() {
        // prevent I-bar on drag
        //d3.event.preventDefault();

        // because :active only works in WebKit?
        svg.classed('active', true);

//        if (Mindmap.mousedown_node) {
////            allow panning if nothing is selected
//            vis.call(d3.behavior.drag().on("drag"), null);
//            return;
//        }

    },

    mousemove: function() {
        if (Mindmap.nodeBeingResized) {
            Cell.changeSize();
        } else if (Mindmap.mousedown_node) {
            // update drag line
            drag_line.attr('d', 'M' + Mindmap.mousedown_node.x + ',' + Mindmap.mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
            restart();
        }


    },

    updateLastNode: function() {
        // update text of last edited node
         if (Mindmap.lastNodeId > 1) {
            Cell.updateTextField(d3.select("[node-id='" + (Mindmap.lastNodeId-1) + "']"))
        }
    },

    mouseup: function() {

        if(Mindmap.mousedown_node) {
            // hide drag line
            drag_line
                .classed('hidden', true)
                .style('marker-end', '');
            // enable panning
            d3.select("svg").select("g").call(Mindmap.zoom);
        }

//        if (force.alpha() === 0) {  // TODO      remove this?
//            force.resume();
//        }

        // because :active only works in WebKit?
        svg.classed('active', false);

        if(!d3.event.ctrlKey && !Mindmap.mousedown_node && !Mindmap.panned && !Mindmap.nodeBeingResized) {
            // insert new node at point
            Cell.addNew(++Mindmap.lastNodeId, null, d3.mouse(this));
            restart();
        }

        // clear mouse event vars
        Mindmap.resetMouseVars();
        // recalculate node repulsion and links distance
        force.start();
    },

    click: function() {

    },

    // only respond once per keydown
    lastKeyDown: -1,
    keydown: function() {
//        d3.event.preventDefault();

        if(Mindmap.lastKeyDown !== -1) return;
        Mindmap.lastKeyDown = d3.event.keyCode;

        // ctrl
        if(d3.event.keyCode === 17) {
            nodes.call(forceDrag);
            svg.classed('ctrl', true);
        }

        if(!Mindmap.selected_node && !Mindmap.selected_link) return;
        switch(d3.event.keyCode) {
//            case 8: // backspace
            case 46: // delete
                if (Mindmap.selected_node && !Mindmap.textBeingEdited && Mindmap.textBeingEdited != "") {
                    Mindmap.nodes.splice(Mindmap.nodes.indexOf(Mindmap.selected_node), 1);
                    Mindmap.spliceLinksForNode(Mindmap.selected_node);
                    Mindmap.selected_node = null;
                } //else if(Mindmap.selected_link) {
                  //  Mindmap.links.splice(Mindmap.links.indexOf(Mindmap.selected_link), 1);
                //}
               // Mindmap.selected_link = null;
                restart();
                break;
            case 9: // TAB
                // add new sibling for selected node
                d3.event.preventDefault();
                if (Mindmap.selected_node && !Mindmap.textBeingEdited) {
                    var selected = Mindmap.selected_node;
                    if (!selected.parent) return;
                    Cell.addNew(++Mindmap.lastNodeId, selected.parent, [selected.x + 5, selected.y]);
                    restart();
                }
                break;
            case 13: // Enter
                if (!Mindmap.textBeingEdited) {
                    // add new child to selected node
                    var parent = Mindmap.selected_node;
                    if (!parent) return;
                    Cell.addNew(++Mindmap.lastNodeId, parent, [parent.x + 5, parent.y]);
                    restart();
                }
                break;

        }
    },

    keyup: function() {
        Mindmap.lastKeyDown = -1;

        // ctrl
        if(d3.event.keyCode === 17) {
            nodes
                .on('mousedown.drag', null)
                .on('touchstart.drag', null);
            svg.classed('ctrl', false);
        }
    },

    rescale: function() {
        if (Mindmap.mousedown_node || Mindmap.nodeBeingResized) {return;}

        var trans = d3.event.translate;
        var scale = d3.event.scale;
//        if (scale < 0.1) {
//            scale = 0.1;
//        }

        vis.attr("transform",
            "translate(" + trans + ")"
                + " scale(" + scale + ")");
        vis.select("rect.mouseevents")
            .attr("x", -trans[0]/scale)
            .attr("y", -trans[1]/scale);

        Mindmap.panned = true;
    },

    linkNodes: function(source, target) {
        var link = {
            source: source,
            target: target
        };
        Mindmap.links.push(link);
        return link;
    },

    resetMouseVars: function() {
        Mindmap.mousedown_node = null;
        Mindmap.mouseup_node = null;
        Mindmap.mousedown_link = null;
        Mindmap.panned = false;

        Mindmap.nodeBeingResized = null;
        Mindmap.start = null;
        if (force.alpha() === 0) { force.resume();}
    },

    textSubmitted: function() {
        // update the text for node
        Mindmap.lastClickedNode.title = Mindmap.textBeingEdited;

        // remove marker from textfield (make it inactive)
        $(window).trigger(jQuery.Event("mousedown"));

        // the next 'change' event on nodeInput will set the text to null
        Mindmap.textBeingEdited = -1;

        restart();
    },

    textFieldResized: function(height, vertPadding, node) {
        var newHeight = height + 2*vertPadding;
        Cell.resize(node, null, newHeight, 200);
        force.start();
    },

    spliceLinksForNode: function(node) {
        var toSplice = Mindmap.links.filter(function(l) {
            return (l.source === node || l.target === node);
        });
        toSplice.map(function(l) {
            Mindmap.links.splice(Mindmap.links.indexOf(l), 1);
        });
    }
};