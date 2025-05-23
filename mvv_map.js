//TODO mit Einwohnerdichte verrechnen
// Bei Hover über Area nächste Station anzeigen (einfärben?)
// Isolines
// wie verändert ubahn/Sbahn/Tram die durchschnittliche Distanz zur nächsten Station
// Story!

function MVV_Map () {
    var debug = false;

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
    // data
    this.stops;
    this.stadtteile;
    this.parks;
    this.wasser;
    this.strassen;
    
    var projection;
    this.projScale;
    var lonBbx;
    var latBbx;
    var pathGenerator;

    var colours = {
        subway: "#2863A6",
        train: "#009D41",
        tram: "#E62D26",
        parks: "#92ce7e",
        wasser: "#6683B0"
    }

    var xScale = d3.scaleLinear()
    var yScale = d3.scaleLinear()

    var marienplatz = { lat: 48.137154, lon: 11.576124 }; // Coordinates for Marienplatz

    // add chart for distances
    const chart_margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const chart_width = 400 - chart_margin.left - chart_margin.right;
    const chart_height = 200 - chart_margin.top - chart_margin.bottom;

    

    var tooltip;

    this.me;


    this.init = async function () {
        var that = this;
        that.me = {lon: 11.585023975988923, lat: 48.12350105123478 } //hochi
        
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
        d3.select(".mapData").append("g").attr("class", "greenery").attr("opacity", 0.7);
        d3.select(".mapData").append("g").attr("class", "water");
        d3.select(".mapData").append("g").attr("class", "boroughs");
        d3.select(".mapData").append("g").attr("class", "strassen");
        d3.select(".mapData").append("g").attr("class", "circle_points");

        d3.select(".map_content").append("g").attr("class", "stationen");
        d3.select(".map_content").append("line").attr("class", "line").attr("stroke", "red").attr("stroke-width", 3)
            
        d3.select("body").append("div").attr("class", "tooltip")
        tooltip = d3.select(".tooltip");


        // add projection
        this.projScale = 120000;
        projection = d3.geoMercator()
            .center(that.center)
            .scale(this.projScale)
            .translate([ that.width/2, that.height/2 ])
            .clipExtent([[0,0], [that.width, that.height]])

        pathGenerator = d3.geoPath().projection(projection);
        
        let pointul = projection.invert([0,0])
        let pointlr = projection.invert([that.width, that.height])
        lonBbx = [pointul[0], pointlr[0]]
        latBbx = [pointlr[1], pointul[1]]

        yScale
            .domain(latBbx) //latitude
            .range([that.height, 0]);
            
        xScale
            .domain(lonBbx) //longitude
            .range([0, that.width]);


        d3.select(".map_content")
            .on("click", function(event) {
                let coords = projection.invert([event.pageX - that.margin.left, event.pageY - that.margin.top]);
                const coordinates = {lon: coords[0], lat: coords[1]}
                that.me = coordinates
                let pixel = distances_per_pixel[Math.round(yScale(coordinates.lat)) * that.width + Math.round(xScale(coordinates.lon))]
                that.addMe();
                that.updateChart();
                that.addInfoToUI(pixel);
            })
        //     .on("mouseover", function (event, d) {
        //         tooltip.style("visibility", "visible")
        //         .text((event.x - that.margin.left) + ", " + (event.y - that.margin.top));
        //         d3.select(".line")
        //             .style("visibility", "visible")
        //     })
        //     .on("mousemove", function (event, d) {
        //         var index = (event.pageY - that.margin.top) * that.width + (event.pageX - that.margin.left)
        //         var pixel = that.distances_per_pixel[index]
        //         if(pixel) {
        //             tooltip
        //                 .html(
        //                     "closest station: " + pixel.name
        //                     //  + ", <br> distance: " + Math.round(10*(pixel.dist))/10 
        //                 )
        //                 .style("top", (event.pageY - 10) + "px")
        //                 .style("left", (event.pageX + 10) + "px")
        //                 .style("visibility", "visible");

        //             d3.select(".line")
        //                 .attr("x1", xScale(that.stops.features[pixel.index].geometry.coordinates[0]))
        //                 .attr("y1", yScale(that.stops.features[pixel.index].geometry.coordinates[1]))
        //                 .attr("x2", (event.pageX - that.margin.left) + 2)
        //                 .attr("y2", (event.pageY - that.margin.top) + 2)
        //                 .style("visibility", "visible");
        //         }
        //     })
        //     .on("mouseout", function (event, d) {
        //             let new_object = d3.select(event.relatedTarget)
        //             if( new_object._groups[0][0] && new_object.attr("class") != "line" ) {
        //                 tooltip.style("visibility", "hidden");
        //                 d3.select(".line").style("visibility", "hidden")
        //             }
        //     })


            // d3.select(".map_content").call(
            //     d3.zoom()
            //     .scaleExtent([1, 8]) // Set the zoom scale extent
            //     .on("zoom", function(event) {
            //         d3.select(this)
            //             .attr("transform", event.transform);
            //         })
            // );

            

            // .call(d3.zoom().on('zoom', async function(d){
            //     that.projScale += 100*d.sourceEvent.wheelDelta
            //     projection.scale(that.projScale)

            //     let pointul = projection.invert([0,0])
            //     let pointlr = projection.invert([that.width, that.height])
            //     lonBbx = [pointul[0], pointlr[0]]
            //     latBbx = [pointlr[1], pointul[1]]

            //     yScale.domain(latBbx);
            //     xScale.domain(lonBbx);

            //     await that.addMapData();
            //     that.addColours()
            //     that.addPoints()
            //     that.addMe(me)
            // }))
        this.addUI()



        d3.select("body")
            .append("svg")
            .attr("class", "histogram")
            .attr("width", chart_width + chart_margin.left + chart_margin.right)
            .attr("height", chart_height + chart_margin.top + chart_margin.bottom)
            .append("g")
                .attr("transform", `translate(${chart_margin.left},${chart_margin.top})`)
                .attr("class", "histogram_content")
            .append("rect").attr("height", chart_height).attr("width", chart_width).attr("fill", "#f2f2f2").attr("x", 0).attr("y", 0);

        d3.select("body")
            .append("svg")
            .attr("class", "distance_histogram")
            .attr("width", chart_width + chart_margin.left + chart_margin.right)
            .attr("height", chart_height + chart_margin.top + chart_margin.bottom)
            .append("g")
                .attr("transform", `translate(${chart_margin.left},${chart_margin.top})`)
                .attr("class", "distance_histogram_content")
            .append("rect").attr("height", chart_height).attr("width", chart_width).attr("fill", "#f2f2f2").attr("x", 0).attr("y", 0);

        

        // marienplatz details
        marienplatz.x = xScale(marienplatz.lon)
        marienplatz.y = yScale(marienplatz.lat)
        marienplatz.imageIndex = Math.round(marienplatz.y) * that.width + Math.round(marienplatz.x)


        //load data
        this.stops = await this.load_stops();
        var [stadtteile, parks, wasser, strassen] = await this.load_mapData();
        this.stadtteile = rewind(stadtteile, true)
        this.parks = rewind(parks, true)
        this.wasser = rewind(wasser, true)
        this.strassen = strassen
    
        //render Stadtteile
        
        that.addMapData();
        that.addColours()
        that.addPoints()
        that.addMe();
        that.addIsoline(30)
        // that.updateChart();
        // that.newChart();

      

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

        var address_input = d3.select(".UI").append("div").attr("class", "UI-div").attr("id", "address-input")
        address_input.append("p").style("margin", "0px").html("Enter Address")
        address_input
            .append("input")
            .attr("type", "text")
            .attr("id", "address")
            .attr("name", "address");

        address_input
            .append("button")
            .attr("id", "geocode-button")
            .html("Add to Map")

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
                        d3.selectAll(".histogram").remove()
                } else {
                    that.stops = await that.load_stops();
                    that.addColours()
                    that.addPoints()
                    that.updateChart()
                    that.newChart()
                }

            })

        var address_invo = d3.select(".UI").append("div").attr("class", "UI-div").attr("id", "address-info")

        // Add event listener to the button

        document.getElementById("geocode-button").addEventListener("click", async function() {
            handleGeocode();
        });

        // Add event listener to the input field for the Enter key
        document.getElementById("address").addEventListener("keydown", async function(event) {
            if (event.key === "Enter") {
                handleGeocode();
            }
        });

        // Function to handle adding the point to the map
        async function handleGeocode() {
            const address = document.getElementById("address").value;
            try {
                if(address == "") {
                    d3.select(".me").remove()
                } else {
                    const coordinates = await getCoordinates(address);
                    this.me = coordinates;
                    let pixel = distances_per_pixel[Math.round(yScale(coordinates.lat)) * that.width + Math.round(xScale(coordinates.lon))]
                    
                    // Add the point to the map
                    that.addMe();
                    that.updateChart();
                    that.addInfoToUI(pixel);

                    
                }
            } catch (error) {
                alert(error.message);
            }
        }

    }

    this.addInfoToUI = function(pixel) {
        var that = this;

        d3.select("#address-info").selectAll("p")
        .data([pixel])
        .join("p")
        .html(d => "Coordinates: " + d.lat.toFixed(2) + ", " + d.lon.toFixed(2) +
            "<br> Closest Station: " + d.name + "<br> Distance to next Station: "
            + haversineDistance(d, {lon: that.stops.features[pixel.index_to_station].geometry.coordinates[0], 
                lat: that.stops.features[pixel.index_to_station].geometry.coordinates[1]
            }).toFixed(3) + "km")
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
            return filtered
        }
        // else {
        //     return {features:[]};
        // }
    }

    this.load_mapData = async function(){
        var stadtteile = await d3.json("data/osm_stadtteilgrenzen.geojson")
        var parks = await d3.json("data/osm_parks_forests.geojson")
        var wasser = await d3.json("data/osm_wasser.geojson")
        var strassen = await d3.json("data/osm_strassen.geojson")
        return [stadtteile, parks, wasser, strassen]
    }

    this.computePixelData = function() {
        var that = this;
        var stops = that.stops;
        var stops_list = stops.features.map(p => p.geometry.coordinates)
        var stops_list_in_pixel = stops_list.map(d => [xScale(d[0]), yScale(d[1])])
        const delaunay = d3.Delaunay.from(stops_list_in_pixel);

        // Iterate over each pixel
        for (let y = 0; y < that.height; y++) {
            var lat = yScale.invert(y)
            for (let x = 0; x < that.width; x++) {
                var lon = xScale.invert(x)

                // Calculate the distance to each point
                var index_in_points = delaunay.find(x, y)
                var name = stops.features[index_in_points].properties.name;
                // var distance = Math.hypot(stops_list_in_pixel[index_in_points][0] - x, stops_list_in_pixel[index_in_points][1] - y);
                var distance = pixelDistance({x: x, y: y}, {x: stops_list_in_pixel[index_in_points][0], y: stops_list_in_pixel[index_in_points][1]})
                var dist_to_marienplatz = pixelDistance({x: x, y: y}, marienplatz)

                that.distances_per_pixel[y * that.width + x] = {
                    dist: distance,
                    name: name,
                    index_to_station: index_in_points,
                    x: x,
                    y: y,
                    imageIndex: y * that.width + x,
                    lon: lon,
                    lat: lat,
                    dist_to_marienplatz: dist_to_marienplatz
                }

            }
        }
    }

    
    this.addColours = function () {
        var that = this;

        that.computePixelData()
        var [colorScale, potenz] = that.getColourScale()

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


        // // Put the image data back into the canvas
        ctx.putImageData(imageData, 0, 0);

        const image = new Image();
        image.onload = function () {
            d3.select(".imageGroup").selectAll("image")
                .data([""])
                .join("image")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", that.width)
                .attr("height", that.height)
                .attr("href", image.src)
                .style("opacity", 0.8)
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
                    return colours.subway
                }
                else if (d.properties.train == "yes") {
                    return colours.train
                }
                else if (d.properties.tram == "yes") {
                    return colours.tram
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
                        return colours.subway
                    }
                    else if (d.properties.train == "yes") {
                        return colours.train
                    }
                    else if (d.properties.tram == "yes") {
                        return colours.tram
                    }  
                });
                tooltip.style("visibility", "hidden");
            })
            .raise();
            
    }

    this.addMe = function() {
        var that = this;
        this.me.x = xScale(this.me.lon)
        this.me.y = yScale(this.me.lat)
        this.me.imageIndex = Math.round(this.me.y) * that.width + Math.round(this.me.x)

        d3.select(".map_content").selectAll("circle.me")
            .data([that.me])
            .join("circle")
            .attr("class", "me")
            .attr("cx", d => xScale(d.lon))
            .attr("cy", d => yScale(d.lat))
            .attr("r", 5)
            .attr("fill", "white")
            .raise();
    }

    this.getColourScale = function() {
        var that = this;
        //colour scale
        var dists = that.distances_per_pixel.map(d=>d.dist)
        var maxDistance = Math.max(...dists)
        var potenz = 0.5
        // const colorScale = d3.scaleSequential(d3.interpolateRgb("#f0f9e8", "#7bccc4", "#08589e"))
        // const colorScale = d3.scaleSequential(d3.interpolateRgb("white", "black"))
        const colorScale = d3.scaleSequential(d3.interpolateRgb("#f5b53d", "#1919b3"))
            .domain([0, maxDistance ** potenz]);
        return [colorScale, potenz]
    }
    

    async function getCoordinates(address) {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const data = await response.json();
        if (data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        } else {
            throw new Error("Address not found");
        }
    }



    this.getDistancesPerPixelForSameDistanceToMarienplatz = function(targetDistance) {
        const result = [];
        
        this.distances_per_pixel.forEach((pixel) => {
    
            if (Math.abs(pixel.dist_to_marienplatz - targetDistance) < 0.6) { // Adjust the tolerance as needed
                const deltaX = pixel.lon - marienplatz.lon;
                const deltaY = pixel.lat - marienplatz.lat;               
                pixel.theta = Math.atan2(deltaY, deltaX);
                result.push(pixel);
            }
        });

    
        return result;
    }

    this.updateChart = function() {
        if(!debug) {
        var me = this.me;
        var distanceToMarienplatz = pixelDistance(me, marienplatz);
        const pointsWithSameDistance = this.getDistancesPerPixelForSameDistanceToMarienplatz(distanceToMarienplatz);
        pointsWithSameDistance.sort((a, b) => a.theta - b.theta);
        
        
        var svg = d3.select(".histogram_content")

        const x = d3.scaleLinear()
            .domain(d3.extent(pointsWithSameDistance, d => d.theta))
            .range([0, chart_width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(pointsWithSameDistance, d => d.dist)])
            .nice()
            .range([chart_height, 0]);
        
        // svg.append("g")
        //     .attr("class", "x-axis")
        //     .attr("transform", `translate(0,${height})`)
        //     .call(d3.axisBottom(x).tickFormat(""));
        
        svg.selectAll("g.y-axis") //TODO join
            .data([1])
            .join("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y));


        const area = d3.area()
            .x(d => x(d.theta))
            .y0(chart_height)
            .y1(d => y(d.dist))
            // .curve(d3.curveBasis); // Use a smoothing curve

        // add circle around marienplatz
        d3.select(".circle_points").selectAll(".histogram_circle")
            .data([distanceToMarienplatz])
            .join("circle")
            .attr("class", "histogram_circle")
            .attr("cx", marienplatz.x)
            .attr("cy", marienplatz.y)
            .attr("r", pixelDistance(me, marienplatz))
            .attr("stroke", "grey")
            .attr("stroke-width", "2")
            .attr("fill", "none")

        svg.selectAll(".area")
            .data([""])
            .join("path")
            .attr("class", "area")
            .attr("fill", "grey")
            .transition().duration(200)
            .attr("d", area(pointsWithSameDistance));
        
        svg.append("line")
            .attr("class","highlight_line")
            .attr("stroke-width", "2")
            .attr("stroke", "black")
            .attr("y1", chart_height)
            .attr("visibility", "hidden")
            .on("mouseout", function () {
                d3.select(this)
                    .attr("visibility", "hidden")
                

                d3.selectAll(".highlight_point")
                    .attr("visibility", "hidden")
                    .transition()
                    .duration(100)
                    .attr("r", 0)
            });


        svg.select(".area")
            .on("mousemove", function (event, d) {
                let pixel = pointsWithSameDistance.filter(e => Math.abs(e.theta - x.invert(event.layerX)) < 0.01)[0];
                if(pixel) {
                    d3.select(".circle_points")
                        .selectAll(".highlight_point")
                        .data([pixel])
                        .join("circle")
                        .attr("class", "highlight_point")
                        .attr("cx", pixel.x)
                        .attr("cy", pixel.y)
                        .attr("fill", "black")
                            .transition()
                            .duration(100)
                        .attr("r", 4)
                        .attr("visibility", "visible")
                    
                    
                
                    svg.selectAll(".highlight_line")
                        .data([pixel])
                        .join("line")
                        .attr("visibility", "visible")
                        .attr("x1", event.layerX)
                        .attr("x2", event.layerX)
                        .attr("y2", d => y(d.dist))

                
                }
            })
            .on("mouseout", function (event, d) {
                let new_object = d3.select(event.relatedTarget)
                   if( new_object._groups[0][0] && new_object.attr("class") != "highlight_line" ) {
                        d3.select(".highlight_line")
                            .attr("visibility", "hidden")
                        

                        d3.select(".highlight_point")
                            .transition()
                            .duration(100)
                            .attr("r", 0)
                   }
            });

        // add mean
        let mean = d3.mean(pointsWithSameDistance, d => d.dist)
        svg.selectAll(".mean_line")
            .data([mean])
            .join("line")
            .attr("class", "mean_line")
            .attr("stroke", "darkgrey")
            .attr("stroke-width", 1)
            .attr("x1", 0)
            .attr("x2", chart_width)
            .attr("y1", y(mean))
            .attr("y2", y(mean))


        // highlight me in histogram
        let me_data= pointsWithSameDistance.filter(e => e.imageIndex === me.imageIndex)[0]
        svg.selectAll(".me_histogram")
            .data([me_data])
            .join("line")
            .attr("class", "me_histogram")
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("x1", d => x(d.theta))
            .attr("x2", d => x(d.theta))
            .attr("y1", d => y(d.dist))
            .attr("y2", chart_height)
        
        }
        
    }

    this.newChart = function() {
        if(!debug) {
        var me = this.me;
        var all_distances_from_marienplatz = Array.from({ length: 270 }, (_, i) => i + 1);
        const all_points = all_distances_from_marienplatz.map((dist) => this.getDistancesPerPixelForSameDistanceToMarienplatz(dist));
        const all_points_mean = all_points.map((points) => d3.mean(points, d => d.dist));
        // pointsWithSameDistance.sort((a, b) => a.theta - b.theta);

        
        
        var svg = d3.select(".distance_histogram_content")

        const x = d3.scaleLinear()
            .domain([0, d3.max(all_distances_from_marienplatz)])
            .range([0, chart_width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(all_points_mean)])
            .nice()
            .range([chart_height, 0]);
        
        // svg.append("g")
        //     .attr("class", "x-axis")
        //     .attr("transform", `translate(0,${height})`)
        //     .call(d3.axisBottom(x).tickFormat(""));
        
        svg.selectAll("g.y-axis")
            .data([1])
            .join("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y));

        //yAxis label
        svg.selectAll("text.axislabel.y")
            .data([1])
            .join("text")
            .attr("class", "axislabel y")
            .attr("text-anchor", "middle")
           .attr("y", 0)
            .attr("dy", ".75em")
            .attr("transform", "translate(-35," + chart_height/2 + "),rotate(-90)")
            .text("avg distance to next station (km)");

        svg.selectAll("g.x-axis")
            .data([1])
            .join("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${chart_height})`)
            .call(d3.axisBottom(x));

        //xAxis label
        svg.selectAll("text.axislabel.x")
            .data([1])
            .join("text")
            .attr("class", "axislabel x")
            .attr("text-anchor", "middle")
            .attr("y", chart_height + 20)
            .attr("x", chart_width/2)
            .attr("dy", ".75em")
            .text("distance to Marienplatz (km)");
            


        const area = d3.area()
            .x((d, i) => x(i))
            .y0(chart_height)
            .y1(d => y(d))
            // .curve(d3.curveBasis); // Use a smoothing curve

        // add area to chart
        svg.selectAll(".area")
            .data([""])
            .join("path")
            .attr("class", "area")
            .attr("fill", "grey")
            .transition().duration(200)
            .attr("d", area(all_points_mean));

        
        
        svg.append("line")
            .attr("class","highlight_line")
            .attr("stroke-width", "2")
            .attr("stroke", "black")
            .attr("y1", chart_height)
            .attr("visibility", "hidden")
            .on("mouseout", function () {
                d3.select(this)
                    .attr("visibility", "hidden")

                d3.select(".circle_points").selectAll(".histogram_circle_hover")
                    .attr("visibility", "hidden")
            });


        svg.select(".area")
            .on("mousemove", function (event, d) {
                let pixel = all_points_mean.filter(function(e,i) {
                    return Math.abs(i - x.invert(event.layerX)) < 0.5
                })[0];
                if(pixel) {
                    // add circle around marienplatz
                    d3.select(".circle_points").selectAll(".histogram_circle_hover")
                        .data([all_points_mean.findIndex(e => e === pixel)])
                        .join("circle")
                        .attr("class", "histogram_circle_hover")
                        .attr("cx", marienplatz.x)
                        .attr("cy", marienplatz.y)
                        .attr("r", d => d)
                        .attr("stroke", "lightgrey")
                        .attr("stroke-width", "1.5")
                        .attr("fill", "none")
                        .attr("visibility", "visible")
                    
                    
                
                    svg.select(".highlight_line")
                        .data([pixel])
                        .join("line")
                        .attr("visibility", "visible")
                        .attr("x1", event.layerX)
                        .attr("x2", event.layerX)
                        .attr("y2", d => y(d))

                
                }
            })
            .on("mouseout", function (event, d) {
                let new_object = d3.select(event.relatedTarget)
                   if( new_object._groups[0][0] && new_object.attr("class") != "highlight_line" ) {
                        d3.select(".highlight_line")
                            .attr("visibility", "hidden")

                        d3.select(".circle_points").selectAll(".histogram_circle_hover")
                            .attr("visibility", "hidden")
                   }
            });

        }
        
    }

    this.addMapData = function() {
        var that = this;

        d3.select(".greenery").selectAll(".park")
            .data(that.parks.features)
            .join("path")
            .attr("class", "park")
            .attr("d", pathGenerator)
            .attr("fill", colours.parks)
            .attr("stroke", "none")

        d3.select(".water").selectAll(".wasser")
            .data(that.wasser.features)
            .join("path")
            .attr("class", "wasser")
            .attr("d", pathGenerator)
            .attr("fill", colours.wasser)
            .attr("stroke", colours.wasser)
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.8)

        d3.select(".boroughs").selectAll(".borough")
            .data(that.stadtteile.features)
            .join("path")
            .attr("class", "borough")
            .attr("d", pathGenerator)
            .attr("fill", "none")
            .attr("stroke"," #63391d")
            .attr("stroke-width", 1)
            .attr("opacity", 0.3)

        
        d3.select(".strassen").selectAll(".strasse")
            .data(that.strassen.features)
            .join("path")
            .attr("class", "strasse")
            .attr("d", pathGenerator)
            .attr("fill", "none")
            .attr("stroke", function (d) {
                if(d.properties.highway === "motorway" || d.properties.highway === "primary") {
                    return "rgb(165, 78, 35)"
                } else {
                    return "rgb(195, 118, 80)"
                }
            })
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.4)

    }

    this.addIsoline = function(threshold){
        const contours = d3.contours().size([width, height])
            .thresholds([threshold])
        
        const isoline = contours(distances_per_pixel.map(d => d.dist));
        const isolinePath = d3.geoPath().projection(null);

        d3.select(".map_content").selectAll(".isos")
            .data(isoline)
			.join("path")
            .attr("class", "isos")
            .attr("d", isolinePath)
            .attr("fill", "none")
            .attr("stroke", "black")

    }

    
    function filterOSMProperty(obj, predicate) {
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

    function haversineDistance(coords1, coords2) {
        const toRadians = degrees => degrees * Math.PI / 180;

        const lat1 = toRadians(coords1.lat);
        const lon1 = toRadians(coords1.lon);
        const lat2 = toRadians(coords2.lat);
        const lon2 = toRadians(coords2.lon);

        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const R = 6371; // Radius of the Earth in kilometers
        return R * c; // Distance in kilometers
    }

    function pixelDistance(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y)
    }



return this;
}