# Survivable Network Design at TTU

CSC 2400 — Design of Algorithms, Undergraduate Research Project.

## Project Overview

We find the **cheapest cable layout that connects every site in a network and still works after any single cable fails**.

- **Input:** `n` nodes (sites) and a cost for every possible link (cable) between them, from map distances or a real dataset.
- **Valid solution:** a set of links that connects every node and contains **no bridge** (a link whose removal disconnects the network). Such a network is *2-edge-connected*.
- **Optimal solution:** the valid solution with the **lowest total link cost**.

The problem is NP-complete (Eswaran & Tarjan, 1976). Applications include campus and ISP backbones, data centers, and power grids.

**Research question:** As the number of nodes grows, how do solution cost and running time of brute force and a greedy method compare, and at what size does brute force stop being practical? Secondary: how far above the true optimum does the greedy method land?

See [docs/proposal.md](docs/proposal.md) for the full proposal.

## Team Members

| Member | Primary responsibilities |
|--------|--------------------------|
| _TBD_  | Brute-force implementation (`src/brute_force/`) |
| _TBD_  | Greedy Build-and-Repair (`src/greedy/`) |
| _TBD_  | Test-network generator, benchmarking and graphs (`scripts/generator.py`, `scripts/benchmark.py`) |

All members analyze results and write the final report.

## Algorithms

1. **Brute Force** (`src/brute_force/`): enumerates every subset of the `m = n(n-1)/2` possible links, checks each subset for connectivity and bridges, and keeps the cheapest valid one. Running time `O(2^m · (n + m))`; practical only up to about 8–9 nodes. Serves as the exact reference answer.
2. **Genetic Algorithm** (`src/genetic/`): **skipped**, as permitted by the assignment. See [src/genetic/README.md](src/genetic/README.md).
3. **Greedy Build-and-Repair** (`src/greedy/`): builds a Minimum Spanning Tree with Kruskal's algorithm (every tree link is a bridge), then repeatedly adds the link with the **lowest cost per bridge it newly covers** until no bridge remains. Fast and deterministic, but may miss the optimum. A close relative (MST + 2-approximate augmentation) is proven within 3× optimal.

Shared C++ code (input parsing, bridge detection) lives in `src/common/`. Python tooling (generator, benchmark, graphs) lives in `scripts/`.

## Building and Running

**Dependencies:**
- Algorithms (`src/`): C++17 compiler (g++ 9+ or clang++), standard library only.
- Tooling (`scripts/`): Python 3.10+ with `matplotlib`, for the test-network generator, benchmark runner, and graphs.

Run all commands from the repository root.

**Build with make** (on Windows/MinGW use `mingw32-make`):

```bash
make
make brute INPUT=tests/test_inputs/square_4.txt
make greedy INPUT=tests/test_inputs/square_4.txt
make test
```

**Build without make:**

```bash
mkdir -p bin
g++ -std=c++17 -O2 src/brute_force/main.cpp src/common/graph.cpp -o bin/brute_force
g++ -std=c++17 -O2 src/greedy/main.cpp src/common/graph.cpp -o bin/greedy
./bin/brute_force tests/test_inputs/square_4.txt
./bin/greedy tests/test_inputs/square_4.txt
```

**Experiments:**

```bash
py -m pip install -r requirements.txt
py scripts/generator.py
py scripts/benchmark.py
```

On macOS/Linux use `python3` instead of `py`.

## Example Input and Output

_Work in progress._ Planned example — the four-office square from the proposal ([tests/test_inputs/square_4.txt](tests/test_inputs/square_4.txt)):

```text
4 4
0 1 1
1 2 1
2 3 1
3 0 1
```

Expected answer: all four links, total cost 4 ([tests/expected_outputs/square_4.txt](tests/expected_outputs/square_4.txt)).

## Experimental Results

_Work in progress._

- **Inputs:** random points with Euclidean link costs; sizes 5–9 for both algorithms, up to ~50 for greedy only; optional TTU campus case study (~47 buildings, OpenStreetMap).
- **Trials:** at least 30 random networks per size; report mean, spread, best, worst.
- **Metrics:** running time, total cost, memory, and gap from best known (brute-force optimum for small sizes, MST cost floor for large).
- Raw data: [results/raw_data/](results/raw_data/) · Graphs: [results/graphs/](results/graphs/)

## Generative AI Statement

_TBD — fill in before submission._ Example: "Claude (Anthropic) was used to scaffold the repository structure and README template. All algorithm implementations were written by the team members."

## References

See [docs/references.md](docs/references.md).
