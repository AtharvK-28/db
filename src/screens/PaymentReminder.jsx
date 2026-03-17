// PaymentReminder.jsx
// GramSync Merchant App — Payment Reminder Screen
//
// Features:
//   • Customer header with overdue badge + balance
//   • Channel selector: WhatsApp vs SMS with live preview
//   • Message composer with variable injection (name, amount, date)
//   • 6 tone-aware templates (gentle / firm / final notice)
//   • Scheduling: Send Now / Morning (9AM) / Evening (6PM) / Custom time
//   • Language toggle: English / Hindi / Hinglish
//   • Character count + WhatsApp message units indicator
//   • Sent History tab with status (Delivered / Read / Failed / Pending)
//   • Success confirmation with animated send
//
// Deps: pure React, no external libraries

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Design tokens ────────────────────────────────────────────────
const tk = {
  blue:        "#2347F5",
  blueMid:     "#3A5BFF",
  bluePale:    "#EEF1FF",
  green:       "#0BAF60",
  greenPale:   "#E6F9F0",
  greenWA:     "#25D366",
  greenWAPale: "#F0FDF4",
  orange:      "#F56A00",
  orangePale:  "#FFF0E5",
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

// ─── Message templates by language & tone ─────────────────────────
const TEMPLATES = {
  english: [
    {
      tone: "gentle",
      label: "Gentle Reminder",
      color: tk.green,
      bg: tk.greenPale,
      text: "Hello {{name}}, this is a friendly reminder that your balance of ₹{{amount}} at {{store}} is due. Please make a payment at your earliest convenience. Thank you! 🙏",
    },
    {
      tone: "firm",
      label: "Payment Due",
      color: tk.orange,
      bg: tk.orangePale,
      text: "Dear {{name}}, your outstanding balance of ₹{{amount}} at {{store}} is now overdue. Kindly clear the amount by {{date}} to maintain your credit. Contact us if you need help arranging payment.",
    },
    {
      tone: "final",
      label: "Final Notice",
      color: tk.red,
      bg: tk.redPale,
      text: "IMPORTANT: {{name}}, your balance of ₹{{amount}} at {{store}} is significantly overdue. This is a final reminder. Failure to pay may affect your Gram Score and future credit eligibility.",
    },
  ],
  hindi: [
    {
      tone: "gentle",
      label: "सौम्य याद दिलाना",
      color: tk.green,
      bg: tk.greenPale,
      text: "नमस्ते {{name}}, {{store}} में आपका ₹{{amount}} का बकाया है। कृपया जल्द भुगतान करें। धन्यवाद! 🙏",
    },
    {
      tone: "firm",
      label: "भुगतान बाकी है",
      color: tk.orange,
      bg: tk.orangePale,
      text: "{{name}} जी, {{store}} में ₹{{amount}} का बकाया अभी तक नहीं आया। कृपया {{date}} तक भुगतान करें।",
    },
    {
      tone: "final",
      label: "अंतिम सूचना",
      color: tk.red,
      bg: tk.redPale,
      text: "{{name}} जी, {{store}} में ₹{{amount}} का बकाया काफी समय से अनसुलझा है। यह अंतिम सूचना है। भुगतान न होने पर आपकी क्रेडिट सुविधा बंद हो सकती है।",
    },
  ],
  hinglish: [
    {
      tone: "gentle",
      label: "Friendly Yaad",
      color: tk.green,
      bg: tk.greenPale,
      text: "Hi {{name}}! {{store}} mein aapka ₹{{amount}} baaki hai. Jab bhi convenient ho, payment kar dena. Thanks! 🙏",
    },
    {
      tone: "firm",
      label: "Payment Pending",
      color: tk.orange,
      bg: tk.orangePale,
      text: "{{name}} bhai, {{store}} ka ₹{{amount}} ab bhi pending hai. {{date}} tak clear kar dena please, warna Gram Score pe asar padega.",
    },
    {
      tone: "final",
      label: "Last Warning",
      color: tk.red,
      bg: tk.redPale,
      text: "{{name}}, yeh final reminder hai. {{store}} mein ₹{{amount}} ka payment bahut der se pending hai. Abhi nahi kiya toh aage credit band ho sakta hai.",
    },
  ],
};

const SCHEDULE_OPTIONS = [
  { id: "now",     label: "Send Now",     icon: "send",    sub: "Deliver immediately" },
  { id: "morning", label: "Morning",      icon: "sunrise", sub: "Today at 9:00 AM" },
  { id: "evening", label: "Evening",      icon: "sunset",  sub: "Today at 6:00 PM" },
  { id: "custom",  label: "Custom Time",  icon: "clock",   sub: "Choose date & time" },
];

const SENT_HISTORY = [
  { id: 1, channel: "whatsapp", time: "Today, 10:45 AM",   status: "read",      msg: "Gentle reminder sent" },
  { id: 2, channel: "sms",      time: "Yesterday, 9:00 AM",status: "delivered", msg: "Payment due notice" },
  { id: 3, channel: "whatsapp", time: "3 days ago",        status: "failed",    msg: "Final notice (failed)" },
  { id: 4, channel: "whatsapp", time: "Last week",         status: "delivered", msg: "Gentle reminder sent" },
];

// ─── CSS ──────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  body { background:#F0F2F8; font-family:'Sora',sans-serif; }
  ::-webkit-scrollbar { display:none; }

  @keyframes fadeSlideUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes sendFly {
    0%   { transform:scale(1) rotate(0deg) translateY(0); opacity:1; }
    60%  { transform:scale(1.2) rotate(-15deg) translateY(-8px); opacity:1; }
    100% { transform:scale(0.4) rotate(-20deg) translateY(-40px); opacity:0; }
  }
  @keyframes successPop {
    0%   { transform:scale(0.5); opacity:0; }
    65%  { transform:scale(1.1); opacity:1; }
    100% { transform:scale(1); opacity:1; }
  }
  @keyframes confettiDrop {
    0%   { transform:translateY(-10px) rotate(0deg); opacity:1; }
    100% { transform:translateY(200px) rotate(540deg); opacity:0; }
  }
  @keyframes pulse {
    0%,100% { opacity:1; } 50% { opacity:0.5; }
  }
  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position: 200% 0; }
  }

  .channel-btn {
    flex:1; padding:12px 8px; border-radius:14px;
    border:2px solid; cursor:pointer;
    font-family:'Sora',sans-serif; font-size:13px; font-weight:700;
    display:flex; flex-direction:column; align-items:center; gap:5px;
    transition:all 0.15s; background:none;
  }
  .channel-btn:active { transform:scale(0.96); }

  .template-card {
    border-radius:14px; padding:12px 14px;
    border:2px solid; cursor:pointer;
    transition:all 0.15s; background:#fff;
  }
  .template-card:hover { box-shadow:0 3px 12px rgba(0,0,0,0.08); }
  .template-card:active { transform:scale(0.98); }

  .schedule-btn {
    flex:1; padding:10px 6px; border-radius:12px;
    border:1.5px solid; cursor:pointer;
    font-family:'Sora',sans-serif; font-size:11px; font-weight:700;
    display:flex; flex-direction:column; align-items:center; gap:3px;
    transition:all 0.15s; background:none;
  }
  .schedule-btn:active { transform:scale(0.95); }

  .lang-chip {
    padding:7px 16px; border-radius:99px;
    border:1.5px solid; cursor:pointer;
    font-family:'Sora',sans-serif; font-size:12px; font-weight:700;
    transition:all 0.15s; background:none;
  }

  .msg-textarea {
    width:100%; min-height:110px;
    border:2px solid #E2E6F3; border-radius:14px;
    padding:14px; resize:vertical;
    font-family:'Sora',sans-serif; font-size:13px; color:#0D1226;
    background:#FAFBFF; outline:none; line-height:1.6;
    transition:border-color 0.15s, box-shadow 0.15s;
  }
  .msg-textarea:focus {
    border-color:#2347F5;
    box-shadow:0 0 0 3px rgba(35,71,245,0.10);
    background:#fff;
  }

  .send-btn {
    width:100%; padding:17px; border-radius:16px; border:none;
    font-family:'Sora',sans-serif; font-weight:800; font-size:16px;
    cursor:pointer; display:flex; align-items:center;
    justify-content:center; gap:10px;
    transition:transform 0.12s, filter 0.12s;
  }
  .send-btn:hover  { filter:brightness(1.07); }
  .send-btn:active { transform:scale(0.97); }
  .send-btn:disabled { cursor:default; filter:none; }

  .history-row {
    display:flex; align-items:center; gap:12px;
    padding:12px 16px; cursor:pointer;
    transition:background 0.12s;
    border-radius:12px;
  }
  .history-row:hover { background:#FAFBFF; }

  .nav-btn {
    flex:1; display:flex; flex-direction:column; align-items:center;
    padding:10px 0 12px; gap:4px; cursor:pointer;
    border:none; background:none;
    font-family:'Sora',sans-serif; font-size:10px; font-weight:500;
    transition:color 0.15s;
  }

  .wa-preview {
    background:#E7FFDB; border-radius:12px 12px 12px 2px;
    padding:10px 14px; max-width:85%; position:relative;
    font-size:13px; line-height:1.6; color:#111;
  }
  .wa-tick { font-size:12px; color:#53BDEB; margin-left:4px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────
function injectVars(template, { name, amount, store, date }) {
  return template
    .replace(/{{name}}/g,   name   || "Customer")
    .replace(/{{amount}}/g, amount || "0")
    .replace(/{{store}}/g,  store  || "our store")
    .replace(/{{date}}/g,   date   || "soon");
}

function waUnits(text) {
  const len = text.length;
  if (len <= 160) return { units: 1, remaining: 160 - len };
  const extra = len - 160;
  const units = 1 + Math.ceil(extra / 153);
  return { units, remaining: units * 153 + 7 - len };
}

// ─── Confetti ─────────────────────────────────────────────────────
function Confetti({ active }) {
  const COLORS = ["#25D366","#2347F5","#F56A00","#F5A623","#fff"];
  if (!active) return null;
  const items = Array.from({ length: 22 }, (_, i) => ({
    left: `${4 + Math.random() * 92}%`,
    color: COLORS[i % COLORS.length],
    delay: `${Math.random() * 0.4}s`,
    size: 5 + Math.random() * 8,
    dur: `${0.7 + Math.random() * 0.6}s`,
    round: Math.random() > 0.5,
  }));
  return (
    <div style={{ position:"absolute", top:0, left:0, right:0, height:160, pointerEvents:"none", overflow:"hidden", zIndex:20 }}>
      {items.map((p, i) => (
        <div key={i} style={{
          position:"absolute", top:-12, left:p.left,
          width:p.size, height:p.size,
          borderRadius: p.round ? "50%" : "2px",
          background:p.color,
          animation:`confettiDrop ${p.dur} ease-in ${p.delay} forwards`,
          opacity:0,
        }}/>
      ))}
    </div>
  );
}

// ─── Schedule icons ───────────────────────────────────────────────
function ScheduleIcon({ type, color, size = 18 }) {
  const s = { stroke:color, strokeWidth:"1.8", strokeLinecap:"round", strokeLinejoin:"round" };
  switch(type) {
    case "send": return (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" {...s}/>
      </svg>
    );
    case "sunrise": return (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
        <path d="M17 18a5 5 0 00-10 0" {...s}/>
        <path d="M12 2v4M4.22 10.22l2.83 2.83M1 18h2M21 18h2M19.78 10.22l-2.83 2.83" {...s}/>
      </svg>
    );
    case "sunset": return (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
        <path d="M17 18a5 5 0 00-10 0" {...s}/>
        <path d="M12 9V5M4.22 10.22l2.83 2.83M1 18h2M21 18h2M19.78 10.22l-2.83 2.83M12 2l-2 3h4l-2-3z" {...s}/>
      </svg>
    );
    case "clock": return (
      <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" {...s}/>
        <path d="M12 6v6l4 2" {...s}/>
      </svg>
    );
    default: return null;
  }
}

// ─── Status badge ─────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    read:      { label:"Read",      color:tk.blue,   bg:tk.bluePale   },
    delivered: { label:"Delivered", color:tk.green,  bg:tk.greenPale  },
    failed:    { label:"Failed",    color:tk.red,    bg:tk.redPale    },
    pending:   { label:"Pending",   color:tk.yellow, bg:tk.yellowPale },
    scheduled: { label:"Scheduled", color:tk.purple, bg:tk.purplePale },
  }[status] || { label:status, color:tk.muted, bg:tk.bg };
  return (
    <span style={{
      background:cfg.bg, color:cfg.color,
      borderRadius:6, fontSize:10, fontWeight:700,
      padding:"2px 8px", letterSpacing:"0.04em", textTransform:"uppercase",
      whiteSpace:"nowrap",
    }}>{cfg.label}</span>
  );
}

