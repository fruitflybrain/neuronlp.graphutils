GvisInitCallbacks = function () {
    var html = `
    <div id="draggable-window" style="display: none; width: 512px; height:512px;">
        <button type="submit" class="close DraggableClass" onclick="$('#draggable-window').hide()">
            <span style = "font-size: 20px; text-shadow: none;">&times;</span>
        </button>
    <div id="draggable-windowheader"><div style="">Graph View <a id='refreshGraph'><i class="fa fa-refresh" style="color: #ffffff;"></i></a></div></div>
    <div id ="info-graph" style="width: 100%; height: calc(100% - 42px); background-color: #28282d;"></div>
    </div>
    `;
    $(".navbar-fixed-bottom")[0].insertAdjacentHTML('afterend', html);
    $("#refreshGraph").on('click', function (e) {
        window.refreshConnectivity();
    });

    dragElement(document.getElementById("draggable-window"));

    function dragElement(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "header")) {
            document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
        } else {
            elmnt.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    window.sigmagraph = null;
    window.sigmagraphtype = 'none';
    $("#draggable-window").resizable().on('resize', function (e) {
        window.sigmagraph.refresh();
    });
    window.ffbomesh.on("showGraph", function () {
        $('#draggable-window').show();
        window.client.getConnectivityGraph();
        window.sigmagraphtype = 'neuronscale';
    });
    window.ffbomesh.on("showCellGraph", function () {
        $('#draggable-window').show();
        window.client.getCellConnectivityGraph();
        window.sigmagraphtype = 'typescale';
    });
    window.ffbomesh.on("showD3Graph", function () {
        $('#draggable-window').show();
        window.client.getD3ConnectivityGraph();
    });
    window.refreshConnectivity = function () {
        if (window.sigmagraphtype == 'neuronscale') {
            window.client.getConnectivityGraph();
        }
        if (window.sigmagraphtype == 'typescale') {
            window.client.getCellConnectivityGraph();
        }
    }
}


