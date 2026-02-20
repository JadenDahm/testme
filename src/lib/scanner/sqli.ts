import type { ScanFinding } from '@/types';

type FindingInput = Omit<ScanFinding, 'id' | 'scan_id' | 'created_at'>;

// SQL error patterns from various databases
const SQL_ERROR_PATTERNS = [
  // MySQL
  /you have an error in your sql syntax/i,
  /warning:\s*mysql/i,
  /unclosed quotation mark after the character string/i,
  /mysql_fetch/i,
  /mysql_num_rows/i,
  /mysql_query\(\)/i,
  /MySqlException/i,
  /com\.mysql\.jdbc/i,
  
  // PostgreSQL
  /postgresql.*error/i,
  /pg_query\(\)/i,
  /pg_exec\(\)/i,
  /valid PostgreSQL result/i,
  /PSQLException/i,
  /unterminated quoted string/i,
  
  // SQL Server
  /microsoft.*sql.*server/i,
  /mssql_query\(\)/i,
  /odbc_exec\(\)/i,
  /OLE DB.*SQL Server/i,
  /SQLServer JDBC Driver/i,
  /macromedia.*\[macromedia\]/i,
  /SqlException/i,
  
  // Oracle
  /oracle.*error/i,
  /ORA-\d{4,5}/i,
  /oracle.*driver/i,
  /quoted string not properly terminated/i,
  
  // SQLite
  /sqlite3?\.OperationalError/i,
  /SQLite\/JDBCDriver/i,
  /near ".*": syntax error/i,
  /SQLITE_ERROR/i,
  
  // Generic
  /SQL syntax.*error/i,
  /syntax error.*SQL/i,
  /unexpected end of SQL command/i,
  /Invalid column name/i,
  /Unknown column/i,
  /Column count doesn't match/i,
  /Conversion failed when converting/i,
];

// Completely harmless SQL injection test payloads
// These only add characters that would cause SQL errors if input is not sanitized
// They NEVER modify, delete, or access data
const HARMLESS_PAYLOADS = [
  "'",                    // Simple single quote
  "''",                   // Double single quote
  "\"",                   // Double quote
  "1' OR '1'='1",        // Classic boolean test
  "1 AND 1=1",           // Boolean true
  "1 AND 1=2",           // Boolean false
  "1'--",                // Comment test
];

