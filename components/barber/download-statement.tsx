"use client";

export type StatementRow = { entry: string; when: string; method: string; amount: number };

// W2's "Download statement": the ledger on screen, as a CSV — built in the
// browser from the rows already loaded, so nothing new leaves the server.
export function DownloadStatement({ rows, label }: { rows: StatementRow[]; label: string }) {
  function download() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [
      "Entry,When,Method,Amount (PHP)",
      ...rows.map((r) => [esc(r.entry), esc(r.when), esc(r.method), r.amount].join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `barbero2go-statement-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="mt-auto rounded-[11px] border border-foreground p-[13px] text-center text-sm font-bold transition-colors hover:bg-wash disabled:opacity-50"
    >
      Download statement
    </button>
  );
}
