// GramSync - Integrated QR Scanner + Customer Profile
// ScanQR opens camera -> jsQR decodes customer ID -> CustomerProfile slides up
// Pure React, jsQR via CDN for real QR decoding

import { useState, useEffect, useRef, useCallback } from "react";

/* --- Load jsQR from CDN --------------------------------------------------- */
function useJsQR() {
  const [ready, setReady] = useState(!!window.jsQR);
  useEffect(() => {
    if (window.jsQR) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

/* --- Design tokens -------------------------------------------------------- */
const t = {
  blue:       "#2347F5",
  blueMid:    "#3A5BFF",
  bluePale:   "#EEF1FF",
  green:      "#0BAF60",
  greenPale:  "#E6F9F0",
  greenDark:  "#098F4E",
  orange:     "#F56A00",
  orangePale: "#FFF0E5",
  red:        "#E8304A",
  redPale:    "#FFEBEE",
  yellow:     "#F5A623",
  yellowPale: "#FFF8E5",
  bg:         "#0a0f2e",
  bgCard:     "rgba(255,255,255,0.07)",
  text:       "#FFFFFF",
  muted:      "rgba(255,255,255,0.55)",
  border:     "rgba(255,255,255,0.10)",
  navBg:      "#0f1535",
  navBorder:  "rgba(255,255,255,0.08)",
  profileBg:  "#F0F2F8",
  profileCard:"#FFFFFF",
  profileText:"#0D1226",
  profileMuted:"#7A85A3",
  profileBorder:"#E2E6F3",
};

const RUPEE = "\u20B9";
const DOT = "\u00B7";
const EM_DASH = "\u2014";
const ELLIPSIS = "\u2026";
const ICON_STAR = "\u2726";
const ICON_CHECK = "\u2713";
const ICON_WARN = "\u26A0\uFE0F";
const ICON_CROSS = "\u2715";
const ICON_OK = "\u2705";
const ICON_TIP = "\u{1F4A1}";
const ICON_BELL = "\u{1F514}";
const ICON_CHART = "\u{1F4CA}";
const ICON_HOURGLASS = "\u23F3";
const ICON_TIMES = "\u00D7";
const ARROW_UP = "\u2191";
const ARROW_DOWN = "\u2193";
const ICON_INFO = "\u2139";

/* --- Customer DB (keyed by QR payload) ----------------------------------- */
const CUSTOMER_DB = {
  "GS-9982": {
    id: "GS-9982", name: "Rajesh Kumar", phone: "+91 98765 43210",
    initials: "RK", since: "July 2023", address: "12, Gandhi Nagar, Nashik",
    gramScore: 720, maxScore: 900, status: "safe",
    creditLimit: 5000, totalUdhar: 3200, totalJama: 1950,
    balance: 1250, balanceType: "udhar", lastActivity: "Today, 10:45 AM",
  },
  "GS-4471": {
    id: "GS-4471", name: "Priya Devi", phone: "+91 91234 56789",
    initials: "PD", since: "March 2022", address: "8, Shivaji Road, Pune",
    gramScore: 855, maxScore: 900, status: "excellent",
    creditLimit: 8000, totalUdhar: 6200, totalJama: 6500,
    balance: 300, balanceType: "jama", lastActivity: "Today, 09:12 AM",
  },
  "GS-7730": {
    id: "GS-7730", name: "Vikram Singh", phone: "+91 99887 65432",
    initials: "VS", since: "Jan 2024", address: "33, MG Road, Aurangabad",
    gramScore: 390, maxScore: 900, status: "risky",
    creditLimit: 2000, totalUdhar: 4100, totalJama: 1800,
    balance: 2300, balanceType: "udhar", lastActivity: "Yesterday, 06:10 PM",
  },
  "GS-1155": {
    id: "GS-1155", name: "Suresh Kumar", phone: "+91 88776 55443",
    initials: "SK", since: "Oct 2021", address: "5, Tilak Nagar, Mumbai",
    gramScore: 540, maxScore: 900, status: "caution",
    creditLimit: 3000, totalUdhar: 2800, totalJama: 2100,
    balance: 700, balanceType: "udhar", lastActivity: "Today, 10:45 AM",
  },
};

const TRANSACTIONS_DB = {
  "GS-9982": [
    { id:1, date:"Today",     time:"10:45 AM", type:"udhar", amount:500,  label:"Grocery Items",        synced:true,  note:"" },
    { id:2, date:"Today",     time:"08:20 AM", type:"jama",  amount:200,  label:"Payment Received",     synced:true,  note:"Cash" },
    { id:3, date:"Yesterday", time:"06:10 PM", type:"udhar", amount:950,  label:"Bulk Grain Purchase",  synced:false, note:"Pending sync" },
    { id:4, date:"12 Oct",    time:"11:30 AM", type:"jama",  amount:750,  label:"Partial Payment",      synced:true,  note:"" },
    { id:5, date:"10 Oct",    time:"03:15 PM", type:"udhar", amount:400,  label:"Household Items",      synced:true,  note:"" },
    { id:6, date:"08 Oct",    time:"09:00 AM", type:"jama",  amount:1000, label:"Full Settlement",      synced:true,  note:"UPI transfer" },
  ],
  "GS-4471": [
    { id:1, date:"Today",     time:"09:12 AM", type:"jama",  amount:1200, label:"Monthly Settlement",   synced:true,  note:"UPI" },
    { id:2, date:"Yesterday", time:"04:00 PM", type:"udhar", amount:800,  label:"Vegetables",           synced:true,  note:"" },
    { id:3, date:"14 Oct",    time:"02:30 PM", type:"jama",  amount:2000, label:"Advance Payment",      synced:true,  note:"Cash" },
  ],
  "GS-7730": [
    { id:1, date:"Yesterday", time:"06:10 PM", type:"udhar", amount:2100, label:"Bulk Order",           synced:false, note:"Pending" },
    { id:2, date:"05 Oct",    time:"01:00 PM", type:"udhar", amount:1200, label:"Household Items",      synced:true,  note:"" },
    { id:3, date:"01 Oct",    time:"10:00 AM", type:"jama",  amount:1800, label:"Partial Payment",      synced:true,  note:"Cash" },
  ],
  "GS-1155": [
    { id:1, date:"Today",     time:"10:45 AM", type:"udhar", amount:450,  label:"Grocery Run",          synced:true,  note:"" },
    { id:2, date:"12 Oct",    time:"09:00 AM", type:"jama",  amount:800,  label:"Payment",              synced:true,  note:"Online" },
    { id:3, date:"08 Oct",    time:"03:00 PM", type:"udhar", amount:950,  label:"Diwali Shopping",      synced:true,  note:"" },
  ],
};

const SCORE_BREAKDOWN = [
  { label: "Repayment rate",    score: 72, max: 100 },
  { label: "Payment frequency", score: 80, max: 100 },
  { label: "Credit history",    score: 65, max: 100 },
  { label: "Balance vs limit",  score: 58, max: 100 },
];

/* --- Helpers -------------------------------------------------------------- */
function lookupCustomer(raw) {
  // Accept "GS-9982" or "#GS-9982" or raw payload containing customer id
  const rawText = String(raw || "").trim();
  const clean = rawText.replace(/^#/, "").trim().toUpperCase();
  // If QR contains JSON, prefer that data
  if (rawText.startsWith("{") && rawText.endsWith("}")) {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === "object") {
        const id = String(parsed.id || parsed.customerId || parsed.uid || clean || "UNKNOWN").toUpperCase();
        return {
          customer: {
            id,
            name: parsed.name || "Unknown Customer",
            phone: parsed.phone || "N/A",
            initials: (parsed.initials || String(parsed.name || id).slice(0, 2)).toUpperCase(),
            since: parsed.since || "Unknown",
            address: parsed.address || "-",
            gramScore: Number(parsed.gramScore || 300),
            maxScore: Number(parsed.maxScore || 900),
            status: parsed.status || "risky",
            creditLimit: Number(parsed.creditLimit || 0),
            totalUdhar: Number(parsed.totalUdhar || 0),
            totalJama: Number(parsed.totalJama || 0),
            balance: Number(parsed.balance || 0),
            balanceType: parsed.balanceType || "udhar",
            lastActivity: parsed.lastActivity || "Unknown",
          },
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        };
      }
    } catch (_) { /* fall through to normal lookup */ }
  }
  // Try direct key
  if (CUSTOMER_DB[clean]) return { customer: CUSTOMER_DB[clean], transactions: TRANSACTIONS_DB[clean] || [] };
  // Try finding any key within the string
  for (const key of Object.keys(CUSTOMER_DB)) {
    if (rawText.toUpperCase().includes(key)) return { customer: CUSTOMER_DB[key], transactions: TRANSACTIONS_DB[key] || [] };
  }
  // Demo fallback - make a generic unknown customer
  return {
    customer: {
      id: clean, name: "Unknown Customer", phone: "N/A",
      initials: clean.slice(0, 2), since: "Unknown", address: "-",
      gramScore: 300, maxScore: 900, status: "risky",
      creditLimit: 0, totalUdhar: 0, totalJama: 0,
      balance: 0, balanceType: "udhar", lastActivity: "Never",
    },
    transactions: [],
  };
}

function trustInfo(score, max) {
  const pct = (score / max) * 100;
  if (pct >= 80) return { label: "Excellent Trust", color: t.green,  bg: t.greenPale,  icon: ICON_STAR,  tagBg: "#dcfce7", tagColor: "#15803d" };
  if (pct >= 60) return { label: "Safe to Lend",    color: t.green,  bg: t.greenPale,  icon: ICON_CHECK, tagBg: "#dcfce7", tagColor: "#15803d" };
  if (pct >= 40) return { label: "Use Caution",     color: t.yellow, bg: t.yellowPale, icon: ICON_WARN,  tagBg: "#fef9c3", tagColor: "#92400e" };
  return             { label: "High Risk",          color: t.red,    bg: t.redPale,    icon: ICON_CROSS, tagBg: "#fee2e2", tagColor: "#b91c1c" };
}

/* --- Global CSS ----------------------------------------------------------- */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  ::-webkit-scrollbar { display:none; }
  body { background:#0a0f2e; }

  @keyframes scanLine {
    0%   { top:12px; opacity:0; }
    8%   { opacity:1; }
    92%  { opacity:1; }
    100% { top:calc(100% - 12px); opacity:0; }
  }
  @keyframes cornerPulse {
    0%,100% { opacity:1; }
    50%      { opacity:0.45; }
  }
  @keyframes fadeSlideUp {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeSlideDown {
    from { opacity:0; transform:translateY(-16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes ripple {
    0%   { transform:scale(0.8); opacity:1; }
    100% { transform:scale(2.4); opacity:0; }
  }
  @keyframes successPop {
    0%   { transform:scale(0.5); opacity:0; }
    70%  { transform:scale(1.12); }
    100% { transform:scale(1);   opacity:1; }
  }
  @keyframes profileSlide {
    from { transform:translateY(100%); opacity:0; }
    to   { transform:translateY(0);    opacity:1; }
  }
  @keyframes balanceCount {
    from { opacity:0; transform:scale(0.85); }
    to   { opacity:1; transform:scale(1); }
  }
  @keyframes trustBadge {
    0%   { transform:scale(0.7) rotate(-6deg); opacity:0; }
    80%  { transform:scale(1.05) rotate(1deg); }
    100% { transform:scale(1) rotate(0deg); opacity:1; }
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes staggerIn {
    from { opacity:0; transform:translateX(-10px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }

  .scan-action-btn {
    display:flex; flex-direction:column; align-items:center; gap:8px;
    cursor:pointer; background:none; border:none;
    color:rgba(255,255,255,0.55); font-family:'Sora',sans-serif;
    font-size:11px; font-weight:500; transition:color 0.15s; padding:4px 8px;
  }
  .scan-action-btn:hover { color:rgba(255,255,255,0.9); }
  .scan-action-btn.active-btn { color:#fff; }
  .scan-action-circle {
    width:54px; height:54px; border-radius:50%;
    background:rgba(255,255,255,0.10);
    display:flex; align-items:center; justify-content:center;
    transition:background 0.15s,transform 0.12s;
  }
  .scan-action-btn:active .scan-action-circle { transform:scale(0.92); }
  .scan-action-circle.active-circle {
    background:#2347F5;
    box-shadow:0 4px 18px rgba(35,71,245,0.55);
  }

  .manual-input {
    background:rgba(255,255,255,0.07); border:1.5px solid rgba(255,255,255,0.15);
    border-radius:12px; padding:14px 16px;
    font-family:'Sora',sans-serif; font-size:15px; color:#fff;
    width:100%; outline:none; transition:border-color 0.15s,box-shadow 0.15s;
    letter-spacing:0.08em;
  }
  .manual-input::placeholder { color:rgba(255,255,255,0.35); letter-spacing:0; }
  .manual-input:focus { border-color:#2347F5; box-shadow:0 0 0 3px rgba(35,71,245,0.25); }

  .history-row {
    display:flex; align-items:center; gap:12px; padding:12px 16px;
    cursor:pointer; transition:background 0.12s; border-radius:12px;
  }
  .history-row:hover { background:rgba(255,255,255,0.05); }

  .nav-btn {
    flex:1; display:flex; flex-direction:column; align-items:center;
    padding:10px 0 12px; gap:4px; cursor:pointer; border:none; background:none;
    font-family:'Sora',sans-serif; font-size:10px; font-weight:500; transition:color 0.15s;
  }

  /* Profile styles */
  .txn-row {
    display:flex; align-items:center; gap:12px; padding:13px 16px;
    background:#fff; border-radius:14px;
    box-shadow:0 1px 3px rgba(0,0,0,0.04); cursor:pointer;
    transition:box-shadow 0.15s,transform 0.12s;
  }
  .txn-row:hover { box-shadow:0 3px 14px rgba(0,0,0,0.08); transform:translateY(-1px); }
  .txn-row:active { transform:scale(0.98); }
  .filter-chip {
    border:1.5px solid; border-radius:99px; padding:6px 14px;
    font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;
    transition:background 0.15s,color 0.15s,border-color 0.15s;
    font-family:'Sora',sans-serif; background:none;
  }
  .action-fab {
    display:flex; flex-direction:column; align-items:center; gap:6px;
    cursor:pointer; background:none; border:none;
    font-family:'Sora',sans-serif; font-size:11px; font-weight:600;
    transition:transform 0.12s;
  }
  .action-fab:active { transform:scale(0.92); }
  .action-fab-circle {
    width:52px; height:52px; border-radius:50%;
    display:flex; align-items:center; justify-content:center; transition:filter 0.12s;
  }
  .action-fab:hover .action-fab-circle { filter:brightness(1.08); }
  .sheet-overlay {
    position:fixed; inset:0; z-index:300;
    background:rgba(13,18,38,0.55);
    display:flex; align-items:flex-end;
    animation:fadeIn 0.18s ease;
  }
  .sheet-body {
    background:#fff; border-radius:22px 22px 0 0;
    width:100%; padding:24px 20px 36px;
    animation:fadeSlideUp 0.26s cubic-bezier(.22,1,.36,1);
    box-shadow:0 -8px 40px rgba(0,0,0,0.15);
    max-height:85vh; overflow-y:auto;
  }
  .sheet-handle { width:38px; height:4px; border-radius:99px; background:#E2E6F3; margin:0 auto 20px; }
  .primary-btn {
    width:100%; padding:16px; border-radius:14px; border:none;
    font-family:'Sora',sans-serif; font-weight:800; font-size:15px;
    cursor:pointer; transition:transform 0.1s,filter 0.1s;
  }
  .primary-btn:hover  { filter:brightness(1.06); }
  .primary-btn:active { transform:scale(0.97); }

  .trust-banner {
    animation: trustBadge 0.5s cubic-bezier(.22,1,.36,1) 0.2s both;
  }
  .camera-video {
    position:absolute; inset:0; width:100%; height:100%;
    object-fit:cover; border-radius:0;
  }
  .extra-btn {
    flex:1; display:flex; flex-direction:column; align-items:center; gap:10px;
    padding:18px 12px; cursor:pointer; background:none; border:none;
    font-family:'Sora',sans-serif; transition:background 0.15s; border-radius:0;
  }
  .extra-btn:hover  { background:rgba(255,255,255,0.05); }
  .extra-btn:active { background:rgba(255,255,255,0.09); }
`;

/* --- Scan Frame ----------------------------------------------------------- */
function ScanFrame({ scanning }) {
  return (
    <div style={{ width:264, height:248, position:"relative", margin:"0 auto" }}>
      {[
        { top:0,    left:0,    borderWidth:"3px 0 0 3px",  borderRadius:"5px 0 0 0" },
        { top:0,    right:0,   borderWidth:"3px 3px 0 0",  borderRadius:"0 5px 0 0" },
        { bottom:0, left:0,    borderWidth:"0 0 3px 3px",  borderRadius:"0 0 0 5px" },
        { bottom:0, right:0,   borderWidth:"0 3px 3px 0",  borderRadius:"0 0 5px 0" },
      ].map((pos, i) => (
        <div key={i} style={{
          position:"absolute", width:38, height:38, borderStyle:"solid",
          borderColor:t.blue,
          animation:scanning ? `cornerPulse 1.8s ease-in-out infinite ${i*0.15}s` : "none",
          ...pos,
        }} />
      ))}
      <div style={{
        position:"absolute", inset:0, opacity:0.06,
        backgroundImage:`linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)`,
        backgroundSize:"33px 33px",
      }} />
      {scanning && (
        <div style={{
          position:"absolute", left:10, right:10, height:2,
          background:`linear-gradient(90deg,transparent,${t.blue},${t.blueMid},${t.blue},transparent)`,
          animation:"scanLine 2s linear infinite", borderRadius:99,
          boxShadow:`0 0 12px ${t.blue}`, filter:"blur(0.5px)",
        }} />
      )}
      {scanning && [0, 0.7].map((delay, i) => (
        <div key={i} style={{
          position:"absolute", inset:"30%", borderRadius:"50%",
          border:`1.5px solid ${t.blue}`,
          animation:`ripple 2s ease-out infinite ${delay}s`, opacity:0,
        }} />
      ))}
      <div style={{
        position:"absolute", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)", width:6, height:6,
        borderRadius:"50%", background:t.blue, opacity:0.6,
        boxShadow:`0 0 8px ${t.blue}`,
      }} />
    </div>
  );
}

/* --- Live Camera + QR decode ---------------------------------------------- */
function CameraView({ onDecode, active, onActive, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const jsQRReady = useJsQR();
  const detectorRef = useRef(null);
  const lastScanRef = useRef(0);
  const lastWideScanRef = useRef(0);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(tr => tr.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!("BarcodeDetector" in window)) return;
    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
    } catch (_) {
      detectorRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    let dead = false;
    lastScanRef.current = 0;
    lastWideScanRef.current = 0;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError?.({ name: "NotSupportedError" });
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
      .then(stream => {
        if (dead) { stream.getTracks().forEach(tr => tr.stop()); return; }
        streamRef.current = stream;
        onActive?.();
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        const tick = async () => {
          if (dead || !videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const now = performance.now();
            if (now - lastScanRef.current < 120) {
              rafRef.current = requestAnimationFrame(tick);
              return;
            }
            lastScanRef.current = now;

            if (detectorRef.current) {
              try {
                const barcodes = await detectorRef.current.detect(video);
                if (dead) return;
                if (barcodes && barcodes.length) {
                  onDecode(barcodes[0].rawValue);
                  return;
                }
              } catch (_) {
                detectorRef.current = null;
              }
            }

            if (jsQRReady && window.jsQR) {
              const canvas = canvasRef.current;
              const vw = video.videoWidth || 0;
              const vh = video.videoHeight || 0;
              if (vw > 0 && vh > 0) {
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.imageSmoothingEnabled = false;

                const decodeRegion = (sx, sy, sw, sh) => {
                  const target = 640;
                  const scale = Math.min(1, target / Math.max(sw, sh));
                  const dw = Math.max(1, Math.round(sw * scale));
                  const dh = Math.max(1, Math.round(sh * scale));
                  canvas.width = dw;
                  canvas.height = dh;
                  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
                  const imageData = ctx.getImageData(0, 0, dw, dh);
                  return window.jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "attemptBoth",
                  });
                };

                const size = Math.min(vw, vh) * 0.65;
                const sx = (vw - size) / 2;
                const sy = (vh - size) / 2;
                let code = decodeRegion(sx, sy, size, size);
                if (!code && now - lastWideScanRef.current > 800) {
                  lastWideScanRef.current = now;
                  code = decodeRegion(0, 0, vw, vh);
                }
                if (code) { onDecode(code.data); return; }
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => { rafRef.current = requestAnimationFrame(tick); };
        }
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch((err) => { onError?.(err); });

    return () => { dead = true; stopCamera(); };
  }, [active, jsQRReady, onDecode, onActive, onError, stopCamera]);

  return (
    <>
      <video ref={videoRef} playsInline muted autoPlay className="camera-video" style={{ display: active ? "block" : "none" }} />
      <canvas ref={canvasRef} style={{ display:"none" }} />
    </>
  );
}

/* --- Success Overlay ------------------------------------------------------ */
function SuccessOverlay({ customer, onViewProfile, onCancel }) {
  const trust = trustInfo(customer.gramScore, customer.maxScore);
  return (
    <div style={{
      position:"absolute", inset:0, zIndex:200,
      background:"rgba(10,15,46,0.94)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:24, animation:"fadeSlideUp 0.25s ease",
    }}>
      {/* Check circle */}
      <div style={{
        width:72, height:72, borderRadius:"50%",
        background:"rgba(11,175,96,0.15)",
        border:`2px solid ${t.green}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        marginBottom:18, animation:"successPop 0.35s ease",
      }}>
        <svg width="34" height="34" fill="none" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" stroke={t.green} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={{ fontSize:22, fontWeight:800, color:"#fff", marginBottom:4 }}>Customer Found</div>
      <div style={{ fontSize:13, color:t.muted, marginBottom:20 }}>QR scanned successfully</div>

      {/* Trust badge */}
      <div className="trust-banner" style={{
        background:trust.bg, borderRadius:99, padding:"8px 18px",
        display:"flex", alignItems:"center", gap:8, marginBottom:20,
      }}>
        <span style={{ fontSize:16, color:trust.color }}>{trust.icon}</span>
        <span style={{ fontSize:13, fontWeight:700, color:trust.color }}>{trust.label}</span>
        <span style={{
          background:trust.tagBg, color:trust.tagColor,
          borderRadius:6, fontSize:11, fontWeight:800, padding:"2px 8px",
          fontFamily:"'JetBrains Mono',monospace",
        }}>{customer.gramScore}/{customer.maxScore}</span>
      </div>

      {/* Customer card */}
      <div style={{
        background:"rgba(255,255,255,0.07)", borderRadius:16,
        padding:"18px 20px", width:"100%", marginBottom:22,
        border:"1px solid rgba(255,255,255,0.12)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
          <div style={{
            width:52, height:52, borderRadius:"50%",
            background:t.bluePale, color:t.blue,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize:16, flexShrink:0,
          }}>
            {customer.initials}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:17, fontWeight:700, color:"#fff" }}>{customer.name}</div>
            <div style={{ fontSize:12, color:t.muted, marginTop:2 }}>ID: {customer.id}</div>
            <div style={{ fontSize:11, color:t.muted, marginTop:1 }}>
              {customer.phone} {DOT} Since {customer.since}
            </div>
          </div>
          <span style={{
            background:trust.tagBg, color:trust.tagColor,
            borderRadius:6, fontSize:10, fontWeight:700, padding:"3px 8px",
          }}>
            {customer.status.toUpperCase()}
          </span>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { label:"Udhar",   value:`${RUPEE}${customer.totalUdhar.toLocaleString("en-IN")}`, color:t.orange },
            { label:"Jama",    value:`${RUPEE}${customer.totalJama.toLocaleString("en-IN")}`,  color:t.green  },
            { label:"Balance", value:`${RUPEE}${customer.balance.toLocaleString("en-IN")}`,    color:"#fff"   },
          ].map((s,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 10px" }}>
              <div style={{ fontSize:9, color:t.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{s.label}</div>
              <div style={{ fontSize:14, fontWeight:800, color:s.color, fontFamily:"'JetBrains Mono',monospace" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit recommendation */}
      <div style={{
        width:"100%", borderRadius:12, padding:"12px 14px",
        background: trust.color === t.red ? "rgba(232,48,74,0.12)" : trust.color === t.yellow ? "rgba(245,166,35,0.12)" : "rgba(11,175,96,0.12)",
        border: `1px solid ${trust.color}33`,
        marginBottom:20, display:"flex", gap:10, alignItems:"flex-start",
      }}>
        <span style={{ fontSize:18, lineHeight:1 }}>
          {trust.color === t.red ? ICON_WARN : trust.color === t.yellow ? ICON_TIP : ICON_OK}
        </span>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:trust.color, marginBottom:2 }}>
            {trust.color === t.red   ? "Do not extend credit" :
             trust.color === t.yellow ? "Extend credit with limits" :
             "Safe to extend credit"}
          </div>
          <div style={{ fontSize:11, color:t.muted, lineHeight:1.5 }}>
            {trust.color === t.red   ? `Outstanding ${RUPEE}${customer.balance.toLocaleString("en-IN")} unpaid. Gram Score below safe threshold.` :
             trust.color === t.yellow ? `Credit limit ${RUPEE}${customer.creditLimit.toLocaleString("en-IN")}. Review before large transactions.` :
             `Credit limit ${RUPEE}${customer.creditLimit.toLocaleString("en-IN")}. Good repayment history.`}
          </div>
        </div>
      </div>

      <button onClick={onViewProfile} style={{
        width:"100%", padding:"16px", borderRadius:14,
        background:t.blue, color:"#fff", border:"none",
        fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:15,
        cursor:"pointer", marginBottom:10,
        boxShadow:`0 4px 16px rgba(35,71,245,0.4)`,
        transition:"transform 0.1s",
      }}
        onMouseDown={e => e.currentTarget.style.transform="scale(0.97)"}
        onMouseUp={e   => e.currentTarget.style.transform="scale(1)"}
      >
        View Full Profile & Ledger
      </button>
      <button onClick={onCancel} style={{
        width:"100%", padding:"14px", borderRadius:14,
        background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.7)",
        border:"1px solid rgba(255,255,255,0.12)",
        fontFamily:"'Sora',sans-serif", fontWeight:600, fontSize:14, cursor:"pointer",
      }}>
        Scan Again
      </button>
    </div>
  );
}

/* --- Manual Entry Panel --------------------------------------------------- */
function ManualPanel({ onSubmit, onClose }) {
  const [val, setVal] = useState("");
  const suggestions = Object.keys(CUSTOMER_DB);
  return (
    <div style={{
      position:"absolute", bottom:0, left:0, right:0, zIndex:150,
      background:"#111b44", borderRadius:"20px 20px 0 0",
      padding:"24px 20px 32px", border:"1px solid rgba(255,255,255,0.1)",
      animation:"fadeSlideUp 0.25s ease", boxShadow:"0 -8px 40px rgba(0,0,0,0.5)",
    }}>
      <div style={{ width:40, height:4, borderRadius:99, background:"rgba(255,255,255,0.2)", margin:"0 auto 20px" }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Enter Customer ID</div>
        <button onClick={onClose} style={{
          background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%",
          width:30, height:30, color:t.muted, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
        }}>{ICON_TIMES}</button>
      </div>
      <input
        className="manual-input"
        placeholder="e.g. GS-9982"
        value={val}
        onChange={e => setVal(e.target.value.toUpperCase())}
        autoFocus maxLength={12}
      />
      <div style={{ fontSize:11, color:t.muted, marginTop:8, marginBottom:12 }}>
        Try: {suggestions.join(` ${DOT} `)}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {suggestions.map(id => (
          <button key={id} onClick={() => setVal(id)} style={{
            background:"rgba(35,71,245,0.15)", border:"1px solid rgba(35,71,245,0.3)",
            borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:600,
            color:t.blueMid, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
          }}>{id}</button>
        ))}
      </div>
      <button
        onClick={() => val.trim() && onSubmit(val.trim())}
        disabled={!val.trim()}
        style={{
          width:"100%", padding:"15px", borderRadius:14,
          background:val.trim() ? t.blue : "rgba(255,255,255,0.1)",
          color:val.trim() ? "#fff" : t.muted,
          border:"none", fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:15,
          cursor:val.trim() ? "pointer" : "default", transition:"background 0.2s,color 0.2s",
        }}
      >
        Look Up Customer
      </button>
    </div>
  );
}

/* --- History Panel -------------------------------------------------------- */
const SCAN_HISTORY = [
  { id:1, name:"Suresh Kumar", initials:"SK", time:"10:45 AM", type:"Udhar", amount:`${RUPEE}450`,    color:t.orange, customerId:"GS-1155" },
  { id:2, name:"Priya Devi",   initials:"PD", time:"09:12 AM", type:"Jama",  amount:`+${RUPEE}1,200`,color:t.green,  customerId:"GS-4471" },
  { id:3, name:"Vikram Singh", initials:"VS", time:"Yesterday",type:"Udhar", amount:`${RUPEE}2,100`, color:t.orange, customerId:"GS-7730" },
];

function HistoryPanel({ onSelect, onClose }) {
  return (
    <div style={{
      position:"absolute", bottom:0, left:0, right:0, zIndex:150,
      background:"#111b44", borderRadius:"20px 20px 0 0",
      padding:"20px 16px 32px", border:"1px solid rgba(255,255,255,0.1)",
      animation:"fadeSlideUp 0.25s ease", boxShadow:"0 -8px 40px rgba(0,0,0,0.5)",
    }}>
      <div style={{ width:40, height:4, borderRadius:99, background:"rgba(255,255,255,0.2)", margin:"0 auto 16px" }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Recent Scans</div>
        <button onClick={onClose} style={{
          background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%",
          width:30, height:30, color:t.muted, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
        }}>{ICON_TIMES}</button>
      </div>
      {SCAN_HISTORY.map(item => (
        <div key={item.id} className="history-row" onClick={() => onSelect(item.customerId)}>
          <div style={{
            width:40, height:40, borderRadius:"50%",
            background:"rgba(255,255,255,0.08)", color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize:13, flexShrink:0,
          }}>{item.initials}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>{item.name}</div>
            <div style={{ fontSize:11, color:t.muted, marginTop:1 }}>{item.type} | {item.time}</div>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:item.color, fontFamily:"'JetBrains Mono',monospace" }}>
            {item.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

/* --- Bottom Nav ----------------------------------------------------------- */
const NAV_ITEMS = [
  { id:"home",      label:"HOME"      },
  { id:"customers", label:"CUSTOMERS" },
  { id:"scan",      label:"SCAN"      },
  { id:"settings",  label:"SETTINGS"  },
];
function NavIcon({ id, color }) {
  const s = { stroke:color || "currentColor", strokeWidth:"1.8", strokeLinecap:"round", strokeLinejoin:"round" };
  switch(id) {
    case "home": return <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M3 12L12 3l9 9" {...s}/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" {...s}/></svg>;
    case "scan": return <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" {...s}/><rect x="14" y="3" width="7" height="7" rx="1" {...s}/><rect x="3" y="14" width="7" height="7" rx="1" {...s}/><rect x="14" y="14" width="7" height="7" rx="1" {...s}/></svg>;
    case "customers": return <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4" {...s}/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" {...s}/><path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" {...s}/></svg>;
    case "settings": return <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" {...s}/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" {...s}/></svg>;
    default: return null;
  }
}
function BottomNav({ active = "scan" }) {
  return (
    <nav style={{ background:t.navBg, borderTop:`1px solid ${t.navBorder}`, display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom)" }}>
      {NAV_ITEMS.map(item => (
        <button key={item.id} className="nav-btn" style={{ color:active===item.id?"#fff":"rgba(255,255,255,0.35)" }}>
          <NavIcon id={item.id} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

/* --- Torch Button --------------------------------------------------------- */
function TorchButton({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      background:on?"rgba(245,166,35,0.25)":t.bgCard,
      border:`1px solid ${on?"rgba(245,166,35,0.5)":t.border}`,
      borderRadius:14, padding:"16px 0", flex:1,
      display:"flex", flexDirection:"column", alignItems:"center", gap:8,
      cursor:"pointer", transition:"background 0.2s,border-color 0.2s", fontFamily:"'Sora',sans-serif",
    }}>
      <div style={{
        width:42, height:42, background:on?"rgba(245,166,35,0.2)":"rgba(255,255,255,0.08)",
        borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <path d="M17 10h2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2m5-4v8m0-8l-3 3m3-3l3 3"
            stroke={on?t.yellow:"rgba(255,255,255,0.7)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span style={{ fontSize:13, fontWeight:600, color:on?t.yellow:"rgba(255,255,255,0.7)" }}>
        {on?"Torch On":"Flashlight"}
      </span>
    </button>
  );
}

/* ==========================================================================
   CUSTOMER PROFILE SCREEN
========================================================================== */
function ScoreRing({ score, max, size=80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? t.green : pct >= 45 ? t.yellow : t.red;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.profileBorder} strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ - (score/max)*circ}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition:"stroke-dashoffset 1s cubic-bezier(.22,1,.36,1) 0.3s" }}
      />
      <text x={size/2} y={size/2-5} textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:size*0.22, fontWeight:800, fill:t.profileText }}>{score}</text>
      <text x={size/2} y={size/2+14} textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily:"'Sora',sans-serif", fontSize:size*0.12, fontWeight:500, fill:t.profileMuted }}>/{max}</text>
    </svg>
  );
}

function ScoreBar({ label, score, max, delay=0 }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => { const id = setTimeout(() => setFilled(true), delay + 300); return () => clearTimeout(id); }, [delay]);
  const pct = Math.round((score/max)*100);
  const color = pct >= 70 ? t.green : pct >= 45 ? t.yellow : t.red;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize:12, color:t.profileText, fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{score}/{max}</span>
      </div>
      <div style={{ height:5, background:t.profileBorder, borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", background:color, borderRadius:99, width:filled?`${pct}%`:"0%", transition:"width 0.8s cubic-bezier(.22,1,.36,1)" }} />
      </div>
    </div>
  );
}

function TxnIcon({ type, synced }) {
  const bg    = type==="udhar" ? t.orangePale : t.greenPale;
  const color = type==="udhar" ? t.orange     : t.green;
  return (
    <div style={{ width:42, height:42, borderRadius:12, background:bg, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        {type==="udhar"
          ? <path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          : <path d="M12 5v14M19 12l-7 7-7-7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>}
      </svg>
      {!synced && <div style={{ position:"absolute", top:-3, right:-3, width:12, height:12, borderRadius:"50%", background:t.yellow, border:"2px solid #fff" }} />}
    </div>
  );
}

function CustomerProfile({ customer, transactions, onBack }) {
  const [filter, setFilter] = useState("All");
  const [sheet, setSheet]   = useState(null);
  const [shown, setShown]   = useState(false);
  const trust = trustInfo(customer.gramScore, customer.maxScore);

  useEffect(() => { const id = setTimeout(() => setShown(true), 60); return () => clearTimeout(id); }, []);

  const filtered = transactions.filter(tx => {
    if (filter === "All")     return true;
    if (filter === "Udhar")   return tx.type === "udhar";
    if (filter === "Jama")    return tx.type === "jama";
    if (filter === "Pending") return !tx.synced;
    return true;
  });
  const groups = filtered.reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx); return acc;
  }, {});

  const isUdhar = customer.balanceType === "udhar";

  return (
    <>
      <div style={{
        width:"100%", maxWidth:420, minHeight:"100dvh",
        background:t.profileBg, display:"flex", flexDirection:"column",
        margin:"0 auto", fontFamily:"'Sora',sans-serif",
        animation:"profileSlide 0.38s cubic-bezier(.22,1,.36,1)",
        opacity:shown?1:0, transition:"opacity 0.25s ease",
      }}>

        {/* Topbar */}
        <div style={{
          background:"#fff", padding:"14px 16px",
          display:"flex", alignItems:"center", gap:12,
          borderBottom:`1px solid ${t.profileBorder}`,
          position:"sticky", top:0, zIndex:50,
        }}>
          <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", flexShrink:0, padding:4 }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke={t.profileText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:t.profileText }}>{customer.name}</div>
            <div style={{ fontSize:11, color:t.profileMuted }}>Customer since {customer.since}</div>
          </div>
          <button onClick={() => window.open(`tel:${customer.phone}`)} style={{ background:"none", border:"none", cursor:"pointer", padding:6 }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.86 12 19.79 19.79 0 01.77 3.38 2 2 0 012.76 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.72 6.72l1.08-1.08a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                stroke={t.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>

          {/* Trust Banner - key section for shopkeeper */}
          <div style={{
            margin:"12px 16px 0",
            background:trust.color===t.red?"rgba(232,48,74,0.08)":trust.color===t.yellow?"rgba(245,166,35,0.08)":"rgba(11,175,96,0.08)",
            border:`1.5px solid ${trust.color}44`,
            borderRadius:14, padding:"12px 16px",
            display:"flex", alignItems:"center", gap:12,
            animation:"staggerIn 0.4s ease 0.1s both",
          }}>
            <div style={{
              width:42, height:42, borderRadius:12,
              background:trust.color===t.red?t.redPale:trust.color===t.yellow?t.yellowPale:t.greenPale,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, flexShrink:0,
            }}>
              {trust.color===t.red?ICON_WARN:trust.color===t.yellow?ICON_TIP:ICON_OK}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:trust.color }}>{trust.label}</div>
              <div style={{ fontSize:11, color:t.profileMuted, marginTop:2, lineHeight:1.4 }}>
                {trust.color===t.red
                  ? "Do not extend new credit. High outstanding balance."
                  : trust.color===t.yellow
                  ? "Use caution. Check balance before extending credit."
                  : "Trustworthy customer. Good repayment history."}
              </div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:18, fontWeight:800, color:trust.color, fontFamily:"'JetBrains Mono',monospace" }}>
                {customer.gramScore}
              </div>
              <div style={{ fontSize:10, color:t.profileMuted }}>/900</div>
            </div>
          </div>

          {/* Balance Hero */}
          <div style={{
            background:isUdhar
              ? `linear-gradient(135deg,#1a38e8 0%,#3a5bff 100%)`
              : `linear-gradient(135deg,#098F4E 0%,#0BAF60 100%)`,
            margin:"12px 0 0", padding:"20px 20px 24px",
            color:"#fff", position:"relative", overflow:"hidden",
          }}>
            <div style={{ position:"absolute", right:-20, top:-30, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
            <div style={{ position:"absolute", right:40, bottom:-40, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, opacity:0.75, letterSpacing:"0.07em", textTransform:"uppercase" }}>Outstanding Balance</div>
                <div style={{ fontSize:32, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", marginTop:2, animation:"balanceCount 0.4s ease" }}>
                  {RUPEE}{customer.balance.toLocaleString("en-IN")}.00
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.18)", borderRadius:12, padding:"6px 14px", fontSize:12, fontWeight:700 }}>
                {isUdhar?"UDHAR":"JAMA"}
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              {[
            { label:"Total Udhar",   value:`${RUPEE}${customer.totalUdhar.toLocaleString("en-IN")}` },
            { label:"Total Jama",    value:`${RUPEE}${customer.totalJama.toLocaleString("en-IN")}` },
            { label:"Credit Limit",  value:`${RUPEE}${customer.creditLimit.toLocaleString("en-IN")}` },
              ].map((s,i) => (
                <div key={i} style={{ flex:1, background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"8px 10px" }}>
                  <div style={{ fontSize:9, opacity:0.7, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{s.label}</div>
                  <div style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display:"flex", gap:8, padding:"16px", background:"#fff", borderBottom:`1px solid ${t.profileBorder}` }}>
            {[
              { label:"Give Credit",  color:t.orange,  bg:t.orangePale,   icon:ARROW_UP,   onClick:() => alert(`Give Credit ${EM_DASH} connect to Keypad screen`) },
              { label:"Accept Pymt", color:t.green,   bg:t.greenPale,    icon:ARROW_DOWN, onClick:() => alert(`Accept Payment ${EM_DASH} connect to Keypad screen`) },
              { label:"Reminder",    color:t.blue,    bg:t.bluePale,     icon:ICON_BELL,  onClick:() => setSheet("reminder") },
              { label:"Gram Score",  color:"#7C3AED", bg:"#F3EEFF",      icon:ICON_CHART, onClick:() => setSheet("score") },
            ].map((a,i) => (
              <button key={i} className="action-fab" onClick={a.onClick} style={{ flex:1, color:a.color }}>
                <div className="action-fab-circle" style={{ background:a.bg }}>
                  <span style={{ fontSize:20 }}>{a.icon}</span>
                </div>
                <span style={{ fontSize:10, color:a.color }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Transactions */}
          <div style={{ background:"#fff" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px 0" }}>
              <div style={{ fontSize:15, fontWeight:700, color:t.profileText }}>Transaction History</div>
              <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:t.blue, fontFamily:"'Sora',sans-serif" }}>
                Download PDF
              </button>
            </div>
            <div style={{ display:"flex", gap:8, padding:"14px 16px 10px", overflowX:"auto", scrollbarWidth:"none" }}>
              {["All","Udhar","Jama","Pending"].map(chip => (
                <button key={chip} className="filter-chip" onClick={() => setFilter(chip)} style={{
                  background:filter===chip?t.blue:"#fff",
                  color:filter===chip?"#fff":t.profileMuted,
                  borderColor:filter===chip?t.blue:t.profileBorder,
                }}>{chip}</button>
              ))}
            </div>
          </div>

          <div style={{ padding:"0 16px 120px" }}>
            {Object.entries(groups).map(([date, txns]) => (
              <div key={date} style={{ marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:t.profileMuted, letterSpacing:"0.06em", textTransform:"uppercase", padding:"10px 0 8px" }}>
                  {date}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {txns.map((tx,i) => {
                    const isU = tx.type==="udhar";
                    return (
                      <div key={tx.id} className="txn-row" onClick={() => setSheet(tx)} style={{ animationDelay:`${i*50}ms` }}>
                        <TxnIcon type={tx.type} synced={tx.synced}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:t.profileText }}>{tx.label}</div>
                          <div style={{ fontSize:11, color:t.profileMuted, marginTop:1 }}>{tx.time}{tx.note?` | ${tx.note}`:""}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:14, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:isU?t.orange:t.green }}>
                            {isU?"-":"+"}{RUPEE}{tx.amount.toLocaleString("en-IN")}
                          </div>
                          <div style={{ fontSize:10, fontWeight:600, color:tx.synced?t.green:t.yellow, marginTop:2 }}>
                            {tx.synced?`${ICON_CHECK} SYNCED`:`${ICON_HOURGLASS} PENDING`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length===0 && (
              <div style={{ textAlign:"center", padding:"40px 0", color:t.profileMuted, fontSize:13 }}>No transactions found</div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          position:"sticky", bottom:0, background:"#fff",
          borderTop:`1px solid ${t.profileBorder}`,
          padding:"12px 16px calc(16px + env(safe-area-inset-bottom))",
          display:"flex", gap:12,
        }}>
          <button className="primary-btn" style={{ background:t.red, color:"#fff", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
            onClick={() => alert("Give Credit")}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.8"/><path d="M8 12h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
            Give Credit
          </button>
          <button className="primary-btn" style={{ background:t.green, color:"#fff", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
            onClick={() => alert("Accept Payment")}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.8"/><path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
            Accept Payment
          </button>
        </div>

        {/* Sheets */}
        {sheet==="score" && (
          <div className="sheet-overlay" onClick={() => setSheet(null)}>
            <div className="sheet-body" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle"/>
              <div style={{ fontSize:16, fontWeight:700, color:t.profileText, marginBottom:4 }}>Gram Score Breakdown</div>
              <div style={{ fontSize:12, color:t.profileMuted, marginBottom:18 }}>Trust score based on payment behaviour across the GramSync network.</div>
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
                <ScoreRing score={customer.gramScore} max={customer.maxScore} size={90} />
                <div>
                  <div style={{ fontSize:24, fontWeight:800, color:trust.color, fontFamily:"'JetBrains Mono',monospace" }}>
                    {customer.gramScore}<span style={{ fontSize:14, color:t.profileMuted }}>/{customer.maxScore}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:trust.color, marginTop:4 }}>{trust.label}</div>
                  <div style={{ fontSize:11, color:t.profileMuted, marginTop:2 }}>Updated today</div>
                </div>
              </div>
              {SCORE_BREAKDOWN.map((b,i) => <ScoreBar key={i} label={b.label} score={b.score} max={b.max} delay={i*100}/>)}
              <div style={{ background:t.bluePale, borderRadius:12, padding:"12px 14px", fontSize:11, color:t.blue, lineHeight:1.6 }}>
                i Score reflects payment behaviour across the GramSync merchant network. Range: 300 (poor) - 900 (excellent).
              </div>
            </div>
          </div>
        )}
        {sheet==="reminder" && (
          <div className="sheet-overlay" onClick={() => setSheet(null)}>
            <div className="sheet-body" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle"/>
              <div style={{ fontSize:16, fontWeight:700, color:t.profileText, marginBottom:4 }}>Send Payment Reminder</div>
              <div style={{ fontSize:12, color:t.profileMuted, marginBottom:16 }}>
                to <strong style={{ color:t.profileText }}>{customer.name}</strong> {EM_DASH} Balance: <strong style={{ color:t.orange }}>{RUPEE}{customer.balance.toLocaleString("en-IN")}</strong>
              </div>
              <button className="primary-btn" style={{ background:"#25D366", color:"#fff" }} onClick={() => { setSheet(null); alert("Reminder sent via WhatsApp"); }}>
                Send via WhatsApp
              </button>
              <button className="primary-btn" style={{ background:t.blue, color:"#fff", marginTop:10 }} onClick={() => { setSheet(null); alert("Reminder sent via SMS"); }}>
                Send via SMS
              </button>
            </div>
          </div>
        )}
        {sheet && typeof sheet === "object" && (
          <div className="sheet-overlay" onClick={() => setSheet(null)}>
            <div className="sheet-body" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle"/>
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ width:64, height:64, borderRadius:"50%", background:sheet.type==="udhar"?t.orangePale:t.greenPale, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    {sheet.type==="udhar"
                      ? <path d="M12 19V5M5 12l7-7 7 7" stroke={t.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      : <path d="M12 5v14M19 12l-7 7-7-7" stroke={t.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
                  </svg>
                </div>
                <div style={{ fontSize:28, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color:sheet.type==="udhar"?t.orange:t.green }}>
                  {sheet.type==="udhar"?"-":"+"}{RUPEE}{sheet.amount.toLocaleString("en-IN")}
                </div>
                <div style={{ fontSize:13, color:t.profileMuted, marginTop:4 }}>{sheet.label}</div>
              </div>
              {[
                { label:"Date", value:`${sheet.date} at ${sheet.time}` },
                { label:"Type", value:sheet.type==="udhar"?"Udhar (Credit Given)":"Jama (Payment Received)" },
                { label:"Sync", value:sheet.synced?"Synced to cloud":"Pending sync" },
                ...(sheet.note?[{ label:"Note", value:sheet.note }]:[]),
              ].map((row,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${t.profileBorder}` }}>
                  <span style={{ fontSize:13, color:t.profileMuted }}>{row.label}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:t.profileText }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ==========================================================================
   SCAN QR SCREEN
========================================================================== */
function ScanQRScreen({ onCustomerFound }) {
  const [scanning,   setScanning]   = useState(true);
  const [torchOn,    setTorchOn]    = useState(false);
  const [panel,      setPanel]      = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [cameraOn,   setCameraOn]   = useState(false);
  const [shown,      setShown]      = useState(false);
  const [camStatus,  setCamStatus]  = useState("idle"); // idle | requesting | denied | active | unsupported | no-camera | insecure
  const [imgStatus,  setImgStatus]  = useState("idle"); // idle | decoding | no-qr | error | loading
  const jsQRReady = useJsQR();
  const fileInputRef = useRef(null);
  const pendingFileRef = useRef(null);
  const decodedRef = useRef(false);

  useEffect(() => { const id = setTimeout(() => setShown(true), 60); return () => clearTimeout(id); }, []);

  const handleDecode = useCallback((raw) => {
    if (decodedRef.current) return;
    decodedRef.current = true;
    setCameraOn(false);
    setScanning(false);
    setImgStatus("idle");
    const { customer } = lookupCustomer(raw);
    setScanResult(customer);
  }, []);

  const startCamera = useCallback(() => {
    if (!window.isSecureContext) {
      setCamStatus("insecure");
      return;
    }
    setCamStatus("requesting");
    setCameraOn(true);
    setImgStatus("idle");
    decodedRef.current = false;
  }, []);

  const handleCameraActive = useCallback(() => {
    setCamStatus("active");
  }, []);

  const handleCameraError = useCallback((err) => {
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setCamStatus("denied");
    } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      setCamStatus("no-camera");
    } else if (name === "NotSupportedError") {
      setCamStatus("unsupported");
    } else {
      setCamStatus("unsupported");
    }
    setCameraOn(false);
  }, []);

  const handleManualSubmit = useCallback((id) => {
    const { customer } = lookupCustomer(id);
    setScanResult(customer);
    setPanel(null);
    setScanning(false);
  }, []);

  const handleHistorySelect = useCallback((customerId) => {
    const { customer } = lookupCustomer(customerId);
    setScanResult(customer);
    setPanel(null);
    setScanning(false);
  }, []);

  const handleViewProfile = useCallback(() => {
    onCustomerFound(scanResult);
  }, [scanResult, onCustomerFound]);

  const handleScanAgain = useCallback(() => {
    setScanResult(null);
    setScanning(true);
    setCameraOn(false);
    decodedRef.current = false;
    setCamStatus("idle");
    setImgStatus("idle");
  }, []);

  const decodeImageFile = useCallback((file, inputEl) => {
    setImgStatus("decoding");
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const maxDim = 1280;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!window.jsQR) {
          setImgStatus("error");
          return;
        }
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code) {
          handleDecode(code.data);
        } else {
          setImgStatus("no-qr");
        }
      } catch (err) {
        setImgStatus("error");
      } finally {
        URL.revokeObjectURL(url);
        if (inputEl) inputEl.value = "";
      }
    };
    img.onerror = () => {
      setImgStatus("error");
      URL.revokeObjectURL(url);
      if (inputEl) inputEl.value = "";
    };
    img.src = url;
  }, [handleDecode]);

  const handlePickImage = useCallback(() => {
    setImgStatus("idle");
    if (!jsQRReady) setImgStatus("loading");
    setCamStatus("idle");
    setCameraOn(false);
    fileInputRef.current?.click();
  }, [jsQRReady]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!jsQRReady) {
      pendingFileRef.current = file;
      setImgStatus("loading");
      return;
    }
    decodeImageFile(file, e.target);
  }, [decodeImageFile, jsQRReady]);

  useEffect(() => {
    if (jsQRReady && pendingFileRef.current) {
      const file = pendingFileRef.current;
      pendingFileRef.current = null;
      decodeImageFile(file, fileInputRef.current);
    }
  }, [decodeImageFile, jsQRReady]);

  return (
    <div style={{
      width:"100%", maxWidth:420, minHeight:"100dvh",
      background:t.bg, display:"flex", flexDirection:"column",
      margin:"0 auto", position:"relative", fontFamily:"'Sora',sans-serif",
      overflow:"hidden",
    }}>
      {/* Topbar */}
      <div style={{
        padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between",
        opacity:shown?1:0, transition:"opacity 0.3s ease",
      }}>
        <div style={{ width:38, height:38 }} />
        <span style={{ fontSize:18, fontWeight:700, color:"#fff" }}>Scan Customer QR</span>
        <button style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"#fff", width:38, height:38, borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="2" fill="#fff" opacity="0.8"/>
            <circle cx="19" cy="12" r="2" fill="#fff" opacity="0.8"/>
            <circle cx="5"  cy="12" r="2" fill="#fff" opacity="0.8"/>
          </svg>
        </button>
      </div>

      {/* Camera area */}
      <div style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"10px 20px 20px",
        opacity:shown?1:0, transition:"opacity 0.4s ease 0.1s",
      }}>
        {/* Status pill */}
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          background:"rgba(255,255,255,0.08)", borderRadius:99, padding:"5px 14px",
          marginBottom:28, border:`1px solid ${t.border}`,
        }}>
          {camStatus==="requesting" ? (
            <>
              <div style={{ width:7, height:7, borderRadius:"50%", background:t.yellow, boxShadow:`0 0 6px ${t.yellow}` }} />
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Requesting Camera</span>
            </>
          ) : camStatus==="denied" ? (
            <>
              <div style={{ width:7, height:7, borderRadius:"50%", background:t.red }} />
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Camera Denied</span>
            </>
          ) : camStatus==="insecure" ? (
            <>
              <div style={{ width:7, height:7, borderRadius:"50%", background:t.orange }} />
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>HTTPS Required</span>
            </>
          ) : camStatus==="no-camera" ? (
            <>
              <div style={{ width:7, height:7, borderRadius:"50%", background:t.red }} />
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>No Camera Found</span>
            </>
          ) : camStatus==="unsupported" ? (
            <>
              <div style={{ width:7, height:7, borderRadius:"50%", background:t.red }} />
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Camera Unsupported</span>
            </>
          ) : cameraOn ? (
            <>
              <div style={{ width:7, height:7, borderRadius:"50%", background:t.green, boxShadow:`0 0 6px ${t.green}` }} />
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Camera Active</span>
            </>
          ) : scanning ? (
            <>
              <div style={{ width:7, height:7, borderRadius:"50%", background:t.blue, boxShadow:`0 0 6px ${t.blue}` }} />
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Ready to Scan</span>
            </>
          ) : (
            <>
              <div style={{ width:7, height:7, borderRadius:"50%", background:t.green }} />
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Scan Complete</span>
            </>
          )}
        </div>

        {/* Camera viewport */}
        <div style={{ width:264, height:248, position:"relative", margin:"0 auto" }}>
          {cameraOn ? (
            <>
              <CameraView
                onDecode={handleDecode}
                active={cameraOn}
                onActive={handleCameraActive}
                onError={handleCameraError}
              />
              {/* Corner overlays on top of camera */}
              {[
                { top:0,    left:0,    borderWidth:"3px 0 0 3px",  borderRadius:"5px 0 0 0" },
                { top:0,    right:0,   borderWidth:"3px 3px 0 0",  borderRadius:"0 5px 0 0" },
                { bottom:0, left:0,    borderWidth:"0 0 3px 3px",  borderRadius:"0 0 0 5px" },
                { bottom:0, right:0,   borderWidth:"0 3px 3px 0",  borderRadius:"0 0 5px 0" },
              ].map((pos,i) => (
                <div key={i} style={{
                  position:"absolute", width:38, height:38, borderStyle:"solid",
                  borderColor:t.green, zIndex:2,
                  animation:`cornerPulse 1.8s ease-in-out infinite ${i*0.15}s`, ...pos,
                }} />
              ))}
              <div style={{
                position:"absolute", left:10, right:10, height:2,
                background:`linear-gradient(90deg,transparent,${t.green},#00ff88,${t.green},transparent)`,
                animation:"scanLine 1.5s linear infinite", borderRadius:99, zIndex:2,
                boxShadow:`0 0 12px ${t.green}`,
              }} />
            </>
          ) : (
            <ScanFrame scanning={scanning} />
          )}
        </div>

        <div style={{ marginTop:22, marginBottom:20, fontSize:13, color:t.muted, display:"flex", alignItems:"center", gap:6 }}>
          {imgStatus==="loading" ? (
            <span style={{ color:t.yellow, fontSize:12, textAlign:"center" }}>{`QR decoder loading${ELLIPSIS} try again in a moment.`}</span>
          ) : imgStatus==="decoding" ? (
            <span style={{ color:t.yellow, fontSize:12, textAlign:"center" }}>{`Reading QR from image${ELLIPSIS}`}</span>
          ) : imgStatus==="no-qr" ? (
            <span style={{ color:t.yellow, fontSize:12, textAlign:"center" }}>No QR found in that image. Try a clearer photo.</span>
          ) : imgStatus==="error" ? (
            <span style={{ color:t.yellow, fontSize:12, textAlign:"center" }}>Could not read that image.</span>
          ) : cameraOn ? (
            <>
              <div style={{ width:8, height:8, borderRadius:"50%", background:t.green, animation:"cornerPulse 1s infinite" }} />
              Point camera at customer's QR code
            </>
          ) : (
            <>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                <path d="M12 8v4m0 4h.01" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Tap Scan to open camera or Upload a QR image
            </>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display:"flex", gap:28, alignItems:"flex-start" }}>
          <button className="scan-action-btn" onClick={() => setPanel("history")}>
            <div className="scan-action-circle">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            History
          </button>

          <button className="scan-action-btn active-btn" onClick={startCamera}>
            <div className="scan-action-circle active-circle" style={cameraOn?{background:t.green,boxShadow:`0 4px 18px rgba(11,175,96,0.55)`}:{}}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="#fff" strokeWidth="1.8"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="#fff" strokeWidth="1.8"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="#fff" strokeWidth="1.8"/>
                <rect x="14" y="14" width="3" height="3" fill="#fff" rx="0.5"/>
                <rect x="18" y="14" width="3" height="3" fill="#fff" rx="0.5"/>
                <rect x="14" y="18" width="3" height="3" fill="#fff" rx="0.5"/>
                <rect x="18" y="18" width="3" height="3" fill="#fff" rx="0.5"/>
              </svg>
            </div>
            {cameraOn?`Scanning${ELLIPSIS}`:"Scan"}
          </button>

          <button className="scan-action-btn" onClick={handlePickImage}>
            <div className="scan-action-circle">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8"/>
                <path d="M9 11l2.2 2.2L15.5 9" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Upload
          </button>
        </div>
      </div>

      {/* Extra Actions */}
      <div style={{
        display:"flex", margin:"0 16px 16px",
        background:"rgba(255,255,255,0.05)", borderRadius:16,
        border:`1px solid ${t.border}`, overflow:"hidden",
        opacity:shown?1:0, transform:shown?"translateY(0)":"translateY(10px)",
        transition:"opacity 0.35s ease 0.2s,transform 0.35s ease 0.2s",
      }}>
        <TorchButton on={torchOn} onToggle={() => setTorchOn(v => !v)} />
        <div style={{ width:1, background:t.border }} />
        <button className="extra-btn" onClick={() => setPanel("manual")} style={{ borderRadius:0 }}>
          <div style={{ width:42, height:42, background:"rgba(255,255,255,0.08)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8"/>
              <path d="M8 10h8M8 14h5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Enter ID Manually</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display:"none" }}
        onChange={handleFileChange}
      />

      <BottomNav active="scan" />

      {/* Demo hint */}
      <div style={{
        position:"absolute", top:72, left:0, right:0,
        display:"flex", justifyContent:"center",
        pointerEvents:"none",
        opacity:shown?1:0, transition:"opacity 0.5s ease 0.8s",
      }}>
        <div style={{
          background:"rgba(35,71,245,0.25)", border:"1px solid rgba(35,71,245,0.4)",
          borderRadius:99, padding:"5px 14px", fontSize:11, color:"rgba(255,255,255,0.7)",
          backdropFilter:"blur(8px)",
        }}>
          {ICON_TIP} Demo: Try manual entry or history to see a profile
        </div>
      </div>

      {/* Overlays */}
      {scanResult && (
        <SuccessOverlay
          customer={scanResult}
          onViewProfile={handleViewProfile}
          onCancel={handleScanAgain}
        />
      )}
      {panel === "manual" && (
        <ManualPanel onSubmit={handleManualSubmit} onClose={() => setPanel(null)} />
      )}
      {panel === "history" && (
        <HistoryPanel onSelect={handleHistorySelect} onClose={() => setPanel(null)} />
      )}
      {panel && (
        <div onClick={() => setPanel(null)} style={{ position:"absolute", inset:0, zIndex:140, background:"rgba(0,0,0,0.5)" }} />
      )}
    </div>
  );
}

/* ==========================================================================
   ROOT APP - routes between ScanQR and CustomerProfile
========================================================================== */
export default function App() {
  const [screen, setScreen] = useState("scan"); // "scan" | "profile"
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [activeTransactions, setActiveTransactions] = useState([]);

  const handleCustomerFound = useCallback((customer) => {
    const { transactions } = lookupCustomer(customer.id);
    setActiveCustomer(customer);
    setActiveTransactions(transactions);
    setScreen("profile");
  }, []);

  const handleBack = useCallback(() => {
    setScreen("scan");
    setActiveCustomer(null);
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ width:"100%", minHeight:"100dvh", background:t.bg, display:"flex", justifyContent:"center" }}>
        {screen === "scan" ? (
          <ScanQRScreen onCustomerFound={handleCustomerFound} />
        ) : (
          <CustomerProfile
            customer={activeCustomer}
            transactions={activeTransactions}
            onBack={handleBack}
          />
        )}
      </div>
    </>
  );
}

