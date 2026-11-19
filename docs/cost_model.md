# Dollar cost model for the TTU case study

_Researched 2026-11-19. These are planning estimates from published industry surveys and contractor guides, not quotes for Tennessee Tech. Real costs need a site survey and local bids._

## Formula

For a link between two buildings:

```text
cost_usd = route_length_ft × (civil_per_ft + cable_per_ft) + per_link_fixed
route_length_ft = straight-line distance (m) × 3.28084 × route_factor
```

- **civil_per_ft** covers the underground construction: trenching or directional boring, conduit and labor. This is most of the cost.
- **cable_per_ft** is the outdoor single-mode fiber itself.
- **per_link_fixed** is the per-link cost that doesn't scale with length, such as termination, splicing and testing. Because of this fixed cost, an extra link is never free, even between neighboring buildings. That can change which design is cheapest compared with a pure-distance model.
- **route_factor** (default 1.0) is an assumption. Real cable follows walkways and avoids buildings, so the actual route is longer than a straight line.

Use `python3 scripts/sim/make_network.py <csv> <out> --cost usd --scenario low|median|high [--route-factor 1.3]`.

## Scenarios

| Parameter | Low | Median (default) | High | Source |
|---|---:|---:|---:|---|
| civil_per_ft | $12.00 | $16.25 | $23.25 | Fiber Broadband Association / Cartesian surveys. Low is the median for trenching; median is the overall underground median; high is the urban underground median. [1][2] |
| cable_per_ft | $0.35 | $0.64 | $0.92 | Contractor guide range for bulk OS2 single-mode cable. [3] |
| per_link_fixed | $1,500 | $2,500 | $3,500 | Contractor guide: an armored OS2 direct-burial building-to-building link is $1,500–$3,500, including materials and labor. [3] |

## Caveats (say these on the slide)

- The FBA figures come from broadband deployments, not university campuses. Campus work under sidewalks, roads and existing utilities may cost more. Rock also roughly doubles underground cost [2], and Cookeville sits on limestone.
- The per-link fixed cost comes from contractor blogs with unclear methodology. It's the weakest number here, which is why we test three scenarios.
- **Not included:**
  - network switches and optics in each building
  - building entry work
  - permits, design, and project management
  - existing TTU conduit that could be reused, which would lower costs a lot.
- The model compares designs fairly because the same estimate applies to every algorithm. It doesn't predict TTU's real budget.

## Sources

1. Fiber Broadband Association, "The Costs for Deploying Fiber" (2024). https://fiberbroadband.org/2024/03/12/the-costs-for-deploying-fiber/
2. Fierce Network, "Cartesian, FBA calculate underground fiber to cost 2x more than aerial." https://www.fierce-network.com/broadband/underground-fiber-drives-deployment-costs. See also the FBA/Cartesian *Fiber Deployment Cost Annual Report 2024*: https://fiberbroadband.org/wp-content/uploads/2025/01/FBA_Cartesian_Fiber-Deployment-Cost-Annual-Report-2024.pdf
3. Contractor and vendor pricing guides, found in a web search summary that did not say which guide gave which figure. Check each figure against these pages:
   - https://thenetworkinstallers.com/blog/cost-of-fiber-optic-cable/
   - https://srsnetworks.com/fiber-optic-installation-cost
   - https://clrnet.net/cost-of-fiber-optic-cable/
   - https://store.cablesplususa.com/cabling-insider-blog/fiber-optic-cable-cost/

> Verify these figures in the source PDFs before presenting. They were gathered from search summaries.
