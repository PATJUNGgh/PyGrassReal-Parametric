import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');
const PAGES_ROOT = join(SRC_ROOT, 'pages');
const TARGET_BLANK_LINK_PATTERN = /<a\b[^>]*target=["']_blank["'][^>]*>/gi;

const isSourceFile = (path: string): boolean => {
  const extension = extname(path);
  return extension === '.ts' || extension === '.tsx';
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

describe('security guardrails', () => {
  it('requires noopener noreferrer on every target="_blank" link in src/pages', () => {
    const violations: string[] = [];
    const sourceFiles = collectSourceFiles(PAGES_ROOT);

    for (const filePath of sourceFiles) {
      const sourceCode = readFileSync(filePath, 'utf8');
      const matches = sourceCode.match(TARGET_BLANK_LINK_PATTERN) ?? [];

      for (const match of matches) {
        const relMatch = match.match(/\brel=["']([^"']+)["']/i);
        const relValue = relMatch?.[1]?.toLowerCase() ?? '';
        const hasNoopener = /\bnoopener\b/.test(relValue);
        const hasNoreferrer = /\bnoreferrer\b/.test(relValue);
        if (!hasNoopener || !hasNoreferrer) {
          violations.push(`${filePath}: ${match}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('disallows dangerouslySetInnerHTML usage unless explicit sanitization is present', () => {
    const violations: string[] = [];
    const sourceFiles = collectSourceFiles(SRC_ROOT);

    for (const filePath of sourceFiles) {
      const sourceCode = readFileSync(filePath, 'utf8');
      if (!sourceCode.includes('dangerouslySetInnerHTML')) {
        continue;
      }

      if (sourceCode.includes('DOMPurify.sanitize')) {
        continue;
      }

      violations.push(filePath);
    }

    expect(violations).toEqual([]);
  });
});
