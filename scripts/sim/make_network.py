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

M_TO_FT = 3.28084
# Dollar cost per link = length_ft * (civil_per_ft + cable_per_ft) + per_link_fixed.
# Sources and caveats: docs/cost_model.md
SCENARIOS = {
    'low':    {'civil_per_ft': 12.00, 'cable_per_ft': 0.35, 'per_link_fixed': 1500},
    'median': {'civil_per_ft': 16.25, 'cable_per_ft': 0.64, 'per_link_fixed': 2500},
    'high':   {'civil_per_ft': 23.25, 'cable_per_ft': 0.92, 'per_link_fixed': 3500},
}

from netio import haversine_m, save_json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv')
    ap.add_argument('out')
    ap.add_argument('--only', help='comma-separated building names to keep')
    ap.add_argument('--exclude', help='comma-separated building names to drop')
    ap.add_argument('--cost', choices=['metres', 'usd'], default='metres',
                    help='link cost: straight-line metres, or estimated dollars (see docs/cost_model.md)')
    ap.add_argument('--scenario', choices=list(SCENARIOS), default='median')
    ap.add_argument('--route-factor', type=float, default=1.0,
                    help='multiply straight-line length to approximate the real cable route (assumption)')
    a = ap.parse_args()
    rows = list(csv.DictReader(open(a.csv)))
    if a.only:
        keep = [s.strip() for s in a.only.split(',')]
        missing = set(keep) - {r['name'] for r in rows}
        if missing:
            raise SystemExit(f'not in CSV: {sorted(missing)}')
        rows = [r for r in rows if r['name'] in keep]
    if a.exclude:
        drop = {s.strip() for s in a.exclude.split(',')}
        rows = [r for r in rows if r['name'] not in drop]
    seen = set()
    rows = [r for r in rows if not (r['name'] in seen or seen.add(r['name']))]  # keep first of duplicate names
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
            d *= a.route_factor
            if a.cost == 'usd':
                sc = SCENARIOS[a.scenario]
                d = d * M_TO_FT * (sc['civil_per_ft'] + sc['cable_per_ft']) + sc['per_link_fixed']
            links.append((i, j, round(d, 2)))
    with open(a.out + '.txt', 'w') as f:
        unit = 'USD' if a.cost == 'usd' else 'metres (straight line)'
        f.write(f'# {n} buildings from {a.csv}; cost unit: {unit}; scenario: {a.scenario if a.cost == "usd" else "-"}; route factor {a.route_factor}\n{n} {len(links)}\n')
        for u, v, c in links:
            f.write(f'{u} {v} {c}\n')
    meta = {'source': a.csv, 'cost_unit': 'USD' if a.cost == 'usd' else 'metres', 'route_factor': a.route_factor, 'nodes': nodes}
    if a.cost == 'usd':
        meta['scenario'] = {'name': a.scenario, **SCENARIOS[a.scenario]}
    save_json(meta, a.out + '.json')
    print(f'{n} buildings, {len(links)} links -> {a.out}.txt / {a.out}.json')


if __name__ == '__main__':
    main()
