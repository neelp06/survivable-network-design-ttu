"""Read and write the network file formats used in this repo.

Formats found in the repo (none are changed by this module):
  * tests/test_inputs:  '# comments', header 'n m', then 'u v cost', nodes 0..n-1
  * src/greedy:         header 'n', then 'u v cost', nodes 0..n-1, decimal costs
  * src/brute_force:    no header, 'u v weight', nodes 1..V, integer weights
"""
import json
import math


def read_network(path):
    """Return {'n': int, 'links': [(u, v, cost)], 'index_base': 0|1} from any repo format."""
    rows = []
    with open(path) as f:
        for line in f:
            line = line.split('#', 1)[0].strip()
            if line:
                rows.append(line.split())
    header = None
    if rows and len(rows[0]) in (1, 2) and len(rows[0]) != 3:
        header = [int(x) for x in rows[0]]
        rows = rows[1:]
    links = [(int(u), int(v), float(c)) for u, v, c in rows]
    nodes = {x for u, v, _ in links for x in (u, v)}
    base = 0 if 0 in nodes else 1
    if base == 1:
        links = [(u - 1, v - 1, c) for u, v, c in links]
    n = header[0] if header else (max(max(u, v) for u, v, _ in links) + 1 if links else 0)
    return {'n': n, 'links': links, 'index_base': base}


def write_greedy_format(net, path):
    with open(path, 'w') as f:
        f.write(f"{net['n']}\n")
        for u, v, c in net['links']:
            f.write(f"{u} {v} {c:.6g}\n")


def int_cost(c, scale):
    return int(round(c * scale))


def write_brute_format(net, path, scale):
    """Brute force reads integer weights and numbers nodes from 1.
    Costs are multiplied by `scale` and rounded; the same scaled costs must be
    used when comparing algorithms (see scaled_network)."""
    with open(path, 'w') as f:
        for u, v, c in net['links']:
            f.write(f"{u + 1} {v + 1} {int_cost(c, scale)}\n")


def scaled_network(net, scale):
    """Network whose costs are exactly the integers brute force sees, divided back by scale."""
    return {**net, 'links': [(u, v, int_cost(c, scale) / scale) for u, v, c in net['links']]}


def haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def load_json(path):
    with open(path) as f:
        return json.load(f)


def save_json(obj, path):
    with open(path, 'w') as f:
        json.dump(obj, f, indent=1)
