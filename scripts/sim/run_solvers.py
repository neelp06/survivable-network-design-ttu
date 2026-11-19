"""Run the team's solvers, unchanged, on one network and save normalized results
for the website simulation.

Usage:
  python3 scripts/sim/run_solvers.py <network file> [--positions net.json] [--name NAME]

* Reads any network format used in the repo (see netio.py).
* Costs are scaled to integers (x SCALE) because brute force reads integer
  weights; every solver gets those same scaled costs, so results are comparable.
* Each solver's printed output is parsed as-is. If a solver's output format
  changes, update the matching parse_* function here.
* Survivability of every result is re-checked here with an independent bridge
  check, so the site never trusts a solver's own claim.
Writes site/public/data/runs/<name>.json and updates site/public/data/index.json.
"""
import argparse
import os
import re
import subprocess
import tempfile
import time

from netio import read_network, write_greedy_format, write_brute_format, scaled_network, load_json, save_json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BUILD = os.path.join(ROOT, 'build', 'sim')
OUT = os.path.join(ROOT, 'site', 'public', 'data')
SCALE = 100  # costs kept to 2 decimal places

SOLVERS = {
    'brute_force': 'src/brute_force/fault_tolerant_BF.cpp',  # survivable version; brute_force.cpp is the earlier MST version
    'genetic': 'src/genetic/genetic.cpp',
    'greedy': 'src/greedy/greedy.cpp',
}


def compile_solver(key):
    src = os.path.join(ROOT, SOLVERS[key])
    if not os.path.exists(src) or 'main(' not in open(src).read():
        return None, 'not implemented yet (no main() in ' + SOLVERS[key] + ')'
    os.makedirs(BUILD, exist_ok=True)
    exe = os.path.join(BUILD, key)
    if not os.path.exists(exe) or os.path.getmtime(exe) < os.path.getmtime(src):
        r = subprocess.run(['g++', '-std=c++17', '-O2', src, '-o', exe], capture_output=True, text=True)
        if r.returncode:
            return None, 'compile failed: ' + r.stderr[-400:]
    return exe, None


def parse_brute(out):
    links = [(int(u) - 1, int(v) - 1) for u, v, _ in re.findall(r'^(\d+) -- (\d+) \(Weight: (-?\d+)\)', out, re.M)]
    m = re.search(r'Minimum Total Weight: (-?\d+)', out)
    t_us = re.search(r'Time in Microseconds: ([\d.eE+-]+)', out)
    t_s = re.search(r'Time in Seconds: ([\d.eE+-]+)', out)
    if not m:
        return None
    time_us = float(t_us.group(1)) if t_us else float(t_s.group(1)) * 1e6 if t_s else None
    return {'chosen': links, 'reported_cost': int(m.group(1)) / SCALE, 'time_us': time_us}


def parse_greedy(out):
    rows = re.findall(r'^\s+(\d+) (\d+) ([\d.eE+-]+)\s+\[(tree|added)\]', out, re.M)
    total = re.search(r'^total_cost ([\d.eE+-]+)', out, re.M)
    t = re.search(r'^time_microseconds ([\d.eE+-]+)', out, re.M)
    if not total:
        return None
    return {'chosen': [(int(u), int(v)) for u, v, _, _ in rows],
            'phase': [k for *_, k in rows],
            'reported_cost': float(total.group(1)), 'time_us': float(t.group(1)) if t else None}


def bridges_and_components(n, edges):
    adj = [[] for _ in range(n)]
    for i, (u, v) in enumerate(edges):
        adj[u].append((v, i)); adj[v].append((u, i))
    disc, low, timer, comps, bridges = [-1] * n, [0] * n, [0], 0, []
    for s in range(n):
        if disc[s] != -1:
            continue
        comps += 1
        disc[s] = low[s] = timer[0]; timer[0] += 1
        stack = [(s, -1, iter(adj[s]))]
        while stack:
            u, pe, it = stack[-1]
            for w, ei in it:
                if ei == pe:
                    continue
                if disc[w] == -1:
                    disc[w] = low[w] = timer[0]; timer[0] += 1
                    stack.append((w, ei, iter(adj[w])))
                    break
                low[u] = min(low[u], disc[w])
            else:
                stack.pop()
                if stack:
                    p = stack[-1][0]
                    low[p] = min(low[p], low[u])
                    if low[u] > disc[p]:
                        bridges.append(edges[pe])
    return bridges, comps


