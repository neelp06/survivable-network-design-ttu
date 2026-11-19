# Simulation tooling (Brady)

These scripts feed the 3D simulator on the website (`site/src/sim.js`). They run the team's solvers **unchanged** and convert between the repo's file formats, so no one has to change their code.

| Script | What it does |
|---|---|
| `netio.py` | Reads every network format in the repo (tests `n m` header, greedy `n` header, brute-force 1-based/no header) and writes each solver's format. |
| `run_solvers.py` | Compiles `src/*/*.cpp` into `build/sim/`, runs each solver on the same network, parses its printed output, independently checks survivability (bridges), and saves `site/public/data/runs/<name>.json`. |
| `osm_to_buildings.py` | Overpass Turbo GeoJSON export → `data/ttu_buildings.csv`. |
| `make_network.py` | Buildings CSV → complete-graph network (straight-line metres) + positions JSON. Use `--only` to make the brute-force cluster. |

**Fairness:** brute force reads integer weights, so `run_solvers.py` scales every cost ×100 and rounds, then gives those *same* costs to every solver.

**Output parsing:** the parsers match each solver's current printed text (`parse_brute`, `parse_greedy`). If a solver's output changes, update the matching function. Genetic is skipped until `src/genetic/genetic.cpp` has a `main()`.

## Run on a test network
```bash
python3 scripts/sim/run_solvers.py tests/test_inputs/square_4.txt
```
Brute force is skipped above 24 links by default (`--brute-max-links`).

## TTU case study
1. Open https://overpass-turbo.eu, paste the query below, click **Run**, then **Export → GeoJSON**.
   ```
   [out:json][timeout:60];
   area["name"="Tennessee Technological University"]->.campus;
   ( way["building"](area.campus); relation["building"](area.campus); );
   out geom;
   ```
   If the area isn't found, zoom the map to campus and replace the `area` line and `(area.campus)` with `({{bbox}})`.
2. `python3 scripts/sim/osm_to_buildings.py export.geojson data/ttu_buildings.csv`, then review the CSV and delete buildings you don't want. Record the download date in `data/README.md`.
3. Full campus: `python3 scripts/sim/make_network.py data/ttu_buildings.csv data/ttu_full`
   Cluster: `python3 scripts/sim/make_network.py data/ttu_buildings.csv data/ttu_cluster --only "Name A,Name B,..."`
4. `python3 scripts/sim/run_solvers.py data/ttu_full.txt --positions data/ttu_full.json --name ttu_full` (and the same for the cluster).
