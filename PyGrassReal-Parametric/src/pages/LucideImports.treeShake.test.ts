import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const PAGES_ROOT = join(process.cwd(), 'src', 'pages');
const LUCIDE_IMPORT_PATTERN = /import\s+([^;]+?)\s+from\s+['"]lucide-react['"]/g;

const isSourceFile = (path: string): boolean => {
  const extension = extname(path);
  if (extension !== '.ts' && extension !== '.tsx') {
    return false;
  }

  return !path.endsWith('.test.ts') && !path.endsWith('.test.tsx');
};

const collectSourceFiles = (directoryPath: string): string[] => {
  const filePaths: string[] = [];
  const entries = readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      filePaths.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (isSourceFile(entryPath)) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
};

const isTreeShakeFriendlyClause = (clause: string): boolean => {
  const trimmedClause = clause.trim();
  return /^\{[\s\S]+\}$/.test(trimmedClause) || /^type\s+\{[\s\S]+\}$/.test(trimmedClause);
};

describe('lucide-react imports', () => {
  it('stay named-only to preserve tree-shaking', () => {
    const invalidImports: string[] = [];
    const sourceFiles = collectSourceFiles(PAGES_ROOT);

    for (const filePath of sourceFiles) {
      const sourceCode = readFileSync(filePath, 'utf8');
      const matches = sourceCode.matchAll(LUCIDE_IMPORT_PATTERN);

      for (const match of matches) {
        const clause = match[1] ?? '';
        if (isTreeShakeFriendlyClause(clause)) {
          continue;
        }

        invalidImports.push(`${filePath}: ${clause.trim()}`);
      }
    }

    expect(invalidImports).toEqual([]);
  });
});
