"use client";

// "Download": a small, self-contained receipt file generated in the
// browser — no server round-trip, nothing to leak.
export type ReceiptData = {
  id: string;
  barberName: string;
  when: string;
  serviceName: string;
  servicePrice: number;
  chosenFee: number;
  method: string;
  total: number;
  address: string;
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function DownloadReceiptButton({ receipt }: { receipt: ReceiptData }) {
  function download() {
    const rows = [
      [receipt.serviceName, `₱${receipt.servicePrice}`],
      ...(receipt.chosenFee > 0 ? [["Chosen barber", `₱${receipt.chosenFee}`]] : []),
      ["Paid with", receipt.method],
    ]
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right">${esc(v)}</td></tr>`)
      .join("");
    const html = `<!doctype html><meta charset="utf-8"><title>Barbero2Go receipt</title>
<body style="font:15px/1.5 system-ui,sans-serif;max-width:420px;margin:40px auto;color:#16130f">
<h1 style="font-size:22px;margin:0 0 4px">Barbero2Go</h1>
<p style="margin:0 0 20px;color:#6a635a">Receipt · ${esc(receipt.when)}</p>
<p style="margin:0"><b>${esc(receipt.barberName)}</b></p>
<p style="margin:0 0 16px;color:#6a635a">${esc(receipt.address)}</p>
<table style="width:100%;border-collapse:collapse">${rows}
<tr><td style="padding-top:12px"><b>Total</b></td><td style="padding-top:12px;text-align:right;font-size:20px"><b>₱${receipt.total}</b></td></tr></table>
<p style="margin-top:24px;color:#8a8277;font-size:12px">Booking ${esc(receipt.id)}</p>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `barbero2go-receipt-${receipt.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} className="text-[13px] font-bold text-primary">
      Download
    </button>
  );
}
