"""Build a complete-graph network from a buildings CSV (straight-line distance in metres).

Usage:
  python3 scripts/sim/make_network.py data/ttu_buildings.csv data/ttu_full
  python3 scripts/sim/make_network.py data/ttu_buildings.csv data/ttu_cluster --only "Derryberry Hall,Henderson Hall,..."

Writes <out>.txt (tests/ format: header 'n m', nodes 0..n-1) and <out>.json
(names and positions for the simulation).
"""
import argparse
import csv
import math

from netio import haversine_m, save_json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv')
    ap.add_argument('out')
    ap.add_argument('--only', help='comma-separated building names to keep')
    a = ap.parse_args()
    rows = list(csv.DictReader(open(a.csv)))
    if a.only:
        keep = [s.strip() for s in a.only.split(',')]
        missing = set(keep) - {r['name'] for r in rows}
        if missing:
            raise SystemExit(f'not in CSV: {sorted(missing)}')
        rows = [r for r in rows if r['name'] in keep]
    lat0 = sum(float(r['lat']) for r in rows) / len(rows)
    lon0 = sum(float(r['lon']) for r in rows) / len(rows)
    nodes = []
    for r in rows:
        lat, lon = float(r['lat']), float(r['lon'])
        # local east/north offsets in metres from the campus centre
        x = haversine_m(lat0, lon0, lat0, lon) * (1 if lon >= lon0 else -1)
        y = haversine_m(lat0, lon0, lat, lon0) * (1 if lat >= lat0 else -1)
        node = {'name': r['name'], 'x': round(x, 2), 'y': round(y, 2)}
        if r.get('height_m'):
            node['height'] = float(r['height_m'])
        if r.get('footprint'):
            pts = []
            for p in r['footprint'].split(';'):
                plon, plat = map(float, p.split())
                px = haversine_m(lat0, lon0, lat0, plon) * (1 if plon >= lon0 else -1)
                py = haversine_m(lat0, lon0, plat, lon0) * (1 if plat >= lat0 else -1)
                pts.append([round(px, 2), round(py, 2)])
            node['footprint'] = pts
        nodes.append(node)
    n = len(nodes)
    links = []
    for i in range(n):
        for j in range(i + 1, n):
            d = haversine_m(float(rows[i]['lat']), float(rows[i]['lon']), float(rows[j]['lat']), float(rows[j]['lon']))
            links.append((i, j, round(d, 2)))
    with open(a.out + '.txt', 'w') as f:
        f.write(f'# {n} buildings from {a.csv}; cost = straight-line distance in metres\n{n} {len(links)}\n')
        for u, v, c in links:
            f.write(f'{u} {v} {c}\n')
    save_json({'source': a.csv, 'cost_unit': 'metres (straight line)', 'nodes': nodes}, a.out + '.json')
    print(f'{n} buildings, {len(links)} links -> {a.out}.txt / {a.out}.json')


if __name__ == '__main__':
    main()
