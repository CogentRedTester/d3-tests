// https://brendansudol.com/writing/responsive-d3
function responsivefy(svg) {
    // get container + svg aspect ratio
    var container = d3.select(svg.node().parentNode),
        width = parseInt(svg.style("width")),
        height = parseInt(svg.style("height")),
        aspect = width / height;

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg.attr("viewBox", "0 0 " + width + " " + height)
        .attr("perserveAspectRatio", "xMinYMid")
        .call(resize);

    // to register multiple listeners for same event type, 
    // you need to add namespace, i.e., 'click.foo'
    // necessary if you call invoke this function for multiple svgs
    // api docs: https://github.com/mbostock/d3/wiki/Selections#on
    d3.select(window).on("resize." + container.attr("id"), resize);

    // get width of container and resize svg to fit it
    function resize() {
        var targetWidth = parseInt(container.style("width"));
        svg.attr("width", targetWidth);
        svg.attr("height", Math.round(targetWidth / aspect));
    }
}

async function loadjson(file) {
    const response = await fetch(file, { cache: "no-cache" })
    const json = await response.json()
    return json
}

let myData = [40, 10, 20, 60, 30];

// d3.select("#bar_graph1")
//   .call(responsivefy)


d3.selectAll('g.item')
	.append('text')
	.text("A")
	.attr('y', 50)
	.attr('x', 30);

d3.select('.join1')
    .selectAll('circle')
    .data(myData)
    .join('circle')
    .attr('cx', function(d, i) {
        return i * 100;
    })
    .attr('cy', 50)
    .attr('r', function(d) {
        return 0.5 * d;
    })
    .style('fill', d => d > 30 ? "orange" : "teal");

async function generate_table() {
    let architecture = await d3.json("json/test.json")
    // console.log(architecture)

    let table = d3.select("#table1")

    // creating the header
    if (table.select("tr").empty()) {
        table.append("tr")
            .call(function(selection) {
                selection.append("td")

                for (const key in architecture[0].channels) {
                    const channel = architecture[0].channels[key].name
                    selection.append("td")
                        .text(channel)
                }
            })
    }
    
    // creating the data rows
    table.selectAll("tr.data")
        .data(architecture)
        .join(function(enter) {
            return enter.append("tr").classed("data", true)
        })
        .each(function() {
            let row = d3.select(this)
            if (row.select("td").empty()) {
                row.append("td").text(function(d) {
                    return d.name
                })
            }

            row.selectAll("td.data")
                .data(this.__data__.channels)
                .join(function(enter) {
                    return enter.append("td")
                        .classed("data", true)
                        .append("svg")
                        .attr("height", 30)
                        .attr("width", "70")
                        // .call(responsivefy)
                        // .attr("padding-top", "50%")
                }, function(modify) {
                    return modify.select("svg")
                })

                .each(function() {
                    let cell = d3.select(this)
                    let publisher = this.__data__.publish
                    let subscriber = this.__data__.subscribe

                    if (publisher == true) {
                        if (cell.select("rect.publisher").empty())
                            cell.append("rect").classed("publisher", true)
                                .attr("width", "50%")
                                .attr("height", "100%")
                                .attr("fill", "green")
                    } else {
                        cell.select("rect.publisher").remove()
                    }
                    if (subscriber == true) {
                        if (cell.select("rect.subscriber").empty())
                            cell.append("rect").classed("subscriber", true)
                                .attr("width", "50%")
                                .attr("height", "100%")
                                .attr("fill", "orange")
                                .attr("x", "35")
                    } else {
                        cell.select("rect.subscriber").remove()
                    }
                })
        })
}
generate_table()

function get_names(arr, key) {
    if (!key) key = "name"
    let names = []
    for (const city of arr) {
        names.push(city[key])
    }
    return names
}

function bar_chart(randomise) {

    let cities = [
        { name: 'London', population: 8674000},
        { name: 'New York', population: 8406000},
        { name: 'Sydney', population: 4293000},
        { name: 'Paris', population: 2244000},
        { name: 'Beijing', population: 11510000}
    ];

    if (randomise ) {
        cities.unshift({ name: "Adelaide", population: 1200000 })
        for (let city of cities) {
            city.population = Math.round(Math.random() * 10000)*1000
        }
    }

    let w_padding = 120
    let h_padding = 30
    let h_axis = 40
    let w = 800
    let h = 160
    // let margin = {top: 20, right: 150, bottom: 20, left: 10};

    let svg = d3.select("#bar_graph1")
        .attr( "width",  w)
        .attr("height", h + h_padding + h_axis);

    let scale = d3.scaleLinear()
                    .domain([0, d3.max(cities, d => d.population)])
                    .range([0, w - w_padding])

    let axis = d3.axisBottom()
                    .scale(scale)
                    .ticks(6)

    let bandScale = d3.scaleBand()
                        .domain(get_names(cities))
                        .range([0, h])
                        .paddingInner(0.1)
                        .round(true)

    d3.select("#bar1")
        .selectAll("rect")
        .data(cities, d => d.name)
        .join("rect")
        .transition()
        .attr("height", bandScale.bandwidth())
        .attr("y", d =>  bandScale(d.name) )
        .duration(500)
        .attr("width", function(d) {
            // let scale = 0.00004
            return scale(d.population)
        });

    d3.select("#labels1")
        .selectAll("text")
        .data(cities, d => d.name)
        .join("text")
        .transition()
        .duration(500)
        .attr("y", d =>  bandScale(d.name) + bandScale.bandwidth()/2)
        .text(function(d) {
            return d.name
        });

    d3.select("#values1")
        .selectAll("text")
        .data(cities, d => d.name)
        .join("text")
        .transition()
        .duration(500)
        .attr("y", d =>  bandScale(d.name) + bandScale.bandwidth()/2)
        .attr("x", function(d) {
            // let scale = 0.00004
            return scale(d.population) + 3
        })
        .text(function(d) {
            return (d.population / 1000)+"k"
        });
    
    svg.select("g.axis")
        .transition()
        .duration(500)
        .call(axis)
        .attr("transform", "translate(70,"+(h + h_axis + 10)+")")
}
bar_chart()