export async function checkSqlInjection(
  domain: string,
  crawledUrls: string[]
): Promise<FindingInput[]> {
  const findings: FindingInput[] = [];

  // 1. Collect URLs with parameters from crawled pages
  const urlsWithParams: URL[] = [];
  for (const urlStr of crawledUrls) {
    try {
      const url = new URL(urlStr);
      if (url.searchParams.toString().length > 0) {
        urlsWithParams.push(url);
      }
    } catch {
      // Invalid URL
    }
  }

  // 2. Also check common parameter patterns
  const baseUrl = `https://${domain}`;
  const commonParamPaths = [
    '/search?q=test',
    '/api/search?query=test',
    '/?s=test',
    '/?id=1',
    '/?page=1',
    '/?category=1',
    '/?product=1',
  ];

  for (const path of commonParamPaths) {
    try {
      const url = new URL(path, baseUrl);
      const response = await fetch(url.href, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        redirect: 'follow',
      });
      if (response.ok) {
        urlsWithParams.push(url);
      }
    } catch {
      // Ignore
    }
  }

  // Limit to 10 unique URLs to test
  const uniqueUrls = [...new Map(urlsWithParams.map((u) => [u.pathname + u.search, u])).values()].slice(0, 10);

  // 3. Test each URL's parameters for SQL injection
  for (const url of uniqueUrls) {
    for (const [paramName] of url.searchParams) {
      const vulnerable = await testParameter(url, paramName);
      if (vulnerable) {
        findings.push({
          category: 'vulnerability',
          severity: 'critical',
          title: `Mögliche SQL-Injection in Parameter "${paramName}"`,
          description: `Der Parameter "${paramName}" scheint für SQL-Injection anfällig zu sein. Der Server gibt SQL-Fehlermeldungen bei manipulierten Eingaben zurück, was auf fehlende Input-Sanitization hinweist.`,
          affected_url: url.href,
          recommendation: 'Verwende IMMER Prepared Statements/Parameterized Queries statt String-Concatenation für SQL-Queries. Validiere und bereinige alle Benutzereingaben.',
          details: { parameter: paramName, type: 'error-based' },
        });
        break; // One finding per URL is enough
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // 4. Boolean-based detection on found parameters
  for (const url of uniqueUrls.slice(0, 5)) {
    for (const [paramName, paramValue] of url.searchParams) {
      if (/^\d+$/.test(paramValue)) {
        const boolResult = await testBooleanBased(url, paramName, paramValue);
        if (boolResult) {
          // Check if we already found this URL
          const alreadyFound = findings.some((f) => f.affected_url === url.href);
          if (!alreadyFound) {
            findings.push({
              category: 'vulnerability',
              severity: 'critical',
              title: `Boolean-basierte SQL-Injection in "${paramName}"`,
              description: `Der Parameter "${paramName}" reagiert unterschiedlich auf boolesche SQL-Bedingungen (AND 1=1 vs AND 1=2), was stark auf eine SQL-Injection-Schwachstelle hindeutet.`,
              affected_url: url.href,
              recommendation: 'Verwende Prepared Statements für alle Datenbankabfragen. Prüfe den Code, der diesen Parameter verarbeitet.',
              details: { parameter: paramName, type: 'boolean-based' },
            });
          }
          break;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  return findings;
}

async function testParameter(url: URL, paramName: string): Promise<boolean> {
  // First, get a baseline response
  let baselineBody: string;
  try {
    const response = await fetch(url.href, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'follow',
    });
    baselineBody = await response.text();
  } catch {
    return false;
  }

  // Check if baseline already contains SQL errors (false positive prevention)
  if (containsSqlError(baselineBody)) {
    return false;
  }

  // Test each payload
  for (const payload of HARMLESS_PAYLOADS.slice(0, 3)) { // Only test first 3 harmless payloads
    try {
      const testUrl = new URL(url.href);
      testUrl.searchParams.set(paramName, payload);

      const response = await fetch(testUrl.href, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
        redirect: 'follow',
      });

      const body = await response.text();

      if (containsSqlError(body)) {
        return true;
      }
    } catch {
      // Ignore
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return false;
}

async function testBooleanBased(url: URL, paramName: string, originalValue: string): Promise<boolean> {
  try {
    // True condition: value AND 1=1
    const trueUrl = new URL(url.href);
    trueUrl.searchParams.set(paramName, `${originalValue} AND 1=1`);

    const trueResponse = await fetch(trueUrl.href, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'follow',
    });
    const trueBody = await trueResponse.text();
    const trueLength = trueBody.length;

    await new Promise((r) => setTimeout(r, 200));

    // False condition: value AND 1=2
    const falseUrl = new URL(url.href);
    falseUrl.searchParams.set(paramName, `${originalValue} AND 1=2`);

    const falseResponse = await fetch(falseUrl.href, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'follow',
    });
    const falseBody = await falseResponse.text();
    const falseLength = falseBody.length;

    // Also get baseline for comparison
    const baselineResponse = await fetch(url.href, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'TestMe-Security-Scanner/1.0' },
      redirect: 'follow',
    });
    const baselineBody = await baselineResponse.text();
    const baselineLength = baselineBody.length;

    // If true condition matches baseline but false condition differs significantly
    const trueDiff = Math.abs(trueLength - baselineLength);
    const falseDiff = Math.abs(falseLength - baselineLength);

    if (trueDiff < 50 && falseDiff > 200) {
      return true;
    }
  } catch {
    // Ignore
  }

  return false;
}

function containsSqlError(body: string): boolean {
  return SQL_ERROR_PATTERNS.some((pattern) => pattern.test(body));
}
