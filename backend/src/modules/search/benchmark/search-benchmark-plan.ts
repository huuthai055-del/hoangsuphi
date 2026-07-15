export interface SearchExplainPlanSummary {
  readonly planningTimeMs: number;
  readonly executionTimeMs: number;
  readonly actualRows: number;
  readonly nodeTypes: readonly string[];
  readonly indexNames: readonly string[];
  readonly sequentialScanRelations: readonly string[];
  readonly sortMethods: readonly string[];
  readonly sharedHitBlocks: number;
  readonly sharedReadBlocks: number;
  readonly tempReadBlocks: number;
  readonly tempWrittenBlocks: number;
}

interface ExplainNode extends Record<string, unknown> {
  readonly Plans?: readonly ExplainNode[];
}

function numberField(value: unknown, field: string): number {
  const result = value as Record<string, unknown>;
  const candidate = result[field];
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0;
}

function stringField(value: unknown, field: string): string | null {
  const result = value as Record<string, unknown>;
  return typeof result[field] === 'string' ? result[field] : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectPlanDetails(
  node: ExplainNode,
  details: {
    nodeTypes: Set<string>;
    indexNames: Set<string>;
    sequentialScanRelations: Set<string>;
    sortMethods: Set<string>;
  }
): void {
  const nodeType = stringField(node, 'Node Type');
  if (nodeType !== null) details.nodeTypes.add(nodeType);

  const indexName = stringField(node, 'Index Name');
  if (indexName !== null) details.indexNames.add(indexName);

  if (nodeType === 'Seq Scan') {
    const relation = stringField(node, 'Relation Name');
    if (relation !== null) details.sequentialScanRelations.add(relation);
  }

  const sortMethod = stringField(node, 'Sort Method');
  if (sortMethod !== null) details.sortMethods.add(sortMethod);

  for (const child of node.Plans ?? []) collectPlanDetails(child, details);
}

/**
 * Converts PostgreSQL's `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` value into a compact,
 * stable artifact suitable for the Step 4.1.6 benchmark report.
 */
export function summarizeExplainPlan(value: unknown): SearchExplainPlanSummary {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    throw new Error('PostgreSQL EXPLAIN payload has an unexpected shape');
  }

  const statement = value[0];
  const root = statement.Plan;
  if (!isRecord(root)) throw new Error('PostgreSQL EXPLAIN payload is missing its root plan');

  const details = {
    nodeTypes: new Set<string>(),
    indexNames: new Set<string>(),
    sequentialScanRelations: new Set<string>(),
    sortMethods: new Set<string>(),
  };
  collectPlanDetails(root as ExplainNode, details);

  return {
    planningTimeMs: numberField(statement, 'Planning Time'),
    executionTimeMs: numberField(statement, 'Execution Time'),
    actualRows: numberField(root, 'Actual Rows'),
    nodeTypes: [...details.nodeTypes].sort(),
    indexNames: [...details.indexNames].sort(),
    sequentialScanRelations: [...details.sequentialScanRelations].sort(),
    sortMethods: [...details.sortMethods].sort(),
    sharedHitBlocks: numberField(root, 'Shared Hit Blocks'),
    sharedReadBlocks: numberField(root, 'Shared Read Blocks'),
    tempReadBlocks: numberField(root, 'Temp Read Blocks'),
    tempWrittenBlocks: numberField(root, 'Temp Written Blocks'),
  };
}
