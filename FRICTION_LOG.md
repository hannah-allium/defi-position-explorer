# Friction Log: DeFi Position Explorer

**Project:** AI-powered historical DeFi position explorer for auditors
**Date:** February 4, 2026
**Builder:** Hannah Zhang
**Time to MVP:** ~3 hours (with Claude Code)

---

## Overview

Built a chat-based tool that lets auditors query historical Solana lending positions in natural language, powered by Allium's MCP API. This log captures friction points encountered during development.

---

## Friction Points

### 1. Allium API Discovery – Finding the Right Endpoint

**Issue:** Started with the Explorer REST API (`https://api.allium.so/api/v1/explorer/queries/run`) but got 404 errors. The REST API requires saving queries first and uses an async run → poll → fetch flow.

**Resolution:** Switched to the MCP HTTP endpoint (`https://mcp.allium.so`) which accepts raw SQL via JSON-RPC. This wasn't immediately obvious from documentation.

**Suggestion:** Add a "Quick Start" example in docs showing the simplest way to run an ad-hoc SQL query programmatically.

---

### 2. MCP Response Format – SSE Parsing Required

**Issue:** MCP endpoint returns Server-Sent Events format (`event: message\ndata: {...}\n\n`), not plain JSON. Initial implementation expected JSON and failed silently.

**Resolution:** Added SSE parsing to extract the `data:` line and parse the JSON-RPC response from `structuredContent`.

**Suggestion:** Document the SSE response format explicitly, or offer an `Accept: application/json` option for simpler integrations.

---

### 3. MCP Headers – "Not Acceptable" Error

**Issue:** Got 406 "Not Acceptable" error when calling MCP endpoint with standard JSON headers.

**Resolution:** Required adding `Accept: application/json, text/event-stream` header.

**Suggestion:** Return a more descriptive error message indicating the required Accept header.

---

### 4. Schema Discovery – What Tables Exist?

**Issue:** Needed to find what lending position tables exist across chains. Used `explorer_browse_schemas` and `explorer_search_schemas` MCP tools but had to iterate to find the right table.

**Discovery:**
- `solana.lending.position_holdings_daily` exists with pre-computed wallet-level balances ✓
- `ethereum.lending` only has event tables (deposits, withdrawals, loans, repayments) – no position snapshots

**Suggestion:** Add a "Common Use Cases" section in docs mapping use cases to recommended tables (e.g., "Point-in-time positions" → `position_holdings_daily` on Solana).

---

### 5. Ethereum Lending Positions – Accrued Interest Complexity

**Issue:** Customer pain point (RSM, accounting firms) is getting positions with accrued yield. On Ethereum, this requires:
1. Summing deposit/withdraw events to get principal
2. Joining with `interest_rates` table for `cumulative_supply_interest` (liquidityIndex)
3. Calculating: `balance = scaledBalance × liquidityIndex`

**Resolution:** Scoped MVP to Solana only where `position_holdings_daily` already has computed balances (likely includes accrued interest).

**Suggestion:** Consider adding `position_holdings_daily` equivalent for Ethereum, or provide a view/example query that handles the interest accrual math.

---

### 6. Protocol Coverage – Limited to Kamino

**Issue:** `solana.lending.position_holdings_daily` currently only has Kamino (kvault) data.

**Resolution:** Acceptable for MVP – Kamino is a major Solana lending protocol.

**Suggestion:** Expand to other Solana lending protocols (Solend, Marginfi) to increase utility.

---

### 7. Anthropic API Credits

**Issue:** API key had no credits, causing Claude API calls to fail during NLP parsing.

**Resolution:** Added regex-based fallback parser that handles common query patterns (snapshot, range, comparison). Claude API failure is caught and logged as warning.

**Takeaway:** Always have a fallback for external API dependencies, especially in demos.

---

### 8. Next.js Scaffolding Conflicts

**Issue:** `create-next-app` failed because `.env.local` already existed in the directory.

**Resolution:** Moved `.env.local` to temp location, ran scaffolding, moved it back.

**Minor friction** – could be avoided by initializing in empty directory first.

---

### 9. GitHub Authentication

**Issue:** Neither HTTPS nor SSH was authenticated for pushing to GitHub.

**Resolution:** Installed `gh` CLI (`brew install gh`) and ran `gh auth login`.

**Minor friction** – standard setup step.

---

## What Worked Well

1. **MCP tools for schema exploration** – `explorer_browse_schemas` and `explorer_search_schemas` were useful for discovering available tables.

2. **Pre-computed position tables** – `solana.lending.position_holdings_daily` eliminated the need to reconstruct positions from events.

3. **Claude Code for rapid prototyping** – Full stack (API client, NLP parser, formatters, Next.js UI) built in ~3 hours.

4. **Real data immediately available** – No mock data needed; queried actual wallet positions from day one.

---

## Recommendations for Allium

| Priority | Suggestion |
|----------|------------|
| High | Add quick-start example for running ad-hoc SQL via MCP |
| High | Document SSE response format for MCP endpoint |
| Medium | Add `position_holdings_daily` for Ethereum (with accrued interest) |
| Medium | Create "Common Use Cases" → table mapping in docs |
| Low | Expand Solana lending coverage beyond Kamino |
| Low | Better error messages for missing/wrong headers |

---

## Next Steps (Post-Hackathon)

1. **Ethereum support** – Build interest accrual calculation using `cumulative_supply_interest`
2. **More protocols** – Aave, Compound, Solend, Marginfi
3. **Staking positions** – Different data model, need to track rewards
4. **LP positions** – Complex: impermanent loss, fee accrual, reward tokens
5. **Multi-wallet** – Batch queries for fund-level reporting
6. **Auth & deployment** – Production-ready for customer pilots
