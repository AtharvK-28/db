// TransactionDetail.jsx
// GramSync Merchant App - Transaction Detail & Receipt Screen
//
// Features:
//   - Hero receipt card with animated entrance (type-coloured gradient)
//   - Inline edit mode - amount, description, note, category tag
//   - Status badge: Synced / Pending / Failed with sync action
//   - Mark as Paid (converts Udhar->Jama partial payment flow)
//   - Mark as Disputed (adds flag + note prompt)
//   - Share Receipt: WhatsApp text receipt / PDF stub
//   - Delete with two-step confirmation
//   - Full audit trail - created, edited, synced timestamps
//   - Related transactions mini-list for same customer
//
// Deps: pure React, no external libraries

import { useState, useEffect, useCallback, useRef } from "react";

// --- Design tokens ------------------------------------------------
const t = {
  blue:        "#2347F5",
  blueMid:     "#3A5BFF",
  bluePale:    "#EEF1FF",
  green:       "#0BAF60",
  greenPale:   "#E6F9F0",
  greenDark:   "#098F4E",
  orange:      "#F56A00",
  orangePale:  "#FFF0E5",
  orangeDark:  "#C45500",
  red:         "#E8304A",
  redPale:     "#FFEBEE",
  yellow:      "#F5A623",
  yellowPale:  "#FFF8E5",
  purple:      "#7C3AED",
  purplePale:  "#F3EEFF",
  bg:          "#F0F2F8",
  card:        "#FFFFFF",
  text:        "#0D1226",
  muted:       "#7A85A3",
  border:      "#E2E6F3",
};

const RUPEE = "\u20B9";
const EM_DASH = "\u2014";
const ELLIPSIS = "\u2026";
const ICON_FLAG = "\u2691";
const ICON_CHECK = "\u2713";
const ICON_HOURGLASS = "\u23F3";
const ICON_CHAT = "\u{1F4AC}";
const ICON_CLIPBOARD = "\u{1F4CB}";
const ICON_PDF = "\u{1F4C4}";
const ICON_TIMES = "\u00D7";
// --- Sample default transaction -----------------------------------
const DEFAULT_TRANSACTION = {
  id:          "TXN-28441",
  type:        "udhar",
  amount:      950,
  description: "Bulk Grain Purchase",
  note:        "",
  category:    "groceries",
  status:      "pending",
  synced:      false,
  disputed:    false,
  paid:        false,
  customer: {
    name:     "Rajesh Kumar",
    phone:    "+91 98765 43210",
    initials: "RK",
    id:       "GS-9982",
  },
  store:       "Sharma Kirana Store",
  storeId:     "GS-ST-4421",
  createdAt:   "Today, 10:45 AM",
  editedAt:    null,
  syncedAt:    null,
};

const RELATED_TXN = [
  { id:"TXN-28200", type:"jama",  amount:200,  label:"Payment Received",  time:"Today, 08:20 AM",  synced:true  },
  { id:"TXN-28100", type:"udhar", amount:500,  label:"Grocery Items",      time:"Yesterday, 6:00 PM", synced:true },
  { id:"TXN-27900", type:"jama",  amount:750,  label:"Partial Payment",    time:"12 Oct, 11:30 AM", synced:true  },
];

const CATEGORIES = [
  { id:"groceries",   label:"Groceries",  color:t.green  },
  { id:"dairy",       label:"Dairy",      color:"#0284C7"},
  { id:"grains",      label:"Grains",     color:t.orange },
  { id:"vegetables",  label:"Vegetables", color:"#16A34A"},
  { id:"household",   label:"Household",  color:t.purple },
  { id:"electronics", label:"Electronics",color:t.blue   },
  { id:"other",       label:"Other",      color:t.muted  },
];

