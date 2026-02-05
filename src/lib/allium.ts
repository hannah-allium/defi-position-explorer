const ALLIUM_MCP_URL = "https://mcp.allium.so";

export interface PositionRow {
  date: string;
  address: string;
  project: string;
  protocol: string;
  symbol: string;
  balance: number;
  usd_balance: number;
  usd_exchange_rate: number;
  lending_id: string;
  mint: string;
  token_name: string;
}

interface AlliumResponse {
  data: PositionRow[];
  meta: {
    columns: { name: string; data_type: string }[];
    row_count: number | null;
  };
  sql: string;
}

export async function queryAllium(sql: string): Promise<AlliumResponse> {
  const apiKey = process.env.ALLIUM_API_KEY;
  if (!apiKey) {
    throw new Error("ALLIUM_API_KEY is not set");
  }

  const res = await fetch(ALLIUM_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "explorer_run_sql",
        arguments: { sql },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Allium API error (${res.status}): ${text}`);
  }

  // Response is SSE format: "event: message\ndata: {...}\n\n"
  const rawText = await res.text();
  const dataLine = rawText
    .split("\n")
    .find((line) => line.startsWith("data: "));
  if (!dataLine) {
    throw new Error("No data in Allium response");
  }

  const jsonStr = dataLine.slice("data: ".length);
  const rpcResponse = JSON.parse(jsonStr);

  if (rpcResponse.error) {
    throw new Error(`Allium query error: ${rpcResponse.error.message}`);
  }

  // structuredContent has the parsed data directly
  const result = rpcResponse.result?.structuredContent;
  if (!result) {
    // Fall back to parsing from text content
    const textContent = rpcResponse.result?.content?.[0]?.text;
    if (textContent) {
      return JSON.parse(textContent);
    }
    throw new Error("No result data in Allium response");
  }

  return result as AlliumResponse;
}

export function buildPositionQuery(
  address: string,
  date: string,
  protocol?: string
): string {
  const conditions = [
    `address = '${address}'`,
    `date = '${date}'`,
    `balance > 0`,
  ];
  if (protocol) {
    conditions.push(`project = '${protocol.toLowerCase()}'`);
  }

  return `
    SELECT
      date,
      address,
      project,
      protocol,
      symbol,
      balance,
      usd_balance,
      usd_exchange_rate,
      lending_id,
      mint,
      token_name
    FROM solana.lending.position_holdings_daily
    WHERE ${conditions.join(" AND ")}
    ORDER BY usd_balance DESC
    LIMIT 50
  `;
}

export function buildPositionRangeQuery(
  address: string,
  startDate: string,
  endDate: string,
  protocol?: string
): string {
  const conditions = [
    `address = '${address}'`,
    `date >= '${startDate}'`,
    `date <= '${endDate}'`,
    `balance > 0`,
  ];
  if (protocol) {
    conditions.push(`project = '${protocol.toLowerCase()}'`);
  }

  return `
    SELECT
      date,
      address,
      project,
      protocol,
      symbol,
      balance,
      usd_balance,
      usd_exchange_rate,
      lending_id,
      mint,
      token_name
    FROM solana.lending.position_holdings_daily
    WHERE ${conditions.join(" AND ")}
    ORDER BY date ASC, usd_balance DESC
    LIMIT 500
  `;
}

export function buildComparisonQuery(
  address: string,
  date1: string,
  date2: string,
  protocol?: string
): string {
  const conditions = [
    `address = '${address}'`,
    `date IN ('${date1}', '${date2}')`,
    `balance > 0`,
  ];
  if (protocol) {
    conditions.push(`project = '${protocol.toLowerCase()}'`);
  }

  return `
    SELECT
      date,
      address,
      project,
      protocol,
      symbol,
      balance,
      usd_balance,
      usd_exchange_rate,
      lending_id,
      mint,
      token_name
    FROM solana.lending.position_holdings_daily
    WHERE ${conditions.join(" AND ")}
    ORDER BY date ASC, usd_balance DESC
    LIMIT 100
  `;
}
