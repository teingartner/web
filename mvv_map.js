
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
    this.stops;

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
            
        // d3.select(".map_content").append("rect").attr("height", that.height).attr("width", that.width).attr("fill", "grey");
        
        d3.select(".map_content").append("g").attr("class", "imageGroup");
        d3.select(".map_content").append("g").attr("class", "stadtteile");
        d3.select(".map_content").append("g").attr("class", "mapData");
        d3.select(".map_content").append("g").attr("class", "stationen");
        d3.select(".map_content").append("line").attr("class", "line").attr("stroke", "red").attr("stroke-width", 3)
            
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
        this.stops = await this.load_stops();
        var mapData = await this.load_mapData();
    
        //render Stadtteile
        this.addUI()
        this.addMapData(mapData);
        this.addColours()
        this.addPoints()
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
            .attr("checked", true);
        data_selection.append("label").attr("for", "subway").html("U-Bahn");
        data_selection.append("br");

        data_selection
            .append("input")
            .attr("type", "checkbox")
            .attr("id", "train")
            .attr("name", "train")
        data_selection.append("label").attr("for", "train").html("S-Bahn");
        data_selection.append("br");

        data_selection
            .append("input")
            .attr("type", "checkbox")
            .attr("id", "tram")
            .attr("name", "tram")
        data_selection.append("label").attr("for", "tram").html("Tram");
        data_selection.append("br");

        d3.selectAll("input")
            .on("change", async function(d) {
                let input = d3.select(d.srcElement)
                let id = input.attr("id")
                let value = input.property("checked")
                that.transportChoice[id] = value;


                if(that.transportChoice.subway == false &&
                    that.transportChoice.train == false &&
                    that.transportChoice.tram == false)
                    {
                        d3.select("image").remove()
                        d3.selectAll(".station").remove()
                } else {
                    that.stops = await that.load_stops();
                    that.addColours()
                    that.addPoints()
                }

            })

    }



    this.load_stops = async function(){
        
        var data_choice = this.transportChoice
        var condition = []
        Object.keys(data_choice).forEach((key) => {
            if (data_choice[key] == true) {
                condition.push("(d." + key + " == 'yes')")
            }
        })
        if(condition.length > 0) {   
            var stops = await d3.json("data/osm_stationen.geojson")
            const predicate = new Function('d', `return ${condition.join(" || ")};`);
            // var stops = d3.tsv("/data/stops.csv", (d) => {
            var filtered = filterOSMProperty(stops, predicate)
            // TODO remove duplicates
            // return (d.subway == true) || (d.tram == true) || (d.train == true)
            return filtered
        }
        // else {
        //     return {features:[]};
        // }
    }



    this.load_mapData = async function(){
        var stadtteile = await d3.json("data/osm_stadtteilgrenzen.geojson")
        var parks = await d3.json("data/osm_parks.geojson")
        var wasser = await d3.json("data/osm_wasser.geojson")
        return [stadtteile, parks, wasser]
    }
    
    
    
    this.addColours = function () {
        var that = this;
        var stops = that.stops;
        var stops_list = stops.features.map(p => p.geometry.coordinates)
        var stops_list_in_pixel = stops_list.map(d => [xScale(d[0]), yScale(d[1])])
        const delaunay = d3.Delaunay.from(stops_list_in_pixel);

        // Iterate over each pixel
        for (let y = 0; y < that.height; y++) {
            for (let x = 0; x < that.width; x++) {
                // Calculate the distance to each point
                var index_in_points = delaunay.find(x, y)
                var name = stops.features[index_in_points].properties.name;
                var distance = Math.hypot(stops_list_in_pixel[index_in_points][0] - x, stops_list_in_pixel[index_in_points][1] - y);
                that.distances_per_pixel[y * that.width + x] = {dist: distance, name: name, index: index_in_points}

            }
        }

        //colour scale
        var dists = that.distances_per_pixel.map(d=>d.dist)
        var maxDistance = Math.max(...dists)
        var potenz = 1.4
        const colorScale = d3.scaleSequential(d3.interpolateRgb("#f0f9e8", "#7bccc4", "#08589e"))
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
            const color = d3.color(colorScale(that.distances_per_pixel[i].dist ** potenz));
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
            d3.select(".imageGroup").selectAll("image")
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
                    d3.select(".line")
                        .style("visibility", "visible")
                })
                .on("mousemove", function (event, d) {
                    var index = (event.pageY - that.margin.top) * that.width + (event.pageX - that.margin.left)
                    var pixel = that.distances_per_pixel[index]
                    tooltip
                        .html(
                            "closest station: " + pixel.name
                            //  + ", <br> distance: " + Math.round(10*(pixel.dist))/10 
                        )
                        .style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");

                    d3.select(".line")
                        .attr("x1", xScale(that.stops.features[pixel.index].geometry.coordinates[0]))
                        .attr("y1", yScale(that.stops.features[pixel.index].geometry.coordinates[1]))
                        .attr("x2", (event.pageX - that.margin.left))
                        .attr("y2", (event.pageY - that.margin.top))

                    
                })
                .on("mouseout", function (event, d) {
                    // tooltip.style("visibility", "hidden");
                    // d3.select(".line").style("visibility", "hidden")
                })
                // .lower();
        };
        image.src = canvas.toDataURL();
    }

    
    this.addPoints = function() {
        var data_points = this.stops
        // Draw each borough as a path
        d3.select(".stationen").selectAll("path")
            .data(data_points.features)
            .join("path")
            .attr("class", "station")
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
            })
            .raise();
            
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





    this.addMapData = function(mapData) {
        let parks = mapData[1]
        // Draw each borough as a path
        d3.select(".mapData").selectAll(".park")
            .data(parks.features)
            .join("path")
            .attr("class", "park")
            .attr("d", (d) => {
                let path = pathGenerator(d)
                if(path && ((path.match(/Z/g) || []).length > 1) ) {
                    return path.split("Z")[1]
                }   
            })
            .attr("fill", "ForestGreen")
            .attr("stroke", "none")
            .attr("opacity", 0.6)

        var wasser = mapData[2]
        // Draw each borough as a path
        d3.select(".mapData").selectAll(".wasser")
            .data(wasser.features)
            .join("path")
            .attr("class", "wasser")
            .attr("d", (d, i) => {
                let path = pathGenerator(d)
                if(path && ((path.match(/Z/g) || []).length > 1) ) {
                    return path.split("Z")[1]
                }
            })
            // .attr("d", pathGenerator)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("opacity", 0.6)

        var stadtteile = mapData[0]
        // Draw each borough as a path
        d3.select(".stadtteile").selectAll(".borough")
            .data(stadtteile.features)
            .join("path")
            .attr("class", "borough")
            // .attr("d", (d) => {
            //     let path = pathGenerator(d)
            //     if(path) {
            //         return path.split("Z")[1]
            //     }
                
            // })
            .attr("d", pathGenerator)
            .attr("fill", "none") // No fill by default
            .attr("stroke", "#63391d") // Borough boundaries
            .attr("stroke-width", 1.3)

        
  



            

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