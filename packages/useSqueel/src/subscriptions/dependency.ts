export function extractTables(sql: string): Set<string> | null {
  // Conservative table extraction
  const tables = new Set<string>();
  
  // Clean comments and strings
  const cleanSql = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'[^']*'/g, "''");

  // Basic support for CTE names to avoid them being picked up as tables
  const ctes = new Set<string>();
  const cteMatch = cleanSql.matchAll(/\bWITH\s+([a-z0-9_]+)\b/gi);
  for (const m of cteMatch) ctes.add(m[1].toLowerCase());

  const patterns = [
    /\b(?:FROM|JOIN|UPDATE|INTO|DELETE\s+FROM)\s+["`]?([a-z0-9_]+)["`]?/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(cleanSql)) !== null) {
      const t = match[1].toLowerCase();
      if (!ctes.has(t)) tables.add(t);
    }
  }

  return tables.size > 0 ? tables : null;
}
