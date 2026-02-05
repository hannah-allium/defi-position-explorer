import { PositionRow } from "./allium";

function formatUSD(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function formatBalance(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(4)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(4)}K`;
  }
  return value.toFixed(6);
}

function formatDate(dateStr: string): string {
  return dateStr.split("T")[0];
}

export function formatPositionTable(rows: PositionRow[]): string {
  if (rows.length === 0) {
    return "No positions found for this wallet on the specified date. The wallet may not have had any active Kamino lending positions, or the date may be outside the available data range (March 2025 onwards).";
  }

  const date = formatDate(rows[0].date);
  const address = rows[0].address;
  const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;

  let totalUSD = 0;
  rows.forEach((r) => (totalUSD += r.usd_balance));

  let md = `### Lending Positions for \`${shortAddr}\` on ${date}\n\n`;
  md += `| Token | Protocol | Balance | USD Value | Price |\n`;
  md += `|-------|----------|---------|-----------|-------|\n`;

  for (const row of rows) {
    md += `| ${row.symbol} | ${row.project} (${row.protocol}) | ${formatBalance(row.balance)} | ${formatUSD(row.usd_balance)} | $${row.usd_exchange_rate.toFixed(4)} |\n`;
  }

  md += `\n**Total Portfolio Value: ${formatUSD(totalUSD)}**\n`;
  md += `\n_Data source: Allium \`solana.lending.position_holdings_daily\`_`;

  return md;
}

export function formatRangeTable(rows: PositionRow[]): string {
  if (rows.length === 0) {
    return "No positions found for this wallet in the specified date range.";
  }

  const address = rows[0].address;
  const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;

  // Group by date
  const byDate = new Map<string, PositionRow[]>();
  for (const row of rows) {
    const d = formatDate(row.date);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(row);
  }

  // Group by symbol to show time series
  const symbols = [...new Set(rows.map((r) => r.symbol))];
  const dates = [...byDate.keys()].sort();

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  let md = `### Position History for \`${shortAddr}\` (${startDate} to ${endDate})\n\n`;

  for (const symbol of symbols) {
    md += `#### ${symbol}\n\n`;
    md += `| Date | Balance | USD Value | Price |\n`;
    md += `|------|---------|-----------|-------|\n`;

    for (const date of dates) {
      const dateRows = byDate.get(date) || [];
      const symbolRow = dateRows.find((r) => r.symbol === symbol);
      if (symbolRow) {
        md += `| ${date} | ${formatBalance(symbolRow.balance)} | ${formatUSD(symbolRow.usd_balance)} | $${symbolRow.usd_exchange_rate.toFixed(4)} |\n`;
      }
    }

    md += "\n";
  }

  // Summary
  const firstDate = byDate.get(dates[0]) || [];
  const lastDate = byDate.get(dates[dates.length - 1]) || [];
  const firstTotal = firstDate.reduce((sum, r) => sum + r.usd_balance, 0);
  const lastTotal = lastDate.reduce((sum, r) => sum + r.usd_balance, 0);
  const change = lastTotal - firstTotal;
  const pctChange = firstTotal > 0 ? ((change / firstTotal) * 100).toFixed(2) : "N/A";

  md += `**Period Summary:**\n`;
  md += `- Start value (${startDate}): ${formatUSD(firstTotal)}\n`;
  md += `- End value (${endDate}): ${formatUSD(lastTotal)}\n`;
  md += `- Change: ${formatUSD(change)} (${pctChange}%)\n`;
  md += `\n_Data source: Allium \`solana.lending.position_holdings_daily\`_`;

  return md;
}

export function formatComparisonTable(
  rows: PositionRow[],
  date1: string,
  date2: string
): string {
  if (rows.length === 0) {
    return "No positions found for comparison on the specified dates.";
  }

  const address = rows[0].address;
  const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;

  const d1Rows = rows.filter((r) => formatDate(r.date) === date1);
  const d2Rows = rows.filter((r) => formatDate(r.date) === date2);

  const allSymbols = [
    ...new Set([...d1Rows.map((r) => r.symbol), ...d2Rows.map((r) => r.symbol)]),
  ];

  let md = `### Position Comparison for \`${shortAddr}\`: ${date1} vs ${date2}\n\n`;
  md += `| Token | Balance (${date1}) | USD (${date1}) | Balance (${date2}) | USD (${date2}) | Change | % Change |\n`;
  md += `|-------|${"-".repeat(18)}|${"-".repeat(16)}|${"-".repeat(18)}|${"-".repeat(16)}|--------|----------|\n`;

  let totalD1 = 0;
  let totalD2 = 0;

  for (const symbol of allSymbols) {
    const r1 = d1Rows.find((r) => r.symbol === symbol);
    const r2 = d2Rows.find((r) => r.symbol === symbol);

    const bal1 = r1?.balance ?? 0;
    const usd1 = r1?.usd_balance ?? 0;
    const bal2 = r2?.balance ?? 0;
    const usd2 = r2?.usd_balance ?? 0;

    totalD1 += usd1;
    totalD2 += usd2;

    const usdChange = usd2 - usd1;
    const pctChange = usd1 > 0 ? ((usdChange / usd1) * 100).toFixed(2) + "%" : "N/A";

    md += `| ${symbol} | ${formatBalance(bal1)} | ${formatUSD(usd1)} | ${formatBalance(bal2)} | ${formatUSD(usd2)} | ${formatUSD(usdChange)} | ${pctChange} |\n`;
  }

  const totalChange = totalD2 - totalD1;
  const totalPct =
    totalD1 > 0 ? ((totalChange / totalD1) * 100).toFixed(2) + "%" : "N/A";

  md += `\n**Total Portfolio:**\n`;
  md += `- ${date1}: ${formatUSD(totalD1)}\n`;
  md += `- ${date2}: ${formatUSD(totalD2)}\n`;
  md += `- Change: ${formatUSD(totalChange)} (${totalPct})\n`;
  md += `\n_Data source: Allium \`solana.lending.position_holdings_daily\`_`;

  return md;
}