// --- Global CSS ---------------------------------------------------
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  body { background:#F0F2F8; font-family:'Sora',sans-serif; }
  ::-webkit-scrollbar { display:none; }

  @keyframes heroReveal {
    0%   { opacity:0; transform:translateY(20px) scale(0.96); }
    70%  { transform:translateY(-3px) scale(1.01); }
    100% { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes fadeSlideUp {
    from { opacity:0; transform:translateY(12px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes paidPop {
    0%   { transform:scale(0.5) rotate(-8deg); opacity:0; }
    65%  { transform:scale(1.12) rotate(2deg); opacity:1; }
    100% { transform:scale(1) rotate(0deg); opacity:1; }
  }
  @keyframes shake {
    0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)}
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @keyframes receiptTear {
    0%   { transform:scaleX(0); }
    100% { transform:scaleX(1); }
  }

  .edit-input {
    background:#FAFBFF; border:2px solid #E2E6F3; border-radius:12px;
    padding:11px 14px; font-family:'Sora',sans-serif;
    font-size:14px; color:#0D1226; outline:none; width:100%;
    transition:border-color 0.15s, box-shadow 0.15s;
  }
  .edit-input:focus {
    border-color:#2347F5;
    box-shadow:0 0 0 3px rgba(35,71,245,0.10);
    background:#fff;
  }

  .action-row-btn {
    flex:1; padding:13px 8px; border-radius:14px;
    border:1.5px solid; background:none;
    font-family:'Sora',sans-serif; font-size:12px; font-weight:700;
    cursor:pointer; display:flex; flex-direction:column;
    align-items:center; gap:6px;
    transition:all 0.15s;
  }
  .action-row-btn:hover  { opacity:0.82; }
  .action-row-btn:active { transform:scale(0.94); }

  .detail-row {
    display:flex; align-items:flex-start;
    justify-content:space-between; padding:11px 0;
    border-bottom:1px solid #E2E6F3;
  }
  .detail-row:last-child { border-bottom:none; }

  .related-row {
    display:flex; align-items:center; gap:12px;
    padding:11px 16px; cursor:pointer;
    transition:background 0.12s; border-radius:12px;
  }
  .related-row:hover { background:#FAFBFF; }

  .sheet-overlay {
    position:fixed; inset:0; z-index:200;
    background:rgba(13,18,38,0.58);
    display:flex; align-items:flex-end;
    animation:fadeIn 0.18s ease;
  }
  .sheet-body {
    background:#fff; border-radius:22px 22px 0 0;
    width:100%; padding:24px 20px 36px;
    animation:fadeSlideUp 0.26s cubic-bezier(.22,1,.36,1);
    box-shadow:0 -8px 40px rgba(0,0,0,0.16);
  }
  .sheet-handle { width:38px; height:4px; border-radius:99px; background:#E2E6F3; margin:0 auto 20px; }

  .pill-btn {
    border:none; border-radius:99px; padding:8px 18px;
    font-family:'Sora',sans-serif; font-size:13px; font-weight:700;
    cursor:pointer; transition:transform 0.1s, filter 0.1s;
  }
  .pill-btn:active { transform:scale(0.95); filter:brightness(0.92); }

  .nav-btn {
    flex:1; display:flex; flex-direction:column; align-items:center;
    padding:10px 0 12px; gap:4px; cursor:pointer;
    border:none; background:none;
    font-family:'Sora',sans-serif; font-size:10px; font-weight:500;
    transition:color 0.15s;
  }

  .amount-edit-input {
    background:none; border:none; outline:none;
    font-family:'JetBrains Mono',monospace;
    font-size:42px; font-weight:800; color:#fff;
    text-align:center; width:100%;
    border-bottom:2px solid rgba(255,255,255,0.4);
    padding-bottom:4px;
  }
  .amount-edit-input::placeholder { color:rgba(255,255,255,0.4); }

  .category-chip {
    border-radius:99px; padding:6px 13px;
    font-family:'Sora',sans-serif; font-size:11px; font-weight:700;
    cursor:pointer; border:1.5px solid; transition:all 0.12s;
    background:none; white-space:nowrap;
  }
  .category-chip:active { transform:scale(0.94); }

  .receipt-dashes {
    height:1px;
    background: repeating-linear-gradient(
      to right, #E2E6F3 0px, #E2E6F3 6px, transparent 6px, transparent 12px
    );
  }
`;

// --- Sync status --------------------------------------------------
function SyncBadge({ synced, disputed, paid }) {
  if (disputed) return (
    <span style={{ background:"#FFF0E5", color:t.orange, borderRadius:6, fontSize:10, fontWeight:700, padding:"3px 8px", letterSpacing:"0.04em" }}>
      {ICON_FLAG} DISPUTED
    </span>
  );
  if (paid) return (
    <span style={{ background:t.greenPale, color:t.green, borderRadius:6, fontSize:10, fontWeight:700, padding:"3px 8px", letterSpacing:"0.04em" }}>
      {ICON_CHECK} PAID
    </span>
  );
  if (synced) return (
    <span style={{ background:t.greenPale, color:t.green, borderRadius:6, fontSize:10, fontWeight:700, padding:"3px 8px", letterSpacing:"0.04em" }}>
      {ICON_CHECK} SYNCED
    </span>
  );
  return (
    <span style={{ background:t.yellowPale, color:t.yellow, borderRadius:6, fontSize:10, fontWeight:700, padding:"3px 8px", letterSpacing:"0.04em", animation:"pulse 1.6s ease-in-out infinite" }}>
      {ICON_HOURGLASS} PENDING
    </span>
  );
}

// --- Hero receipt card --------------------------------------------
function HeroCard({ txn, editMode, onAmountChange, onDescChange }) {
  const isUdhar = txn.type === "udhar";
  const gradStart = isUdhar ? "#1a38e8" : "#098F4E";
  const gradEnd   = isUdhar ? "#3a5bff" : "#0BAF60";

  return (
    <div style={{
      margin:"16px", borderRadius:20,
      background:`linear-gradient(145deg, ${gradStart}, ${gradEnd})`,
      padding:"22px 22px 20px",
      position:"relative", overflow:"hidden",
      animation:"heroReveal 0.45s cubic-bezier(.22,1,.36,1) 0.05s both",
      boxShadow:`0 12px 36px ${isUdhar ? "rgba(35,71,245,0.3)" : "rgba(11,175,96,0.3)"}`,
    }}>
      {/* Decorative circles */}
      <div style={{ position:"absolute", right:-30, top:-35, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.07)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", left:-20, bottom:-40, width:110, height:110, borderRadius:"50%", background:"rgba(255,255,255,0.05)", pointerEvents:"none" }}/>

      {/* Disputed / Paid overlay stamp */}
      {(txn.disputed || txn.paid) && (
        <div style={{
          position:"absolute", top:14, right:14,
          background: txn.disputed ? "rgba(245,106,0,0.85)" : "rgba(11,175,96,0.85)",
          borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:800,
          color:"#fff", letterSpacing:"0.06em", textTransform:"uppercase",
          transform:"rotate(2deg)",
          animation:"paidPop 0.35s cubic-bezier(.22,1,.36,1)",
        }}>
          {txn.disputed ? `${ICON_FLAG} DISPUTED` : `${ICON_CHECK} PAID`}
        </div>
      )}

      {/* Type label */}
      <div style={{ fontSize:11, fontWeight:600, opacity:0.7, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>
        {isUdhar ? `Udhar ${EM_DASH} Credit Given` : `Jama ${EM_DASH} Payment Received`}
      </div>

      {/* Amount */}
      {editMode ? (
        <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:10 }}>
          <span style={{ fontSize:28, color:"rgba(255,255,255,0.7)", fontFamily:"'JetBrains Mono',monospace" }}>{RUPEE}</span>
          <input
            className="amount-edit-input"
            type="number"
            value={txn.amount}
            onChange={e => onAmountChange(Number(e.target.value) || 0)}
            placeholder="0"
            style={{ flex:1, textAlign:"left" }}
          />
        </div>
      ) : (
        <div style={{ fontSize:44, fontWeight:800, color:"#fff", fontFamily:"'JetBrains Mono',monospace", lineHeight:1, marginBottom:10 }}>
          {RUPEE}{txn.amount.toLocaleString("en-IN")}.00
        </div>
      )}

      {/* Description */}
      {editMode ? (
        <input
          className="edit-input"
          value={txn.description}
          onChange={e => onDescChange(e.target.value)}
          placeholder="Description"
          style={{ background:"rgba(255,255,255,0.18)", borderColor:"rgba(255,255,255,0.25)", color:"#fff", marginBottom:12 }}
        />
      ) : (
        <div style={{ fontSize:15, fontWeight:600, color:"rgba(255,255,255,0.9)", marginBottom:12 }}>
          {txn.description}
        </div>
      )}

      {/* Footer row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:28, height:28, borderRadius:"50%",
            background:"rgba(255,255,255,0.18)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:800, color:"#fff",
          }}>
            {txn.customer.initials}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{txn.customer.name}</div>
            <div style={{ fontSize:10, opacity:0.65 }}>{txn.customer.id}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, opacity:0.65, marginBottom:2 }}>{txn.createdAt}</div>
          <div style={{ fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", opacity:0.8 }}>#{txn.id}</div>
        </div>
      </div>
    </div>
  );
}

// --- Action Row ---------------------------------------------------
function ActionRow({ txn, onEdit, onShare, onReminder, onMarkPaid, onMarkDisputed }) {
  const actions = [
    {
      label: "Edit",
      color: t.blue,
      bg: t.bluePale,
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={t.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={t.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      onClick: onEdit,
    },
    {
      label: "Share",
      color: "#25D366",
      bg: "#F0FDF4",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#25D366" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      onClick: onShare,
    },
    {
      label: "Remind",
      color: t.orange,
      bg: t.orangePale,
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke={t.orange} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      onClick: onReminder,
    },
    {
      label: txn.paid ? "Unpay" : "Mark Paid",
      color: t.green,
      bg: t.greenPale,
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={t.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      onClick: onMarkPaid,
    },
  ];

  return (
    <div style={{ display:"flex", gap:8, padding:"0 16px 16px" }}>
      {actions.map((a, i) => (
        <button key={i} className="action-row-btn"
          style={{ borderColor: a.bg, color:a.color }}
          onClick={a.onClick}
        >
          <div style={{ width:36, height:36, borderRadius:10, background:a.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {a.icon}
          </div>
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

// --- Detail rows card ---------------------------------------------
function DetailCard({ txn, editMode, onNoteChange, onCategoryChange }) {
  const catObj = CATEGORIES.find(c => c.id === txn.category) || CATEGORIES[CATEGORIES.length - 1];

  const rows = [
    { label:"Transaction ID",  value:`#${txn.id}`,         mono:true  },
    { label:"Customer",        value:txn.customer.name,    mono:false },
    { label:"Phone",           value:txn.customer.phone,   mono:true  },
    { label:"Store",           value:txn.store,            mono:false },
    { label:"Type",            value:txn.type === "udhar" ? "Udhar (Credit Given)" : "Jama (Payment Received)", mono:false },
    { label:"Status",          value:null,                 component:<SyncBadge synced={txn.synced} disputed={txn.disputed} paid={txn.paid}/> },
    { label:"Created",         value:txn.createdAt,        mono:false },
    ...(txn.editedAt ? [{ label:"Last Edited", value:txn.editedAt, mono:false }] : []),
    ...(txn.syncedAt ? [{ label:"Synced At",   value:txn.syncedAt, mono:false }] : []),
  ];

  return (
    <div style={{ margin:"0 16px 14px", background:"#fff", borderRadius:16, padding:"0 16px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
      {rows.map((row, i) => (
        <div key={i} className="detail-row">
          <span style={{ fontSize:12, color:t.muted, fontWeight:500, flexShrink:0, paddingTop:2 }}>{row.label}</span>
          <div style={{ textAlign:"right", maxWidth:"60%" }}>
            {row.component || (
              <span style={{ fontSize:12, fontWeight:600, color:t.text, fontFamily: row.mono ? "'JetBrains Mono',monospace" : "'Sora',sans-serif", wordBreak:"break-all" }}>
                {row.value}
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Note field */}
      <div className="detail-row" style={{ flexDirection:"column", gap:8, paddingBottom:14 }}>
        <span style={{ fontSize:12, color:t.muted, fontWeight:500 }}>Note</span>
        {editMode ? (
          <input
            className="edit-input"
            value={txn.note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder={`Add a private note${ELLIPSIS}`}
          />
        ) : (
          <span style={{ fontSize:13, color: txn.note ? t.text : t.muted, fontStyle: txn.note ? "normal" : "italic" }}>
            {txn.note || "No note added"}
          </span>
        )}
      </div>

      {/* Category */}
      <div className="detail-row" style={{ flexDirection:"column", gap:8, paddingBottom:14, borderBottom:"none" }}>
        <span style={{ fontSize:12, color:t.muted, fontWeight:500 }}>Category</span>
        {editMode ? (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} className="category-chip"
                onClick={() => onCategoryChange(cat.id)}
                style={{
                  borderColor: txn.category === cat.id ? cat.color : t.border,
                  background:  txn.category === cat.id ? cat.color + "18" : "#fff",
                  color:       txn.category === cat.id ? cat.color : t.muted,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        ) : (
          <span style={{
            display:"inline-flex", alignItems:"center",
            background: catObj.color + "18", color:catObj.color,
            borderRadius:99, padding:"4px 12px", fontSize:12, fontWeight:700,
          }}>
            {catObj.label}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Share Sheet --------------------------------------------------
function ShareSheet({ txn, storeName, onClose }) {
  const isUdhar = txn.type === "udhar";

  const waText = `*GramSync Receipt*\n\n` +
    `*${isUdhar ? "Credit (Udhar)" : "Payment (Jama)"}*\n` +
    `Amount: ${RUPEE}${txn.amount.toLocaleString("en-IN")}\n` +
    `Description: ${txn.description}\n` +
    `Customer: ${txn.customer.name}\n` +
    `Store: ${storeName}\n` +
    `Date: ${txn.createdAt}\n` +
    `Ref: #${txn.id}\n\n` +
    `_Powered by GramSync | gramsync.in_`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(waText).catch(() => {});
    onClose();
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-body" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div style={{ fontSize:16, fontWeight:700, color:t.text, marginBottom:16 }}>Share Receipt</div>

        {/* Receipt preview */}
        <div style={{ background:"#F0FDF4", borderRadius:14, padding:"14px 16px", marginBottom:20, fontFamily:"monospace", fontSize:12, color:"#111", lineHeight:1.8, whiteSpace:"pre-line" }}>
          {waText}
        </div>

        {[
          { label:"Share via WhatsApp", bg:"#25D366", color:"#fff", shadow:"rgba(37,211,102,0.35)", icon:ICON_CHAT },
          { label:"Copy to Clipboard",  bg:t.bluePale, color:t.blue, shadow:null, icon:ICON_CLIPBOARD },
          { label:"Download PDF (stub)",bg:t.bg, color:t.muted, shadow:null, icon:ICON_PDF, disabled:true },
        ].map((opt, i) => (
          <button key={i} onClick={opt.disabled ? undefined : handleCopy} style={{
            width:"100%", padding:"14px 16px", borderRadius:14, border:"none",
            background:opt.bg, color:opt.color, marginBottom:10,
            fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:14,
            cursor: opt.disabled ? "default" : "pointer", opacity: opt.disabled ? 0.5 : 1,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            boxShadow: opt.shadow ? `0 4px 14px ${opt.shadow}` : "none",
            transition:"transform 0.1s, filter 0.1s",
          }}>
            <span style={{ fontSize:16 }}>{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Mark Paid Sheet ----------------------------------------------
function MarkPaidSheet({ txn, onConfirm, onClose }) {
  const [partial, setPartial] = useState(false);
  const [payAmount, setPayAmount] = useState(txn.amount);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-body" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{
            width:60, height:60, borderRadius:"50%", background:t.greenPale,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 12px",
          }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={t.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize:17, fontWeight:800, color:t.text, marginBottom:4 }}>Mark as Paid?</div>
          <div style={{ fontSize:13, color:t.muted, lineHeight:1.6 }}>
            This will record a Jama payment against this Udhar.<br/>
            Full amount: <strong style={{ color:t.text }}>{RUPEE}{txn.amount.toLocaleString("en-IN")}</strong>
          </div>
        </div>

        {/* Partial toggle */}
        <div style={{ background:t.bg, borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:t.text }}>Partial payment</div>
              <div style={{ fontSize:11, color:t.muted, marginTop:1 }}>Enter the amount received</div>
            </div>
            <button onClick={() => setPartial(p => !p)} style={{
              width:42, height:24, borderRadius:99, border:"none", cursor:"pointer",
              background: partial ? t.blue : "#D1D5E8", position:"relative", transition:"background 0.2s",
            }}>
              <div style={{
                position:"absolute", top:2, left: partial ? 20 : 2,
                width:20, height:20, borderRadius:"50%", background:"#fff",
                boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transition:"left 0.2s",
              }}/>
            </button>
          </div>
          {partial && (
            <div style={{ marginTop:10 }}>
              <input
                type="number"
                className="edit-input"
                value={payAmount}
                onChange={e => setPayAmount(Math.min(Number(e.target.value) || 0, txn.amount))}
                placeholder="Enter amount"
              />
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{
            flex:1, padding:14, borderRadius:12,
            background:t.bg, color:t.muted, border:`1.5px solid ${t.border}`,
            fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer",
          }}>Cancel</button>
          <button onClick={() => onConfirm(partial ? payAmount : txn.amount)} style={{
            flex:1, padding:14, borderRadius:12,
            background:t.green, color:"#fff", border:"none",
            fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer",
            boxShadow:"0 4px 14px rgba(11,175,96,0.3)",
          }}>Confirm Paid</button>
        </div>
      </div>
    </div>
  );
}

// --- Dispute Sheet ------------------------------------------------
function DisputeSheet({ txn, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const REASONS = ["Amount incorrect", "Already paid", "Item not received", "Duplicate entry", "Customer disputes", "Other"];

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-body" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{
            width:60, height:60, borderRadius:"50%", background:t.orangePale,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 12px",
          }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" stroke={t.orange} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize:17, fontWeight:800, color:t.text, marginBottom:4 }}>Mark as Disputed</div>
          <div style={{ fontSize:13, color:t.muted }}>Select a reason to flag this transaction</div>
        </div>

        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)} style={{
              border:`1.5px solid ${reason===r ? t.orange : t.border}`,
              background: reason===r ? t.orangePale : "#fff",
              borderRadius:99, padding:"7px 13px",
              fontFamily:"'Sora',sans-serif", fontSize:12, fontWeight:600,
              color: reason===r ? t.orange : t.muted, cursor:"pointer",
              transition:"all 0.12s",
            }}>{r}</button>
          ))}
        </div>

        <input
          className="edit-input"
          value={reason === "Other" || !REASONS.slice(0, -1).includes(reason) ? reason : ""}
          onChange={e => setReason(e.target.value)}
          placeholder={`Or type a custom reason${ELLIPSIS}`}
          style={{ marginBottom:16 }}
        />

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{
            flex:1, padding:14, borderRadius:12,
            background:t.bg, color:t.muted, border:`1.5px solid ${t.border}`,
            fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer",
          }}>Cancel</button>
          <button onClick={() => reason.trim() && onConfirm(reason)} disabled={!reason.trim()} style={{
            flex:1, padding:14, borderRadius:12,
            background: reason.trim() ? t.orange : t.border,
            color: reason.trim() ? "#fff" : t.muted,
            border:"none",
            fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:14,
            cursor: reason.trim() ? "pointer" : "default",
          }}>Flag Transaction</button>
        </div>
      </div>
    </div>
  );
}

// --- Delete Sheet -------------------------------------------------
function DeleteSheet({ txn, onConfirm, onClose }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-body" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{
            width:60, height:60, borderRadius:"50%", background:t.redPale,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 12px",
          }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke={t.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize:17, fontWeight:800, color:t.text, marginBottom:6 }}>Delete Transaction?</div>
          <div style={{ fontSize:13, color:t.muted, lineHeight:1.6 }}>
            <strong style={{ color:t.red }}>This cannot be undone.</strong> The transaction<br/>
            of <strong style={{ color:t.text }}>{RUPEE}{txn.amount.toLocaleString("en-IN")}</strong> will be permanently removed<br/>
            and the customer's balance will be recalculated.
          </div>
        </div>

        {/* Type to confirm */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, color:t.muted, marginBottom:8 }}>
            Type <strong style={{ fontFamily:"'JetBrains Mono',monospace", color:t.text }}>DELETE</strong> to confirm
          </div>
          <input
            className="edit-input"
            placeholder="DELETE"
            onChange={e => setConfirmed(e.target.value === "DELETE")}
            style={{ borderColor: confirmed ? t.red : t.border }}
          />
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{
            flex:1, padding:14, borderRadius:12,
            background:t.bg, color:t.muted, border:`1.5px solid ${t.border}`,
            fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer",
          }}>Cancel</button>
          <button onClick={() => confirmed && onConfirm()} disabled={!confirmed} style={{
            flex:1, padding:14, borderRadius:12,
            background: confirmed ? t.red : t.border,
            color: confirmed ? "#fff" : t.muted, border:"none",
            fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:14,
            cursor: confirmed ? "pointer" : "default",
            boxShadow: confirmed ? "0 4px 14px rgba(232,48,74,0.3)" : "none",
            transition:"all 0.2s",
          }}>Delete Forever</button>
        </div>
      </div>
    </div>
  );
}

// --- Related transactions -----------------------------------------
function RelatedTransactions({ transactions, customerName, onTxnPress }) {
  if (!transactions.length) return null;
  return (
    <div style={{ margin:"0 16px 20px" }}>
      <div style={{ fontSize:13, fontWeight:700, color:t.text, marginBottom:8 }}>
        Other transactions with {customerName.split(" ")[0]}
      </div>
      <div style={{ background:"#fff", borderRadius:14, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        {transactions.map((tx, i) => {
          const isUdhar = tx.type === "udhar";
          return (
            <div key={tx.id}>
              {i > 0 && <div style={{ height:1, background:t.border, margin:"0 16px" }}/>}
              <div className="related-row" onClick={() => onTxnPress(tx)}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background: isUdhar ? t.orangePale : t.greenPale,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    {isUdhar
                      ? <path d="M12 19V5M5 12l7-7 7 7" stroke={t.orange} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      : <path d="M12 5v14M19 12l-7 7-7-7" stroke={t.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>}
                  </svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:t.text }}>{tx.label}</div>
                  <div style={{ fontSize:11, color:t.muted, marginTop:1 }}>{tx.time}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:13, fontWeight:700, color: isUdhar ? t.orange : t.green, fontFamily:"'JetBrains Mono',monospace" }}>
                    {isUdhar ? "-" : "+"}{RUPEE}{tx.amount.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize:10, color: tx.synced ? t.green : t.yellow, marginTop:1, fontWeight:600 }}>
                    {tx.synced ? "SYNCED" : "PENDING"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Topbar -------------------------------------------------------
function Topbar({ editMode, onBack, onToggleEdit, onDelete }) {
  return (
    <div style={{
      background:"#fff", padding:"14px 16px",
      display:"flex", alignItems:"center", gap:10,
      borderBottom:`1px solid ${t.border}`,
      position:"sticky", top:0, zIndex:50,
    }}>
      <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", flexShrink:0 }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke={t.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:17, fontWeight:700, color:t.text }}>Transaction Detail</div>
        <div style={{ fontSize:11, color:t.muted, marginTop:1 }}>
          {editMode ? `Editing ${EM_DASH} tap fields to change` : "View & manage this entry"}
        </div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button
          onClick={onToggleEdit}
          style={{
            background: editMode ? t.green : t.bluePale, border:"none",
            borderRadius:10, padding:"7px 14px", cursor:"pointer",
            fontFamily:"'Sora',sans-serif", fontSize:12, fontWeight:700,
            color: editMode ? "#fff" : t.blue, transition:"all 0.15s",
          }}
        >
          {editMode ? "Save" : "Edit"}
        </button>
        <button onClick={onDelete} style={{
          background:t.redPale, border:"none", borderRadius:10,
          width:34, height:34, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke={t.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// --- Main Component -----------------------------------------------
/**
 * TransactionDetail
 *
 * Props:
 *  - transaction    {object}   Transaction data (defaults to sample)
 *  - storeName      {string}
 *  - relatedTxns    {array}    Other transactions with same customer
 *  - onBack         {fn}
 *  - onNavigate     {fn}
 *  - onUpdate       {(txn) => void}     Called when saved
 *  - onDelete       {(id) => void}      Called after delete confirm
 *  - onReminder     {(customer) => void}
 *  - onTxnPress     {(txn) => void}     Tap a related transaction
 */
export default function TransactionDetail({
  transaction  = DEFAULT_TRANSACTION,
  storeName    = "Sharma Kirana Store",
  relatedTxns  = RELATED_TXN,
  onBack       = () => {},
  onNavigate   = () => {},
  onUpdate     = () => {},
  onDelete     = () => {},
  onReminder   = () => {},
  onTxnPress   = () => {},
}) {
  const [txn,      setTxn]      = useState(transaction);
  const [editMode, setEditMode] = useState(false);
  const [sheet,    setSheet]    = useState(null); // null | "share" | "paid" | "dispute" | "delete"
  const [shown,    setShown]    = useState(false);

  useEffect(() => { const id = setTimeout(() => setShown(true), 60); return () => clearTimeout(id); }, []);

  const handleSave = useCallback(() => {
    const updated = { ...txn, editedAt: "Just now" };
    setTxn(updated);
    onUpdate(updated);
    setEditMode(false);
  }, [txn, onUpdate]);

  const handleToggleEdit = useCallback(() => {
    if (editMode) handleSave();
    else setEditMode(true);
  }, [editMode, handleSave]);

  const handleMarkPaid = useCallback((amount) => {
    setTxn(prev => ({ ...prev, paid:true, disputed:false, note: prev.note || `Marked paid: ${RUPEE}${amount.toLocaleString("en-IN")}` }));
    setSheet(null);
    onUpdate({ ...txn, paid:true });
  }, [txn, onUpdate]);

  const handleMarkDisputed = useCallback((reason) => {
    setTxn(prev => ({ ...prev, disputed:true, note: reason }));
    setSheet(null);
    onUpdate({ ...txn, disputed:true, note:reason });
  }, [txn, onUpdate]);

  const handleDelete = useCallback(() => {
    setSheet(null);
    onDelete(txn.id);
    onBack();
  }, [txn.id, onDelete, onBack]);

  const updateField = useCallback((field, value) => {
    setTxn(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{
        width:"100%", maxWidth:420, minHeight:"100vh",
        background:t.bg, display:"flex", flexDirection:"column",
        margin:"0 auto", fontFamily:"'Sora',sans-serif",
        opacity: shown ? 1 : 0, transition:"opacity 0.25s ease",
        position:"relative",
      }}>
        <Topbar
          editMode={editMode}
          onBack={onBack}
          onToggleEdit={handleToggleEdit}
          onDelete={() => setSheet("delete")}
        />

        <div style={{ flex:1, overflowY:"auto", paddingBottom:24 }}>
          {/* Hero */}
          <HeroCard
            txn={txn}
            editMode={editMode}
            onAmountChange={v => updateField("amount", v)}
            onDescChange={v => updateField("description", v)}
          />

          {/* Receipt tear line */}
          <div style={{ margin:"0 16px 14px", display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:14, height:14, borderRadius:"50%", background:t.bg, flexShrink:0, marginLeft:-22 }}/>
            <div className="receipt-dashes" style={{ flex:1, animation:"receiptTear 0.4s ease 0.3s both" }}/>
            <div style={{ width:14, height:14, borderRadius:"50%", background:t.bg, flexShrink:0, marginRight:-22 }}/>
          </div>

          {/* Quick actions */}
          <ActionRow
            txn={txn}
            onEdit={() => setEditMode(true)}
            onShare={() => setSheet("share")}
            onReminder={() => onReminder(txn.customer)}
            onMarkPaid={() => txn.paid ? setTxn(p => ({...p, paid:false})) : setSheet("paid")}
            onMarkDisputed={() => setSheet("dispute")}
          />

          {/* Disputed quick-dismiss if flagged */}
          {txn.disputed && (
            <div style={{
              margin:"0 16px 14px", background:t.orangePale, borderRadius:12,
              padding:"10px 14px", display:"flex", alignItems:"center", gap:10,
              animation:"fadeSlideUp 0.25s ease",
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" stroke={t.orange} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ flex:1, fontSize:12, color:t.orange, fontWeight:600 }}>
                Flagged: {txn.note || "Disputed"}
              </span>
              <button onClick={() => setTxn(p => ({...p, disputed:false, note:""}))} style={{
                background:"none", border:"none", cursor:"pointer", fontSize:16, color:t.orange, fontWeight:700,
              }}>{ICON_TIMES}</button>
            </div>
          )}

          {/* Detail rows */}
          <DetailCard
            txn={txn}
            editMode={editMode}
            onNoteChange={v => updateField("note", v)}
            onCategoryChange={v => updateField("category", v)}
          />

          {/* Sync status banner if pending */}
          {!txn.synced && (
            <div style={{
              margin:"0 16px 14px", background:"#fff", borderRadius:12,
              padding:"12px 14px", display:"flex", alignItems:"center", gap:10,
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
              animation:"fadeSlideUp 0.3s ease",
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ animation:"spin 2s linear infinite", flexShrink:0 }}>
                <path d="M4 12a8 8 0 018-8v2m8 6a8 8 0 01-8 8v-2" stroke={t.yellow} strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:t.text }}>Pending sync</div>
                <div style={{ fontSize:11, color:t.muted }}>Will upload when connected</div>
              </div>
              <button onClick={() => setTxn(p => ({...p, synced:true, syncedAt:"Just now"}))} style={{
                background:t.bluePale, border:"none", borderRadius:8, padding:"6px 12px",
                fontFamily:"'Sora',sans-serif", fontSize:11, fontWeight:700, color:t.blue, cursor:"pointer",
              }}>
                Retry
              </button>
            </div>
          )}

          {/* Related transactions */}
          <RelatedTransactions
            transactions={relatedTxns}
            customerName={txn.customer.name}
            onTxnPress={onTxnPress}
          />
        </div>

        {/* Sheets */}
        {sheet === "share"   && <ShareSheet   txn={txn} storeName={storeName} onClose={() => setSheet(null)}/>}
        {sheet === "paid"    && <MarkPaidSheet txn={txn} onConfirm={handleMarkPaid}    onClose={() => setSheet(null)}/>}
        {sheet === "dispute" && <DisputeSheet  txn={txn} onConfirm={handleMarkDisputed} onClose={() => setSheet(null)}/>}
        {sheet === "delete"  && <DeleteSheet   txn={txn} onConfirm={handleDelete}       onClose={() => setSheet(null)}/>}
      </div>
    </>
  );
}
