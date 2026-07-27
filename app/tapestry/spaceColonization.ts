// Space colonization (Runions et al., "Modeling Trees with a Space
// Colonization Algorithm"): the guests' names are attractors, and branches
// grow from the trunk towards them. Each iteration every attractor tugs on its
// nearest branch node; a node pulled by several attractors grows one segment in
// their averaged direction, so limbs fork where the crowd of names splits and
// thin as they reach the edge — the irregular, non-overlapping branching a real
// crown has, which hand-placed Béziers can only approximate.

export type Vec = { x: number; y: number };

export type SCANode = {
  pos: Vec;
  parent: number; // index into nodes; -1 for the root
  depth: number; // steps from the root, for the grow-outward draw stagger
  // How many attractors (names) this node ultimately feeds. Drives taper:
  // a limb carrying the whole left sky is thick, a twig carrying one name is
  // a thread. The root's count equals the number of attractors.
  leafLoad: number;
};

export type SCAParams = {
  // A node can only be tugged by attractors within this radius. Large enough
  // that the root sees the whole canopy (so a trunk forms and then splits),
  // small values give bushier, earlier forking.
  attractionDistance: number;
  // An attractor is satisfied — and stops pulling — once a node comes this
  // close. Must exceed segmentLength or a node oscillates without ever
  // arriving.
  killDistance: number;
  segmentLength: number;
  maxIterations: number;
  // Lateral wander, in radians, added to each growth step so limbs meander
  // like wood instead of arrowing straight at their targets.
  jitter: number;
  // Seeded so the server and every client grow an identical tree.
  random: () => number;
};

export type SCAResult = {
  nodes: SCANode[];
  // For each attractor (same order as the input), the index of the node that
  // ended up nearest it — where that name's leaf-stem should attach.
  terminals: number[];
};

const distanceSquared = (a: Vec, b: Vec) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const buildSpaceColonizationTree = (
  root: Vec,
  attractors: Vec[],
  params: SCAParams,
): SCAResult => {
  const { attractionDistance, killDistance, segmentLength, maxIterations, jitter, random } = params;
  const nodes: SCANode[] = [{ pos: root, parent: -1, depth: 0, leafLoad: 0 }];

  if (attractors.length === 0) {
    return { nodes, terminals: [] };
  }

  const attractionSq = attractionDistance * attractionDistance;
  const killSq = killDistance * killDistance;
  const alive = attractors.map(() => true);
  let remaining = attractors.length;

  for (let iteration = 0; iteration < maxIterations && remaining > 0; iteration++) {
    // Association: each live attractor votes for its nearest node, and a node's
    // votes are summed into a single pull direction.
    const pull = new Map<number, Vec>();
    for (let a = 0; a < attractors.length; a++) {
      if (!alive[a]) continue;
      const attractor = attractors[a];
      let nearest = -1;
      let nearestSq = attractionSq;
      for (let n = 0; n < nodes.length; n++) {
        const d = distanceSquared(attractor, nodes[n].pos);
        if (d < nearestSq) {
          nearestSq = d;
          nearest = n;
        }
      }
      if (nearest === -1) continue;
      const from = nodes[nearest].pos;
      const length = Math.sqrt(nearestSq) || 1;
      const dir = { x: (attractor.x - from.x) / length, y: (attractor.y - from.y) / length };
      const summed = pull.get(nearest);
      if (summed) {
        summed.x += dir.x;
        summed.y += dir.y;
      } else {
        pull.set(nearest, { x: dir.x, y: dir.y });
      }
    }

    if (pull.size === 0) break; // nothing in reach — the canopy is as full as it gets

    // Growth: every pulled node sprouts one child a segment along its averaged
    // direction, nudged by a little seeded wander.
    for (const [nodeIndex, summed] of pull) {
      const magnitude = Math.hypot(summed.x, summed.y) || 1;
      let angle = Math.atan2(summed.y / magnitude, summed.x / magnitude);
      angle += (random() - 0.5) * 2 * jitter;
      const parent = nodes[nodeIndex];
      nodes.push({
        pos: {
          x: parent.pos.x + Math.cos(angle) * segmentLength,
          y: parent.pos.y + Math.sin(angle) * segmentLength,
        },
        parent: nodeIndex,
        depth: parent.depth + 1,
        leafLoad: 0,
      });
    }

    // Pruning: retire any attractor a node has now reached.
    for (let a = 0; a < attractors.length; a++) {
      if (!alive[a]) continue;
      for (let n = 0; n < nodes.length; n++) {
        if (distanceSquared(attractors[a], nodes[n].pos) < killSq) {
          alive[a] = false;
          remaining--;
          break;
        }
      }
    }
  }

  // Each attractor keeps the node that came nearest it (unbounded now — even a
  // name the growth never quite reached still gets the closest tip), so its
  // leaf can attach.
  const terminals = attractors.map((attractor) => {
    let nearest = 0;
    let nearestSq = Infinity;
    for (let n = 0; n < nodes.length; n++) {
      const d = distanceSquared(attractor, nodes[n].pos);
      if (d < nearestSq) {
        nearestSq = d;
        nearest = n;
      }
    }
    return nearest;
  });

  // Taper by load: walk from every terminal up to the root, tallying how many
  // names pass through each node. Da Vinci's rule then turns the tally into a
  // width — a limb is as thick as the foliage it carries.
  for (const terminal of terminals) {
    let cursor = terminal;
    while (cursor !== -1) {
      nodes[cursor].leafLoad += 1;
      cursor = nodes[cursor].parent;
    }
  }

  return { nodes, terminals };
};
