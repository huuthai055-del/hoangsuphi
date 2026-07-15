import { describe, expect, test } from 'bun:test';
import { summarizeExplainPlan } from './search-benchmark-plan';

describe('summarizeExplainPlan', () => {
  test('collects index, sequential-scan and buffer evidence', () => {
    const result = summarizeExplainPlan([
      {
        Plan: {
          'Node Type': 'Append',
          'Actual Rows': 21,
          'Shared Hit Blocks': 90,
          'Shared Read Blocks': 4,
          'Temp Read Blocks': 0,
          'Temp Written Blocks': 0,
          Plans: [
            {
              'Node Type': 'Bitmap Index Scan',
              'Index Name': 'idx_articles_search_fts',
            },
            {
              'Node Type': 'Seq Scan',
              'Relation Name': 'reviews',
              'Sort Method': 'quicksort',
            },
          ],
        },
        'Planning Time': 1.25,
        'Execution Time': 8.5,
      },
    ]);

    expect(result).toEqual({
      planningTimeMs: 1.25,
      executionTimeMs: 8.5,
      actualRows: 21,
      nodeTypes: ['Append', 'Bitmap Index Scan', 'Seq Scan'],
      indexNames: ['idx_articles_search_fts'],
      sequentialScanRelations: ['reviews'],
      sortMethods: ['quicksort'],
      sharedHitBlocks: 90,
      sharedReadBlocks: 4,
      tempReadBlocks: 0,
      tempWrittenBlocks: 0,
    });
  });

  test('rejects a malformed explain payload', () => {
    expect(() => summarizeExplainPlan({ Plan: {} })).toThrow('unexpected shape');
  });
});
