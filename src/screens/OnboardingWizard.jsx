// OnboardingWizard.jsx
// GramSync Merchant App — First-Run Onboarding Wizard
//
// Steps:
//   0 — Welcome splash (animated logo reveal)
//   1 — Store identity  (store name + owner name)
//   2 — Category        (grid of business types)
//   3 — Credit limit    (slider + preset chips)
//   4 — QR card reveal  (animated merchant QR card + confetti)
//
// Runs once after signup. Persisted via onComplete(storeData) prop.
// Deps: pure React, no external libraries

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Design tokens ────────────────────────────────────────────────
const t = {
  blue:       "#2347F5",
  blueMid:    "#3A5BFF",
  bluePale:   "#EEF1FF",
  green:      "#0BAF60",
  greenPale:  "#E6F9F0",
  orange:     "#F56A00",
  orangePale: "#FFF0E5",
  red:        "#E8304A",
  yellow:     "#F5A623",
  bg:         "#F0F2F8",
  card:       "#FFFFFF",
  text:       "#0D1226",
  muted:      "#7A85A3",
  border:     "#E2E6F3",
};

// ─── Store categories ─────────────────────────────────────────────
const CATEGORIES = [
  { id: "kirana",     label: "Kirana / Grocery",   icon: "🛒", color: t.green,   bg: t.greenPale  },
  { id: "vegetables", label: "Vegetables & Fruit",  icon: "🥦", color: "#16A34A", bg: "#F0FDF4"    },
  { id: "dairy",      label: "Dairy & Milk",        icon: "🥛", color: "#0284C7", bg: "#F0F9FF"    },
  { id: "medical",    label: "Medical / Pharmacy",  icon: "💊", color: t.red,    bg: "#FFF1F2"    },
  { id: "hardware",   label: "Hardware & Tools",    icon: "🔧", color: t.orange, bg: t.orangePale  },
  { id: "textiles",   label: "Textiles / Clothing", icon: "👗", color: "#7C3AED", bg: "#F3EEFF"   },
  { id: "electronics",label: "Electronics",         icon: "📱", color: t.blue,   bg: t.bluePale   },
  { id: "food",       label: "Food & Snacks",       icon: "🍱", color: "#D97706", bg: "#FFFBEB"   },
  { id: "stationery", label: "Stationery / Books",  icon: "📚", color: "#0F766E", bg: "#F0FDFA"   },
  { id: "other",      label: "Other Business",      icon: "🏪", color: t.muted,  bg: t.bg         },
];

// ─── Credit limit presets ─────────────────────────────────────────
const LIMIT_PRESETS = [500, 1000, 2000, 5000, 10000];

// ─── Confetti ─────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#2347F5","#0BAF60","#F56A00","#F5A623","#E8304A","#7C3AED","#fff"];
function Confetti({ active }) {
  const items = Array.from({ length: 28 }, (_, i) => ({
    left:  `${3 + Math.random() * 94}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${Math.random() * 0.6}s`,
    size:  5 + Math.random() * 9,
    dur:   `${0.9 + Math.random() * 0.8}s`,
    round: Math.random() > 0.5,
    rot:   Math.random() * 360,
  }));
  if (!active) return null;
  return (
    <div style={{ position:"absolute", top:0, left:0, right:0, height:200, pointerEvents:"none", overflow:"hidden", zIndex:10 }}>
      {items.map((p, i) => (
        <div key={i} style={{
          position:"absolute", top:-14, left:p.left,
          width:p.size, height:p.size,
          borderRadius: p.round ? "50%" : "2px",
          background: p.color,
          transform: `rotate(${p.rot}deg)`,
          animation: `confettiDrop ${p.dur} ease-in ${p.delay} forwards`,
          opacity: 0,
        }}/>
      ))}
    </div>
  );
}

