export interface NodeTypeInfo {
  type: string;
  description: string;
  keyProps: string[];
}

export const NODE_TYPES: NodeTypeInfo[] = [
  {
    type: 'Rect',
    description: 'Rectangle shape.',
    keyProps: ['width', 'height', 'radius', 'fill', 'stroke', 'lineWidth'],
  },
  {
    type: 'Circle',
    description: 'Circle or arc shape.',
    keyProps: ['width', 'height', 'startAngle', 'endAngle', 'fill', 'stroke'],
  },
  {
    type: 'Txt',
    description: 'Text node.',
    keyProps: ['text', 'fontSize', 'fontFamily', 'fontWeight', 'fill', 'textAlign'],
  },
  {
    type: 'Img',
    description: 'Image node.',
    keyProps: ['src', 'width', 'height', 'alpha', 'smoothing'],
  },
  {
    type: 'Video',
    description: 'Video node.',
    keyProps: ['src', 'width', 'height', 'loop', 'playbackRate'],
  },
  {
    type: 'Audio',
    description: 'Audio node (no visual output).',
    keyProps: ['src', 'loop', 'playbackRate'],
  },
  {
    type: 'Line',
    description: 'Polyline through a list of points.',
    keyProps: ['points', 'radius', 'stroke', 'lineWidth'],
  },
  {
    type: 'Polygon',
    description: 'Regular polygon.',
    keyProps: ['sides', 'radius', 'fill', 'stroke'],
  },
  {
    type: 'Grid',
    description: 'Grid of lines.',
    keyProps: ['spacing', 'width', 'height', 'stroke'],
  },
  {
    type: 'Ray',
    description: 'A line segment from one point to another.',
    keyProps: ['from', 'to', 'stroke', 'lineWidth'],
  },
  {
    type: 'Path',
    description: 'SVG path shape.',
    keyProps: ['data', 'fill', 'stroke'],
  },
  {
    type: 'Spline',
    description: 'Smooth curve through control points.',
    keyProps: ['points', 'smoothness', 'stroke'],
  },
  {
    type: 'CubicBezier',
    description: 'Cubic Bézier curve.',
    keyProps: ['p0', 'p1', 'p2', 'p3', 'stroke'],
  },
  {
    type: 'QuadBezier',
    description: 'Quadratic Bézier curve.',
    keyProps: ['p0', 'p1', 'p2', 'stroke'],
  },
  {
    type: 'Knot',
    description: 'Control point knot used inside Spline.',
    keyProps: ['startHandle', 'endHandle', 'auto'],
  },
  {
    type: 'Latex',
    description: 'LaTeX math expression rendered via MathJax.',
    keyProps: ['tex', 'fill', 'width', 'height'],
  },
  {
    type: 'Code',
    description: 'Syntax-highlighted code block.',
    keyProps: ['language', 'code', 'theme', 'fontSize'],
  },
  {
    type: 'Icon',
    description: 'Iconify icon.',
    keyProps: ['icon', 'color', 'width', 'height'],
  },
  {
    type: 'SVG',
    description: 'Raw SVG markup rendered as a node.',
    keyProps: ['svg', 'width', 'height'],
  },
  {
    type: 'Layout',
    description: 'Flexbox-style layout container.',
    keyProps: ['layout', 'direction', 'gap', 'justifyContent', 'alignItems'],
  },
  {
    type: 'Node',
    description: 'Generic grouping container (no visual output).',
    keyProps: ['position', 'rotation', 'scale', 'opacity'],
  },
];

/** Common props inherited by every node type. */
export const COMMON_PROPS = {
  transform: ['x', 'y', 'position', 'rotation', 'scale', 'scaleX', 'scaleY'],
  appearance: ['opacity', 'zIndex', 'shadowColor', 'shadowBlur', 'shadowOffset'],
  layout: ['width', 'height', 'margin', 'padding'],
  propValueEncoding: {
    number: 'number — e.g. 48',
    string: 'string — e.g. "Hello"',
    boolean: 'boolean — e.g. true',
    Color: 'CSS color string — e.g. "#ff0000" or "red"',
    Vector2: '[x, y] number tuple — e.g. [100, -200]',
    Spacing: 'number or [v, h] or [t, r, b, l]',
  },
};

export function listNodeTypes(): {
  nodeTypes: NodeTypeInfo[];
  commonProps: typeof COMMON_PROPS;
} {
  return {nodeTypes: NODE_TYPES, commonProps: COMMON_PROPS};
}
