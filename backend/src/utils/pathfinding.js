/**
 * A* Pathfinding Algorithm
 * 
 * @param {Object} start {x, y}
 * @param {Object} end {x, y}
 * @param {Set<string>} obstacles Set of "x,y" strings representing blocked coordinates
 * @param {number} gridSize The size of the grid (default 100)
 * @returns {Object} { path: Array<{x, y}>, distance: number }
 */
export function findPath(start, end, obstacles, gridSize = 100) {
    // Helper to get key for set
    const key = (x, y) => `${x},${y}`;

    // Priority Queue implementation (Open Set) - Simplified as array for this MVP
    // For production, use a Binary Heap
    const openSet = [start];
    const cameFrom = new Map();

    // gScore: Cost from start to node
    const gScore = new Map();
    gScore.set(key(start.x, start.y), 0);

    // fScore: Estimated total cost (g + h)
    const fScore = new Map();
    fScore.set(key(start.x, start.y), heuristic(start, end));

    while (openSet.length > 0) {
        // Get node with lowest fScore
        openSet.sort((a, b) => {
            const fA = fScore.get(key(a.x, a.y)) ?? Infinity;
            const fB = fScore.get(key(b.x, b.y)) ?? Infinity;
            return fA - fB;
        });

        const current = openSet.shift(); // Pop best node

        // Check if reached goal
        if (current.x === end.x && current.y === end.y) {
            return reconstructPath(cameFrom, current);
        }

        // Neighbors (4-directional: N, S, E, W)
        const neighbors = [
            { x: current.x, y: current.y - 1 },
            { x: current.x, y: current.y + 1 },
            { x: current.x - 1, y: current.y },
            { x: current.x + 1, y: current.y }
        ];

        for (const neighbor of neighbors) {
            // Check bounds
            if (neighbor.x < 0 || neighbor.x > gridSize || neighbor.y < 0 || neighbor.y > gridSize) continue;

            // Check obstacles
            if (obstacles.has(key(neighbor.x, neighbor.y))) continue;

            const neighborKey = key(neighbor.x, neighbor.y);
            const tentativeGScore = (gScore.get(key(current.x, current.y)) ?? Infinity) + 1; // Cost is 1 per step

            if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
                // This path is better
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, end));

                if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    // No path found
    return { path: [], distance: Infinity };
}

function heuristic(a, b) {
    // Manhattan distance implies 4-directional movement cost
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(cameFrom, current) {
    const totalPath = [current];
    const key = (x, y) => `${x},${y}`;

    while (cameFrom.has(key(current.x, current.y))) {
        current = cameFrom.get(key(current.x, current.y));
        totalPath.unshift(current);
    }

    // Distance matches path length - 1 (steps)
    return { path: totalPath, distance: totalPath.length - 1 };
}
