
function MVV_Map () {

    // Set up the SVG area and margins
    this.margin = { top: 50, right: 20, bottom: 20, left: 60 };
    this.width = 650 - margin.left - margin.right;
    this.height = 600 - margin.top - margin.bottom;

    this.center = [11.57, 48.15]
    this.distances_per_pixel = []

    this.transportChoice = {
        subway: true,
        train: false,
        tram: false
    }

    var projection;
    var pathGenerator;

    var xScale = d3.scaleLinear()
    var yScale = d3.scaleLinear()



    

    var tooltip;

    var me;


    this.init = async function () {
        var that = this;
        me = {lon: 11.585023975988923, lat: 48.12350105123478 } //hochi
        
        d3.select("body")
        .append("svg")
        .style("float", "left")
        .attr("width",  that.width + that.margin.left + that.margin.right)
        .attr("height",  that.height + that.margin.top + that.margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + that.margin.left + "," + that.margin.top + ")")
            .attr("class", "map_content")   
            
        d3.select(".map_content").append("g").attr("class", "stationen");;
            
        d3.select("body").append("div").attr("class", "tooltip")
        tooltip = d3.select(".tooltip");


        // add projection
        projection = d3.geoMercator()
            .center(that.center)
            .scale(120000)
            .translate([ that.width/2, that.height/2 ])
            .clipExtent([[0,0], [width, height]])

        pathGenerator = d3.geoPath().projection(projection);
        
        let pointul = projection.invert([0,0])
        let pointlr = projection.invert([that.width, that.height])
        var lonBbx = [pointul[0], pointlr[0]]
        var latBbx = [pointlr[1], pointul[1]]

        yScale
            .domain(latBbx) //latitude
            .range([that.height, 0]);
            
        xScale
            .domain(lonBbx) //longitude
            .range([0, that.width]);


        //load data
        var [stops, stops_list] = await this.load_stops();
        var stadtteile = await this.load_mapData();
    
        //render Stadtteile
        this.addUI()
        this.addStadtteile(stadtteile);
        this.addColours(stops_list)
        this.addPoints(stops)
        this.addMe(me)
    }

    this.addUI = function() {
        var that = this;

        d3.select("body").append("div").attr("class", "UI")
        
        var data_selection = d3.select(".UI").append("div").attr("class", "UI-div").attr("id", "data-select")
        data_selection.append("p").style("margin", "0px").html("Select Transporttype")
        data_selection
            .append("input")
            .attr("type", "checkbox")
            .attr("id", "subway")
            .attr("name", "subway")
            .attr("value", true)
            .attr("checked", true);
        data_selection.append("label").attr("for", "subway").html("U-Bahn");
        data_selection.append("br");

        data_selection
            .append("input")
            .attr("type", "checkbox")
            .attr("id", "train")
            .attr("name", "train")
            // .attr("value", false)
            // .attr("checked", false);
        data_selection.append("label").attr("for", "train").html("S-Bahn");
        data_selection.append("br");

        data_selection
            .append("input")
            .attr("type", "checkbox")
            .attr("id", "tram")
            .attr("name", "tram")
            // .attr("value", false)
            // .attr("checked", false);
        data_selection.append("label").attr("for", "tram").html("Tram");
        data_selection.append("br");

        d3.selectAll("input")
            .on("change", async function(d) {
                let input = d3.select(d.srcElement)
                let id = input.attr("id")
                let value = input.property("checked")
                that.transportChoice[id] = value;

                var [stops, stops_list] = await that.load_stops();
                that.addColours(stops_list)
                that.addPoints(stops)
            })

    }



    this.load_stops = async function(){
        var data_choice = this.transportChoice
        var conditidion = []
        Object.keys(data_choice).forEach((key) => {
            if (data_choice[key] == true) {
                conditidion.push("(d." + key + " == 'yes')")
            }
        })
        const predicate = new Function('d', `return ${conditidion.join(" || ")};`);
        // var stops = d3.tsv("/data/stops.csv", (d) => {
        var stops = await d3.json("data/osm_stationen.geojson")
        var filtered = filterOSMProperty(stops, predicate)
        var points_list = filtered.features.map(p => p.geometry.coordinates)
        // TODO remove duplicates
        // return (d.subway == true) || (d.tram == true) || (d.train == true)
        return [filtered, points_list]
    }



    this.load_mapData = async function(){
        var stadtteile = await d3.json("data/osm_stadtteilgrenzen.geojson")
        return stadtteile
    }
    
    
    
    this.addColours = function (stops_list) {
        var that = this;

        var stops_list_in_pixel = stops_list.map(d => [xScale(d[0]), yScale(d[1])])
        const delaunay = d3.Delaunay.from(stops_list_in_pixel);

        // Iterate over each pixel
        for (let y = 0; y < that.height; y++) {
            for (let x = 0; x < that.width; x++) {
                // Calculate the distance to each point
                var index_in_points = delaunay.find(x, y)
                var distance = Math.hypot(stops_list_in_pixel[index_in_points][0] - x, stops_list_in_pixel[index_in_points][1] - y);
                that.distances_per_pixel[y * that.width + x] = distance;

            }
        }

        //colour scale
        var maxDistance = Math.max(...that.distances_per_pixel)
        const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([0, maxDistance]);

        // Create an offscreen canvas for pixel manipulation
        const canvas = document.createElement("canvas");
        canvas.width = that.width;
        canvas.height = that.height;
        const ctx = canvas.getContext("2d");

        // Get the image data object
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        var pixelIndex = 0;
        for (let i = 0; i < that.distances_per_pixel.length; i++) {
            const color = d3.color(colorScale(that.distances_per_pixel[i]));
            // Set the RGBA values
            data[pixelIndex] = color.r;     // Red
            data[pixelIndex + 1] = color.g; // Green
            data[pixelIndex + 2] = color.b; // Blue
            data[pixelIndex + 3] = 255;     // Alpha (fully opaque)
            pixelIndex += 4;
        }

        let i = 3;

        // // Put the image data back into the canvas
        ctx.putImageData(imageData, 0, 0);

        // d3.select("image").remove()

        const image = new Image();
        image.onload = function () {
            d3.select(".map_content").selectAll("image")
                .data([""])
                .join("image")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", width)
                .attr("height", height)
                .attr("href", image.src)
                .style("opacity", 0.9)
                .on("mouseover", function (event, d) {
                    tooltip.style("visibility", "visible")
                    // .text((event.x - that.margin.left) + ", " + (event.y - that.margin.top));
                })
                .on("mousemove", function (event, d) {
                    tooltip
                    .text((event.x - that.margin.left) + ", " + (event.y - that.margin.top) + ", "
                     + Math.round(10*(that.distances_per_pixel[(event.y - that.margin.top) * that.width + (event.x - that.margin.left)]))/10)
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function (event, d) {
                    tooltip.style("visibility", "hidden");
                })
                .lower();
        };
        image.src = canvas.toDataURL();
    }

    
    this.addPoints = function(data_points) {
        

        // Draw each borough as a path
        d3.select(".stationen").selectAll("path")
            .data(data_points.features)
            .join("path")
            .attr("d", pathGenerator.pointRadius(3))
            // .attr("d", pathGenerator)
            .attr("fill", (d) => {
                if (d.properties.subway == "yes") {
                    return "blue"
                }
                else if (d.properties.train == "yes") {
                    return "green"
                }
                else if (d.properties.tram == "yes") {
                    return "red"
                }  
            })
            .on("mouseover", function (event, d) {
                tooltip.style("visibility", "visible").text(d.properties.name);
                d3.select(this).attr("fill", "grey")
            })
            .on("mousemove", function (event, d) {
                tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function (event, d) {
                d3.select(this).attr("fill", (d) => {
                    if (d.properties.subway == "yes") {
                        return "blue"
                    }
                    else if (d.properties.subway == "yes") {
                        return "green"
                    }
                    else if (d.properties.tram == "yes") {
                        return "red"
                    }  
                });
                tooltip.style("visibility", "hidden");
            });
            
    }

    this.addMe = function(me_position) {
        d3.select(".map_content").selectAll("circle.me")
            .data([me_position])
            .join("circle")
            .attr("class", "me")
            .attr("cx", d => xScale(d.lon))
            .attr("cy", d => yScale(d.lat))
            .attr("r", 5)
            .attr("fill", "pink");
    }





    this.addStadtteile = function(stadtteile) {
            // console.log("center: " + projection.center())
            // console.log("scale: " + projection.scale())
            // console.log("translate: " + projection.translate())
            // console.log("clipExtent: " + projection.clipExtent())
    
            const boroughsGroup = d3.select(".map_content").append("g").attr("class", "boroughs");

            // Draw each borough as a path
            boroughsGroup.selectAll("path")
                .data(stadtteile.features)
                .join("path")
                .attr("d", pathGenerator)
                // .attr("d", pathGenerator)
                .attr("fill", "none") // No fill by default
                .attr("stroke", "black") // Borough boundaries

    }

    function filterOSMProperty( obj, predicate) {
        let crs = obj.crs
        let name = obj.name
        let type = obj.type
        let features = obj.features

        let new_features = features.filter(function (d) {
            let re = predicate(d.properties)
            return re
            // (d.properties.subway == true) || (d.tram == true) || (d.train == true)
        })

        let result = {
            crs: crs,
            name: name,
            type: type,
            features: new_features
        };

        // for (key in features) {
        //     if (features.hasOwnProperty(key) && !predicate(features[key])) {
        //         result[key] = features[key];
        //     }
        // }

        return result;
    }

return this;
}