// ─── LogoMark ─────────────────────────────────────────────────────
function LogoMark({ size = 48, animate = false }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.22,
      background: `linear-gradient(135deg, #2347F5, #3A5BFF)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 20px rgba(35,71,245,0.3)",
      animation: animate ? "logoPop 0.5s cubic-bezier(.22,1,.36,1) 0.2s both" : "none",
      flexShrink: 0,
    }}>
      <svg width={size*0.58} height={size*0.58} viewBox="0 0 32 32" fill="none">
        <path d="M4 26l7-9 5 6 4-5 6 8H4z" fill="#fff" opacity="0.95"/>
        <circle cx="24" cy="9" r="4" fill="#fff"/>
      </svg>
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────
function ProgressDots({ total, current }) {
  return (
    <div style={{ display:"flex", gap:6, alignItems:"center", justifyContent:"center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width:  i === current ? 20 : 6,
          height: 6,
          borderRadius: 99,
          background: i < current  ? t.green
                    : i === current ? t.blue
                    : t.border,
          transition: "all 0.35s cubic-bezier(.22,1,.36,1)",
        }}/>
      ))}
    </div>
  );
}

// ─── Text input ───────────────────────────────────────────────────
function TextInput({ label, placeholder, value, onChange, hint, maxLength, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:t.muted, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:8 }}>
        {label}
      </div>
      <div style={{
        border: `2px solid ${focused ? t.blue : value ? t.border : t.border}`,
        borderRadius: 14,
        background: focused ? "#fff" : "#FAFBFF",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: focused ? "0 0 0 4px rgba(35,71,245,0.1)" : "none",
        padding: "14px 16px",
      }}>
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength || 60}
          style={{
            width:"100%", background:"none", border:"none", outline:"none",
            fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:600, color:t.text,
          }}
        />
      </div>
      {hint && (
        <div style={{ fontSize:11, color:t.muted, marginTop:5, paddingLeft:2 }}>{hint}</div>
      )}
    </div>
  );
}

// ─── Primary button ───────────────────────────────────────────────
function PrimaryBtn({ label, onClick, disabled, loading, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width:"100%", padding:"17px", borderRadius:16, border:"none",
        background: disabled ? t.border : t.blue,
        color: disabled ? t.muted : "#fff",
        fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:16,
        cursor: disabled ? "default" : "pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        boxShadow: disabled ? "none" : "0 4px 20px rgba(35,71,245,0.35)",
        transition:"transform 0.1s, filter 0.1s, background 0.2s, box-shadow 0.2s",
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {loading ? (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
          style={{ animation:"spin 1s linear infinite" }}>
          <path d="M4 12a8 8 0 018-8v2m8 6a8 8 0 01-8 8v-2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      ) : (
        <>
          {label}
          {icon && <span style={{ fontSize:18 }}>{icon}</span>}
        </>
      )}
    </button>
  );
}

// ─── Back button ──────────────────────────────────────────────────
function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background:"none", border:`1.5px solid ${t.border}`, borderRadius:12,
      padding:"10px 18px", cursor:"pointer",
      fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:600, color:t.muted,
      display:"flex", alignItems:"center", gap:6,
      transition:"border-color 0.15s, color 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = t.text; e.currentTarget.style.color = t.text; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.muted; }}
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
        <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Back
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════
// STEP 0 — Welcome splash
// ══════════════════════════════════════════════════════════════════
function StepWelcome({ onNext }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 80); return () => clearTimeout(id); }, []);

  const features = [
    { icon:"💳", label:"Record Udhar & Jama", sub:"Track every rupee in seconds" },
    { icon:"📊", label:"Gram Score™",         sub:"Know who to trust before lending" },
    { icon:"☁️", label:"Works offline too",   sub:"Sync when connection is back" },
  ];

  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column",
      padding:"0 24px 32px",
      opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(16px)",
      transition:"opacity 0.4s ease, transform 0.4s ease",
    }}>
      {/* Hero */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", paddingBottom:16 }}>
        <div style={{ animation:"logoPop 0.5s cubic-bezier(.22,1,.36,1) 0.1s both" }}>
          <LogoMark size={72}/>
        </div>
        <div style={{
          fontSize:28, fontWeight:800, color:t.text, marginTop:20, textAlign:"center",
          lineHeight:1.2, animation:"fadeUp 0.4s ease 0.25s both",
        }}>
          Welcome to<br/>GramSync
        </div>
        <div style={{
          fontSize:14, color:t.muted, textAlign:"center", marginTop:10, lineHeight:1.7,
          animation:"fadeUp 0.4s ease 0.35s both",
        }}>
          India's trusted merchant credit network.<br/>Set up your store in under 2 minutes.
        </div>

        {/* Feature pills */}
        <div style={{
          display:"flex", flexDirection:"column", gap:10, marginTop:28, width:"100%",
          animation:"fadeUp 0.4s ease 0.45s both",
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:14,
              background:"#fff", borderRadius:14, padding:"12px 16px",
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
              animation:`fadeUp 0.35s ease ${0.5 + i*0.08}s both`,
            }}>
              <div style={{
                width:40, height:40, borderRadius:12, background:t.bluePale,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, flexShrink:0,
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:t.text }}>{f.label}</div>
                <div style={{ fontSize:11, color:t.muted, marginTop:1 }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ animation:"fadeUp 0.4s ease 0.7s both" }}>
        <PrimaryBtn label="Set Up My Store" onClick={onNext} icon="→"/>
        <div style={{ textAlign:"center", marginTop:12, fontSize:11, color:t.muted }}>
          Takes less than 2 minutes · Free to start
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STEP 1 — Store identity
// ══════════════════════════════════════════════════════════════════
function StepIdentity({ data, onChange, onNext, onBack }) {
  const valid = data.storeName.trim().length >= 2 && data.ownerName.trim().length >= 2;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"0 24px 32px", animation:"slideIn 0.28s cubic-bezier(.22,1,.36,1)" }}>
      <div style={{ flex:1, paddingTop:8 }}>
        {/* Step icon */}
        <div style={{
          width:56, height:56, borderRadius:16, background:t.bluePale,
          display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20,
        }}>
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={t.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12h6v10" stroke={t.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={{ fontSize:22, fontWeight:800, color:t.text, marginBottom:6 }}>Name your store</div>
        <div style={{ fontSize:13, color:t.muted, marginBottom:24, lineHeight:1.6 }}>
          This appears on your QR card and customer receipts.
        </div>

        <TextInput
          label="Store Name"
          placeholder="e.g. Sharma Kirana Store"
          value={data.storeName}
          onChange={v => onChange({ ...data, storeName: v })}
          hint="Your shop's trading name — exactly as customers know it"
          autoFocus
        />
        <TextInput
          label="Your Full Name"
          placeholder="e.g. Ramesh Sharma"
          value={data.ownerName}
          onChange={v => onChange({ ...data, ownerName: v })}
          hint="Your name as the registered store owner"
        />
        <TextInput
          label="City / Town"
          placeholder="e.g. Nashik, Maharashtra"
          value={data.city}
          onChange={v => onChange({ ...data, city: v })}
          hint="Helps customers and the network locate your store"
        />
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <BackBtn onClick={onBack}/>
        <div style={{ flex:1 }}>
          <PrimaryBtn label="Continue" onClick={onNext} disabled={!valid}/>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STEP 2 — Business category
// ══════════════════════════════════════════════════════════════════
function StepCategory({ data, onChange, onNext, onBack }) {
  const selected = data.category;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"0 24px 32px", animation:"slideIn 0.28s cubic-bezier(.22,1,.36,1)" }}>
      <div style={{ flex:1 }}>
        <div style={{
          width:56, height:56, borderRadius:16, background:t.orangePale,
          display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20,
        }}>
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke={t.orange} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" stroke={t.orange} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 12h6M9 16h4" stroke={t.orange} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>

        <div style={{ fontSize:22, fontWeight:800, color:t.text, marginBottom:6 }}>What type of store?</div>
        <div style={{ fontSize:13, color:t.muted, marginBottom:20, lineHeight:1.6 }}>
          We'll customise your Gram Score model and credit defaults for your industry.
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {CATEGORIES.map((cat, i) => {
            const isSelected = selected === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onChange({ ...data, category: cat.id })}
                style={{
                  background: isSelected ? cat.bg : "#fff",
                  border: `2px solid ${isSelected ? cat.color : t.border}`,
                  borderRadius:14, padding:"13px 12px",
                  cursor:"pointer", textAlign:"left",
                  transition:"all 0.15s",
                  animation:`fadeUp 0.3s ease ${i * 0.04}s both`,
                  boxShadow: isSelected ? `0 0 0 1px ${cat.color}22` : "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ fontSize:22, marginBottom:5 }}>{cat.icon}</div>
                <div style={{
                  fontSize:12, fontWeight:700,
                  color: isSelected ? cat.color : t.text,
                  lineHeight:1.3,
                }}>{cat.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <BackBtn onClick={onBack}/>
        <div style={{ flex:1 }}>
          <PrimaryBtn label="Continue" onClick={onNext} disabled={!selected}/>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STEP 3 — Credit limit
// ══════════════════════════════════════════════════════════════════
function StepCreditLimit({ data, onChange, onNext, onBack }) {
  const limit = data.creditLimit || 2000;
  const MIN = 100, MAX = 25000;

  const pct = Math.round(((limit - MIN) / (MAX - MIN)) * 100);

  const riskLabel = limit <= 500  ? { label:"Very Conservative", color:t.green }
                  : limit <= 2000 ? { label:"Conservative",      color:t.green }
                  : limit <= 5000 ? { label:"Moderate",          color:t.yellow }
                  : limit <= 10000? { label:"Generous",          color:t.orange }
                  :                 { label:"High Risk",          color:t.red };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"0 24px 32px", animation:"slideIn 0.28s cubic-bezier(.22,1,.36,1)" }}>
      <div style={{ flex:1 }}>
        <div style={{
          width:56, height:56, borderRadius:16, background:t.greenPale,
          display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20,
        }}>
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={t.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={t.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={{ fontSize:22, fontWeight:800, color:t.text, marginBottom:6 }}>Set your default credit limit</div>
        <div style={{ fontSize:13, color:t.muted, marginBottom:24, lineHeight:1.6 }}>
          The maximum Udhar you'll extend to a new customer. You can override this per customer later.
        </div>

        {/* Big amount display */}
        <div style={{
          background: `linear-gradient(135deg, #1a38e8, #3a5bff)`,
          borderRadius:20, padding:"22px 24px", marginBottom:24, position:"relative", overflow:"hidden",
          textAlign:"center",
        }}>
          <div style={{ position:"absolute", right:-20, top:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }}/>
          <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>
            Default Credit Limit
          </div>
          <div style={{
            fontSize:44, fontWeight:800, color:"#fff",
            fontFamily:"'JetBrains Mono',monospace", lineHeight:1,
            transition:"all 0.15s ease",
          }}>
            ₹{limit.toLocaleString("en-IN")}
          </div>
          <div style={{
            display:"inline-block", marginTop:10,
            background:"rgba(255,255,255,0.18)", borderRadius:99,
            padding:"3px 12px", fontSize:12, fontWeight:700, color:"#fff",
          }}>
            {riskLabel.label}
          </div>
        </div>

        {/* Slider */}
        <div style={{ marginBottom:20, padding:"0 4px" }}>
          <style>{`
            .limit-slider {
              -webkit-appearance:none; appearance:none;
              width:100%; height:6px; border-radius:99px;
              background: linear-gradient(to right, #2347F5 ${pct}%, #E2E6F3 ${pct}%);
              outline:none; cursor:pointer;
            }
            .limit-slider::-webkit-slider-thumb {
              -webkit-appearance:none; appearance:none;
              width:24px; height:24px; border-radius:50%;
              background:#2347F5; border:3px solid #fff;
              box-shadow:0 2px 8px rgba(35,71,245,0.35);
              cursor:pointer; transition:transform 0.1s;
            }
            .limit-slider::-webkit-slider-thumb:active { transform:scale(1.2); }
            .limit-slider::-moz-range-thumb {
              width:24px; height:24px; border-radius:50%;
              background:#2347F5; border:3px solid #fff;
              box-shadow:0 2px 8px rgba(35,71,245,0.35);
              cursor:pointer;
            }
          `}</style>
          <input
            type="range" className="limit-slider"
            min={MIN} max={MAX} step={100}
            value={limit}
            onChange={e => onChange({ ...data, creditLimit: Number(e.target.value) })}
          />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:t.muted }}>
            <span>₹{MIN.toLocaleString("en-IN")}</span>
            <span>₹{MAX.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Preset chips */}
        <div style={{ marginBottom:6 }}>
          <div style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>
            Quick presets
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {LIMIT_PRESETS.map(p => (
              <button key={p} onClick={() => onChange({ ...data, creditLimit: p })} style={{
                border: `2px solid ${limit === p ? t.blue : t.border}`,
                background: limit === p ? t.bluePale : "#fff",
                borderRadius:10, padding:"8px 14px",
                fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:700,
                color: limit === p ? t.blue : t.muted,
                cursor:"pointer", transition:"all 0.15s",
              }}>
                ₹{p.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div style={{
          background:t.bluePale, borderRadius:12, padding:"11px 14px", marginTop:16,
          display:"flex", gap:8, alignItems:"flex-start",
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink:0, marginTop:1 }}>
            <circle cx="12" cy="12" r="10" stroke={t.blue} strokeWidth="1.5"/>
            <path d="M12 8v4m0 4h.01" stroke={t.blue} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize:11, color:t.blue, lineHeight:1.6 }}>
            Most merchants start with ₹1,000–₹2,000 for new customers and increase it after a few successful repayments.
          </span>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <BackBtn onClick={onBack}/>
        <div style={{ flex:1 }}>
          <PrimaryBtn label="Generate My QR Card" onClick={onNext} icon="✦"/>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STEP 4 — QR Card Reveal
// ══════════════════════════════════════════════════════════════════
function QRPattern({ size = 120, storeId }) {
  // Generate a deterministic dot pattern based on storeId
  const hash = storeId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cells = 9;
  const cellSize = size / cells;
  const pattern = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      const isCorner = (r < 2 && c < 2) || (r < 2 && c > cells-3) || (r > cells-3 && c < 2);
      if (isCorner) return true;
      return ((r * cells + c + hash) % 3) === 0;
    })
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {pattern.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize + 1}
              y={r * cellSize + 1}
              width={cellSize - 2}
              height={cellSize - 2}
              rx={2}
              fill="#fff"
              opacity={0.9}
            />
          ) : null
        )
      )}
    </svg>
  );
}