GvisInitGraphs = function () {
    window.client.getConnectivityGraph = function (callback) {
        var _this = window.client;
        function graphDataCallback(data) {
            var morph_data = {};
            var nodes = data['nodes'];
            var edges = data['edges'];
            _this.graph['nodes'] = Object.assign({}, _this.graph['nodes'], nodes);
            _this.graph['edges'] = _this.graph['edges'].concat(edges);
        }


        _this.graph = { 'nodes': {}, 'edges': [] };
        queryID = _this.executeNAquery({
            format: "nx",
            query: [
                {
                    action: { method: { add_connecting_synapses: {} } },
                    object: { state: 0 }
                }
            ],
            threshold: "auto",
            temp: true
        }, { success: graphDataCallback });
        _this.status.on("change", function (e) {
            nodes = _this.graph['nodes'];
            edges = _this.graph['edges'];
            let outgoing_edges = edges.filter(edge => nodes[edge[0]].class == 'Neuron');
            let incoming_edges = edges.filter(edge => !outgoing_edges.includes(edge));
            let connectivity = [];
            let g = {
                nodes: [],
                edges: []
            };
            let gnames = [];

            for (let edge of incoming_edges) {
                let edge_id = edge[0];
                let inferred = (nodes[edge[0]].class == 'InferredSynapse') ? 1 : 0;
                let pre_outgoing_edge = outgoing_edges.filter(edge => edge[1] == edge_id);
                if (pre_outgoing_edge.length != 1) {
                    console.error(`Cannot find outgoing edge from presynaptic neuron for edge ${edge}`);
                    continue
                }
                var rgbToHex = function (rgb) {
                    var hex = Number(rgb).toString(16);
                    if (hex.length < 2) {
                        hex = "0" + hex;
                    }
                    return hex;
                };
                var fullColorHex = function (r, g, b) {
                    var red = rgbToHex(r);
                    var green = rgbToHex(g);
                    var blue = rgbToHex(b);
                    return red + green + blue;
                };
                let pre_node = pre_outgoing_edge[0][0];
                let post_node = edge[1];
                let N = nodes[edge_id].N;
                let pre_name = 'uname' in nodes[pre_node] ? nodes[pre_node].uname : nodes[pre_node].name;
                let post_name = 'uname' in nodes[post_node] ? nodes[post_node].uname : nodes[post_node].name;
                if (!gnames.includes(pre_name)) {
                    gnames.push(pre_name);
                    for (i in Object.keys(ffbomesh.meshDict)) {
                        var key = Object.keys(ffbomesh.meshDict)[i];
                        if (ffbomesh.meshDict[key]['uname'] == pre_name) {
                            var code = key;
                        }
                    }
                    g.nodes.push({
                        id: pre_name,
                        label: pre_name,
                        x: Math.random(),
                        y: Math.random(),
                        size: 0.5 + 0.5 * Math.random(),
                        color: '#' + fullColorHex(Math.round(ffbomesh.meshDict[code]['color']['r'] * 255), Math.round(ffbomesh.meshDict[code]['color']['g'] * 255), Math.round(ffbomesh.meshDict[code]['color']['b'] * 255)),
                        code: code
                    });
                }


                if (!gnames.includes(post_name)) {
                    gnames.push(post_name);
                    for (i in Object.keys(ffbomesh.meshDict)) {
                        var key = Object.keys(ffbomesh.meshDict)[i];
                        if (ffbomesh.meshDict[key]['uname'] == post_name) {
                            var code = key;
                        }
                    }
                    console.log('#' + fullColorHex(Math.round(ffbomesh.meshDict[code]['color']['r'] * 255), Math.round(ffbomesh.meshDict[code]['color']['g'] * 255), Math.round(ffbomesh.meshDict[code]['color']['b'] * 255)));
                    g.nodes.push({
                        id: post_name,
                        label: post_name,
                        x: Math.random(),
                        y: Math.random(),
                        size: 0.5 + 0.5 * Math.random(),
                        color: '#' + fullColorHex(Math.round(ffbomesh.meshDict[code]['color']['r'] * 255), Math.round(ffbomesh.meshDict[code]['color']['g'] * 255), Math.round(ffbomesh.meshDict[code]['color']['b'] * 255)),
                        code: code
                    });
                }
                g.edges.push({
                    id: pre_name + ' to ' + post_name,
                    label: pre_name + ' to ' + post_name,
                    source: pre_name,
                    target: post_name,
                    size: Math.random(),
                    color: '#ccc',
                    type: 'arrow'
                });
                connectivity.push([pre_name, post_name, N, inferred])
            }
            window.G = g;
            $('#info-graph').html("");
            $('#info-graph').show();
            $("#info-intro").hide();

            g = {
                nodes: [],
                edges: []
            };

            s = new sigma({
                graph: window.G,
                renderer: {
                    container: document.getElementById('info-graph'),
                    type: 'canvas'
                },
                settings: {
                    labelThreshold: 0,
                    minArrowSize: 10,
                    defaultLabelColor: "#fff",
                    edgeLabelSize: 'proportional'
                }
            });
            s.bind('overNode', (e) => { dynamicNeuronMenu.dispatch.highlight(e['data']['node']['code']); })
            s.bind('clickNode', (e) => { dynamicNeuronMenu.dispatch.toggle(e['data']['node']['code']); })
            s.bind('outNode', (e) => { dynamicNeuronMenu.dispatch.resume(); })
            s.startForceAtlas2({ worker: true, barnesHutOptimize: true, slowDown: 1, linLogMode: 1 });
            window.sigmagraph = s;
            sigma.plugins.dragNodes(s, s.renderers[0]);
            setTimeout(function () { s.stopForceAtlas2(); }, 1000);
        }, queryID);
    }

    window.client.getCellConnectivityGraph = function (callback) {
        getMatches = function (query) {
            keys = Object.keys(ffbomesh.meshDict);
            var matches = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if ('uname' in ffbomesh.meshDict[key]) {
                    if (ffbomesh.meshDict[key]['uname'].includes(query)) {
                        matches.push(key);
                    }
                }
            }
            return matches;
        }

        pinHover = function (query) {
            ffbomesh.unpinAll();
            matches = getMatches(query);
            for (var i = 0; i < matches.length; i++) {
                ffbomesh.pin(matches[i]);
            }
        }

        toggleClick = function (query) {
            ffbomesh.unpinAll();
            matches = getMatches(query);
            for (var i = 0; i < matches.length; i++) {
                ffbomesh.toggle(matches[i]);
            }
        }

        var _this = window.client;
        function graphDataCallback(data) {
            var morph_data = {};
            var nodes = data['nodes'];
            var edges = data['edges'];
            _this.graph['nodes'] = Object.assign({}, _this.graph['nodes'], nodes);
            _this.graph['edges'] = _this.graph['edges'].concat(edges);
        }

        _this.graph = { 'nodes': {}, 'edges': [] };
        queryID = _this.executeNAquery({
            format: "nx",
            query: [
                {
                    action: { method: { add_connecting_synapses: {} } },
                    object: { state: 0 }
                }
            ],
            threshold: "auto",
            temp: true
        }, { success: graphDataCallback });
        _this.status.on("change", function (e) {
            console.log(_this.graph);
            nodes = _this.graph['nodes'];
            edges = _this.graph['edges'];
            let outgoing_edges = edges.filter(edge => nodes[edge[0]].class == 'Neuron');
            let incoming_edges = edges.filter(edge => !outgoing_edges.includes(edge));
            let connectivity = [];
            let g = {
                nodes: [],
                edges: []
            };
            let gnames = [];

            for (let edge of incoming_edges) {
                let edge_id = edge[0];
                let inferred = (nodes[edge[0]].class == 'InferredSynapse') ? 1 : 0;
                let pre_outgoing_edge = outgoing_edges.filter(edge => edge[1] == edge_id);
                if (pre_outgoing_edge.length != 1) {
                    console.error(`Cannot find outgoing edge from presynaptic neuron for edge ${edge}`);
                    continue
                }
                var rgbToHex = function (rgb) {
                    var hex = Number(rgb).toString(16);
                    if (hex.length < 2) {
                        hex = "0" + hex;
                    }
                    return hex;
                };
                var fullColorHex = function (r, g, b) {
                    var red = rgbToHex(r);
                    var green = rgbToHex(g);
                    var blue = rgbToHex(b);
                    return red + green + blue;
                };
                let pre_node = pre_outgoing_edge[0][0];
                let post_node = edge[1];
                let N = nodes[edge_id].N;
                let pre_name = 'name' in nodes[pre_node] ? nodes[pre_node].name : nodes[pre_node].name;
                let post_name = 'name' in nodes[post_node] ? nodes[post_node].name : nodes[post_node].name;
                if (!gnames.includes(pre_name)) {
                    gnames.push(pre_name);
                    for (i in Object.keys(ffbomesh.meshDict)) {
                        var key = Object.keys(ffbomesh.meshDict)[i];
                        if (ffbomesh.meshDict[key]['name'] == pre_name) {
                            var code = key;
                        }
                    }
                    g.nodes.push({
                        id: pre_name,
                        label: pre_name,
                        x: Math.random(),
                        y: Math.random(),
                        size: 0.5 + 0.5 * Math.random(),
                        color: '#' + fullColorHex(Math.round(ffbomesh.meshDict[code]['color']['r'] * 255), Math.round(ffbomesh.meshDict[code]['color']['g'] * 255), Math.round(ffbomesh.meshDict[code]['color']['b'] * 255)),
                        code: code
                    });
                }
                if (!gnames.includes(post_name)) {
                    gnames.push(post_name);
                    for (i in Object.keys(ffbomesh.meshDict)) {
                        var key = Object.keys(ffbomesh.meshDict)[i];
                        if (ffbomesh.meshDict[key]['name'] == post_name) {
                            var code = key;
                        }
                    }
                    console.log('#' + fullColorHex(Math.round(ffbomesh.meshDict[code]['color']['r'] * 255), Math.round(ffbomesh.meshDict[code]['color']['g'] * 255), Math.round(ffbomesh.meshDict[code]['color']['b'] * 255)));
                    g.nodes.push({
                        id: post_name,
                        label: post_name,
                        x: Math.random(),
                        y: Math.random(),
                        size: 0.5 + 0.5 * Math.random(),
                        color: '#' + fullColorHex(Math.round(ffbomesh.meshDict[code]['color']['r'] * 255), Math.round(ffbomesh.meshDict[code]['color']['g'] * 255), Math.round(ffbomesh.meshDict[code]['color']['b'] * 255)),
                        code: code
                    });
                }
                g.edges.push({
                    id: pre_name + ' to ' + post_name,
                    label: pre_name + ' to ' + post_name,
                    source: pre_name,
                    target: post_name,
                    size: Math.random(),
                    color: '#ccc',
                    type: 'arrow'
                });
                connectivity.push([pre_name, post_name, N, inferred])
            }
            window.G = g;
            $('#info-graph').html("");
            $('#info-graph').show();
            $("#info-intro").hide();
            g = {
                nodes: [],
                edges: []
            };
            s = new sigma({
                graph: window.G,
                renderer: {
                    container: document.getElementById('info-graph'),
                    type: 'canvas'
                },
                settings: {
                    labelThreshold: 0,
                    minArrowSize: 10,
                    defaultLabelColor: "#fff",
                    edgeLabelSize: 'proportional'
                }
            });
            s.bind('overNode', (e) => { pinHover(e['data']['node']['label']); })
            s.bind('clickNode', (e) => { toggleClick(e['data']['node']['label']); })
            s.bind('outNode', (e) => { ffbomesh.unpinAll(); })
            s.startForceAtlas2({ worker: true, barnesHutOptimize: true, slowDown: 1, linLogMode: 1 });
            window.sigmagraph = s;
            sigma.plugins.dragNodes(s, s.renderers[0]);
            setTimeout(function () { s.stopForceAtlas2(); }, 1000);
        }, queryID);
    }
}