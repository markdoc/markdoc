import type { NodeType } from '@markdoc/markdoc';
import type { MarkdocNextJsSchema } from '@markdoc/next.js';

const nodes = {} satisfies Partial<Record<NodeType, MarkdocNextJsSchema>>;

export default nodes;
