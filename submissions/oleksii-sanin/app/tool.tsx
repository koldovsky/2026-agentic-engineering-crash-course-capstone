"use client";

import { useRef, useState } from "react";

import { copy, paste } from "@/lib/clipboard";
import { type Imported, importFile, sequence } from "@/lib/import/file";
import { jiraToMarkdown } from "@/lib/import/jira";
import type { TransformResult } from "@/lib/transform";

/**
 * The tool surface. It is the only client component in the app: it needs state, an event
 * handler and the clipboard.
 *
 * The type import above is erased at build time, so the transform stays on the server. The HTML
 * and `.docx` conversions load with `await import(...)` inside `importFile` and `paste`, so the
 * first page load carries none of them. `file.ts` and `jira.ts` have no dependency, and they load
 * statically.
 */

const TABS = [
  { id: "blog", label: "Blog" },
  { id: "email", label: "Email" },
  { id: "x", label: "X thread" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "jira", label: "Jira" },
  { id: "gdocs", label: "Google Docs" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** With `html`, the button copies rich text, and `text` is the plain-text entry beside it. */
function CopyButton({ text, html, label = "Copy" }: { text: string; html?: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  return (
    <button
      type="button"
      disabled={(html ?? text) === ""}
      onClick={async () => {
        setStatus(await copy(text, navigator.clipboard, html));
        setTimeout(() => setStatus("idle"), 1500);
      }}
      className="rounded-md border border-black/15 px-3 py-1 text-xs font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10"
    >
      {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : label}
    </button>
  );
}

function Output({ text }: { text: string }) {
  if (text === "") {
    return <p className="p-4 text-sm opacity-60">No output. The source is empty.</p>;
  }
  return (
    <pre className="max-h-[28rem] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap">
      {text}
    </pre>
  );
}

export function Tool() {
  const [markdown, setMarkdown] = useState("");
  const [result, setResult] = useState<TransformResult | null>(null);
  // The markdown that produced `result`. The visitor can edit the textarea after the transform.
  const [source, setSource] = useState("");
  const [tab, setTab] = useState<TabId>("blog");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  // Numbers each import and edit. A slow import that ends after a later one is stale.
  const [imports] = useState(sequence);
  // The Jira conversion of the textarea. The control stays off until the textarea changes again.
  const [converted, setConverted] = useState<string | null>(null);

  function edit(value: string) {
    imports.edit();
    setMarkdown(value);
  }

  /** Put an import in the textarea, or show its message. A stale import changes nothing. */
  async function load(pending: Promise<Imported>) {
    const imported = await imports.load(pending);
    if (!imported) return;
    if ("error" in imported) return setError(imported.error);
    setMarkdown(imported.markdown);
    setError("");
  }

  function convertJira() {
    const next = jiraToMarkdown(markdown);
    edit(next);
    setConverted(next);
    setError("");
  }

  async function run() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const body = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(body.error ?? `The transform failed with status ${response.status}.`);
        return;
      }
      setResult(body as TransformResult);
      // `markdown` is the value of the render that started this run, not the textarea of now.
      setSource(markdown);
    } catch {
      setResult(null);
      setError("The transform did not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const panel = "rounded-lg border border-black/10 dark:border-white/15";
  const secondary =
    "rounded-md border border-black/15 px-3 py-2 text-sm transition hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10";

  return (
    <div className="mt-8 grid gap-6">
      <div className="grid gap-3">
        <label htmlFor="source" className="text-sm font-medium">
          Markdown source
        </label>
        <textarea
          id="source"
          value={markdown}
          onChange={(event) => edit(event.target.value)}
          rows={12}
          spellCheck={false}
          placeholder="# Your post&#10;&#10;Paste markdown here."
          className={`${panel} bg-transparent p-4 font-mono text-sm outline-none focus:border-black/40 dark:focus:border-white/40`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Working" : "Transform"}
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} className={secondary}>
            Open file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".md,.markdown,.txt,.html,.docx"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Clear the value, so that the same file can open again.
              event.target.value = "";
              if (file) void load(importFile(file));
            }}
          />
          <button type="button" onClick={() => load(paste(navigator.clipboard))} className={secondary}>
            Paste rich text
          </button>
          <button
            type="button"
            onClick={convertJira}
            disabled={markdown === "" || markdown === converted}
            className={secondary}
          >
            Convert Jira text
          </button>
          <span className="text-xs opacity-60">
            Nothing is stored. A reload clears the work.
          </span>
        </div>
      </div>

      {error !== "" && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {error}
        </p>
      )}

      {result !== null && (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Outputs">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  tab === item.id
                    ? "bg-foreground text-background"
                    : "border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={panel}>
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-2 dark:border-white/15">
              <span className="text-xs opacity-70">
                {tab === "x"
                  ? `${result.meta.x.parts} part${result.meta.x.parts === 1 ? "" : "s"}, ${result.meta.x.chars} characters`
                  : `${result.meta[tab].chars} characters`}
                {tab === "linkedin" && result.meta.linkedin.truncated ? " · cut at 3000" : ""}
              </span>
              <CopyButton
                key={tab}
                text={tab === "x" ? result.x.join("\n\n") : tab === "gdocs" ? source : result[tab]}
                html={tab === "gdocs" ? result.gdocs : undefined}
                label={tab === "x" ? "Copy the thread" : tab === "gdocs" ? "Copy as rich text" : "Copy"}
              />
            </div>

            {tab === "x" ? (
              <div className="grid gap-3 p-4">
                {result.x.length === 0 && (
                  <p className="text-sm opacity-60">No output. The source is empty.</p>
                )}
                {result.x.map((part, index) => (
                  <div key={index} className={`${panel} grid gap-2 p-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium opacity-70">
                        Part {index + 1} of {result.x.length}
                      </span>
                      <CopyButton text={part} label="Copy this part" />
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{part}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Output text={result[tab]} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
