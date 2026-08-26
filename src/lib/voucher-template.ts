/** Default HTML skeleton + render sederhana untuk cetak voucher. */

export const VOUCHER_TEMPLATE_VARS = [
  { key: "{{number}}", label: "Nomor" },
  { key: "{{code}}", label: "Username" },
  { key: "{{secret}}", label: "Password" },
  { key: "{{total}}", label: "Harga Paket" },
  { key: "{{plan_name}}", label: "Profil" },
  { key: "{{bandwidth}}", label: "Bandwidth" },
  { key: "{{validperiod}}", label: "Validity" },
  { key: "{{timelimit}}", label: "Time Limit" },
  { key: "{{datalimit}}", label: "Quota Limit" },
  { key: "{{type}}", label: "Tipe" },
  { key: "{{company}}", label: "Perusahaan" },
  { key: "{{phone}}", label: "Nomor HP" },
  { key: "{{hotspot_url}}", label: "Hotspot URL" },
  { key: "{{qrcode}}", label: "URL QR (teks)" },
] as const;

export const DEFAULT_VOUCHER_HTML = `<!-- NEWBILL VOUCHER TEMPLATE -->
{{#each}} <!-- DON'T REMOVE THIS LINE -->
<!-- don't include opening body tag -->
<!-- START CUSTOM HTML -->
<!-- #################################### -->
<style>
  .nb-voucher {
    display: inline-block;
    width: 280px;
    margin: 6px;
    padding: 12px;
    border: 1px dashed #888;
    font-family: Arial, sans-serif;
    font-size: 12px;
    vertical-align: top;
  }
  .nb-voucher h3 { margin: 0 0 8px; font-size: 14px; }
  .nb-voucher .code { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
  .nb-voucher .muted { color: #666; }
</style>
<div class="nb-voucher">
  <h3>{{company}}</h3>
  <div class="muted">{{plan_name}} / {{validperiod}}</div>
  <div style="margin-top:8px">User</div>
  <div class="code">{{code}}</div>
  <div style="margin-top:6px">Pass</div>
  <div class="code">{{secret}}</div>
  <div class="muted" style="margin-top:8px">Rp {{total}}</div>
  <div class="muted">{{hotspot_url}}</div>
</div>
<!-- #################################### -->
<!-- END CUSTOM HTML -->
<!-- don't include closing body tag -->
{{/each}} <!-- DON'T REMOVE THIS LINE -->
`;

export type VoucherPrintItem = {
  number: number | string;
  code: string;
  secret: string;
  total: string | number;
  plan_name: string;
  bandwidth?: string;
  validperiod?: string;
  timelimit?: string;
  datalimit?: string;
  type?: string;
  company?: string;
  phone?: string;
  hotspot_url?: string;
  qrcode?: string;
};

function fillItem(html: string, item: VoucherPrintItem) {
  let out = html;
  const map: Record<string, string> = {
    number: String(item.number ?? ""),
    code: item.code ?? "",
    secret: item.secret ?? "",
    total: String(item.total ?? ""),
    plan_name: item.plan_name ?? "",
    bandwidth: item.bandwidth ?? "",
    validperiod: item.validperiod ?? "",
    timelimit: item.timelimit ?? "",
    datalimit: item.datalimit ?? "",
    type: item.type ?? "",
    company: item.company ?? "",
    phone: item.phone ?? "",
    hotspot_url: item.hotspot_url ?? "",
    qrcode: item.qrcode ?? item.hotspot_url ?? "",
  };
  for (const [key, value] of Object.entries(map)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

/** Render template HTML dengan list voucher. */
export function renderVoucherTemplate(
  templateHtml: string,
  items: VoucherPrintItem[],
) {
  const loopMatch = templateHtml.match(/\{\{#each\}\}([\s\S]*?)\{\{\/each\}\}/);
  if (loopMatch) {
    const body = loopMatch[1];
    const rendered = items.map((item, index) =>
      fillItem(body, { ...item, number: item.number ?? index + 1 }),
    );
    return templateHtml.replace(loopMatch[0], rendered.join("\n"));
  }
  return items
    .map((item, index) => fillItem(templateHtml, { ...item, number: item.number ?? index + 1 }))
    .join("\n");
}
