"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";

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
    <div className="min-h-screen bg-[#0A0A0F] text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/60 px-6 py-4 bg-[#0A0A0F]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-semibold text-white">
                DeFi Position Explorer
              </h1>
              <p className="text-sm text-gray-400">
                Historical lending position auditing — Powered by{" "}
                <span className="text-allium-purple font-medium">Allium</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-gray-800/50 px-2.5 py-1.5 rounded-lg border border-gray-700/50">
              <Image src="/solana.svg" alt="Solana" width={16} height={16} className="rounded-full" />
              <span className="text-xs text-gray-300">Solana</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-800/50 px-2.5 py-1.5 rounded-lg border border-gray-700/50">
              <Image src="/kamino.svg" alt="Kamino" width={16} height={16} className="rounded-full" />
              <span className="text-xs text-gray-300">Kamino</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-5 py-4 ${
                  msg.role === "user"
                    ? "bg-allium-purple/20 border border-allium-purple/30 text-white"
                    : "bg-gray-800/50 border border-gray-700/40 text-gray-100"
                }`}
              >
                <div
                  className={`prose prose-invert prose-sm max-w-none
                    [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg [&_table]:overflow-hidden
                    [&_table]:border [&_table]:border-gray-700/50
                    [&_thead]:bg-allium-purple/10
                    [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-allium-purple [&_th]:border-b [&_th]:border-gray-700/50
                    [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-sm [&_td]:border-b [&_td]:border-gray-800/50
                    [&_tr:last-child_td]:border-b-0
                    [&_tr:hover]:bg-gray-700/20
                    [&_h3]:text-white [&_h3]:font-semibold [&_h3]:text-base [&_h3]:mb-3
                    [&_h4]:text-allium-purple [&_h4]:font-medium [&_h4]:text-sm
                    [&_code]:text-allium-purple [&_code]:bg-allium-purple/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
                    [&_strong]:text-white
                    [&_em]:text-gray-400
                  `}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.sql && (
                  <div className="mt-3 pt-3 border-t border-gray-700/40 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setShowSql(showSql === i ? null : i)}
                      className="text-xs text-gray-400 hover:text-allium-purple flex items-center gap-1.5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      {showSql === i ? "Hide" : "Show"} SQL
                    </button>
                    <button
                      onClick={() => handleExportCsv(i)}
                      className="text-xs text-gray-400 hover:text-allium-purple flex items-center gap-1.5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                    {showSql === i && (
                      <pre className="w-full mt-2 text-xs bg-gray-900/80 border border-gray-700/40 p-3 rounded-lg overflow-x-auto text-allium-purple font-mono">
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
              <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl px-5 py-4">
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="animate-spin h-4 w-4 border-2 border-allium-purple border-t-transparent rounded-full" />
                  <span className="text-sm">Querying Allium...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Example queries */}
      {messages.length <= 1 && (
        <div className="px-6 pb-3">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-gray-500 mb-2">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(q)}
                  className="text-xs bg-allium-purple/10 hover:bg-allium-purple/20 text-gray-300 hover:text-white px-3 py-1.5 rounded-full border border-allium-purple/20 hover:border-allium-purple/40 transition-all truncate max-w-full"
                >
                  {q.length > 80 ? q.slice(0, 80) + "..." : q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <footer className="border-t border-gray-800/60 px-6 py-4 bg-[#0A0A0F]">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about a wallet's lending positions..."
            className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-allium-purple focus:ring-1 focus:ring-allium-purple/50 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-allium-purple hover:bg-allium-purple/80 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
