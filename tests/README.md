# Tests

- `test_inputs/` (generate more with `py scripts/generator.py`) — networks fed to **both** algorithms (identical inputs for fairness).
- `expected_outputs/` — hand-solved answers for small networks, used to check the brute-force reference.

## Input format

```text
n m
u v cost      # m lines, nodes numbered 0..n-1
```

Lines starting with `#` are comments. A complete graph lists all n(n-1)/2 links.

## Running

```bash
make test
```
