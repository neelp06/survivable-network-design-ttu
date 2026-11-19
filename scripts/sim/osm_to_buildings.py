"""Convert an Overpass Turbo export of campus buildings into data/ttu_buildings.csv.

Usage:  python3 scripts/sim/osm_to_buildings.py export.geojson data/ttu_buildings.csv
Columns: name, lat, lon, height_m (blank if OSM has none), footprint (lon lat;lon lat;...)
Buildings without a name are skipped. Review the CSV by hand before using it.
"""
import csv
import json
import sys


def centroid(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return sum(ys) / len(ys), sum(xs) / len(xs)


def main(src, dst):
    data = json.load(open(src))
    out = []
    for feat in data.get('features', []):
        props = feat.get('properties', {})
        name = props.get('name')
        geom = feat.get('geometry') or {}
        if not name or geom.get('type') not in ('Polygon', 'MultiPolygon'):
            continue
        ring = geom['coordinates'][0] if geom['type'] == 'Polygon' else geom['coordinates'][0][0]
        lat, lon = centroid(ring[:-1] if ring[0] == ring[-1] else ring)
        h = props.get('height') or ''
        if not h and props.get('building:levels'):
            try:
                h = round(float(props['building:levels']) * 3.5, 1)
            except ValueError:
                h = ''
        out.append([name, f'{lat:.7f}', f'{lon:.7f}', h, ';'.join(f'{x:.7f} {y:.7f}' for x, y in ring)])
    out.sort(key=lambda r: r[0])
    with open(dst, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['name', 'lat', 'lon', 'height_m', 'footprint'])
        w.writerows(out)
    print(f'wrote {len(out)} named buildings to {dst}')


if __name__ == '__main__':
    main(*sys.argv[1:3])
