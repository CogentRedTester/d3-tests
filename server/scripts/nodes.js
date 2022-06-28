// https://observablehq.com/@d3/force-directed-graph
function drag(simulation) {
    return d3.drag(simulation)
            .on("start.me", function(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            })
            .on("drag.me", function(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            })
            .on("end.me", function(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            })
}

let topology = null;
let simulation = null;
let tick = null;
let update_matrix = null;

function clear_selection() {
    if (!topology) return;
    topology.nodes.forEach( n => n.selected = false );
    topology.edges.forEach( e => e.selected = false );
}

function select_up(node) {

}

function select_edge_down(node, depth, references) {
    // if (depth > 2) return;
    if (references[node.index]) return;
    references[node.index] = true;

    node.outEdges.forEach( edge => {
        edge.selected = true;
        select_edge_down(edge.targetNode, depth + 1, references);
    });
}

function select(node) {
    let data = node.__data__;
    // console.log(data);

    if (data.type != "microservice") return;

    let select = !data.selected;
    clear_selection()
    if (select) {
        data.selected = true;
        select_edge_down(data, 0, {});
    }

    update();
}

function svg_zoom(svg, enable) {
    if (enable === false) {
        return svg.on(".zoom", null);
    }

    let zoom = d3.zoom()
        .on("zoom", function(e) {
            svg.selectAll("svg > g")
                .attr("transform", e.transform)
        });
    return svg.call(zoom);
}

