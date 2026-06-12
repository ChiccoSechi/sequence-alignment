# Sequence Alignment

**Dynamic Programming Sequence Alignment** is an interactive GitHub Pages web application that visualizes the mechanics of two fundamental dynamic programming algorithms in Bioinformatics: **Needleman-Wunsch** (Global Alignment) and **Smith-Waterman** (Local Alignment).

This tool is designed to help users understand how these algorithms align biological sequences.

> **Try it live**: The application is hosted on GitHub Pages. [Click here to launch the Sequence Alignment Visualizer](https://ChiccoSechi.github.io/SequenceAlignment/).

### Algorithms 

Compare sequences aligment using two distinct approaches:

- **Needleman-Wunsch**: Implements **Global Alignment**, which finds the optimal alignment across the entire length of two sequences. It is best suited for sequences that are similar in length and of comparable length.
- **Smith-Waterman**: Implements **Local Alignment**, which finds the optimal alignment between the best-matching subsequences of two sequences. It is ideal for spotting a shared region inside different sequences.

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