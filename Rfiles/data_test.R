library(osmdata)
library(sf)
library(baselines)
# 48.149314321673536, 11.393591348857223
# 48.22600401097579, 11.44747927646014
# 48.05936472205524, 11.731607652320864


bbox <- getbb('münchen')

stops <-
  opq(bbox = bbox) %>%
  add_osm_feature(key = "railway", value = "stop") %>%
  add_osm_feature(key = "public_transport", value = "stop_position") %>%
  osmdata_sf()

busstops <-
  opq(bbox = bbox) %>%
  add_osm_feature(key = "highway", value = "bus_stop") %>%
  # add_osm_feature(key = "public_transport", value = "platform") %>%
  osmdata_sf()

stop_points <- stops$osm_points
busstop_points <- busstops$osm_points

u_bahn <- subset(stop_points, subway == 'yes')
u_bahn <- u_bahn[!duplicated(u_bahn$name), ]
s_bahn <- subset(stop_points, train == 'yes')
s_bahn <- s_bahn[!duplicated(s_bahn$name), ]
tram <- subset(stop_points, tram == 'yes')
tram <- tram[!duplicated(tram$name), ]
bus <- subset(busstop_points, bus == 'yes')
bus <- bus[!duplicated(bus$name), ]


unique_points <- rbind(u_bahn, s_bahn, tram)

st_write(unique_points, "../web/data/osm_stationen.geojson", driver = "GeoJSON")



stadtteilgrenzen <-
  opq(bbox = bbox) %>%
  add_osm_feature(key = "boundary", value = "administrative") %>%
  add_osm_feature(key = "admin_level", value = 9) %>%
  osmdata_sf()

stadtteilgrenzen_sf <- stadtteilgrenzen$osm_multipolygons
st_write(stadtteilgrenzen_sf, "../web/data/osm_stadtteilgrenzen.geojson", driver = "GeoJSON")



parks <-
  opq(bbox = bbox) %>%
  add_osm_features(features = 
                     list ("leisure" = "park",
                           "landuse" = "forest"
                           ))%>%
  osmdata_sf()

parks_polygons <- parks$osm_polygons[c("osm_id", "name", "leisure", "landuse", "geometry")]
parks_multipolygons <- parks$osm_multipolygons[c("osm_id", "name", "leisure", "landuse", "geometry")]
st_write(parks_polygons, "../web/data/osm_parks_forests.geojson", driver = "GeoJSON")



wasser <-
  opq(bbox = bbox) %>%
  add_osm_feature(key = "natural", value = "water") %>%
  add_osm_feature(key = "water", value = "river") %>%
  osmdata_sf()

wasser_polygons <- wasser$osm_polygons
wasser_filtered <- subset(wasser_polygons, (natural == 'water' & water == 'river'))[c("natural", "water", "geometry")]
wasser_multipolygons <- wasser$osm_multipolygons[c("natural", "water", "geometry")]
st_write(rbind(wasser_filtered, wasser_multipolygons), "../web/data/osm_wasser.geojson", driver = "GeoJSON")


strassen <- 
  opq(bbox = bbox) %>%
  add_osm_features (features = list (
    "highway" = "motorway",
    "highway" = "primary",
    "highway" = "secondary"
  )) %>%
  osmdata_sf()
strassen_lines <- strassen$osm_lines

st_write(strassen_lines, "../web/data/osm_strassen.geojson", driver = "GeoJSON")

parks_polygons[10888495,]
forest <- subset(parks$osm_polygons, osm_id == "711099633")


par(mar=c(0,0,0,0))
plot_blank(x=bbox[1,], y=bbox[2,])
plot(parks$osm_multipolygons$geometry, col="green", border=F)
plot(strassen_lines$geometry, add=T, col="orange")
plot(stadtteilgrenzen$osm_multipolygons$geometry, add=T)
plot(wasser$osm_multipolygons, add=T, col="blue4", border=F)
plot(wasser$osm_polygons, add=T, col="blue4", border=F)
plot(u_bahn$geometry, add=T, cex=0.8, col="blue", type="p", pch=19)


