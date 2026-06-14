# learnvis Skills

Agent skills for **learnvis**, a D3.js visualization library for algorithm lessons — math primitives, graph theory, and layout composition with a fluent builder API.

## Installation

```bash
npx skills add 0xlxx/learnvis
```

## What's Included

The learnvis skill provides coding agents with knowledge about:

- **Math Primitives** — point, vector, segment, circle, polygon, angle, grid, axes, fn, fill, symbol, arc
- **Graph Theory** — vertex, edge, directed/undirected, force/circular layouts
- **Layout System** — node, block (container), port, edge (offset-line), layer (band/swimlane), enclosure
- **Control Flow** — stage(), steps(), frame(), play(), FrameManager direct access
- **Color System** — oklch theme tokens → svgColor() → hex conversion pipeline
- **Transform System** — pure descriptor rotate/scale/translate with interpolate()

## Usage

Once installed, agents will automatically use learnvis knowledge when:

- Creating algorithm/data-structure visualizations
- Building interactive SVG diagrams with nodes and edges
- Setting up graph/network visualizations with D3
- Writing math/animation tutorials
- Designing Sugiyama-style layered layouts

### Example Prompts

```
Create a visualization showing Dijkstra's shortest path algorithm
```

```
Draw a force-directed graph with labeled vertices and weighted edges
```

```
Build a Sugiyama layered layout with 4 ranks and colored band layers
```

```
Set up a coordinate system with axes and plot a function curve
```

```
Animate a sorting algorithm with step-through controls
```

## Documentation

- [learnvis source](https://github.com/0xlxx/learnvis)
- [D3.js](https://d3js.org)

## License

MIT