def run(key, exe, net, tmp, timeout):
    if key == 'brute_force':
        path = os.path.join(tmp, 'brute.txt'); write_brute_format(net, path, SCALE)
        cmd, stdin = [exe], path + '\n'   # brute force asks for the file name on stdin
    else:
        path = os.path.join(tmp, 'net.txt'); write_greedy_format(net, path)
        cmd, stdin = [exe, path], None
    t0 = time.perf_counter()
    try:
        r = subprocess.run(cmd, input=stdin, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return {'status': f'timed out after {timeout}s'}
    wall = (time.perf_counter() - t0) * 1e6
    parsed = (parse_brute if key == 'brute_force' else parse_greedy)(r.stdout) if key != 'genetic' else None
    if not parsed:
        return {'status': 'no result parsed', 'stdout_tail': r.stdout[-400:]}
    parsed['wall_us'] = round(wall)
    return parsed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('network')
    ap.add_argument('--positions', help='JSON from make_network.py with node names/positions')
    ap.add_argument('--name')
    ap.add_argument('--brute-max-links', type=int, default=24, help='skip brute force above this many links')
    ap.add_argument('--timeout', type=int, default=600)
    a = ap.parse_args()

    raw = read_network(a.network)
    net = scaled_network(raw, SCALE)
    n, links = net['n'], net['links']
    cost = {(min(u, v), max(u, v)): c for u, v, c in links}
    name = a.name or os.path.splitext(os.path.basename(a.network))[0]
    doc = {'name': name, 'source': os.path.relpath(os.path.abspath(a.network), ROOT), 'n': n,
           'links': [[u, v, c] for u, v, c in links], 'results': {}}
    if a.positions:
        meta = load_json(a.positions)
        doc['nodes'] = meta['nodes']
        for k in ('cost_unit', 'scenario', 'route_factor'):
            if k in meta:
                doc[k] = meta[k]

    with tempfile.TemporaryDirectory() as tmp:
        for key in SOLVERS:
            exe, err = compile_solver(key)
            if err:
                doc['results'][key] = {'status': err}
                continue
            if key == 'brute_force' and len(links) > a.brute_max_links:
                doc['results'][key] = {'status': f'skipped: {len(links)} links > --brute-max-links {a.brute_max_links}'}
                continue
            print(f'running {key} on {name} ({n} nodes, {len(links)} links)...', flush=True)
            res = run(key, exe, net, tmp, a.timeout)
            if 'chosen' in res:
                res['chosen'] = [[min(u, v), max(u, v)] for u, v in res['chosen']]
                res['total_cost'] = round(sum(cost[tuple(e)] for e in res['chosen']), 4)
                br, comps = bridges_and_components(n, [tuple(e) for e in res['chosen']])
                res['components'] = comps
                res['bridges'] = [list(e) for e in br]
                res['survivable'] = comps == 1 and not br
                res['status'] = 'ok'
            doc['results'][key] = res

    os.makedirs(os.path.join(OUT, 'runs'), exist_ok=True)
    save_json(doc, os.path.join(OUT, 'runs', name + '.json'))
    idx_path = os.path.join(OUT, 'index.json')
    idx = load_json(idx_path) if os.path.exists(idx_path) else {'runs': []}
    idx['runs'] = [r for r in idx['runs'] if r['name'] != name] + [{'name': name, 'n': n, 'geo': bool(a.positions)}]
    save_json(idx, idx_path)
    for k, r in doc['results'].items():
        print(f"  {k:12s} {r.get('status')}" + (f"  cost={r['total_cost']} survivable={r['survivable']}" if 'total_cost' in r else ''))


if __name__ == '__main__':
    main()
