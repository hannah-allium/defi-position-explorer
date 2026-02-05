"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  sql?: string;
  query_type?: string;
}

const EXAMPLE_QUERIES = [
  "Show me positions for GQRzZVLkmehJM1fnMj8e8DdhxMPmQBEGiSnSWeVeJvCc on 2025-12-31",
  "Show position history for GQRzZVLkmehJM1fnMj8e8DdhxMPmQBEGiSnSWeVeJvCc from 2025-12-01 to 2025-12-31",
  "Compare GQRzZVLkmehJM1fnMj8e8DdhxMPmQBEGiSnSWeVeJvCc on 2025-10-01 vs 2025-12-31",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Welcome to the **DeFi Position Explorer** — an AI-powered tool for auditing historical lending positions on Solana.

I can help you:
- **Look up** a wallet's Kamino lending position at any historical date
- **Track** position changes over a date range
- **Compare** positions between two dates (e.g., quarter-end vs quarter-end)

**Try asking:**
- "Show me positions for \`<wallet_address>\` on 2025-12-31"
- "Show history for \`<wallet_address>\` from 2025-10-01 to 2025-12-31"
- "Compare \`<wallet_address>\` on 2025-09-30 vs 2025-12-31"

Available data: Kamino (Solana) | USDC, SOL, PYUSD, USDG, USDT | March 2025 onwards`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSql, setShowSql] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        sql: data.sql,
        query_type: data.query_type,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Failed to connect to the server. Make sure the app is running.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleExampleClick(query: string) {
    setInput(query);
    inputRef.current?.focus();
  }

  function handleExportCsv(msgIndex: number) {
    const msg = messages[msgIndex];
    if (!msg?.content) return;

    // Extract table rows from markdown
    const lines = msg.content.split("\n").filter((l) => l.startsWith("|"));
    if (lines.length < 2) return;

    const csvRows = lines
      .filter((l) => !l.includes("---"))
      .map((l) =>
        l
          .split("|")
          .filter(Boolean)
          .map((cell) => cell.trim())
          .join(",")
      );

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "defi-positions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">
              DeFi Position Explorer
            </h1>
            <p className="text-sm text-gray-400">
              AI-powered historical lending position auditing — Powered by{" "}
              <span className="text-blue-400">Allium</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded">
              Solana
            </span>
            <span className="bg-purple-900/50 text-purple-400 px-2 py-1 rounded">
              Kamino
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <div className="prose prose-invert prose-sm max-w-none [&_table]:text-xs [&_th]:px-3 [&_th]:py-1.5 [&_td]:px-3 [&_td]:py-1.5 [&_table]:border-collapse [&_th]:border [&_th]:border-gray-600 [&_td]:border [&_td]:border-gray-700 [&_th]:bg-gray-700/50 [&_table]:w-full">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.sql && (
                  <div className="mt-2 border-t border-gray-700 pt-2 flex items-center gap-3">
                    <button
                      onClick={() => setShowSql(showSql === i ? null : i)}
                      className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
                    >
                      {showSql === i ? "Hide" : "Show"} SQL
                    </button>
                    <button
                      onClick={() => handleExportCsv(i)}
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >
                      Export CSV
                    </button>
                    {showSql === i && (
                      <pre className="mt-2 text-xs bg-gray-900 p-3 rounded overflow-x-auto text-green-400 w-full">
                        {msg.sql}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                  Querying Allium...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Example queries */}
      {messages.length <= 1 && (
        <div className="px-6 pb-2">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-gray-500 mb-2">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(q)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700 transition-colors truncate max-w-full"
                >
                  {q.length > 80 ? q.slice(0, 80) + "..." : q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <footer className="border-t border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about a wallet's lending positions..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
