import { jsPDF } from "jspdf";
import { format } from "date-fns";

type ShotItem = { text: string; tag: string; done: boolean };

type ShootForPdf = {
  name: string;
  date: string | null;
  time: string | null;
  location: string | null;
  shoot_type: string | null;
  status: string | null;
  mood_tags: string[] | null;
  shot_list: ShotItem[] | null;
  gear: string[] | null;
  notes: string | null;
};

type PhotographerInfo = {
  name: string;
  email: string;
  businessName?: string | null;
  phone?: string | null;
  website?: string | null;
  avatarDataUrl?: string | null;
};

const ACCENT = [79, 138, 31] as const;
const ACCENT_LIGHT = [234, 243, 222] as const;
const TEXT_DARK = [30, 30, 30] as const;
const TEXT_MUTED = [110, 110, 110] as const;
const DIVIDER = [225, 225, 225] as const;

export async function generateShootBriefPdf(shoot: ShootForPdf, photographer: PhotographerInfo) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = 0;

  function checkPageBreak(needed = 30) {
    if (y > pageHeight - needed - 40) {
      doc.addPage();
      y = 48;
      drawPageHeaderBar();
    }
  }

  function drawPageHeaderBar() {
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.rect(0, 0, pageWidth, 5, "F");
  }

  function divider() {
    doc.setDrawColor(DIVIDER[0], DIVIDER[1], DIVIDER[2]);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;
  }

  function sectionTitle(title: string) {
    checkPageBreak(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text(title.toUpperCase(), margin, y);
    y += 14;
  }

  // ─── Page 1 header ───
  drawPageHeaderBar();
  y = 40;

  // Avatar circle (top right)
  const avatarSize = 64;
  const avatarX = pageWidth - margin - avatarSize;
  const avatarY = y;
  if (photographer.avatarDataUrl) {
    try {
      // clip to circle
      doc.saveGraphicsState();
      const cx = avatarX + avatarSize / 2;
      const cy = avatarY + avatarSize / 2;
      const r = avatarSize / 2;
      doc.circle(cx, cy, r, "S");
      // jsPDF doesn't natively clip images to circles in open source version,
      // so we add the image and draw a white ring to fake the crop
      doc.addImage(photographer.avatarDataUrl, "JPEG", avatarX, avatarY, avatarSize, avatarSize);
      doc.restoreGraphicsState();
      // white ring border
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(3);
      doc.circle(cx, cy, r, "S");
      doc.setLineWidth(1);
      doc.setDrawColor(DIVIDER[0], DIVIDER[1], DIVIDER[2]);
      doc.circle(cx, cy, r, "S");
    } catch {
      // silently skip avatar if image fails
    }
  }

  // Shoot name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  const nameLines = doc.splitTextToSize(shoot.name || "Untitled Shoot", pageWidth - margin * 2 - avatarSize - 20);
  nameLines.forEach((line: string) => { doc.text(line, margin, y + 18); y += 22; });
  y += 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("Shoot Brief", margin, y);
  y += 24;

  // Photographer info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(photographer.businessName || photographer.name || "—", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  if (photographer.name && photographer.businessName) { doc.text(photographer.name, margin, y); y += 12; }
  if (photographer.email) { doc.text(photographer.email, margin, y); y += 12; }
  if (photographer.phone) { doc.text(photographer.phone, margin, y); y += 12; }
  if (photographer.website) { doc.text(photographer.website, margin, y); y += 12; }
  y += 18;

  divider();

  // ─── Shoot details ───
  sectionTitle("Shoot details");

  const details: [string, string][] = [
    ["Date", shoot.date ? format(new Date(shoot.date + "T00:00:00"), "EEEE d MMMM yyyy") : "Not set"],
    ["Time", shoot.time ? formatTime(shoot.time) : "Not set"],
    ["Location", shoot.location || "Not set"],
    ["Shoot type", shoot.shoot_type || "Custom"],
    ["Status", capitalise(shoot.status || "upcoming")],
  ];

  const colWidth = (pageWidth - margin * 2) / 2;
  details.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * colWidth;
    const rowY = y + row * 34;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(label.toUpperCase(), x, rowY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    const wrappedVal = doc.splitTextToSize(value, colWidth - 10);
    doc.text(wrappedVal[0], x, rowY + 13);
  });
  y += Math.ceil(details.length / 2) * 34 + 10;

  divider();

  // ─── Mood & style ───
  if (shoot.mood_tags && shoot.mood_tags.length > 0) {
    sectionTitle("Mood & style");
    let x = margin;
    const chipPad = 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    shoot.mood_tags.forEach((tag) => {
      const w = doc.getTextWidth(tag) + chipPad * 2;
      if (x + w > pageWidth - margin) { x = margin; y += 22; }
      doc.setFillColor(ACCENT_LIGHT[0], ACCENT_LIGHT[1], ACCENT_LIGHT[2]);
      doc.roundedRect(x, y - 11, w, 18, 9, 9, "F");
      doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.text(tag, x + chipPad, y + 1);
      x += w + 6;
    });
    y += 28;
    divider();
  }

  // ─── Shot list ───
  if (shoot.shot_list && shoot.shot_list.length > 0) {
    sectionTitle(`Shot list (${shoot.shot_list.filter((s) => s.done).length}/${shoot.shot_list.length} captured)`);

    shoot.shot_list.forEach((shot, idx) => {
      checkPageBreak(28);
      const rowBg = idx % 2 === 0;
      if (rowBg) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin - 4, y - 11, pageWidth - margin * 2 + 8, 22, "F");
      }

      // Checkbox
      if (shot.done) {
        doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.roundedRect(margin, y - 8, 12, 12, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("✓", margin + 2, y + 1);
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(margin, y - 8, 12, 12, 2, 2, "S");
      }

      doc.setFont("helvetica", shot.done ? "normal" : "normal");
      doc.setFontSize(10);
      doc.setTextColor(shot.done ? TEXT_MUTED[0] : TEXT_DARK[0], shot.done ? TEXT_MUTED[1] : TEXT_DARK[1], shot.done ? TEXT_MUTED[2] : TEXT_DARK[2]);
      doc.text(shot.text || "—", margin + 18, y + 1);

      if (shot.tag) {
        const tagW = doc.getTextWidth(shot.tag) + 10;
        doc.setFontSize(8);
        doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(pageWidth - margin - tagW, y - 8, tagW, 13, 6, 6, "S");
        doc.text(shot.tag, pageWidth - margin - tagW + 5, y + 1);
      }
      y += 22;
    });
    y += 8;
    divider();
  }

  // ─── Gear ───
  if (shoot.gear && shoot.gear.length > 0) {
    checkPageBreak(50);
    sectionTitle("Gear checklist");
    let x = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    shoot.gear.forEach((item) => {
      const w = doc.getTextWidth(item) + 20;
      if (x + w > pageWidth - margin) { x = margin; y += 20; }
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(x, y - 10, w, 16, 4, 4, "FD");
      doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
      doc.text(item, x + 10, y + 1);
      x += w + 6;
    });
    y += 26;
    divider();
  }

  // ─── Notes ───
  if (shoot.notes && shoot.notes.trim()) {
    checkPageBreak(60);
    sectionTitle("Notes");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    const lines = doc.splitTextToSize(shoot.notes, pageWidth - margin * 2);
    lines.forEach((line: string) => {
      checkPageBreak(18);
      doc.text(line, margin, y);
      y += 16;
    });
  }

  // ─── Footer on every page ───
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = pageHeight - 28;
    doc.setDrawColor(DIVIDER[0], DIVIDER[1], DIVIDER[2]);
    doc.line(margin, fy - 8, pageWidth - margin, fy - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    const footerLeft = [photographer.businessName, photographer.name].filter(Boolean).join(" · ") || photographer.email;
    doc.text(`Prepared by ${footerLeft}  ·  Shoot Brief`, margin, fy);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, fy, { align: "right" });
  }

  const safeName = (shoot.name || "shoot").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safeName}-brief.pdf`);
}

// ─── Helpers ───
function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, "0")} ${period}`;
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function fetchAvatarAsDataUrl(avatarPath: string): Promise<string | null> {
  try {
    if (avatarPath.startsWith("http")) {
      const res = await fetch(avatarPath);
      const blob = await res.blob();
      return await blobToDataUrl(blob);
    }
    const { data } = await import("@/integrations/supabase/client").then((m) =>
      m.supabase.storage.from("avatars").createSignedUrl(avatarPath, 60)
    );
    if (!data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Client Report PDF ────────────────────────────────────────────────────────

type ClientReportShoot = {
  name: string;
  date: string | null;
  location: string | null;
  shoot_type: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  contract_status: string | null;
  payment_status: string | null;
  client_notes: string | null;
  gallery_link: string | null;
  editing_progress: number | null;
  final_delivery_date: string | null;
};

export async function generateClientReportPdf(shoot: ClientReportShoot, photographer: PhotographerInfo) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = 0;

  function checkPageBreak(needed = 30) {
    if (y > pageHeight - needed - 40) { doc.addPage(); y = 48; drawPageHeaderBar(); }
  }
  function drawPageHeaderBar() {
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.rect(0, 0, pageWidth, 5, "F");
  }
  function divider() {
    doc.setDrawColor(DIVIDER[0], DIVIDER[1], DIVIDER[2]);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;
  }
  function sectionTitle(title: string) {
    checkPageBreak(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text(title.toUpperCase(), margin, y);
    y += 14;
  }
  function row(label: string, value: string, x = margin, colWidth = pageWidth - margin * 2) {
    checkPageBreak(34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    const wrapped = doc.splitTextToSize(value, colWidth - 10);
    doc.text(wrapped[0], x, y + 13);
    y += 30;
  }

  // Header
  drawPageHeaderBar();
  y = 40;

  // Avatar
  const avatarSize = 64;
  const avatarX = pageWidth - margin - avatarSize;
  if (photographer.avatarDataUrl) {
    try {
      const cx = avatarX + avatarSize / 2;
      const cy = y + avatarSize / 2;
      const r = avatarSize / 2;
      doc.addImage(photographer.avatarDataUrl, "JPEG", avatarX, y, avatarSize, avatarSize);
      doc.setDrawColor(255, 255, 255); doc.setLineWidth(3); doc.circle(cx, cy, r, "S");
      doc.setLineWidth(1); doc.setDrawColor(DIVIDER[0], DIVIDER[1], DIVIDER[2]); doc.circle(cx, cy, r, "S");
    } catch {}
  }

  // Title
  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  const nameLines = doc.splitTextToSize(shoot.name || "Untitled Shoot", pageWidth - margin * 2 - avatarSize - 20);
  nameLines.forEach((line: string) => { doc.text(line, margin, y + 18); y += 22; });
  y += 2;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("Client Report", margin, y); y += 24;

  // Photographer
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(photographer.businessName || photographer.name || "—", margin, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  if (photographer.name && photographer.businessName) { doc.text(photographer.name, margin, y); y += 12; }
  if (photographer.email) { doc.text(photographer.email, margin, y); y += 12; }
  if (photographer.phone) { doc.text(photographer.phone, margin, y); y += 12; }
  y += 18;
  divider();

  // ─── Client info ───
  sectionTitle("Client");
  const colW = (pageWidth - margin * 2) / 2;
  const clientFields: [string, string][] = [
    ["Name", shoot.client_name || "Not set"],
    ["Email", shoot.client_email || "Not set"],
    ["Phone", shoot.client_phone || "Not set"],
    ["", ""],
  ];
  clientFields.forEach(([label, value], i) => {
    if (!label) return;
    const col = i % 2; const rx = margin + col * colW;
    const startY = y + Math.floor(i / 2) * 34;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(label.toUpperCase(), rx, startY);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(value, rx, startY + 13);
  });
  y += Math.ceil(clientFields.filter(([l]) => !!l).length / 2) * 34 + 4;
  divider();

  // ─── Visual Timeline ───
  sectionTitle("Your Journey");
  const pct = Math.min(100, Math.max(0, shoot.editing_progress ?? 0));
  const shootDate = shoot.date ? new Date(shoot.date + "T00:00:00") : null;
  const deliveryDate = shoot.final_delivery_date ? new Date(shoot.final_delivery_date + "T00:00:00") : null;
  const today = new Date();

  const timelineStages = [
    {
      label: "Shoot Day",
      sublabel: shootDate ? format(shootDate, "d MMM yyyy") : "TBC",
      done: shootDate ? today > shootDate : false,
    },
    {
      label: "Editing",
      sublabel: `${pct}% complete`,
      done: pct === 100,
    },
    {
      label: "Delivery",
      sublabel: deliveryDate ? format(deliveryDate, "d MMM yyyy") : "TBC",
      done: deliveryDate ? today >= deliveryDate : false,
    },
  ];

  const tlLeft = margin;
  const tlRight = pageWidth - margin;
  const tlWidth = tlRight - tlLeft;
  const nodePositions = [tlLeft, tlLeft + tlWidth / 2, tlRight];
  const nodeY = y + 20;
  const nodeR = 10;

  // Track line background
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(2);
  doc.line(tlLeft, nodeY, tlRight, nodeY);

  // Track line progress
  const doneCount = timelineStages.filter(s => s.done).length;
  if (doneCount > 0) {
    const progressX = nodePositions[Math.min(doneCount, 2)];
    doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.line(tlLeft, nodeY, progressX, nodeY);
  }
  doc.setLineWidth(1);

  // Nodes + labels
  timelineStages.forEach((stage, i) => {
    const nx = nodePositions[i];
    if (stage.done) {
      doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.circle(nx, nodeY, nodeR, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("✓", nx, nodeY + 3, { align: "center" });
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200, 200, 200);
      doc.circle(nx, nodeY, nodeR, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      doc.text(String(i + 1), nx, nodeY + 3, { align: "center" });
    }

    // Stage label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(stage.done ? ACCENT[0] : TEXT_DARK[0], stage.done ? ACCENT[1] : TEXT_DARK[1], stage.done ? ACCENT[2] : TEXT_DARK[2]);
    doc.text(stage.label, nx, nodeY + nodeR + 12, { align: "center" });

    // Sub-label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(stage.sublabel, nx, nodeY + nodeR + 22, { align: "center" });
  });

  y = nodeY + nodeR + 36;

  // Editing progress bar
  if (pct > 0 && pct < 100) {
    const barWidth = tlWidth;
    doc.setFillColor(234, 243, 222);
    doc.roundedRect(tlLeft, y, barWidth, 10, 5, 5, "F");
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.roundedRect(tlLeft, y, barWidth * pct / 100, 10, 5, 5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Editing ${pct}% complete`, tlLeft, y + 20);
    y += 28;
  }

  y += 12;
  divider();

  // ─── Shoot & admin details ───
  sectionTitle("Shoot Details");
  const shootFields: [string, string][] = [
    ["Location", shoot.location || "Not set"],
    ["Contract", capitalise(shoot.contract_status || "unsigned")],
    ["Payment", capitalise((shoot.payment_status || "unpaid").replace(/_/g, " "))],
    ["Gallery link", shoot.gallery_link || "Not provided"],
  ];
  const colW2 = (pageWidth - margin * 2) / 2;
  shootFields.forEach(([label, value], i) => {
    const col = i % 2; const rx = margin + col * colW2;
    const startY = y + Math.floor(i / 2) * 34;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(label.toUpperCase(), rx, startY);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    const wrapped = doc.splitTextToSize(value, colW2 - 10);
    doc.text(wrapped[0], rx, startY + 13);
  });
  y += Math.ceil(shootFields.length / 2) * 34 + 10;
  divider();

  // ─── Notes for client ───
  if (shoot.client_notes && shoot.client_notes.trim()) {
    sectionTitle("Notes for Client");
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    const lines = doc.splitTextToSize(shoot.client_notes, pageWidth - margin * 2);
    lines.forEach((line: string) => { checkPageBreak(18); doc.text(line, margin, y); y += 16; });
  }

  // ─── Footer ───
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = pageHeight - 28;
    doc.setDrawColor(DIVIDER[0], DIVIDER[1], DIVIDER[2]);
    doc.line(margin, fy - 8, pageWidth - margin, fy - 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    const footerLeft = [photographer.businessName, photographer.name].filter(Boolean).join(" · ") || photographer.email;
    doc.text(`Prepared by ${footerLeft}  ·  Shoot Brief`, margin, fy);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, fy, { align: "right" });
  }

  const safeName = (shoot.client_name || shoot.name || "client").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safeName}-report.pdf`);
}
