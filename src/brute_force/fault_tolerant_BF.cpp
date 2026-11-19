
#include <iostream>
#include <vector>
#include <climits>
#include <chrono>
#include <fstream>
using namespace std;

struct Edge
{
    int u, v, weight;
};

bool isConnected(int V, vector<Edge>& edges, vector<int>& selected);

bool isFaultTolerant(int V, vector<Edge>& edges, vector<int>& selected);

void bruteForceFTMST(int V, vector<Edge>& edges);


// Main function
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

    if (!file.is_open())
    {
        cout << "Error: Could not open file." << endl;
        return 1;
    }

    vector<Edge> edges;

    // Read edges and weights from file
    while (file >> u >> v >> weight)
    {
        edges.push_back({u, v, weight});

        maxVertex = max(maxVertex, max(u, v));
    }

    file.close();

    E = edges.size();
    V = maxVertex;

    cout << "Number of vertices: " << V << endl;
    cout << "Number of edges: " << E << endl;

    auto start = chrono::steady_clock::now();

    bruteForceFTMST(V, edges);

    auto end = chrono::steady_clock::now();

    double sec = chrono::duration<double>(end - start).count();

    cout << endl << "Time in Seconds: " << sec << endl;

    return 0;
}


// Check whether selected edges connect all vertices
bool isConnected(int V, vector<Edge>& edges,
                 vector<int>& selected)
{
    vector<int> visited(V + 1, 0);
    vector<int> stack;

    int current;
    int u, v;

    stack.push_back(1);
    visited[1] = 1;

    while (!stack.empty())
    {
        current = stack.back();
        stack.pop_back();

        for (int index : selected)
        {
            u = edges[index].u;
            v = edges[index].v;

            if (u == current && !visited[v])
            {
                visited[v] = 1;
                stack.push_back(v);
            }
            else if (v == current && !visited[u])
            {
                visited[u] = 1;
                stack.push_back(u);
            }
        }
    }

    // Check whether every vertex was visited
    for (int i = 1; i <= V; i++)
    {
        if (!visited[i])
            return false;
    }

    return true;
}


// Check whether the graph survives any single edge failure
bool isFaultTolerant(int V, vector<Edge>& edges,
                     vector<int>& selected)
{
    // Remove each selected edge individually
    for (int removed : selected)
    {
        vector<int> remaining;

        for (int index : selected)
        {
            if (index != removed)
            {
                remaining.push_back(index);
            }
        }

        // If the graph becomes disconnected,
        // it is not fault tolerant
        if (!isConnected(V, edges, remaining))
        {
            return false;
        }
    }

    return true;
}


// Brute force fault-tolerant MST algorithm
void bruteForceFTMST(int V, vector<Edge>& edges)
{
    int E = edges.size();

    long long minWeight = LLONG_MAX;
    long long totalWeight;

    int count;

    if (V == 0)
    {
        cout << "Graph has no vertices.\n";
        return;
    }

    if (V == 1)
    {
        cout << "Fault-tolerant spanning graph "
             << "has total weight: 0\n";
        return;
    }

    vector<int> bestFTMST;

    // Enumerate every possible subset of edges
    for (int mask = 0; mask < (1 << E); mask++)
    {
        vector<int> selected;

        count = 0;
        totalWeight = 0;

        // Build current subset
        for (int i = 0; i < E; i++)
        {
            if (mask & (1 << i))
            {
                selected.push_back(i);
                count++;
                totalWeight += edges[i].weight;
            }
        }

        // A 2-edge-connected graph must have
        // at least V edges
        if (count < V)
            continue;

        // Skip candidates that cannot improve
        // the current best solution (assuming
        // nonnegative edge weights)
        if (totalWeight >= minWeight)
            continue;

        // Check fault tolerance
        if (isFaultTolerant(V, edges, selected))
        {
            minWeight = totalWeight;
            bestFTMST = selected;
        }
    }

    // No valid fault-tolerant spanning graph found
    if (minWeight == LLONG_MAX)
    {
        cout << "No fault-tolerant spanning graph exists.\n";
        return;
    }

    // Display resulting graph
    cout << "\nMinimum Fault-Tolerant Spanning Graph:\n";

    for (int index : bestFTMST)
    {
        cout << edges[index].u << " -- "
             << edges[index].v
             << " (Weight: "
             << edges[index].weight << ")\n";
    }

    cout << "\nMinimum Total Weight: "
         << minWeight << endl;

    cout << "Number of edges in solution: "
         << bestFTMST.size() << endl;
}
