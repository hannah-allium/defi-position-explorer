import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a DeFi position analysis assistant that helps auditors and accountants query historical lending positions on Solana. You have access to Allium's solana.lending.position_holdings_daily table which contains daily snapshots of wallet-level lending positions on Kamino (kvault protocol).

Available data:
- Chain: Solana only
- Protocol: Kamino (kvault)
- Tokens: USDC, SOL, USDG, PYUSD, cash, USDT, USDS, usd1, AUSD
- Date range: March 2025 to present
- Fields: date, address, project, protocol, symbol, balance, usd_balance, usd_exchange_rate, lending_id, mint, token_name

You must parse the user's natural language query and respond with a JSON object indicating the query type and parameters. Do NOT respond with anything other than valid JSON.

Query types:

1. "snapshot" - Position at a specific date
   {"type": "snapshot", "address": "<wallet_address>", "date": "YYYY-MM-DD", "protocol": "kamino" (optional)}

2. "range" - Position history over a date range
   {"type": "range", "address": "<wallet_address>", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "protocol": "kamino" (optional)}

3. "comparison" - Compare positions at two dates
   {"type": "comparison", "address": "<wallet_address>", "date1": "YYYY-MM-DD", "date2": "YYYY-MM-DD", "protocol": "kamino" (optional)}

4. "help" - If the user asks for help or you can't parse their request
   {"type": "help", "message": "explanation of what you can do"}

5. "error" - If the user's request is missing required info (like wallet address)
   {"type": "error", "message": "what's missing"}

Rules:
- A valid Solana wallet address is a base58-encoded string, typically 32-44 characters
- If the user says "end of Q4 2025" interpret as 2025-12-31
- If the user says "end of Q1 2026" interpret as 2026-03-31
- If the user says "last month" calculate relative to today (2026-02-04)
- Always extract the full wallet address exactly as provided
- If no protocol is specified, omit it (will search all protocols)
- Respond ONLY with the JSON object, nothing else`;

export interface ParsedQuery {
  type: "snapshot" | "range" | "comparison" | "help" | "error";
  address?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  date1?: string;
  date2?: string;
  protocol?: string;
  message?: string;
}

// Regex-based fallback parser for when Claude API is unavailable
function regexParse(msg: string): ParsedQuery {
  const lower = msg.toLowerCase();

  // Extract Solana address (base58, 32-44 chars)
  const addrMatch = msg.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  const address = addrMatch ? addrMatch[0] : undefined;

  // Extract dates in YYYY-MM-DD format
  const dateMatches = msg.match(/\d{4}-\d{2}-\d{2}/g) || [];

  // Check for help
  if (lower.includes("help") || lower.includes("what can you") || lower === "hi" || lower === "hello") {
    return { type: "help" };
  }

  // No address found
  if (!address) {
    return {
      type: "error",
      message:
        "I need a Solana wallet address. Try: 'Show me positions for `<wallet_address>` on 2025-12-31'",
    };
  }

  // Comparison: "compare ... on DATE1 vs DATE2" or two dates with "compare"
  if (
    (lower.includes("compare") || lower.includes("vs") || lower.includes("versus")) &&
    dateMatches.length >= 2
  ) {
    return {
      type: "comparison",
      address,
      date1: dateMatches[0],
      date2: dateMatches[1],
    };
  }

  // Range: "from DATE1 to DATE2" or two dates with "history"/"range"/"from"
  if (
    (lower.includes("from") || lower.includes("history") || lower.includes("range") || lower.includes("between")) &&
    dateMatches.length >= 2
  ) {
    return {
      type: "range",
      address,
      start_date: dateMatches[0],
      end_date: dateMatches[1],
    };
  }

  // Snapshot: single date
  if (dateMatches.length >= 1) {
    return {
      type: "snapshot",
      address,
      date: dateMatches[0],
    };
  }

  // Has address but no date
  return {
    type: "error",
    message:
      "I found a wallet address but need a date. Try: 'Show me positions for `<wallet>` on 2025-12-31'",
  };
}

export async function parseUserQuery(
  userMessage: string
): Promise<ParsedQuery> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Try Claude first, fall back to regex
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";

      return JSON.parse(text.trim()) as ParsedQuery;
    } catch (err) {
      console.warn("Claude API failed, falling back to regex parser:", err);
    }
  }

  // Fallback: regex-based parsing
  return regexParse(userMessage);
}
