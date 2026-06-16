# Sequence Alignment

**Sequence Alignment** is an interactive GitHub Pages web application that visualizes how fundamental Bioinformatics algorithms align biological sequences. It covers two complementary families of approaches: exact **dynamic programming** (Needleman-Wunsch and Smith-Waterman) and the **seed-and-extend heuristic** used by FASTA.

This tool is designed to help users understand how these algorithms work, step by step.

> **Try it live**: The application is hosted on GitHub Pages. [Click here to launch the Sequence Alignment Visualizer](https://ChiccoSechi.github.io/sequence-alignment/).

## Dynamic Programming

![Demo](docs/SequenceAlignmentGIF.gif)

Exact algorithms that guarantee the optimal alignment for a chosen scoring scheme, comparing sequences with two distinct approaches:

- **Needleman-Wunsch**: Implements **Global Alignment**, which finds the optimal alignment across the entire length of two sequences. It is best suited for sequences that are similar overall and of comparable length.
- **Smith-Waterman**: Implements **Local Alignment**, which finds the optimal alignment between the best-matching subsequences of two sequences. It is ideal for spotting a shared region inside otherwise different sequences.

### Customizable Scoring

Users can adjust the scoring parameters to see how different values affect the alignment:
- **Match Score**: Points awarded for matching bases (e.g., A-A).
- **Mismatch Score**: Points deducted for non-matching bases.
- **Gap Penalty**: Points deducted for inserting gaps to align sequences.

### Interactive Visualization

A dynamic scoring matrix updates as inputs change. Clicking any cell reveals the step-by-step calculation (diagonal, top, left, or floor) used to determine its final score. All valid optimal paths are automatically detected and displayed in a list; selecting a path from this list highlights the specific traceback route on the matrix. Pre-defined example sequences are also available for immediate testing.

### Results

- **Optimal Paths**: Lists every valid path found with its coordinate sequence.
- **Alignment Result**: Displays the final aligned sequences with gaps and match/mismatch indicators.
- **Alignment Score**: Shows the final calculated score for the alignment (and the best local score for Smith-Waterman).

### How It Works

1. Enter two sequences.
2. Select the algorithm (Global or Local).
3. Adjust Match, Mismatch, and Gap parameters.
4. Run the alignment to generate the matrix.
5. Explore the results by inspecting cells and selecting optimal paths.

## Heuristics

![Demo](docs/HeuristicsGIF.gif)

Dynamic programming is optimal, but it runs in O(n × m) time and space: every cell of the matrix must be computed and stored. At genome scale, with billions of base pairs and millions of reads, that cost becomes prohibitive. Heuristics give up the guarantee of optimality to stay fast and practical, focusing expensive computation only where it is likely to pay off.

- **FASTA**: A **seed-and-extend** algorithm that searches for regions of similarity between a query and a target sequence. Instead of aligning everything, it anchors on short exact matches to spot promising regions, then computes a full local alignment only around the best diagonal it finds.

### Interactive Visualization

The FASTA page visualizes the first three steps of the algorithm:

1. **K-tuple Generation**: The query is split into all words of length **k** (the word length, user-defined). Each k-tuple is shown aligned under the query letters it was taken from.
2. **Exact Matches in Target**: Each k-tuple is searched for in the target. Every occurrence records its position in the query, its position in the target, and the `diagonal = posT - posQ`. A table lists the matches, and each diagonal is scored by its number of matches.
3. **Diagonal Matrix**: A Query × Target matrix where every match is marked and colored by its diagonal, with a unique name (A, B, C, ...) shared between the table and the matrix. Selecting a diagonal highlights it across the matrix and shows its score; the top-scoring diagonal is the strongest candidate region for local alignment.

### How It Works

1. Enter a query and a target sequence.
2. Set **k**, the word length.
3. Run FASTA to generate the three steps.
4. Click any diagonal to highlight it on the matrix and inspect its score.
