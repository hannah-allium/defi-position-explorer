import { NextRequest, NextResponse } from "next/server";
import { parseUserQuery } from "@/lib/agent";
import {
  queryAllium,
  buildPositionQuery,
  buildPositionRangeQuery,
  buildComparisonQuery,
} from "@/lib/allium";
import {
  formatPositionTable,
  formatRangeTable,
  formatComparisonTable,
} from "@/lib/formatters";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Step 1: Parse natural language with Claude
    const parsed = await parseUserQuery(message);

    if (parsed.type === "help") {
      return NextResponse.json({
        response:
          parsed.message ||
          `I can help you look up historical DeFi lending positions on Solana (Kamino). Try:\n\n- **Snapshot:** "Show me positions for \`<wallet>\` on 2025-12-31"\n- **Range:** "Show me positions for \`<wallet>\` from 2025-10-01 to 2025-12-31"\n- **Compare:** "Compare \`<wallet>\` positions on 2025-09-30 vs 2025-12-31"\n\nAvailable tokens: USDC, SOL, USDG, PYUSD, USDT, USDS\nDate range: March 2025 to present`,
        query_type: "help",
      });
    }

    if (parsed.type === "error") {
      return NextResponse.json({
        response: parsed.message || "I couldn't understand that query.",
        query_type: "error",
      });
    }

    // Step 2: Build and execute SQL query
    let sql: string;
    let formattedResponse: string;

    switch (parsed.type) {
      case "snapshot": {
        if (!parsed.address || !parsed.date) {
          return NextResponse.json({
            response:
              "I need both a wallet address and a date. Try: 'Show me positions for `<wallet>` on 2025-12-31'",
            query_type: "error",
          });
        }
        sql = buildPositionQuery(parsed.address, parsed.date, parsed.protocol);
        const result = await queryAllium(sql);
        formattedResponse = formatPositionTable(result.data);
        break;
      }

      case "range": {
        if (!parsed.address || !parsed.start_date || !parsed.end_date) {
          return NextResponse.json({
            response:
              "I need a wallet address, start date, and end date. Try: 'Show positions for `<wallet>` from 2025-10-01 to 2025-12-31'",
            query_type: "error",
          });
        }
        sql = buildPositionRangeQuery(
          parsed.address,
          parsed.start_date,
          parsed.end_date,
          parsed.protocol
        );
        const rangeResult = await queryAllium(sql);
        formattedResponse = formatRangeTable(rangeResult.data);
        break;
      }

      case "comparison": {
        if (!parsed.address || !parsed.date1 || !parsed.date2) {
          return NextResponse.json({
            response:
              "I need a wallet address and two dates to compare. Try: 'Compare `<wallet>` on 2025-09-30 vs 2025-12-31'",
            query_type: "error",
          });
        }
        sql = buildComparisonQuery(
          parsed.address,
          parsed.date1,
          parsed.date2,
          parsed.protocol
        );
        const compResult = await queryAllium(sql);
        formattedResponse = formatComparisonTable(
          compResult.data,
          parsed.date1,
          parsed.date2
        );
        break;
      }

      default:
        return NextResponse.json({
          response: "Unsupported query type.",
          query_type: "error",
        });
    }

    return NextResponse.json({
      response: formattedResponse,
      query_type: parsed.type,
      sql: sql,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        response: `Something went wrong: ${errorMessage}`,
        query_type: "error",
      },
      { status: 500 }
    );
  }
}