// ─── Customer Header ──────────────────────────────────────────────
function CustomerHeader({ customer }) {
  const daysOverdue = customer.daysOverdue || 0;
  const isOverdue = daysOverdue > 0;

  return (
    <div style={{
      margin:"14px 16px", background:"#fff", borderRadius:16, padding:"16px",
      boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
      borderLeft:`3px solid ${isOverdue ? tk.red : tk.orange}`,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{
          width:46, height:46, borderRadius:"50%", flexShrink:0,
          background: isOverdue ? tk.redPale : tk.orangePale,
          color: isOverdue ? tk.red : tk.orange,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:800, fontSize:15,
        }}>
          {customer.initials}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700, color:tk.text }}>{customer.name}</div>
          <div style={{ fontSize:11, color:tk.muted, marginTop:1 }}>{customer.phone}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:18, fontWeight:800, color: isOverdue ? tk.red : tk.orange, fontFamily:"'JetBrains Mono',monospace" }}>
            ₹{customer.balance.toLocaleString("en-IN")}
          </div>
          {isOverdue && (
            <div style={{
              fontSize:10, fontWeight:700, color:tk.red,
              background:tk.redPale, borderRadius:4, padding:"2px 6px", marginTop:2, display:"inline-block",
            }}>
              {daysOverdue}d overdue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Channel Selector ─────────────────────────────────────────────
function ChannelSelector({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:10, padding:"0 16px 14px" }}>
      {[
        { id:"whatsapp", label:"WhatsApp", color:tk.greenWA,  border: value==="whatsapp" ? tk.greenWA : tk.border, bg: value==="whatsapp" ? tk.greenWAPale : "#fff" },
        { id:"sms",      label:"SMS",      color:tk.blue,     border: value==="sms"      ? tk.blue    : tk.border, bg: value==="sms"      ? tk.bluePale    : "#fff" },
      ].map(ch => (
        <button key={ch.id} className="channel-btn"
          style={{ borderColor:ch.border, background:ch.bg, color: value===ch.id ? ch.color : tk.muted }}
          onClick={() => onChange(ch.id)}
        >
          <div style={{
            width:36, height:36, borderRadius:10,
            background: value===ch.id ? ch.color : "#F0F2F8",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {ch.id === "whatsapp" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill={value==="whatsapp" ? "#fff" : tk.muted}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.12 1.522 5.856L.057 23.882l6.183-1.44A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.806 9.806 0 01-5.002-1.367l-.36-.213-3.67.855.87-3.577-.234-.374A9.796 9.796 0 012.182 12c0-5.419 4.399-9.818 9.818-9.818 5.419 0 9.818 4.399 9.818 9.818 0 5.419-4.399 9.818-9.818 9.818z"/>
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  stroke={value==="sms" ? "#fff" : tk.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  fill={value==="sms" ? tk.blue : "none"}/>
              </svg>
            )}
          </div>
          <span>{ch.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Language Selector ────────────────────────────────────────────
function LanguageSelector({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:8, padding:"0 16px 12px" }}>
      {["english","hindi","hinglish"].map(lang => (
        <button key={lang} className="lang-chip"
          style={{
            borderColor: value===lang ? tk.blue : tk.border,
            background:  value===lang ? tk.bluePale : "#fff",
            color:       value===lang ? tk.blue : tk.muted,
          }}
          onClick={() => onChange(lang)}
        >
          {lang === "english" ? "English" : lang === "hindi" ? "हिंदी" : "Hinglish"}
        </button>
      ))}
    </div>
  );
}

// ─── Template Cards ───────────────────────────────────────────────
function TemplateCards({ templates, selected, onSelect, vars }) {
  return (
    <div style={{ padding:"0 16px 14px" }}>
      <div style={{ fontSize:11, fontWeight:700, color:tk.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>
        Message Templates
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {templates.map((tmpl, i) => {
          const isSelected = selected === i;
          return (
            <div key={i} className="template-card"
              style={{
                borderColor: isSelected ? tmpl.color : tk.border,
                background: isSelected ? tmpl.bg : "#fff",
              }}
              onClick={() => onSelect(i)}
            >
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{
                  fontSize:11, fontWeight:700, color:tmpl.color,
                  background: tmpl.bg, borderRadius:5, padding:"2px 8px",
                  border:`1px solid ${tmpl.color}33`,
                }}>
                  {tmpl.label}
                </span>
                {isSelected && (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill={tmpl.color} opacity="0.15"/>
                    <path d="M8 12l3 3 5-5" stroke={tmpl.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ fontSize:12, color: isSelected ? tk.text : tk.muted, lineHeight:1.6 }}>
                {injectVars(tmpl.text, vars).slice(0, 90)}…
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Message Composer ─────────────────────────────────────────────
function MessageComposer({ value, onChange, channel, vars }) {
  const ref = useRef(null);
  const { units, remaining } = waUnits(value);
  const isWA = channel === "whatsapp";

  const insertVar = (v) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = value.slice(0, start) + `{{${v}}}` + value.slice(end);
    onChange(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + v.length + 4, start + v.length + 4);
    }, 10);
  };

  return (
    <div style={{ padding:"0 16px 14px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:tk.muted, letterSpacing:"0.06em", textTransform:"uppercase" }}>
          Compose Message
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {["name","amount","date"].map(v => (
            <button key={v} onClick={() => insertVar(v)} style={{
              background:tk.bluePale, border:"none", borderRadius:6,
              padding:"3px 8px", fontSize:10, fontWeight:700, color:tk.blue,
              cursor:"pointer", fontFamily:"'Sora',sans-serif",
              transition:"background 0.1s",
            }}>
              +{v}
            </button>
          ))}
        </div>
      </div>

      <textarea
        ref={ref}
        className="msg-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
      />

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
        <div style={{ fontSize:11, color:tk.muted }}>
          {value.length} chars
          {isWA && (
            <span style={{ marginLeft:6, color: units > 1 ? tk.orange : tk.muted }}>
              · {units} WA {units === 1 ? "message" : "messages"}
            </span>
          )}
        </div>
        <div style={{ fontSize:11, color: remaining < 20 ? tk.orange : tk.muted }}>
          {remaining} remaining
        </div>
      </div>

      {/* Live preview */}
      <div style={{ marginTop:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:tk.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>
          Preview
        </div>
        <div style={{
          background: isWA ? "#E8F5E9" : "#F0F2F8",
          borderRadius:14, padding:"12px 14px",
        }}>
          {isWA && (
            <div style={{ fontSize:10, color:"#5F5F5F", marginBottom:6, fontWeight:600 }}>
              WhatsApp · {vars.name || "Customer"}
            </div>
          )}
          <div className={isWA ? "wa-preview" : ""} style={isWA ? {} : { fontSize:13, color:tk.text, lineHeight:1.6 }}>
            {injectVars(value, vars)}
            {isWA && (
              <div style={{ textAlign:"right", marginTop:4, fontSize:11, color:"#9E9E9E" }}>
                Just now <span className="wa-tick">✓✓</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Selector ────────────────────────────────────────────
function ScheduleSelector({ value, onChange, customTime, onCustomTime }) {
  return (
    <div style={{ padding:"0 16px 14px" }}>
      <div style={{ fontSize:11, fontWeight:700, color:tk.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>
        Schedule
      </div>
      <div style={{ display:"flex", gap:8 }}>
        {SCHEDULE_OPTIONS.map(opt => {
          const isActive = value === opt.id;
          return (
            <button key={opt.id} className="schedule-btn"
              style={{
                borderColor: isActive ? tk.blue : tk.border,
                background: isActive ? tk.bluePale : "#fff",
                color: isActive ? tk.blue : tk.muted,
              }}
              onClick={() => onChange(opt.id)}
            >
              <ScheduleIcon type={opt.icon} color={isActive ? tk.blue : tk.muted} size={16}/>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {value === "custom" && (
        <div style={{ marginTop:10 }}>
          <input
            type="datetime-local"
            value={customTime}
            onChange={e => onCustomTime(e.target.value)}
            style={{
              width:"100%", padding:"11px 14px",
              border:`1.5px solid ${tk.border}`, borderRadius:12,
              fontFamily:"'Sora',sans-serif", fontSize:13, color:tk.text,
              background:"#fff", outline:"none",
            }}
          />
        </div>
      )}

      <div style={{ marginTop:10, fontSize:11, color:tk.muted, display:"flex", alignItems:"center", gap:5 }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke={tk.muted} strokeWidth="1.5"/>
          <path d="M12 8v4m0 4h.01" stroke={tk.muted} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        {value === "now"     && "Message will be sent immediately after you tap Send."}
        {value === "morning" && "Scheduled for 9:00 AM today. Best open rate for reminders."}
        {value === "evening" && "Scheduled for 6:00 PM today. High engagement in evenings."}
        {value === "custom"  && "Choose a specific date and time to send this reminder."}
      </div>
    </div>
  );
}

// ─── Sent History ─────────────────────────────────────────────────
function SentHistory({ history }) {
  if (history.length === 0) return (
    <div style={{ padding:"40px 16px", textAlign:"center" }}>
      <div style={{ fontSize:14, fontWeight:600, color:tk.muted }}>No reminders sent yet</div>
      <div style={{ fontSize:12, color:tk.muted, marginTop:4 }}>Previous reminders will appear here.</div>
    </div>
  );
  return (
    <div style={{ padding:"8px 8px 20px" }}>
      {history.map((item, i) => (
        <div key={item.id}>
          {i > 0 && <div style={{ height:1, background:tk.border, margin:"0 16px" }}/>}
          <div className="history-row">
            <div style={{
              width:38, height:38, borderRadius:10, flexShrink:0,
              background: item.channel==="whatsapp" ? tk.greenWAPale : tk.bluePale,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {item.channel === "whatsapp" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill={tk.greenWA}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.12 1.522 5.856L.057 23.882l6.183-1.44A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.806 9.806 0 01-5.002-1.367l-.36-.213-3.67.855.87-3.577-.234-.374A9.796 9.796 0 012.182 12c0-5.419 4.399-9.818 9.818-9.818 5.419 0 9.818 4.399 9.818 9.818 0 5.419-4.399 9.818-9.818 9.818z"/>
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    stroke={tk.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:tk.text }}>{item.msg}</div>
              <div style={{ fontSize:11, color:tk.muted, marginTop:1 }}>{item.time}</div>
            </div>
            <StatusBadge status={item.status}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Success Overlay ──────────────────────────────────────────────
function SuccessOverlay({ channel, schedule, onDone }) {
  const [confetti, setConfetti] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setConfetti(true), 100);
    const t2 = setTimeout(() => setConfetti(false), 2800);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  const isWA = channel === "whatsapp";
  const scheduleLabel = schedule === "now" ? "right now" :
    schedule === "morning" ? "at 9:00 AM" : schedule === "evening" ? "at 6:00 PM" : "at the scheduled time";

  return (
    <div style={{
      position:"absolute", inset:0, zIndex:100,
      background:"rgba(13,18,38,0.65)",
      display:"flex", alignItems:"flex-end",
      animation:"fadeIn 0.2s ease",
    }}>
      <Confetti active={confetti}/>
      <div style={{
        background:"#fff", borderRadius:"22px 22px 0 0",
        width:"100%", padding:"28px 24px 40px",
        animation:"fadeSlideUp 0.28s cubic-bezier(.22,1,.36,1)",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.18)",
        position:"relative", overflow:"hidden",
        textAlign:"center",
      }}>
        <div style={{
          width:72, height:72, borderRadius:"50%",
          background: isWA ? tk.greenWAPale : tk.bluePale,
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 16px",
          animation:"successPop 0.4s cubic-bezier(.22,1,.36,1)",
        }}>
          <svg width="34" height="34" fill="none" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke={isWA ? tk.greenWA : tk.blue} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={{ fontSize:22, fontWeight:800, color:tk.text, marginBottom:8 }}>
          {schedule === "now" ? "Reminder Sent!" : "Reminder Scheduled!"}
        </div>
        <div style={{ fontSize:13, color:tk.muted, lineHeight:1.7, marginBottom:28 }}>
          Your reminder will be delivered via {isWA ? "WhatsApp" : "SMS"}<br/>
          {scheduleLabel}. You'll be notified when it's read.
        </div>

        <button
          onClick={onDone}
          style={{
            width:"100%", padding:16, borderRadius:14, border:"none",
            background: isWA ? tk.greenWA : tk.blue, color:"#fff",
            fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:15,
            cursor:"pointer",
            boxShadow: isWA ? "0 4px 16px rgba(37,211,102,0.35)" : "0 4px 16px rgba(35,71,245,0.35)",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────
function TabBar({ active, onChange, historyCount }) {
  return (
    <div style={{
      display:"flex", background:"#fff",
      borderBottom:`1px solid ${tk.border}`,
      padding:"0 16px",
    }}>
      {[
        { id:"compose", label:"Compose" },
        { id:"history", label:`History${historyCount > 0 ? ` (${historyCount})` : ""}` },
      ].map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          padding:"12px 16px 10px", background:"none", border:"none",
          fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:700,
          color: active===tab.id ? tk.blue : tk.muted, cursor:"pointer",
          borderBottom:`2px solid ${active===tab.id ? tk.blue : "transparent"}`,
          marginBottom:-1, transition:"color 0.15s, border-color 0.15s",
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
/**
 * PaymentReminder
 *
 * Props:
 *  - customer       {object}   Customer data
 *  - storeName      {string}   Merchant store name
 *  - onBack         {fn}
 *  - onNavigate     {fn}
 *  - onSent         {(reminderData) => void}
 */
export default function PaymentReminder({
  customer = {
    name:        "Rohit Nair",
    phone:       "+91 95566 77889",
    initials:    "RN",
    balance:     12200,
    daysOverdue: 14,
  },
  storeName  = "Sharma Kirana Store",
  onBack     = () => {},
  onNavigate = () => {},
  onSent     = () => {},
}) {
  const [tab,        setTab]        = useState("compose");
  const [channel,    setChannel]    = useState("whatsapp");
  const [language,   setLanguage]   = useState("english");
  const [tmplIdx,    setTmplIdx]    = useState(0);
  const [schedule,   setSchedule]   = useState("now");
  const [customTime, setCustomTime] = useState("");
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [history,    setHistory]    = useState(SENT_HISTORY);
  const [shown,      setShown]      = useState(false);

  useEffect(() => { const id = setTimeout(() => setShown(true), 60); return () => clearTimeout(id); }, []);

  const vars = {
    name:   customer.name,
    amount: customer.balance.toLocaleString("en-IN"),
    store:  storeName,
    date:   new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-IN", { day:"numeric", month:"short" }),
  };

  const templates = TEMPLATES[language];
  const [message, setMessage] = useState(() => injectVars(templates[0].text, vars));

  // Sync message when template or language changes
  useEffect(() => {
    setMessage(injectVars(templates[tmplIdx]?.text || templates[0].text, vars));
  }, [language, tmplIdx]);

  const handleTemplateSelect = useCallback((i) => {
    setTmplIdx(i);
    setMessage(injectVars(templates[i].text, vars));
  }, [templates, vars]);

  const handleSend = useCallback(() => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      const newEntry = {
        id: Date.now(),
        channel,
        time: "Just now",
        status: schedule === "now" ? "delivered" : "scheduled",
        msg: templates[tmplIdx]?.label + " sent",
      };
      setHistory(prev => [newEntry, ...prev]);
      onSent({ channel, message, schedule, customer });
    }, 1400);
  }, [channel, message, schedule, customer, templates, tmplIdx, onSent]);

  const canSend = message.trim().length > 5;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{
        width:"100%", maxWidth:420, minHeight:"100vh",
        background:tk.bg, display:"flex", flexDirection:"column",
        margin:"0 auto", fontFamily:"'Sora',sans-serif", position:"relative",
        opacity: shown ? 1 : 0, transition:"opacity 0.25s ease",
      }}>

        {/* Topbar */}
        <div style={{
          background:"#fff", padding:"14px 16px",
          display:"flex", alignItems:"center", gap:10,
          borderBottom:`1px solid ${tk.border}`,
          position:"sticky", top:0, zIndex:50,
        }}>
          <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", flexShrink:0 }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke={tk.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:17, fontWeight:700, color:tk.text }}>Payment Reminder</div>
            <div style={{ fontSize:11, color:tk.muted, marginTop:1 }}>Send a nudge to collect faster</div>
          </div>
          {/* History count badge */}
          {history.length > 0 && (
            <div style={{
              background:tk.bluePale, color:tk.blue,
              borderRadius:99, fontSize:11, fontWeight:700,
              padding:"3px 10px",
            }}>
              {history.length} sent
            </div>
          )}
        </div>

        {/* Customer */}
        <CustomerHeader customer={customer}/>

        {/* Tab Bar */}
        <TabBar active={tab} onChange={setTab} historyCount={history.length}/>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:"auto", paddingBottom:100 }}>
          {tab === "compose" ? (
            <div style={{ paddingTop:14, animation:"fadeSlideUp 0.25s ease" }}>
              {/* Channel */}
              <div style={{ padding:"0 16px 4px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:tk.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>
                  Send via
                </div>
              </div>
              <ChannelSelector value={channel} onChange={setChannel}/>

              {/* Language */}
              <div style={{ padding:"0 16px 4px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:tk.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>
                  Language
                </div>
              </div>
              <LanguageSelector value={language} onChange={(l) => { setLanguage(l); setTmplIdx(0); }}/>

              {/* Templates */}
              <TemplateCards
                templates={templates}
                selected={tmplIdx}
                onSelect={handleTemplateSelect}
                vars={vars}
              />

              {/* Composer */}
              <MessageComposer
                value={message}
                onChange={setMessage}
                channel={channel}
                vars={vars}
              />

              {/* Schedule */}
              <ScheduleSelector
                value={schedule}
                onChange={setSchedule}
                customTime={customTime}
                onCustomTime={setCustomTime}
              />
            </div>
          ) : (
            <div style={{ animation:"fadeSlideUp 0.25s ease" }}>
              <SentHistory history={history}/>
            </div>
          )}
        </div>

        {/* Send button — sticky bottom */}
        {tab === "compose" && (
          <div style={{
            position:"sticky", bottom:0,
            background:"#fff", borderTop:`1px solid ${tk.border}`,
            padding:"12px 16px 16px",
          }}>
            {/* Channel preview pill */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{
                display:"flex", alignItems:"center", gap:6,
                background: channel==="whatsapp" ? tk.greenWAPale : tk.bluePale,
                borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600,
                color: channel==="whatsapp" ? "#16A34A" : tk.blue,
              }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:channel==="whatsapp" ? tk.greenWA : tk.blue }}/>
                {channel==="whatsapp" ? "WhatsApp" : "SMS"} ·
                {schedule==="now" ? " Send immediately" : schedule==="morning" ? " 9:00 AM" : schedule==="evening" ? " 6:00 PM" : " Custom time"}
              </div>
            </div>

            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!canSend || sending}
              style={{
                background: !canSend ? tk.border
                  : channel==="whatsapp" ? tk.greenWA : tk.blue,
                color: !canSend ? tk.muted : "#fff",
                boxShadow: !canSend ? "none"
                  : channel==="whatsapp" ? "0 4px 18px rgba(37,211,102,0.35)"
                  : "0 4px 18px rgba(35,71,245,0.35)",
              }}
            >
              {sending ? (
                <>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
                    style={{ animation:"sendFly 1.2s ease forwards" }}>
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {schedule==="now" ? "Send Reminder" : "Schedule Reminder"}
                </>
              )}
            </button>
          </div>
        )}

        {/* Success overlay */}
        {sent && (
          <SuccessOverlay
            channel={channel}
            schedule={schedule}
            onDone={() => { setSent(false); setTab("history"); }}
          />
        )}
      </div>
    </>
  );
}