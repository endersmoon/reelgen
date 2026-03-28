import type {Node} from '@reelgen/2d';
import {
  Audio,
  Circle,
  Code,
  CubicBezier,
  Grid,
  Icon,
  Img,
  Knot,
  Latex,
  Layout,
  Line,
  Path,
  Polygon,
  QuadBezier,
  Ray,
  Rect,
  Spline,
  SVG,
  Txt,
  Video,
} from '@reelgen/2d';
import type {NodeDescriptor} from './types';
import {resolveProps} from './prop-resolver';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NodeConstructor = new (props?: any) => Node;

const NODE_MAP: Record<string, NodeConstructor> = {
  Audio,
  Circle,
  Code,
  CubicBezier,
  Grid,
  Icon,
  Img,
  Knot,
  Latex,
  Layout,
  Line,
  Path,
  Polygon,
  QuadBezier,
  Ray,
  Rect,
  Spline,
  SVG,
  Txt,
  Video,
};

export interface NodeTreeResult {
  rootNodes: Node[];
  refMap: Map<string, Node>;
}

/**
 * Instantiates a single node from its descriptor, recursively building children.
 * Registers nodes with an `id` into `refMap`.
 */
function createNode(
  descriptor: NodeDescriptor,
  refMap: Map<string, Node>,
): Node {
  const Ctor = NODE_MAP[descriptor.type];
  if (!Ctor) {
    throw new Error(`[scene-builder] Unknown node type: "${descriptor.type}"`);
  }

  const resolvedProps = descriptor.props ? resolveProps(descriptor.props) : {};

  const children = (descriptor.children ?? []).map(child =>
    createNode(child, refMap),
  );

  const node = new Ctor({...resolvedProps, children});

  if (descriptor.id) {
    refMap.set(descriptor.id, node);
  }

  return node;
}

/**
 * Builds the full node tree from a list of descriptors.
 * Returns root nodes and a map of id → node for timeline targeting.
 */
export function buildNodeTree(descriptors: NodeDescriptor[]): NodeTreeResult {
  const refMap = new Map<string, Node>();
  const rootNodes = descriptors.map(d => createNode(d, refMap));
  return {rootNodes, refMap};
}
