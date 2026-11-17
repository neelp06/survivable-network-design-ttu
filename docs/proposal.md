# CSC2400 Term Project Proposal: Survivable Network Design at TTU

## 1. Problem

We will find the cheapest cable layout that connects every site in a network and still works after any single cable fails.

**Terms.** A *node* is an office or other site. A *link* is a cable between two nodes, with a cost. A *bridge* is a link whose removal splits the network into disconnected pieces. A *survivable network* (technically 2-edge-connected) stays connected after any one link fails, so it has no bridges.

- **Input:** n nodes and a cost for every possible link, from map distances or a real dataset.
- **Valid solution:** a set of links that connects every node and has no bridge.
- **Better solution:** lower total cost. The goal is to minimize cost.
- **Real-world use:** campus and internet-provider backbones, data centers, and power grids.

**Small example:** four offices at the corners of a square; every side costs 1.

```text
A ---- B
|      |
D ---- C
```

- *Option 1:* cheapest connected network (3 links, cost 3): `A - B - C - D`. Cutting B–C separates A, B from C, D.
- *Option 2:* survivable network (all 4 sides, cost 4). Adding D–A closes the loop, so after any single cut every office can still reach every other the long way around.

The extra link costs 1 more and buys survivability. The project asks how to find the cheapest such design when there are many nodes and many possible links.

## 2. Why This Problem?

- **Cybersecurity:** Availability is a core security goal. One weak link can be taken down by a single cable cut or targeted attack.
- **Data Science and AI:** A clear optimization task with many possible designs, each with a measurable cost.
- **Why efficiency matters:** Links are expensive to build, and testing every design takes far too long once the network is large.

## 3. Brute-Force Approach

Try every combination of links, check each for connectivity and bridges, keep the cheapest valid one. With n nodes there are n(n−1)/2 possible links, so 2^(n(n−1)/2) combinations.

| Nodes | Possible links | Combinations |
|------:|---------------:|-------------:|
| 7 | 21 | ~2 million |
| 8 | 28 | ~268 million |
| 9 | 36 | ~69 billion |

Running time is roughly O(2^m × (n + m)). The problem is NP-complete (Eswaran & Tarjan).

## 4. Genetic Algorithm (Skipped)

Not included. The assignment allows this section to be skipped; the project compares brute force with the greedy method in Section 5.

## 5. Proposed Third Algorithm: Greedy Build-and-Repair

1. Build the cheapest connecting network, a Minimum Spanning Tree (Kruskal's algorithm).
2. Find its bridges. Every link in a tree is a bridge.
3. Repeatedly add the link with the lowest cost per bridge it newly covers, until no bridge remains.

**Why it fits.** Fast and deterministic. A close relative (spanning tree + 2-approximate augmentation) is proven to cost at most 3× the optimum; we found no such proof for our exact rule.

**How it differs from brute force.** It makes one locally cheap choice at a time and never reconsiders, so it is fast but may miss the best answer.

## 6. Research Question

As the number of nodes grows, how do the solution cost and running time of brute force and a greedy method compare when designing the cheapest survivable network, and at what size does brute force stop being practical?

Secondary: how far above the true best cost (found by brute force) does the greedy method land as the network grows?

## 7. Experimental Plan

- **Test data:** Random nodes, distance-based link cost. Sizes 5–9 for both algorithms; up to ~50 for greedy only. Case study: TTU campus (~47 buildings, OpenStreetMap coordinates, straight-line distances). Brute force on a cluster of 8–9 neighboring buildings; greedy on the full campus.
- **Measurements:** Running time, total cost, memory use, and gap from best known answer (brute force for small cases; MST cost floor for larger).
- **Repeated trials:** At least 30 random networks per size; report average, spread, best, worst.
- **Fairness:** Both algorithms receive identical test networks.

## 8. Expected Challenges

- **Correctness.** Brute force is the reference answer, so its bridge detection must be right; test on hand-solved networks.
- **No true optimum at scale.** Beyond ~9 nodes we only have the MST cost floor, which may make greedy look worse than it is.
- **Fair comparison.** Report cost gap and running time separately.

## 9. Sources

See [references.md](references.md).

## 10. Group Expectations

_Placeholder — replace with the group's actual agreement._

- **Work split:** Member 1 builds brute force. Member 2 builds the greedy method. Member 3 builds the test-network generator and testing/graphing tools. All members analyze results and write the final report.
- **Meetings:** One 30-minute meeting per week, plus short check-ins before deadlines.
- **Communication:** Group chat and a shared Git repository.
- **Conflicts:** Raise concerns in chat within 48 hours; if unresolved, talk in person, then bring it to the instructor early.
