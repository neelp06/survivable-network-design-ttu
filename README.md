# Survivable Network Design at TTU

CSC 2400 — Design of Algorithms, Undergraduate Research Project.

## Project Overview

We find the **cheapest cable layout that connects every site in a network and still works after any single cable fails**.

- **Input:** `n` nodes (sites) and a cost for every possible link (cable) between them, from map distances or a real dataset.
- **Valid solution:** a set of links that connects every node and contains **no bridge** (a link whose removal disconnects the network). Such a network is *2-edge-connected*.
- **Optimal solution:** the valid solution with the **lowest total link cost**.

The problem is NP-complete (Eswaran & Tarjan, 1976). Applications include campus and ISP backbones, data centers, and power grids.

**Research question:** As the number of nodes grows, how do solution cost and running time of brute force, a genetic algorithm and a greedy method compare, and at what size does brute force stop being practical? Secondary: how far above the true optimum do the genetic and greedy methods land?

See [docs/proposal.md](docs/proposal.md) for the full proposal.

## Team Members

| Member | Primary responsibilities |
|--------|--------------------------|
| Nick   | Brute-force implementation (`src/brute_force/`) |
| Cristin| Greedy Build-and-Repair (`src/greedy/`) |
| Neel   | Genetic Implementation (`src/genetic/`)|
| Brady  | Building Simulation Software for Case Study and Randomized Data sets|

All members analyze results and write the final report.

## Algorithms

1. **Brute Force** (`src/brute_force/`): enumerates every subset of the `m = n(n-1)/2` possible links, checks each subset for connectivity and bridges, and keeps the cheapest valid one. Running time `O(2^m · (n + m))`; practical only up to about 8–9 nodes. Serves as the exact reference answer.
2. **Genetic Algorithm** (`src/genetic/`): evolves a population of candidate networks toward cheaper survivable designs. Randomized, so it may find better answers than greedy but gives no guarantee of the optimum.
   - **Representation (chromosome):** a bit string of length `m = n(n-1)/2`, one bit per possible link. Bit `i` = 1 means link `i` is built. This is the same search space brute force enumerates, so the GA samples it instead of checking every string.
   - **Initial population:** a mix of random bit strings (each link on with some probability) and seeded individuals, such as the MST plus random extra links, so the search starts near valid designs.
   - **Fitness (lower is better):** `total cost + penalty × (number of bridges + extra disconnected components)`. A valid network has penalty 0, so fitness is just its cost. The penalty is set larger than any link cost so that an invalid network never beats a valid one.
   - **Repair (optional):** an invalid child can be fixed by adding the cheapest link that covers its bridges (the same idea as the greedy repair step), then pruned by removing expensive links whose removal keeps it survivable.
   - **Selection:** tournament selection, which picks a few individuals at random and keeps the fittest.
   - **Crossover:** uniform crossover, where each link bit is copied from one parent or the other at random, so good link choices from both parents combine.
   - **Mutation:** flip each bit with a small probability (around `1/m`), adding or removing a link.
   - **Elitism and stopping:** the best individuals carry over unchanged each generation. The run stops after a fixed number of generations or when the best cost stops improving.
   - **Output:** the cheapest valid network seen across all generations.
   - **Trials:** because results vary run to run, the GA runs at least 30 times per network with different random seeds, and we report the mean, spread, best and worst cost.
3. **Greedy Build-and-Repair** (`src/greedy/`): builds a Minimum Spanning Tree with Kruskal's algorithm (every tree link is a bridge), then repeatedly adds the link with the **lowest cost per bridge it newly covers** until no bridge remains. Fast and deterministic, but may miss the optimum. A close relative (MST + 2-approximate augmentation) is proven within 3× optimal.

Shared C++ code (input parsing, bridge detection) lives in `src/common/`. Python tooling (generator, benchmark, graphs) lives in `scripts/`.

## Repository Structure

