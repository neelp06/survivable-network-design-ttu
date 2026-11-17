# Build with GNU make (on Windows/MinGW: mingw32-make).
CXX      ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra
PY       ?= py
INPUT    ?= tests/test_inputs/square_4.txt

COMMON = src/common/graph.cpp

.PHONY: all brute genetic greedy test bench clean

all: bin/brute_force bin/genetic bin/greedy

bin:
	mkdir -p bin

bin/brute_force: src/brute_force/main.cpp $(COMMON) src/common/graph.h | bin
	$(CXX) $(CXXFLAGS) src/brute_force/main.cpp $(COMMON) -o $@

bin/genetic: src/genetic/main.cpp $(COMMON) src/common/graph.h | bin
	$(CXX) $(CXXFLAGS) src/genetic/main.cpp $(COMMON) -o $@

bin/greedy: src/greedy/main.cpp $(COMMON) src/common/graph.h | bin
	$(CXX) $(CXXFLAGS) src/greedy/main.cpp $(COMMON) -o $@

bin/test_graph: tests/test_graph.cpp $(COMMON) src/common/graph.h | bin
	$(CXX) $(CXXFLAGS) tests/test_graph.cpp $(COMMON) -o $@

brute: bin/brute_force
	./bin/brute_force $(INPUT)

genetic: bin/genetic
	./bin/genetic $(INPUT)

greedy: bin/greedy
	./bin/greedy $(INPUT)

test: bin/test_graph
	./bin/test_graph

bench: all
	$(PY) scripts/benchmark.py

clean:
	rm -rf bin
