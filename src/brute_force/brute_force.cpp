
#include <iostream>
#include <vector>
#include <climits>
#include <chrono>
#include <fstream>
using namespace std;

 
//    Every Edge has two vertices (u, v) and a weight. 
struct Edge
{
    int u, v, weight;
};

bool isConnected(int, vector<Edge>&, vector<int>&);
void bruteForceMST(int, vector<Edge>&);

int main() 
{
    string filename;
    ifstream file;
    int u, v, weight;
    int maxVertex = 0;
    int E;
    int V;

    cout << "Enter name of test case file: ";
    cin >> filename;

    file.open(filename);

    if (!file.is_open()) {
        cout << "Error: Could not open file." << endl;
        return 1;
    }

    vector<Edge> edges;

    // Read edges and weights from the file
    while (file >> u >> v >> weight) {

        edges.push_back({u, v, weight});

        maxVertex = max(maxVertex, max(u, v));
    }

    file.close();

    E = edges.size();
    V = maxVertex;

    cout << "Number of vertices: " << V << endl;
    cout << "Number of edges: " << E << endl;

    auto start = chrono::steady_clock::now();

    bruteForceMST(V, edges);

    auto end = chrono::steady_clock::now();

    double micros = chrono::duration<double, micro>(end - start).count();

    cout << endl << "Time in Microseconds: " << micros << endl;

    return 0;
}

// Check whether the selected edges form a connected graph

bool isConnected(int V, vector<Edge>& edges, vector<int>& selected) {
    vector<int> visited(V + 1, 0);
    vector<int> stack;
    int current;
    int u;
    int v;

    stack.push_back(1);
    visited[1] = 1;

    while (!stack.empty()) {
        current = stack.back();
        stack.pop_back();

        for (int index : selected) {
            u = edges[index].u;
            v = edges[index].v;

            if (u == current && !visited[v]) {
                visited[v] = 1;
                stack.push_back(v);
            }
            else if (v == current && !visited[u]) {
                visited[u] = 1;
                stack.push_back(u);
            }
        }
    }

    // Check vertices 1 through V
    for (int i = 1; i <= V; i++) {
        if (!visited[i])
            return false;
    }

    return true;
}


// Brute force MST algorithm
void bruteForceMST(int V, vector<Edge>& edges)
 {
    int E = edges.size();
    long long minWeight = LLONG_MAX;
    long long totalWeight;
    int count;


    if (V == 0) // BaseCase 1: checks if 
    {
        cout << "Graph has no vertices.\n";
        return;
    }

    if (V == 1) 
    {
        cout << "Minimum Spanning Tree has total weight: 0\n";
        return;
    }

    
    vector<int> bestMST;

    // Enumerate every possible subset of edges
    for (int mask = 0; mask < (1 << E); mask++) 
    {

        vector<int> selected;
        count = 0;
        totalWeight = 0;

        for (int i = 0; i < E; i++) 
        {
            if (mask & (1 << i)) 
            {
                selected.push_back(i);
                count++;
                totalWeight += edges[i].weight;
            }
        }

        // A spanning tree must contain exactly V edges
        if (count != V - 1)
            continue;

        // Check connectivity (also guarantees no cycles
        // when exactly V-1 edges are selected)
        if (isConnected(V, edges, selected)) 
        {

            if (totalWeight < minWeight) 
            {
                minWeight = totalWeight;
                bestMST = selected;
            }
        }
    }

    if (minWeight == LLONG_MAX) 
    {
        cout << "No spanning tree exists.\n";
        return;
    }

    cout << "\nMinimum Spanning Tree:\n";

    for (int index : bestMST) 
    {
        cout << edges[index].u << " -- "
             << edges[index].v
             << " (Weight: "
             << edges[index].weight << ")\n";
    }

    cout << "\nMinimum Total Weight: " << minWeight << endl;
}