function force_graph(topology) {
    kill_simulation();

    let w = 900;
    let h = 600;

    simulation = d3.forceSimulation();

    let svg = d3.select("#force_1")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${w} ${h}`)
        .call(svg_zoom);

    tick = function() {
        svg.select("g.edges")
            .selectAll("line")
            .data(topology.edges)
            .join("line")
            .attr("marker-end", d => d.type == "publish" ? "url(#arrowhead-publish)" : "url(#arrowhead-subscribe)")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .classed("publish", d => d.type == "publish")
            .classed("subscribe", d => d.type == "subscribe" || d.type == "dependency")
            .classed("selected", edge => edge.selected );

        svg.select("g.nodes")
            .selectAll("circle")
            .data(topology.nodes)
            .join("circle")
            .call(drag(simulation))
            .attr("r", d => d.type == "microservice" ? 20 : 15)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .classed("microservice", d => d.type == "microservice")
            .classed("channel", d => d.type == "channel")
            .classed("selected", d => d.selected)
            .on("click", function(d) {
                select(this)
            });
        
        svg.select("g.labels")
            .selectAll("text")
            .data(topology.nodes)
            .join("text")
            .text(d => d.name)
            .attr("x", d => d.x)
            .attr("y", d => d.y)
    }

    // creates repulsion between microservice nodes only
    // https://stackoverflow.com/questions/39575319/partial-forces-on-nodes-in-d3-js/39597440#39597440
    let custom_repulsion = d3.forceManyBody();
    let original_init = custom_repulsion.initialize;
    custom_repulsion.initialize = function(nodes) {
        original_init(nodes.filter(function(n) { return n.type == "microservice" } ));
    }

    // let custom_leftright = d3.forceX();
    // let original_init_leftright = custom_leftright.initialize;
    // original_init_leftright

    // let force_strength = d3.scaleLinear()
    //     .domain([
    //         d3.min(microservices, d => d.num_subscribers - d.num_publishers),
    //         d3.max(microservices, d => d.num_subscribers - d.num_publishers)
    //     ])
    //     .range([1, 0])

    simulation.nodes(topology.nodes)
        // .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(w/2, h/2).strength(0.1))
        .force("m_repulsion", custom_repulsion.strength(-1000))
        .force("charge", d3.forceManyBody().strength(-100))
        // .force("centerx", d3.forceX(w/2).strength(0.05))
        // .force("centery", d3.forceY(h/2).strength(0.05))
        .force("link", d3.forceLink(topology.edges).distance(100))
        .force("collision", d3.forceCollide().radius(30))
        // .force("x_pos", d3.forceX(Number.MIN_VALUE).strength( d => {
        //     if (d.type == "channel") return 0;
        //     let strength = force_strength(d.original_obj.num_subscribers - d.original_obj.num_publishers);
        //     console.log(d, strength);
        //     return strength;
        // } ))
        .on("tick", tick)

}

function get_names(arr, key) {
    if (!key) key = "name"
    let names = []
    for (const city of arr) {
        names.push(city[key])
    }
    return names
}

async function matrix_svg(json, topology) {
    let cells = [];
    let channels = new Set();
    for (const microservice of json) {
        for (const name in microservice.channels) {
            const channel = microservice.channels[name];
            if (! microservice || ! channel) continue;
            channels.add(name);

            cells.push({
                "microservice": microservice.name,
                "channel": name,
                "contents": {
                    publish: channel.publish,
                    subscribe: channel.subscribe
                }
            })
        }
    }

    let svg = d3.select("#matrix_2");
    let margin = {top: 10, right: 10, bottom: 10, left: 10};
    let w = 900;
    let h = 600;

    let w_padded = w - margin.left - margin.right;
    let h_padded = h - margin.top - margin.bottom;

    if (document.getElementById("scroll_checkbox").checked) {
        h_padded = Math.max(h_padded, json.length * 15);
        svg.call(svg_zoom, false);
    } else {
        svg.call(svg_zoom);
    }

    svg.attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${w} ${h_padded}`);
    
    // d3.select("#matrix_2_container")
    //     .style("width", w+"px")
    //     .style("height", h+"px")
    
    channels = Array.from(channels).sort( (a,b) => a.localeCompare(b) );
    let m_names = get_names(json).sort( (a,b) => a.localeCompare(b) );
    let c_names = channels.slice(0);
    m_names.unshift("");
    c_names.unshift("");

    let rowScale = d3.scaleBand()
        .domain(m_names)
        .range([margin.top, h_padded])
        // .paddingInner(0.1)
    let colScale = d3.scaleBand()
        .domain(c_names)
        .range([margin.left, w_padded])
        // .paddingInner(0.1)

    function column_mid(d) {
        let v = colScale(d)
        if (!v) v = colScale("")
        return v + colScale.bandwidth() / 2
    }

    function row_mid(d) {
        let v = rowScale(d.name)
        if (!v) v = rowScale("")
        return v + rowScale.bandwidth() / 2
    }

    update_matrix = function() {
        svg.select("g.headers.rows")
            .selectAll("text")
            .data(json)
            .join("text")
            .text(d => d.name)
            .attr("x", column_mid)
            .attr("y", row_mid )
        
        svg.select("g.headers.columns")
            .selectAll("text")
            .data(channels)
            .join("text")
            .text( d => d )
            .attr("x", column_mid)
            .attr("y", row_mid)
        
        svg.select("g.cells.data")
            .selectAll("g")
            .data(cells)
            .join("g")
            .each(function(cell) {
                let height = rowScale.bandwidth();
                let width = colScale.bandwidth();
                let y = rowScale(cell.microservice);
                let x = colScale(cell.channel);

                let g = d3.select(this);
                g.selectAll("polygon").remove();

                if (cell.contents.publish) {
                    g.append("polygon")
                        .attr("points", `${x},${y} ${x},${y+height} ${(x+width)-(width/10)},${y+(height/2)}`)
                        .classed("publish", true)
                }

                if (cell.contents.subscribe) {
                    g.append("polygon")
                        .attr("points", `${x},${y} ${x+width},${y} ${x+width},${y+height} ${x},${y+height} ${(x+width)-(width/10)},${y+(height/2)}`)
                        .classed("subscribe", true)
                }
            });
        
        let vertical = svg.select("g.rules .vertical")
        vertical.selectAll("line")
            .data(channels)
            .join("line")
            .attr("x1", d => colScale(d))
            .attr("y1", rowScale("") )
            .attr("x2", d => colScale(d))
            .attr("y2", h_padded)
        
        vertical.append("line")
            .attr("x1", w_padded)
            .attr("y1", rowScale(""))
            .attr("x2", w_padded)
            .attr("y2", h_padded)

        let horizontal = svg.select("g.rules .horizontal")
        horizontal.selectAll("line")
            .data(json)
            .join("line")
            .attr("x1", colScale(""))
            .attr("y1", d => rowScale(d.name))
            .attr("x2", w_padded )
            .attr("y2", d => rowScale(d.name))
        
        horizontal.append("line")
            .attr("x1", colScale(""))
            .attr("y1", h_padded)
            .attr("x2", w_padded)
            .attr("y2", h_padded)
        
        let highlights = svg.select("g.highlights");
        highlights.selectAll("rect")
            .data(topology.nodes.filter(d => d.type == "microservice"))
            .join("rect")
            .attr("x", 0)
            .attr("y", d => rowScale(d.name))
            .attr("width", w_padded)
            .attr("height", rowScale.bandwidth())
            .classed("selected", d => d.selected)
            .classed("highlight", true)
            .classed("background", true)
            .on("click", function(d) {
                this.__data__.type = "microservice";
                this.__data__.original_obj = this.__data__;
                select(this, json);
            });
    }

    update_matrix();
}

