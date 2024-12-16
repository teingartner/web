
function MVV_Map () {

    // Set up the SVG area and margins
    this.margin = { top: 50, right: 20, bottom: 20, left: 60 };
    this.width = 650 - margin.left - margin.right;
    this.height = 600 - margin.top - margin.bottom;

    this.center = [11.57, 48.15]

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
        .attr("width",  that.width + that.margin.left + that.margin.right)
        .attr("height",  that.height + that.margin.top + that.margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + that.margin.left + "," + that.margin.top + ")")
            .attr("class", "map_content")            ;
            
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
        var stops = await this.load_stops();
        var stadtteile = await this.load_mapData();
    
        //render Stadtteile
        this.addStadtteile(stadtteile);
    
        // localStorage.removeItem("proximityImage")   
        this.addColours(stops)
        this.addPoints(stops)
        this.addMe(me)
    }

    this.load_stops = async function(){
        var stops = d3.tsv("/data/stops.csv", (d) => {
            // console.log(d)
            const regex = /c\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;
            let match = d.geometry.match(regex); // Match the regex
            let [_, longitude, latitude] = match; // Extract matched groups
            
            return {
                name: d.name,
                description: d.description,
                subway: d.subway  == "yes"? true : false,
                tram: d.tram == "yes"? true : false, 
                train: d.train  == "yes"? true : false,
                lat: parseFloat(latitude),
                lon: parseFloat(longitude),
            };
            }).then((transport_data) => {
                var transport_data = transport_data
                var filtered = transport_data.filter(function (d) {
                    return (d.subway == true) || (d.tram == true) || (d.train == true)
                })
                return filtered

            });   
        return stops
    }

    this.load_stops = async function(){
        var stops = d3.tsv("/data/stops.csv", (d) => {
            // console.log(d)
            const regex = /c\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;
            let match = d.geometry.match(regex); // Match the regex
            let [_, longitude, latitude] = match; // Extract matched groups
            
            return {
                name: d.name,
                description: d.description,
                subway: d.subway  == "yes"? true : false,
                tram: d.tram == "yes"? true : false, 
                train: d.train  == "yes"? true : false,
                lat: parseFloat(latitude),
                lon: parseFloat(longitude),
            };
            }).then((transport_data) => {
                var transport_data = transport_data
                var filtered = transport_data.filter(function (d) {
                    return (d.subway == true) || (d.tram == true) || (d.train == true)
                })
                return filtered

            });   
        return stops
    }

    this.load_mapData = async function(){
        var stadtteile = await d3.json("data/osm_stadtteilgrenzen.geojson")
        return stadtteile
    }
    
    
    
    this.addColours = function (stops) {
        // Create an offscreen canvas for pixel manipulation
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        // Get the image data object
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        // Check for saved image in localStorage
        const savedImage = localStorage.getItem("proximityImage");

        // Convert the canvas to an image and append it to the SVG
        if (savedImage) {
            // Load saved image if it exists
            loadImage(savedImage);
        } else {
            // Recompute and save image
            const newImage = computeColors(stops);
            localStorage.setItem("proximityImage", newImage);

            // Render the newly computed image
            loadImage(newImage);
        }
    }




    function computeColors(stops) {
        // Define a color scale (greener = closer, redder = farther)
        // Calculate the farthest actual distance
        const maxDistance = d3.max(
            d3.range(height).flatMap(y => 
                d3.range(width).map(x => 
                    Math.min(...stops.map(p => Math.hypot(xScale(p.lon) - x, yScale(p.lat) - y)))
                )
            )
        );

        // Define the color scale with dynamic max distance
        const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([0, maxDistance]);

        // Iterate over each pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Calculate the distance to each point
                const distances = stops.map(p => Math.hypot(xScale(p.lon) - x, yScale(p.lat) - y));
                const nearestDistance = Math.min(...distances);

                // Get the color for this distance
                const color = d3.color(colorScale(nearestDistance));

                // Calculate the pixel index
                const pixelIndex = (y * width + x) * 4;

                // Set the RGBA values
                data[pixelIndex] = color.r;     // Red
                data[pixelIndex + 1] = color.g; // Green
                data[pixelIndex + 2] = color.b; // Blue
                data[pixelIndex + 3] = 255;     // Alpha (fully opaque)
            }
        }

        // Put the image data back into the canvas
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    }

    // Load precomputed image if available
    function loadImage(savedImage) {
        const image = new Image();
        image.onload = function () {
            d3.select(".map_content")
                .append("image")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", width)
                .attr("height", height)
                .attr("href", image.src)
                .style("opacity", 0.8)
                .lower();
        };
        image.src = savedImage;
    }


    
this.addPoints = function(data_points) {
    // Draw the points on top of the image
    d3.select(".map_content").append("g").attr("class", "ubahn_points").selectAll("circle.ubahnen")
        .data(data_points)
        .join("circle")
        .attr("class", "ubahnen")
        .attr("cx", d => xScale(d.lon))
        .attr("cy", d => yScale(d.lat))
        .attr("r", 4)
        .attr("fill", "black")
        .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible").text(d.name);
            d3.select(this).attr("fill", "grey")
        })
        .on("mousemove", function (event, d) {
            tooltip.style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function (event, d) {
            d3.select(this).attr("fill", "black");
            tooltip.style("visibility", "hidden");
        });

        d3.selectAll("circle").raise()

        
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

// });



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

return this;
}