function MerchantQRCard({ data, storeId, animate }) {
  const catObj = CATEGORIES.find(c => c.id === data.category) || CATEGORIES[0];
  const initials = data.ownerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{
      width: 300, margin:"0 auto",
      borderRadius: 24,
      background: `linear-gradient(145deg, #1a38e8 0%, #2347F5 50%, #3a5bff 100%)`,
      padding: 2,
      boxShadow: "0 20px 60px rgba(35,71,245,0.45), 0 8px 20px rgba(35,71,245,0.2)",
      animation: animate ? "cardReveal 0.7s cubic-bezier(.22,1,.36,1) 0.1s both" : "none",
      position: "relative",
      zIndex: 2,
    }}>
      <div style={{
        borderRadius: 22,
        background: `linear-gradient(145deg, #1a38e8, #2f52ff)`,
        padding: "20px 20px 18px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Background decoration */}
        <div style={{ position:"absolute", right:-30, top:-30, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }}/>
        <div style={{ position:"absolute", left:-20, bottom:-30, width:110, height:110, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <LogoMark size={28}/>
            <span style={{ fontSize:13, fontWeight:800, color:"#fff" }}>GramSync</span>
          </div>
          <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.05em" }}>
            MERCHANT
          </span>
        </div>

        {/* Store info */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <div style={{
            width:46, height:46, borderRadius:"50%",
            background:"rgba(255,255,255,0.18)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, fontWeight:800, color:"#fff", flexShrink:0,
            border:"2px solid rgba(255,255,255,0.3)",
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:"#fff", lineHeight:1.2 }}>
              {data.storeName || "Your Store"}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", marginTop:2 }}>
              {data.city || "India"} · {catObj.label}
            </div>
          </div>
        </div>

        {/* QR code area */}
        <div style={{ display:"flex", gap:14, alignItems:"flex-end" }}>
          <div style={{
            width:100, height:100, background:"rgba(255,255,255,0.12)",
            borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center",
            border:"1.5px solid rgba(255,255,255,0.2)",
            padding:6,
          }}>
            <QRPattern size={86} storeId={storeId}/>
          </div>
          <div style={{ flex:1, paddingBottom:4 }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>
              Store ID
            </div>
            <div style={{ fontSize:13, fontWeight:800, color:"#fff", fontFamily:"'JetBrains Mono',monospace", marginBottom:10 }}>
              {storeId}
            </div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>
              Credit limit
            </div>
            <div style={{ fontSize:15, fontWeight:800, color:"#fff", fontFamily:"'JetBrains Mono',monospace" }}>
              ₹{(data.creditLimit || 2000).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.12)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>
            Share with customers to record Udhar
          </div>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.7)" }}>
            gramsync.in
          </div>
        </div>
      </div>
    </div>
  );
}

function StepQRReveal({ data, storeId, onComplete }) {
  const [confetti, setConfetti] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setCardVisible(true), 200);
    const t2 = setTimeout(() => setConfetti(true),    400);
    const t3 = setTimeout(() => setConfetti(false),   3000);
    const t4 = setTimeout(() => setBtnVisible(true),  900);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, []);

  const catObj = CATEGORIES.find(c => c.id === data.category) || CATEGORIES[0];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"0 24px 32px", position:"relative", overflow:"hidden" }}>
      <Confetti active={confetti}/>

      {/* Success header */}
      <div style={{ textAlign:"center", marginBottom:24, animation:"fadeUp 0.4s ease 0.15s both" }}>
        <div style={{
          width:60, height:60, borderRadius:"50%", background:t.greenPale,
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 14px",
          animation:"successPop 0.45s cubic-bezier(.22,1,.36,1) 0.1s both",
        }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke={t.green} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize:22, fontWeight:800, color:t.text, marginBottom:4 }}>
          Your store is ready! 🎉
        </div>
        <div style={{ fontSize:13, color:t.muted, lineHeight:1.6 }}>
          Here's your unique GramSync Merchant QR Card.<br/>Share it with customers to start recording Udhar.
        </div>
      </div>

      {/* QR Card */}
      <div style={{ marginBottom:20 }}>
        <MerchantQRCard data={data} storeId={storeId} animate={cardVisible}/>
      </div>

      {/* Store summary pills */}
      <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginBottom:20, animation:"fadeUp 0.4s ease 0.8s both" }}>
        {[
          { label: data.storeName, icon:"🏪" },
          { label: catObj.label, icon: catObj.icon },
          { label: `₹${(data.creditLimit||2000).toLocaleString("en-IN")} limit`, icon:"💳" },
        ].map((p, i) => (
          <div key={i} style={{
            display:"flex", alignItems:"center", gap:5,
            background:"#fff", borderRadius:99, padding:"6px 12px",
            fontSize:11, fontWeight:700, color:t.text,
            border:`1px solid ${t.border}`,
            boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <span style={{ fontSize:13 }}>{p.icon}</span>
            {p.label}
          </div>
        ))}
      </div>

      {/* Share + Continue buttons */}
      {btnVisible && (
        <div style={{ display:"flex", flexDirection:"column", gap:10, animation:"fadeUp 0.35s ease both" }}>
          <button style={{
            width:"100%", padding:"14px", borderRadius:14, border:`1.5px solid ${t.blue}`,
            background:"#fff", color:t.blue,
            fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:14,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"background 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = t.bluePale}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3" stroke={t.blue} strokeWidth="1.8"/>
              <circle cx="6" cy="12" r="3" stroke={t.blue} strokeWidth="1.8"/>
              <circle cx="18" cy="19" r="3" stroke={t.blue} strokeWidth="1.8"/>
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke={t.blue} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Share QR Card
          </button>
          <PrimaryBtn label="Go to Dashboard" onClick={onComplete} icon="→"/>
        </div>
      )}
    </div>
  );
}

// ─── Global CSS ───────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  html, body { height:100%; }
  body { background:#F0F2F8; font-family:'Sora',sans-serif; }
  ::-webkit-scrollbar { display:none; }

  @keyframes logoPop {
    0%   { transform:scale(0.4) rotate(-10deg); opacity:0; }
    60%  { transform:scale(1.12) rotate(2deg); opacity:1; }
    100% { transform:scale(1) rotate(0deg); }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes slideIn {
    from { opacity:0; transform:translateX(24px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes slideBack {
    from { opacity:0; transform:translateX(-24px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes confettiDrop {
    0%   { transform:translateY(-10px) rotate(0deg); opacity:1; }
    100% { transform:translateY(260px) rotate(540deg); opacity:0; }
  }
  @keyframes cardReveal {
    0%   { opacity:0; transform:scale(0.85) translateY(20px) rotateX(8deg); }
    60%  { transform:scale(1.03) translateY(-4px) rotateX(-1deg); }
    100% { opacity:1; transform:scale(1) translateY(0) rotateX(0deg); }
  }
  @keyframes successPop {
    0%   { transform:scale(0.4) rotate(-12deg); opacity:0; }
    65%  { transform:scale(1.15) rotate(2deg); opacity:1; }
    100% { transform:scale(1) rotate(0deg); }
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
`;

// ─── Topbar ───────────────────────────────────────────────────────
function Topbar({ step, totalSteps, onSkip }) {
  const isWelcome = step === 0;
  const isReveal  = step === totalSteps - 1;
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"16px 20px 0",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {!isWelcome && !isReveal && <LogoMark size={28}/>}
        <span style={{ fontSize:14, fontWeight:700, color:t.muted }}>
          {isReveal ? "" : isWelcome ? "" : `Step ${step} of ${totalSteps - 2}`}
        </span>
      </div>
      {!isReveal && !isWelcome && (
        <button onClick={onSkip} style={{
          background:"none", border:"none", cursor:"pointer",
          fontSize:12, fontWeight:600, color:t.muted, fontFamily:"'Sora',sans-serif",
          padding:"4px 8px",
          transition:"color 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.color = t.text}
          onMouseLeave={e => e.currentTarget.style.color = t.muted}
        >
          Skip setup
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
/**
 * OnboardingWizard
 *
 * Props:
 *  - onComplete   {(storeData) => void}   called when user taps "Go to Dashboard"
 *  - onSkip       {() => void}            called when user taps "Skip setup"
 *  - initialData  {object}               pre-fill form fields (for resuming)
 */
export default function OnboardingWizard({
  onComplete   = () => {},
  onSkip       = () => {},
  initialData  = {},
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [data, setData] = useState({
    storeName:   initialData.storeName   || "",
    ownerName:   initialData.ownerName   || "",
    city:        initialData.city        || "",
    category:    initialData.category    || "",
    creditLimit: initialData.creditLimit || 2000,
  });

  // Generate a stable store ID
  const storeId = useRef(`GS-ST-${Math.floor(1000 + Math.random() * 8999)}`).current;

  const TOTAL_STEPS = 5; // 0=welcome, 1=identity, 2=category, 3=limit, 4=reveal

  const goNext = useCallback(() => {
    setDirection("forward");
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection("back");
    setStep(s => Math.max(s - 1, 0));
  }, []);

  const handleComplete = useCallback(() => {
    onComplete({ ...data, storeId });
  }, [data, storeId, onComplete]);

  const showProgress = step >= 1 && step <= 3;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{
        width:"100%", maxWidth:420, minHeight:"100vh",
        background:t.bg, display:"flex", flexDirection:"column",
        margin:"0 auto", fontFamily:"'Sora',sans-serif",
        position:"relative",
      }}>
        {/* Top bar */}
        <Topbar step={step} totalSteps={TOTAL_STEPS} onSkip={onSkip}/>

        {/* Progress dots */}
        {showProgress && (
          <div style={{ padding:"16px 24px 0" }}>
            <ProgressDots total={3} current={step - 1}/>
          </div>
        )}

        {/* Steps */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", paddingTop:20 }}>
          {step === 0 && <StepWelcome onNext={goNext}/>}
          {step === 1 && <StepIdentity   data={data} onChange={setData} onNext={goNext} onBack={goBack}/>}
          {step === 2 && <StepCategory   data={data} onChange={setData} onNext={goNext} onBack={goBack}/>}
          {step === 3 && <StepCreditLimit data={data} onChange={setData} onNext={goNext} onBack={goBack}/>}
          {step === 4 && <StepQRReveal   data={data} storeId={storeId}  onComplete={handleComplete}/>}
        </div>
      </div>
    </>
  );
}