function generate_random() {
    let num_services = document.getElementById("num_m").value;
    let num_channels = document.getElementById("num_ch").value;
    let num_connections = document.getElementById("num_con").value;

    let microservices = [];
    let channels = [];

    if (num_services == "") num_services = Math.round(Math.random() * 500);
    if (num_services < 2) num_services = 2;

    if (num_channels == "") num_channels = Math.round(Math.random() * 100);
    for (let index = 0; index < num_channels; index++) {
        channels.push({ name: String(index + 1).padStart( Math.ceil(Math.log10(parseFloat(num_channels)+1)), '0' ) });
    }

    for (let index = 0; index < num_services; index++) {
        let microservice = {};
        microservice.name = "M"+String(index + 1).padStart( Math.ceil(Math.log10(parseFloat(num_services)+1)), '0' );
        microservice.channels = {};

        if (num_connections == "") {
            num_connections = Math.ceil(Math.random() * Math.max(num_channels/10, Math.min(num_channels, 5)));
        }
        for (let i = 0; i < num_connections; i++) {
            let index = Math.floor(Math.random() * num_channels);
            let connection = { name: channels[index].name };

            let r = Math.random();
            if (r < 0.1) {
                connection.publish = true;
                connection.subscribe = true;
            } else if (r < 0.5) {
                connection.publish = true;
            } else {
                connection.subscribe = true;
            }

            microservice.channels[connection.name] = connection;
        }

        microservices.push(microservice);
    }

    return microservices;
}

function make_edge(type, source, target) {
    return {
        type: type,
        source: source.index,
        target: target.index,
        sourceNode: source,
        targetNode: target,
    }
}

function setup_edges(json) {
    let show_channels = document.getElementById("channel_checkbox").checked

    let nodes = [];
    let edges = [];
    let channels = {};

    for (const microservice of json) {
        let n = {
            type: "microservice",
            data: microservice,
            name: microservice.name,
            inEdges: [],
            outEdges: [],
        };
        let index = nodes.push(n);
        microservice.node = n;
        n.index = index - 1;

        for (const channel in microservice.channels) {
            let n = channels[channel];
            if (!n) {
                n = {
                    publishers: new Set(),
                    subscribers: new Set()
                };
                channels[channel] = n;
            }

            microservice.channels[channel].node = n;
            if (microservice.channels[channel].publish) n.publishers.add(microservice.node);
            if (microservice.channels[channel].subscribe) n.subscribers.add(microservice.node);
        }
    }

    if (show_channels) {
        for (const channel in channels) {
            let n = channels[channel];
            n.type = "channel";
            n.name = channel;
            n.inEdges = [];
            n.outEdges = [];
            
            let index = nodes.push(n);
            n.index = index - 1;
        }
    }

    for (const microservice of json) {
        for (const channel in microservice.channels) {
            const element = microservice.channels[channel];

            if (show_channels) {
                if (element.publish) {
                    let edge = make_edge("publish", microservice.node, element.node)
                    microservice.node.outEdges.push(edge);
                    element.node.inEdges.push(edge);
                    let i = edges.push(edge);
                    edge.index = i - 1;
                }

                if (element.subscribe) {
                    let edge = make_edge("subscribe", element.node, microservice.node)
                    element.node.outEdges.push(edge);
                    microservice.node.inEdges.push(edge);
                    let i = edges.push(edge);
                    edge.index = i - 1;
                }
            } else {
                if (element.publish) {
                    channels[channel].subscribers.forEach( ms => {
                        console.log(ms);
                        let edge = make_edge("dependency", microservice.node, ms);
                        microservice.node.outEdges.push(edge);
                        ms.inEdges.push(edge);
                        let i = edges.push(edge);
                        edge.index = i - 1;
                    });
                }

                // if (element.subscribe) {
                //     channels[channel].publishers.forEach( ms => {
                //         console.log(ms);
                //         let edge = make_edge("dependency", microservice.node, ms);
                //         microservice.node.outEdges.push(edge);
                //         ms.inEdges.push(edge);
                //         let i = edges.push(edge);
                //         edge.index = i - 1;
                //     });
                // }
            }
        }
    }

    return {nodes: nodes, edges: edges}
}

function update() {
    tick();
    update_matrix();
}

function search() {
    if (!topology) return;
    clear_selection();
    let input = document.getElementById('searchbar').value
    if (input == "") return update();

    input = input.toLowerCase();

    topology.nodes.forEach( node => {
        if (node.name.toLowerCase().indexOf(input) != -1) {
            node.selected = true;
        }
    })

    update();
}

function kill_simulation() {
    if (simulation)
        simulation.stop();
}

function resetZoom(element) {
    d3.select(element)
        .selectAll("svg > g")
        .attr("transform", "")
}


async function json_graph() {
    clear_selection();
    let json = await d3.json("json/microservice_dump.json");
    topology = setup_edges(json);
    force_graph(topology);
    matrix_svg(json, topology);
}

async function random_graph() {
    let random = generate_random();
    clear_selection();

    topology = setup_edges(random);

    force_graph(topology);
    matrix_svg(random, topology);
}

json_graph()
