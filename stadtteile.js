async function addStadtteile(center) {
    // d3.json("data/stadtteile_converted.geojson").then(geojson => {
    const geojson = await d3.json("data/stadtteile_converted.geojson");
    console.log(geojson)

        // geojson.features.forEach(feature => {
        //     feature.geometry.coordinates = feature.geometry.coordinates.map(ring =>
        //         ring.map(([x, y]) => proj4("EPSG:25832", 'WGS84', [x, y]))
        //     );
        // });

        

        // Create a projection to map GeoJSON coordinates to the SVG space
        const projection = d3.geoMercator()
            // .center([11.5756, 48.1372])
            .center(center)
            .scale(120000)
            .translate([ width/2, height/2 ])
            // .angle(45)
            // .fitSize([width, height], geojson)
            // .clipExtent(null); // Fit the map to the SVG size
        
        console.log("center: " + projection.center())
        console.log("scale: " + projection.scale())
        console.log("translate: " + projection.translate())
        console.log("clipExtent: " + projection.clipExtent())
 

        // Create a path generator using the projection
        const pathGenerator = d3.geoPath().projection(projection);

        // Append a group for the boroughs
        const boroughsGroup = svg.append("g").attr("class", "boroughs");

        // Draw each borough as a path
        boroughsGroup.selectAll("path")
            .data(geojson.features)
            .join("path")
            .attr("d", pathGenerator)
            // .attr("d", pathGenerator)
            .attr("fill", "none") // No fill by default
            .attr("stroke", "black") // Borough boundaries

        let pointul = projection.invert([0,0])
        let pointlr = projection.invert([width,height])
        bbx = [[pointul[0], pointlr[0]], [pointlr[1], pointul[1]]]
        console.log(bbx)
        return bbx;
}