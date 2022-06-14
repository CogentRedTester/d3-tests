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

let selected = {
    microservice: new Set(),
    channel: new Set()
};
let simulation = null

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

function force_graph(microservices) {
    selected.microservice.clear();
    selected.channel.clear();
    kill_simulation();

    let w = 900
    let h = 600
    let channels = {}
    let nodes = []
    let edges = []

    for (const microservice of microservices) {
        let i = nodes.push({
            name: microservice.name,
            type: "microservice",
            // x: w/2,
            // y: h/2
        })
        microservice.index = i - 1
        for (const channel in microservice.channels) {
            channels[channel] = {}
        }
    }

    for (const channel in channels) {
        let i = nodes.push({
            name: channel,
            type: "channel",
            // x: w/2,
            // y: h/2
        })
        channels[channel].index = i - 1
    }

    for (const microservice of microservices) {
        for (const channel in microservice.channels) {
            const element = microservice.channels[channel]
            if (element.publish) {
                edges.push({
                    source: microservice.index,
                    target: channels[channel].index,
                    publish: true
                })
            }
            if (element.subscribe) {
                edges.push({
                    source: channels[channel].index,
                    target: microservice.index,
                    subscribe: true
                })
            }
        }
    }

    simulation = d3.forceSimulation()

    let svg = d3.select("#force_1")
        .attr("width", w)
        .attr("height", h)
        .call(svg_zoom);

    function tick() {
        svg.select("g.edges")
            .selectAll("line")
            .data(edges)
            .join("line")
            .attr("marker-end", d => d.publish ? "url(#arrowhead-publish)" : "url(#arrowhead-subscribe)")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .classed("publish", d => d.publish)
            .classed("subscribe", d => d.subscribe)

        svg.select("g.nodes")
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .call(drag(simulation))
            .attr("r", d => d.type == "microservice" ? 20 : 15)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .classed("microservice", d => d.type == "microservice")
            .classed("channel", d => d.type == "channel")
            .on("click", function(d) {
                let data = this.__data__;

                let node = d3.select(this);
                let select = !this.classList.contains("selected");
                node.classed("selected", select);

                if (select) selected[data.type].add(data.name)
                else selected[data.type].delete(data.name);
                matrix_svg(microservices);
            });
        
        svg.select("g.labels")
            .selectAll("text")
            .data(nodes)
            .join("text")
            .text(d => d.name)
            .attr("x", d => d.x)
            .attr("y", d => d.y)
    }

    // https://stackoverflow.com/questions/39575319/partial-forces-on-nodes-in-d3-js/39597440#39597440
    let custom_repulsion = d3.forceManyBody();
    let original_init = custom_repulsion.initialize;
    custom_repulsion.initialize = function(nodes) {
        original_init(nodes.filter(function(n) { return n.type == "microservice" } ));
    }

    simulation.nodes(nodes)
        // .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(w/2, h/2).strength(0.1))
        .force("m_repulsion", custom_repulsion.strength(-1000))
        .force("charge", d3.forceManyBody().strength(-100))
        // .force("centerx", d3.forceX(w/2).strength(0.05))
        // .force("centery", d3.forceY(h/2).strength(0.05))
        .force("link", d3.forceLink(edges).distance(100))
        .force("collision", d3.forceCollide().radius(30))
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

async function matrix_svg(json) {
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
                // "contents": [channel.publish, channel.subscribe]
                "contents": {
                    publish: channel.publish,
                    subscribe: channel.subscribe
                }
            })
        }
    }
    
    // json.forEach(microservice => {
    //     channels.forEach( channel => {
    //         cells.push({
    //             "microservice": microservice.name,
    //             "channel": channel,
    //             "contents": [
    //                 microservice.channels[channel] && microservice.channels[channel].publish,
    //                 microservice.channels[channel] && microservice.channels[channel].subscribe
    //             ]
    //         })
    //     })
    // });

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

    svg.attr("width", w)
        .attr("height", h_padded)
        // .attr("viewbox", "0,0,"+w+','+h)
        // .call(svg_zoom);
    
    d3.select("#matrix_2_container")
        .style("width", w+"px")
        .style("height", h+"px")
    
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

                // .selectAll("polygon")
                // .data(cell.contents)
                // .join("polygon")
                // .attr("height", height)
                // .attr("width", width)
                // .attr("points", function(d, i) {
                //     if (i == 0) { //publish
                //         return `${x},${y} ${x},${y+height} ${(x+width)-(width/10)},${y+(height/2)}`;
                //     } else { //subscribe
                //         return "";
                //     }
                // })
                // .attr("display", d => d ? "" : "none")
                // .classed("publish", (d, i) => i == 0 && d)
                // .classed("subscribe", (d, i) => i == 1 && d)
                // .attr("x", (_,i) => colScale(cell.channel) + (i * (colScale.bandwidth() / 2)) )
                // .attr("y", (_,i) => rowScale(cell.microservice) )
                // .each(function(bool, i) {
                //     let rect = d3.select(this)
                //     if (i == 0)
                //         rect.classed("publish", bool)
                //     else
                //         rect.classed("subscribe", bool)
                // })
            
            // if (cell.publish) {
            //     g.append("polygon")
            //         .attr("points", "0,0 0,100 90,50")
            //         .classed("publish")
            // }
        })
    
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
        .data(selected.microservice)
        .join("rect")
        .attr("x", 0)
        .attr("y", d => rowScale(d))
        .attr("width", w_padded)
        .attr("height", rowScale.bandwidth())
        .classed("selected", true)
        .classed("highlight", true);
    
    // svg.select("g.rules .mid-vertical")
    //     .selectAll("line")
    //     .data(channels)
    //     .join("line")
    //     .attr("x1", d => column_mid(d))
    //     .attr("y1", rowScale("") + rowScale.bandwidth())
    //     .attr("x2", d => column_mid(d))
    //     .attr("y2", h_padded)
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
    force_graph(await d3.json("json/microservice_dump.json"))
}

json_graph();

async function matrix_json() {
    matrix_svg(await d3.json("json/microservice_dump.json"))
}

async function random_graph() {
    let random = generate_random();
    force_graph(random);
    matrix_svg(random);
}

matrix_json()
