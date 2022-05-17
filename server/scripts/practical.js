let stroke_color = "black"
let stroke_width = 2
let da = d3.select("#drawing-area")

// function set_attributes(obj) {
//     for (const key in object) {
        
//     } {

//     }
// }

let circle = da.append("circle")
                .attr("cx", 50)
                .attr("cy", 50)
                .attr("r", 40)
                .attr("fill", "yellow")
                .attr("stroke", stroke_color)
                .attr("stroke-width", stroke_width)

let rect = da.append("rect").attr()