function scatter_chart(first) {
    let dataset = []
    let num_datapoints = document.getElementById("scatter_num").value

    let xRange = Math.random() * 1000
    let yRange = Math.random() * 1000
    for (let i = 0; i < num_datapoints; i++) {
        let x = Math.random() * xRange
        let y = Math.random() * yRange
        dataset.push([x, y])
    }

    var margin = {top: 30, right: 30, bottom: 50, left: 60};

    let w = 1000 - margin.left - margin.right
    let h = 500 - margin.top - margin.bottom

    let x_scale = d3.scaleLinear()
                    .domain([0, d3.max(dataset, d => d[0])])
                    .range([0, w]);
    let y_scale = d3.scaleLinear()
                    .domain([0, d3.max(dataset, d => d[1])])
                    .range([h, 0]);

    let svg = null

    if (d3.select("#scatter_1").select("g").empty()) {
        svg = d3.select("#scatter_1")
                    .attr("width", w + margin.left + margin.right)
                    .attr("height", h + margin.top + margin.bottom)
                .append("g")
                    .attr("width", w)
                    .attr("height", h)
                    .attr("transform", "translate("+margin.left+","+margin.top+")");
        
        svg.append("g")
            .classed("data", true)
            .attr("clip-path", "url(#scatter-mask)")
            .append("clipPath")
                .attr("id", "scatter-mask")
                .append("rect")
                .attr("y", -margin.top)
                .attr("width", w + margin.right)
                .attr("height", h + margin.top)
        svg.append("g")
            .classed("axis", true)
            .classed("x", true)
        svg.append("g")
            .classed("axis", true)
            .classed("y", true)
    } else {
        svg = d3.select("#scatter_1").select("g")
    }

    svg.select("g.data")
        .selectAll("circle")
        .data(dataset)
        .join(function(enter) {
            return enter.append("circle")
                .attr("cx", d => x_scale(d[0]) )
                .attr("cy", d => y_scale(d[1]) )
                .classed("new", !first)
                .transition()
                .duration(300)
                .attr("r", 3)
        }, function (update) {
            return update.classed("new", false)
                .transition()
                .attr("cx", d => x_scale(d[0]) )
                .attr("cy", d => y_scale(d[1]) )
        })
        .on("click", (_,d) => console.log(d))
        .call(d3.drag().on("drag", function(e, d) {
            d3.select(this)
                .attr("cx", e.x)
                .attr("cy", e.y)
        }))
        .each(function(d) {
            let point = d3.select(this)
            let title = point.select("title")
            if (title.empty()) {
                point.append("title")
                    .text("p( " + d3.format(".4r")(d[0]) + ", " + d3.format(".4r")(d[1]) + " )" )
            } else {
                title.text("p( " + d3.format(".4r")(d[0]) + ", " + d3.format(".4r")(d[1]) + " )" )
            }
        })
    

    let x_axis = d3.axisBottom()
                    .scale(x_scale)
                    .ticks(6);
    let y_axis = d3.axisLeft()
                    .scale(y_scale)
                    .ticks(4);

    svg.select(".axis.x")
        .transition()
        .call(x_axis)
        .attr("transform", "translate(0,"+(h)+")");
    
    svg.select(".axis.y")
        .transition()
        .call(y_axis)
        .attr("transform", "translate("+"0"+",0)");
}
scatter_chart(true)

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