```text
survivable-network-design-ttu/
├── README.md                  # project overview (this file)
├── .gitignore                 # ignores build output, Python cache, IDE/OS files
├── Makefile                   # build, run, and test targets
├── requirements.txt           # Python dependencies for scripts/
├── src/                       # C++17 algorithm implementations
│   ├── brute_force/
│   │   └── brute_force.cpp    # exact search over every subset of links
│   ├── genetic/
│   │   └── genetic.cpp        # genetic algorithm (bit-string chromosomes)
│   ├── greedy/
│   │   └── greedy.cpp         # Greedy Build-and-Repair (MST + bridge repair)
│   └── common/
│       ├── graph.h            # shared types: Link, Network
│       └── graph.cpp          # input parsing, connectivity, bridge detection
├── scripts/                   # Python tooling
│   ├── generator.py           # random test-network generator
│   └── benchmark.py           # runs experiments, writes results and graphs
├── tests/
│   ├── README.md              # input format and how to run tests
│   ├── test_graph.cpp         # unit tests for shared graph code
│   ├── test_inputs/           # networks given to both algorithms
│   └── expected_outputs/      # hand-solved answers for small networks
├── results/
│   ├── raw_data/              # benchmark CSVs
│   └── graphs/                # plots of runtime and cost gap
├── data/                      # real-world datasets (TTU campus case study)
└── docs/
    ├── proposal.md            # project proposal
    └── references.md          # sources and third-party libraries
```

## Building and Running

**Dependencies:**
- Algorithms (`src/`): C++17 compiler (g++ 9+ or clang++), standard library only.
- Tooling (`scripts/`): Python 3.10+ with `matplotlib`, for the test-network generator, benchmark runner, and graphs.

Run all commands from the repository root.

**Build with make** (on Windows/MinGW use `mingw32-make`):

```bash
make
make brute INPUT=tests/test_inputs/square_4.txt
make genetic INPUT=tests/test_inputs/square_4.txt
make greedy INPUT=tests/test_inputs/square_4.txt
make test
```

**Build without make:**

```bash
mkdir -p bin
g++ -std=c++17 -O2 src/brute_force/main.cpp src/common/graph.cpp -o bin/brute_force
g++ -std=c++17 -O2 src/genetic/main.cpp src/common/graph.cpp -o bin/genetic
g++ -std=c++17 -O2 src/greedy/main.cpp src/common/graph.cpp -o bin/greedy
./bin/brute_force tests/test_inputs/square_4.txt
./bin/genetic tests/test_inputs/square_4.txt
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

- **Inputs:** random points with Euclidean link costs; sizes 5–9 for all three algorithms, up to ~50 for genetic and greedy only; optional TTU campus case study (~47 buildings, OpenStreetMap).
- **Trials:** at least 30 random networks per size; report mean, spread, best, worst. The GA additionally runs with multiple random seeds per network.
- **Metrics:** running time, total cost, memory, and gap from best known (brute-force optimum for small sizes, MST cost floor for large).
- Raw data: [results/raw_data/](results/raw_data/) · Graphs: [results/graphs/](results/graphs/)

## Generative AI Statement

**Presentation website (`site/`, `.github/workflows/pages.yml`).** Brady used Claude (Anthropic) through Claude Code to build the presentation website: the page layout, styling, scroll transitions, presenter controls, the small explanatory animations (square cut example, crossover illustration, greedy illustration), and the GitHub Pages deploy workflow. Section wording was drafted with Claude from the team's README, proposal and references, then checked against the repository. Content not yet confirmed by the team is marked on the site with a dashed "TBD" box. Brady directed the design and reviewed the output. The code excerpt on the brute-force slide is copied verbatim from Nick's `src/brute_force/brute_force.cpp`; Claude did not write or change any algorithm code.

_Other members: add any AI use for your own parts before submission._

## References

See [docs/references.md](docs/references.md).
