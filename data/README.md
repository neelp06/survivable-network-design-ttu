# Data

Real-world datasets. Planned: Tennessee Tech campus case study (~47 buildings,
coordinates from OpenStreetMap, straight-line distances as link costs).
Record the source and download date for any data added here.

## TTU case study (added 2026-11-19)

- `ttu_osm_export.geojson`: Overpass Turbo export of buildings inside the "Tennessee Technological University" area, downloaded 2026-11-19 by Brady. © OpenStreetMap contributors, ODbL.
- `ttu_buildings.csv`: the 61 named buildings (centroid, height if tagged, footprint), from `scripts/sim/osm_to_buildings.py`.
- `ttu_full.*`: 54 buildings. Excluded as not needing network service: Averitt Baseball Complex, Tech Softball Field, Tucker Stadium (East/West), Walton House. Link cost in estimated USD, median scenario (`docs/cost_model.md`).
- `ttu_quad7.*`: 7 main-quad buildings for brute force: Derryberry, Henderson, Bartoo, Kittrell, Memorial Gym, Jere Whitson, T.J. Farr.
