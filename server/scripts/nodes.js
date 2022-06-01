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

let simulation = null

function force_graph(microservices) {
    if (simulation) simulation.stop();
    let w = 1200
    let h = 600
    let channels = {}
    let nodes = []
    let edges = []

    for (const microservice of microservices) {
        console.log(microservice)
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

    let zoom = d3.zoom()
        .on("zoom", function(e) {
            svg.selectAll("g")
                .attr("transform", e.transform)
            // svg.select("g.labels")
            //     .attr("transform", e.transform)
        })
    svg.call(zoom)

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

function random_graph() {
    let num_services = document.getElementById("num_m").value;
    let num_channels = document.getElementById("num_c").value;

    let microservices = [];
    let channels = [];

    if (num_services == "") num_services = Math.round(Math.random() * 500);
    if (num_services < 2) num_services = 2;

    if (num_channels == "") num_channels = Math.round(Math.random() * 100);
    for (let index = 0; index < num_channels; index++) {
        channels.push({ name: (index + 1).toString() });
    }

    for (let index = 0; index < num_services; index++) {
        let microservice = {};
        microservice.name = "M"+(index + 1);
        microservice.channels = {};


        let num_connections = Math.ceil(Math.random() * Math.max(num_channels/10, Math.min(num_channels, 5)));
        for (let i = 0; i < num_connections; i++) {
            let index = Math.floor(Math.random() * num_channels);
            console.log(index)
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

    force_graph(microservices)
}

async function json_graph() {
    force_graph(await d3.json("json/microservice_dump.json"))
}

json_graph();