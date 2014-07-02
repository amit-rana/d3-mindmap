// Object for storing node functionality.
var Cell = {

    padding: { hor: 15, vert: 10},

    addNew: function(id, parent, coords) {
        Mindmap.updateLastNode();
        var node = {
            id: id,
            title: "",
            size: Mindmap.nodeWidth * Mindmap.nodeHeight,
            parent: parent,
            depth: parent ? parent.depth + 1 : 0,
            children: [],
            x: coords[0],
            y: coords[1]
        };
        // add new node to nodes array
        Mindmap.nodes.push(node);
        Mindmap.selected_node = node;
        Mindmap.lastClickedNode = node;
        // add new node to parent's children (if parent not null)
        if (parent) {
            parent.children.push(node);
            Mindmap.linkNodes(parent, node);
        }

    },

    mouseover: function(d) {
        if(!Mindmap.mousedown_node || d === Mindmap.mousedown_node) return;
        // outline target node
        d3.select(this).select("rect.node").style('stroke-width', 3);
    },

    mouseout: function(d) {
        if(!Mindmap.mousedown_node || d === Mindmap.mousedown_node) return;
        // deoutline target node
        d3.select(this).select("rect.node").style('stroke-width', 1.5);
    },

    mousedown: function(d) {
        // disable panning here
        d3.select("svg").select("g").call(d3.behavior.zoom().on("zoom", null));

        Mindmap.lastClickedNode = d;
        Mindmap.mousedown_node = d;
        if(d3.event.ctrlKey) return;

        // select node
        Mindmap.selected_node = Mindmap.mousedown_node === Mindmap.selected_node ? null : Mindmap.mousedown_node ;
        Mindmap.selected_link = null;

        // reposition drag line
        d3.select("path.dragline")
            .style('marker-end', 'url(#end-arrow)')
            .classed('hidden', false)
            .attr('d', 'M' + Mindmap.mousedown_node.x + ',' + Mindmap.mousedown_node.y + 'L' + Mindmap.mousedown_node.x + ',' + Mindmap.mousedown_node.y);

        restart();
    },

    mouseup: function(d) {

        if(!Mindmap.mousedown_node) return;

        // needed by FF
        d3.select("path.dragline")
            .classed('hidden', true)
            .style('marker-end', '');

        // check for drag-to-self
        Mindmap.mouseup_node = d;
        if(Mindmap.mouseup_node === Mindmap.mousedown_node) { /*Mindmap.resetMouseVars();*/ return; }

        // deoutline target node
        d3.select(this).select("rect.node").style('stroke-width', 1.5);

        // add link to graph (update if exists)

        var link;
        link = Mindmap.links.filter(function(l) {
            return (l.source === Mindmap.mousedown_node && l.target === Mindmap.mouseup_node);
        })[0];

        if(!link) {
            link = Mindmap.linkNodes(Mindmap.mousedown_node, Mindmap.mouseup_node);
        }

        // select new link
        Mindmap.selected_link = link;
        Mindmap.selected_node = null;
        restart();
    },

    dblclick: function(d) {
        d3.event.stopPropagation(); // to prevent zooming

        // if dblclicked rect.node
        if (d3.event.srcElement.className.baseVal === "node" && d3.event.srcElement.tagName === "rect") {
            // put cursor to the end of the text
            var textBackground = $("g.node[node-id='" + d.id + "']").find("g.text rect.background");
            var down = jQuery.Event("mousedown.");
            down.clientX = textBackground.offset().left + textBackground[0].getBoundingClientRect().width-2;
            down.clientY = textBackground.offset().top + textBackground[0].getBoundingClientRect().height-2;
            textBackground.trigger(down);
            textBackground.trigger(jQuery.Event("mouseup."));
        }
    },

    appendResizeHandle: function(node) {
        var resHandleSize = Mindmap.nodeHeight/15;
        var resHandlePadding = resHandleSize;
        var resHandle = node.append("g")
            .attr("class", "resize")
            .attr("transform", "translate(" + Mindmap.nodeWidth + "," + Mindmap.nodeHeight + ")");
        resHandle.selectAll("line").data([1,2])
            .enter()
            .append("line")
            .attr("x1", function(d) {return -resHandleSize*(d + 1.5);})
            .attr("y1", resHandleSize/2 - resHandlePadding)
            .attr("x2", resHandleSize/2 - resHandlePadding)
            .attr("y2", function(d) {return -resHandleSize*(d + 1.5);})
        resHandle.append("rect")
            .attr("x", -3*resHandleSize)
            .attr("y", -3*resHandleSize)
            .attr("width", 3*resHandleSize)
            .attr("height", 3*resHandleSize)
            .style("opacity", 0)
            .on("mousedown", function() {
                d3.event.stopPropagation(); // not trigger 'mousedown' on the node
                Mindmap.nodeBeingResized = d3.select(this).datum();
            });
    },

    appendPinButton: function(node) {
        var pin = node.append("g")
            .attr("class", "pin")
            .attr("transform", "translate(" + (Mindmap.nodeWidth - 5) + ",-7)")
            .on("click", Cell.unpin);
        // for mouseevents:
        pin.append("circle")
            .attr("r", 7)
            .attr("cx", 6)
            .attr("cy", 6)
            .style("opacity", 0);

        pin.append("path")
            .attr("d", "M32,8c0-4.416-3.586-8-8-8c-2.984,0-5.562,1.658-6.938,4.086c0-0.002,0.004-0.004,0.004-0.006   c-0.367-0.035-0.723-0.111-1.098-0.111c-6.629,0-12,5.371-12,12c0,2.527,0.789,4.867,2.121,6.797L0,32l9.289-6.062   c1.91,1.281,4.207,2.031,6.68,2.031c6.629,0,12-5.371,12-12c0-0.346-0.07-0.67-0.102-1.008C30.32,13.594,32,11.006,32,8z    M15.969,23.969c-4.414,0-8-3.586-8-8c0-4.412,3.586-8,8-8c0.012,0,0.023,0.004,0.031,0.004c0-0.008,0.004-0.014,0.004-0.02   C16.004,7.969,16,7.984,16,8c0,0.695,0.117,1.355,0.281,1.998l-3.172,3.174c-1.562,1.562-1.562,4.094,0,5.656s4.094,1.562,5.656,0   l3.141-3.141c0.66,0.18,1.344,0.305,2.059,0.309C23.949,20.398,20.371,23.969,15.969,23.969z M24,12c-2.203,0-4-1.795-4-4   s1.797-4,4-4s4,1.795,4,4S26.203,12,24,12z")
            .attr("transform", "scale(0.4)")
    },

    appendTextField: function(node, text, selectText) {
        var nodeSVG = node.node();
        $(nodeSVG).svg(function(svg) {
            var textWidth = node.select("rect").attr("width") - Cell.padding.hor * 2;
            var settings = {width: textWidth}; //  align: 'middle'

            var textInput = svg.input.text( Cell.padding.hor, Cell.padding.vert, text, settings);
            textInput.bind("changeSize", function(e, width, height) {
                Mindmap.textFieldResized(height, Cell.padding.vert, node);
            });
            textInput.bind("change", function(e, text) {
                // -1 used here as a workaround to deal with one last 'change' event
                // after the text was submitted
                if (Mindmap.textBeingEdited === -1) {
                    Mindmap.textBeingEdited = null;
                } else {
                    Mindmap.textBeingEdited = text;
                }
            });

            if (selectText) {
                setTimeout(function() {
                    // simulate mousedown event on the text (to put cursor there and allow immediate typing)
                    var nodeData = node.datum();
                    var down = jQuery.Event("mousedown.");
                    down.clientX = nodeData.x + 20;
                    down.clientY = nodeData.y + 15;
                    $(nodeSVG).find("text").trigger(down);

                    // simulate pressing CTRL+A (to select all the text in node)
                    var ctrlAPress = jQuery.Event("keydown");
                    ctrlAPress.metaKey = true;
                    ctrlAPress.ctrlKey = true;
                    ctrlAPress.keyCode = 65;
                    $(window).trigger(ctrlAPress);
                }, 100);
                Mindmap.textBeingEdited = text;
            }
        });

    },

    resize: function(node, width, height, duration) {
        var nodeRect = node.select("rect.node");

        // calculate node width if only height is changed
        if (!width) {
            width = node.select("rect.node").attr("width");
        }

        if (width < Mindmap.nodeWidth) {
            width = Mindmap.nodeWidth;
        }
        if (height < Mindmap.nodeHeight) {
            height = Mindmap.nodeHeight;
        }
        // move the resize node handle
        node.select(".resize")
            .transition()
            .duration(duration)
            .attr("transform", "translate(" + width + "," + height + ")");

        // move pin button
        node.select(".pin")
            .transition()
            .duration(duration)
            .attr("transform", "translate(" + (width - 5) + ",-7)");

        var nodeTransition = nodeRect.transition().duration(duration);
        width && nodeTransition.attr("width", width);
        height && nodeTransition.attr("height", height);
        // assign new size to the datum
        node.datum().size = Math.round(width * height);
    },

    changeSize: function() {
        // get old width and height
        var node = d3.select("[node-id='" + Mindmap.nodeBeingResized.id + "']");
        var nodeRect = node.select("rect.node");
        var nodeWidht = nodeRect.attr("width");
        var nodeHeight = nodeRect.attr("height");
        // calculate coordinates of top-left corner
        if (!Mindmap.start) {
            force.stop();
            Mindmap.start = {
                x:Mindmap.nodeBeingResized.x - nodeWidht/2,
                y:Mindmap.nodeBeingResized.y - nodeHeight/2
            }
        }
        var mouse = d3.mouse(d3.select("g.vis").node());
        // calculate new width and height
        var newWidht = mouse[0] - Mindmap.start.x;
        var newHeight = mouse[1] - Mindmap.start.y;
        Cell.resize(node, newWidht, newHeight, 0);

        // update the size of textfield
        Cell.updateTextField(node);

        // normalize node motion after resuming the force
        Mindmap.nodeBeingResized.x = Mindmap.start.x + newWidht/2;
        Mindmap.nodeBeingResized.y = Mindmap.start.y + newHeight/2;
        Mindmap.nodeBeingResized.px = Mindmap.nodeBeingResized.x;
        Mindmap.nodeBeingResized.py = Mindmap.nodeBeingResized.y;
    },

    updateTextField: function(node) {
        node.select("g.text").remove();
        Cell.appendTextField(node, node.datum().title, false);
    },

    dragged: function(d) {
        d.fixed = true;
        d3.select(this).classed("fixed", true);
    },

    unpin: function(d) {
        d.fixed = false;
        d3.select(this.parentNode).classed("fixed", false);
//        d3.select("[node-id='" + d.id + "']").classed("fixed", false);
    }
};