async function force_graph() {
    let microservices = await d3.json("json/test.json")
    let channels = {}
    let nodes = []
    let edges = []

    for (const microservice of microservices) {
        let i = nodes.push({
            name: microservice.name,
            type: "microservice"
        })
        microservice.index = i - 1

        for (const channel of microservice.channels) {
            channels[channel.name] = {}
        }
    }

    for (const channel in channels) {
        let i = nodes.push({
            name: channel,
            type: "channel"
        })
        channels[channel].index = i - 1
    }

    for (const microservice of microservices) {
        for (const channel of microservice.channels) {
            if (channel.publish) {
                edges.push({
                    source: microservice.index,
                    target: channels[channel.name].index,
                    publish: true
                })
            }
            if (channel.subscribe) {
                edges.push({
                    source: channels[channel.name].index,
                    target: microservice.index,
                    subscribe: true
                })
            }
        }
    }

    let w = 600
    let h = 400

    let simulation = d3.forceSimulation()

    let svg = d3.select("#force_1")
        .attr("width", w)
        .attr("height", h)

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

    simulation.nodes(nodes)
        .force("charge", d3.forceManyBody().strength(-500))
        .force("center", d3.forceCenter(w/2, h/2))
        .force("link", d3.forceLink(edges))
        .force("collision", d3.forceCollide().radius(40))
        .on("tick", tick)

}
force_graph()

async function map_aus(file, key) {
    let json = await d3.json(file)
    
    let w = 600
    let h = 500

    let svg = d3.select("#geo_1")

    let zoom = d3.zoom()
        .on("zoom", function(e) {
            svg.select("g.geography")
                .attr("transform", e.transform)
            svg.select("g.labels")
                .attr("transform", e.transform)
        })

    let projection = d3.geoMercator()
        .center([0, -27])
        .rotate([-140, 0])
        .scale(Math.min(h * 1.2, w * 1))
        .translate([w / 2, h / 2])
        .precision(0.1);
    
    let path = d3.geoPath()
        .projection(projection)
    
    svg.call(zoom)
        .attr("width", w)
        .attr("height", h)
    
    svg.select("g.geography")
        .selectAll("path")
        .data(json.features)
        .join("path")
        .attr("d", path)
        .each(function(d) {
            let region = d3.select(this)
            let title = region.select("title")
            if (title.empty())
                title = region.append("title");
            title.text(JSON.stringify(d.properties))
        })
    
    if (key) {
        svg.select("g.labels")
            .selectAll("text")
            .data(json.features)
            .join("text")
            .attr("x", d => path.centroid(d)[0] )
            .attr("y", d => path.centroid(d)[1] )
            .text(d => d.properties[key])
    } else {
        svg.select("g.labels")
            .selectAll("text")
            .remove()
    }
}
map_aus("json/australia.geojson", "STATE_NAME")

async function matrix_svg() {
    let json = await d3.json("json/test.json")

    let cells = []
    for (const microservice of json) {
        for (const channel of microservice.channels) {
            if (! microservice || ! channel) continue;
            cells.push({
                "microservice": microservice.name,
                "channel": channel.name,
                "contents": [channel.publish, channel.subscribe]
            })
        }
    }

    let margin = {top: 10, right: 10, bottom: 10, left: 10};
    let w = 600
    let h = 300

    let w_padded = w - margin.left - margin.right
    let h_padded = h - margin.top - margin.bottom
    let svg = d3.select("#matrix_2")
        .attr("width", w)
        .attr("height", h)
    
    let m_names = get_names(json)
    let c_names = get_names(json[0].channels)
    m_names.unshift("")
    c_names.unshift("")

    let rowScale = d3.scaleBand()
        .domain(m_names)
        .range([margin.top, h_padded])
        // .paddingInner(0.1)
    let colScale = d3.scaleBand()
        .domain(c_names)
        .range([margin.left, w_padded])
        // .paddingInner(0.1)
    
    console.log(colScale.bandwidth() / 2)

    function column_mid(d) {
        let v = colScale(d.name)
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
        .data(json[0].channels)
        .join("text")
        .text( d => d.name )
        .attr("x", column_mid)
        .attr("y", row_mid)
    
    svg.select("g.cells.data")
        .selectAll("g")
        .data(cells)
        .join("g")
        .each(function(cell) {
            d3.select(this)
                .selectAll("rect")
                .data(cell.contents)
                .join("rect")
                .attr("height", rowScale.bandwidth())
                .attr("width", colScale.bandwidth() / 2)
                .attr("x", (_,i) => colScale(cell.channel) + (i * (colScale.bandwidth() / 2)) )
                .attr("y", (_,i) => rowScale(cell.microservice) )
                .each(function(bool, i) {
                    let rect = d3.select(this)
                    if (i == 0)
                        rect.classed("publish", bool)
                    else
                        rect.classed("subscribe", bool)
                })
        })
    
    let vertical = svg.select("g.rules .vertical")
    vertical.selectAll("line")
        .data(json[0].channels)
        .join("line")
        .attr("x1", d => colScale(d.name))
        .attr("y1", rowScale("") )
        .attr("x2", d => colScale(d.name))
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
    
    svg.select("g.rules .mid-vertical")
        .selectAll("line")
        .data(json[0].channels)
        .join("line")
        .attr("x1", d => column_mid(d))
        .attr("y1", rowScale("") + rowScale.bandwidth())
        .attr("x2", d => column_mid(d))
        .attr("y2", h_padded)
}
matrix_svg()
