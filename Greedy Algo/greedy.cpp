#include <algorithm>
#include <chrono>
#include <fstream>
#include <iostream>
#include <limits>
#include <numeric>
#include <queue>
#include <vector>
using namespace std;

struct Link {
    int u, v;
    double cost;
};

// used by Kruskal's to tell whether two nodes are already connected.
struct UnionFind {
    vector<int> parent;
    UnionFind(int n) : parent(n) { iota(parent.begin(), parent.end(), 0); }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }
    bool join(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return false;
        parent[a] = b;
        return true;
    }
};

// Simple bridge check: remove each chosen link one at a time and BFS.
// Returns true if the chosen links connect every node and contain no bridge.
bool isSurvivable(int n, const vector<Link>& links, const vector<int>& chosen) {
    for (int skip = -1; skip < (int)chosen.size(); skip++) {
        vector<vector<int>> adj(n);
        for (int k = 0; k < (int)chosen.size(); k++) {
            if (k == skip) continue;
            const Link& L = links[chosen[k]];
            adj[L.u].push_back(L.v);
            adj[L.v].push_back(L.u);
        }
        vector<bool> seen(n, false);
        queue<int> q;
        q.push(0);
        seen[0] = true;
        int reached = 1;
        while (!q.empty()) {
            int x = q.front();
            q.pop();
            for (int y : adj[x]) {
                if (!seen[y]) {
                    seen[y] = true;
                    reached++;
                    q.push(y);
                }
            }
        }
        if (reached != n) return false;  // skip == -1 means not even connected
    }
    return true;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cerr << "usage: " << argv[0] << " <network file>\n";
        return 1;
    }
    ifstream in(argv[1]);
    if (!in) {
        cerr << "could not open " << argv[1] << "\n";
        return 1;
    }

    int n;
    in >> n;
    vector<Link> links;
    Link L;
    while (in >> L.u >> L.v >> L.cost) links.push_back(L);
    int m = links.size();

    if (n < 3) {
        cout << "no valid design: a survivable network needs at least 3 nodes\n";
        return 0;
    }

    auto start = chrono::steady_clock::now();

    // ---- Step 1: Kruskal's minimum spanning tree ----
    vector<int> order(m);
    iota(order.begin(), order.end(), 0);
    stable_sort(order.begin(), order.end(),
                [&](int a, int b) { return links[a].cost < links[b].cost; });

    UnionFind uf(n);
    vector<bool> inTree(m, false);
    int treeSize = 0;
    for (int i : order) {
        if (uf.join(links[i].u, links[i].v)) {
            inTree[i] = true;
            treeSize++;
            if (treeSize == n - 1) break;
        }
    }
    if (treeSize != n - 1) {
        cout << "no valid design: the possible links do not connect every node\n";
        return 0;
    }

    // ---- Step 2: root the tree, then find the tree path each extra link would cover ----
    vector<vector<pair<int, int>>> treeAdj(n);  // (neighbor, link index)
    for (int i = 0; i < m; i++) {
        if (inTree[i]) {
            treeAdj[links[i].u].push_back({links[i].v, i});
            treeAdj[links[i].v].push_back({links[i].u, i});
        }
    }
    vector<int> parent(n, -1), parentLink(n, -1), depth(n, 0);
    vector<bool> visited(n, false);
    queue<int> q;
    q.push(0);
    visited[0] = true;
    while (!q.empty()) {
        int x = q.front();
        q.pop();
        for (auto [y, li] : treeAdj[x]) {
            if (!visited[y]) {
                visited[y] = true;
                parent[y] = x;
                parentLink[y] = li;
                depth[y] = depth[x] + 1;
                q.push(y);
            }
        }
    }

    // path[i] = tree links on the loop that extra link i would close
    vector<vector<int>> path(m);
    for (int i = 0; i < m; i++) {
        if (inTree[i]) continue;
        int a = links[i].u, b = links[i].v;
        while (a != b) {
            if (depth[a] < depth[b]) swap(a, b);
            path[i].push_back(parentLink[a]);
            a = parent[a];
        }
    }

    // ---- Step 3: greedily add the link with the lowest cost per newly covered bridge ----
    vector<bool> uncovered = inTree;  // every tree link starts as a bridge
    int bridgesLeft = n - 1;
    vector<bool> added(m, false);
    vector<int> chosen;
    for (int i = 0; i < m; i++)
        if (inTree[i]) chosen.push_back(i);

    while (bridgesLeft > 0) {
        int best = -1;
        double bestScore = numeric_limits<double>::infinity();
        for (int i = 0; i < m; i++) {
            if (inTree[i] || added[i]) continue;
            int newly = 0;
            for (int t : path[i])
                if (uncovered[t]) newly++;
            if (newly == 0) continue;
            double score = links[i].cost / newly;
            if (score < bestScore) {  // strict: ties go to the lowest link index
                bestScore = score;
                best = i;
            }
        }
        if (best == -1) {
            cout << "no valid design: some bridge cannot be covered by any possible link\n";
            return 0;
        }
        added[best] = true;
        chosen.push_back(best);
        for (int t : path[best]) {
            if (uncovered[t]) {
                uncovered[t] = false;
                bridgesLeft--;
            }
        }
    }

    auto end = chrono::steady_clock::now();
    double micros = chrono::duration<double, micro>(end - start).count();

    // ---- Report ----
    double total = 0, treeCost = 0;
    for (int i : chosen) {
        total += links[i].cost;
        if (inTree[i]) treeCost += links[i].cost;
    }
    bool valid = isSurvivable(n, links, chosen);

    cout << "chosen links (u v cost):\n";
    for (int i : chosen)
        cout << "  " << links[i].u << " " << links[i].v << " " << links[i].cost
             << (inTree[i] ? "   [tree]" : "   [added]") << "\n";
    cout << "nodes " << n << "\n";
    cout << "links_used " << chosen.size() << "\n";
    cout << "tree_cost " << treeCost << "\n";  // the cost floor from Section 7
    cout << "total_cost " << total << "\n";
    cout << "time_microseconds " << micros << "\n";
    cout << "valid " << (valid ? "yes" : "NO (bug)") << "\n";
    return 0;
}
