import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyAY1KjLbjUqSkL_4VLE1Ptodq1AItS4m_g",
  authDomain: "medtracker-18208.firebaseapp.com",
  projectId: "medtracker-18208",
  storageBucket: "medtracker-18208.firebasestorage.app",
  messagingSenderId: "428621033560",
  appId: "1:428621033560:web:afd58a79097dcfa5451a2d",
});
const db = getFirestore(app);

const TIMES = ["בוקר", "צהריים", "ערב", "לילה"];
const TIME_ICONS: Record<string,string> = { "בוקר":"🌅","צהריים":"☀️","ערב":"🌆","לילה":"🌙" };

const DEFAULT_MEDS: any = {
  יהודה: [
    { id:101, name:"קלקסן",               dose:"40 מ\"ג — זריקה",      times:["בוקר"],                        notes:"" },
    { id:102, name:"קרדילוק",              dose:"1.25 מ\"ג — כדור",     times:["בוקר","ערב"],                  notes:"" },
    { id:103, name:"ויטמין B12",           dose:"כדור מציצה",             times:["בוקר"],                        notes:"" },
    { id:104, name:"פקסט",                 dose:"כדור",                   times:["ערב"],                         notes:"" },
    { id:105, name:"ויטמין D3",            dose:"כדור",                   times:["ערב"],                         notes:"" },
    { id:106, name:"ויטמין B6 + מגנזיום",  dose:"כדור",                   times:["ערב"],                         notes:"" },
    { id:107, name:"ונקומיצין",            dose:"2.5 cc מהול",            times:["בוקר","צהריים","ערב","לילה"], notes:"אנטיביוטיקה — 4 פעמים ביום" },
  ],
  נני: [
    { id:201, name:"קלציום",  dose:"500 מ\"ג", times:["בוקר","ערב"], notes:"" },
    { id:202, name:"אומגה 3", dose:"1 כמוסה",  times:["צהריים"],     notes:"עם אוכל" },
  ],
};

function today() { return new Date().toISOString().split("T")[0]; }
function nowPeriod() {
  const h = new Date().getHours();
  if (h < 12) return "בוקר";
  if (h < 16) return "צהריים";
  if (h < 20) return "ערב";
  return "לילה";
}
function todayHebrew() {
  return new Date().toLocaleDateString("he-IL", { weekday:"long", day:"numeric", month:"long" });
}

async function initMeds() {
  const snap = await getDoc(doc(db,"data","meds"));
  if (!snap.exists()) await setDoc(doc(db,"data","meds"), { value: DEFAULT_MEDS });
}
async function saveMeds(meds: any) { await setDoc(doc(db,"data","meds"),{ value: meds }); }
async function saveLog(log: any)   { await setDoc(doc(db,"data","log"), { value: log  }); }

export default function App() {
  const [allMeds, setAllMeds] = useState<any>(null);
  const [log,     setLog]     = useState<any>({});
  const [who,     setWho]     = useState<any>(null);
  const [period,  setPeriod]  = useState(nowPeriod());
  const [screen,  setScreen]  = useState("today");
  const [form,    setForm]    = useState<any>({ name:"", dose:"", times:[], notes:"" });
  const [editId,  setEditId]  = useState<any>(null);
  const [editUser,setEditUser]= useState<any>(null);
  const [msg,     setMsg]     = useState("");
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    initMeds();
    const unsubMeds = onSnapshot(doc(db,"data","meds"), snap => {
      if (snap.exists()) setAllMeds(snap.data().value);
    });
    const unsubLog = onSnapshot(doc(db,"data","log"), snap => {
      if (snap.exists()) setLog(snap.data().value);
      else setLog({});
    });
    return () => { unsubMeds(); unsubLog(); };
  }, []);

  const flash = (t: string) => { setMsg(t); setTimeout(()=>setMsg(""), 2000); };
  const logKey = (user: string, medId: number, p: string) => `${today()}_${user}_${p}_${medId}`;
  const taken  = (user: string, medId: number, p: string) => !!(log||{})[logKey(user,medId,p)];

  const toggle = async (user: string, medId: number, p: string) => {
    const lk = logKey(user, medId, p);
    const n = { ...(log||{}) };
    if (n[lk]) { delete n[lk]; flash("בוטל ✕"); }
    else        { n[lk] = 1;   flash("נלקח ✓"); }
    setLog(n);
    await saveLog(n);
  };

  const userMeds  = (u: string) => (allMeds||{})[u] || [];
  const userStats = (u: string) => {
    const meds = userMeds(u);
    const all  = meds.flatMap((m: any) => m.times.map((t: string) => ({ m, t })));
    const done = all.filter(({ m, t }: any) => taken(u, m.id, t)).length;
    return { done, total: all.length };
  };

  const writeMeds = async (newMeds: any) => {
    setAllMeds(newMeds);
    setSaving(true);
    await saveMeds(newMeds);
    setSaving(false);
  };

  const saveForm = async () => {
    const target = editUser || who;
    if (!form.name.trim())  { flash("חסר שם");  return; }
    if (!form.times.length) { flash("בחר זמן"); return; }
    const list    = userMeds(target);
    const newList = editId
      ? list.map((m: any) => m.id===editId ? { ...form, id:editId } : m)
      : [...list, { ...form, id:Date.now() }];
    await writeMeds({ ...(allMeds||{}), [target]: newList });
    flash(editId ? "עודכן ✓" : "נוסף ✓");
    setEditId(null); setEditUser(null);
    setScreen(who==="ילדים" ? "monitor" : "today");
  };

  const deleteMed = async (user: string, id: number) => {
    await writeMeds({ ...(allMeds||{}), [user]: userMeds(user).filter((m: any)=>m.id!==id) });
    flash("הוסר");
  };

  const startEdit = (user: string, med: any) => {
    setForm({ name:med.name, dose:med.dose, times:[...med.times], notes:med.notes });
    setEditId(med.id); setEditUser(user); setScreen("add");
  };
  const startAdd = (user: string) => {
    setForm({ name:"", dose:"", times:[], notes:"" });
    setEditId(null); setEditUser(user); setScreen("add");
  };
  const toggleTime = (t: string) => setForm((p: any) => ({
    ...p, times: p.times.includes(t) ? p.times.filter((x: string)=>x!==t) : [...p.times, t]
  }));

  if (!allMeds) return (
    <div dir="rtl" style={{ ...bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, minHeight:"100vh" }}>
      <div style={{ fontSize:52 }}>💊</div>
      <div style={{ fontSize:24, fontWeight:800, color:"#555" }}>טוען...</div>
    </div>
  );

  if (!who) return (
    <div dir="rtl" style={bg}>
      {msg && <Toast msg={msg} />}
      {saving && <Saving />}
      <div style={{ padding:"32px 20px", maxWidth:500, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:56 }}>💊</div>
          <div style={{ fontSize:32, fontWeight:900, marginTop:8 }}>מעקב תרופות</div>
          <div style={{ fontSize:18, color:"#888", marginTop:6 }}>{todayHebrew()}</div>
        </div>
        <div style={{ fontSize:20, fontWeight:800, color:"#555", marginBottom:14 }}>👴👵 בחרו משתמש</div>
        {["יהודה","נני"].map(u => {
          const { done, total } = userStats(u);
          const pct = total ? Math.round(done/total*100) : 0;
          return (
            <button key={u} onClick={() => { setWho(u); setScreen("today"); }} style={{
              width:"100%", background:"#fff", border:"3px solid #e8e8e8", borderRadius:22,
              padding:"22px 24px", marginBottom:14, cursor:"pointer", textAlign:"right",
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <div>
                <div style={{ fontSize:28, fontWeight:900 }}>{u==="יהודה"?"👴":"👵"} {u}</div>
                <div style={{ fontSize:18, color:"#888", marginTop:4 }}>{done} מתוך {total} נלקחו היום</div>
              </div>
              <div style={{ width:60, height:60, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:900, color:pct>0?"#fff":"#aaa", background:pct===100?"#4ECDC4":pct>0?"#FFB347":"#eee", flexShrink:0 }}>{pct}%</div>
            </button>
          );
        })}
        <div style={{ fontSize:20, fontWeight:800, color:"#555", marginBottom:14, marginTop:8 }}>👨‍👩‍👧 ילדים</div>
        <button onClick={() => { setWho("ילדים"); setScreen("monitor"); }} style={{
          width:"100%", background:"#fff8e8", border:"3px solid #FFB347", borderRadius:22,
          padding:"22px 24px", cursor:"pointer", textAlign:"right",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div>
            <div style={{ fontSize:28, fontWeight:900 }}>👨‍👩‍👧 ניטור ועריכה</div>
            <div style={{ fontSize:18, color:"#888", marginTop:4 }}>צפייה, הוספה והסרת תרופות</div>
          </div>
          <div style={{ fontSize:32 }}>←</div>
        </button>
      </div>
    </div>
  );

  if (who==="ילדים" && screen==="monitor") return (
    <div dir="rtl" style={bg}>
      {msg && <Toast msg={msg} />}
      {saving && <Saving />}
      <Header title="ניטור ועריכה" onBack={() => setWho(null)} extra={todayHebrew()} />
      <div style={{ padding:"16px 16px 40px", maxWidth:500, margin:"0 auto" }}>
        {["יהודה","נני"].map(u => {
          const meds = userMeds(u);
          const { done, total } = userStats(u);
          return (
            <div key={u} style={{ background:"#fff", borderRadius:22, marginBottom:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.07)" }}>
              <div style={{ background:u==="יהודה"?"#e8f4ff":"#fde8f4", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:24, fontWeight:900 }}>{u==="יהודה"?"👴":"👵"} {u}</div>
                <div style={{ fontSize:18, fontWeight:800, color:done===total&&total>0?"#4ECDC4":"#888" }}>{done}/{total} {done===total&&total>0?"✓":""}</div>
              </div>
              <div style={{ padding:"12px 20px 8px", borderBottom:"2px solid #f5f5f0" }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#aaa", marginBottom:8 }}>מצב היום</div>
                <div style={{ display:"flex", gap:8 }}>
                  {TIMES.map(t => {
                    const pm = meds.filter((m: any) => m.times.includes(t));
                    if (!pm.length) return null;
                    const dn = pm.filter((m: any) => taken(u,m.id,t)).length;
                    const ok = dn===pm.length;
                    return (
                      <div key={t} style={{ flex:1, textAlign:"center", background:ok?"#e8faf8":"#fff5f5", border:`2px solid ${ok?"#4ECDC4":"#ffcccc"}`, borderRadius:12, padding:"8px 4px" }}>
                        <div>{TIME_ICONS[t]}</div>
                        <div style={{ fontSize:12, fontWeight:800 }}>{t}</div>
                        <div style={{ fontSize:13, color:ok?"#4ECDC4":"#e55", fontWeight:800 }}>{dn}/{pm.length}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding:"12px 20px" }}>
                {meds.map((med: any) => (
                  <div key={med.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #f5f5f0" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:20, fontWeight:800 }}>{med.name}</div>
                      <div style={{ fontSize:15, color:"#888" }}>{med.dose} · {med.times.join(", ")}</div>
                      {med.notes && <div style={{ fontSize:14, color:"#e8a020" }}>⚠️ {med.notes}</div>}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => startEdit(u,med)} style={iconBtn}>✏️</button>
                      <button onClick={() => deleteMed(u,med.id)} style={iconBtn}>🗑️</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => startAdd(u)} style={{ width:"100%", marginTop:12, padding:"12px", background:"#f5f5f0", border:"2px dashed #ccc", borderRadius:14, fontSize:18, fontWeight:800, cursor:"pointer" }}>
                  + הוסף תרופה ל{u}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (screen==="add") {
    const target = editUser || who;
    return (
      <div dir="rtl" style={bg}>
        {msg && <Toast msg={msg} />}
        {saving && <Saving />}
        <Header title={editId?`ערוך — ${target}`:`הוסף ל${target}`} onBack={() => { setEditId(null); setEditUser(null); setScreen(who==="ילדים"?"monitor":"list"); }} />
        <div style={{ padding:"16px 16px 40px", maxWidth:500, margin:"0 auto" }}>
          <div style={lbl}>שם התרופה</div>
          <input value={form.name} onChange={(e:any)=>setForm((p:any)=>({...p,name:e.target.value}))} placeholder="לדוגמה: קרדילוק" style={inp} />
          <div style={lbl}>מינון / סוג</div>
          <input value={form.dose} onChange={(e:any)=>setForm((p:any)=>({...p,dose:e.target.value}))} placeholder='לדוגמה: 1.25 מ"ג כדור' style={inp} />
          <div style={lbl}>מתי לקחת</div>
          <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
            {TIMES.map(t => (
              <button key={t} onClick={() => toggleTime(t)} style={{
                padding:"14px 18px", borderRadius:14, fontSize:18, fontWeight:800, border:"3px solid", cursor:"pointer",
                borderColor:form.times.includes(t)?"#222":"#ddd",
                background:form.times.includes(t)?"#222":"#fff",
                color:form.times.includes(t)?"#fff":"#555",
              }}>{TIME_ICONS[t]} {t}</button>
            ))}
          </div>
          <div style={lbl}>הערות</div>
          <input value={form.notes} onChange={(e:any)=>setForm((p:any)=>({...p,notes:e.target.value}))} placeholder="לדוגמה: אנטיביוטיקה" style={inp} />
          <button onClick={saveForm} style={{ width:"100%", padding:20, background:"#222", color:"#fff", border:"none", borderRadius:18, fontSize:22, fontWeight:900, cursor:"pointer" }}>
            {editId?"שמור שינויים":"הוסף תרופה"}
          </button>
        </div>
      </div>
    );
  }

  const meds       = userMeds(who);
  const periodMeds = meds.filter((m: any) => m.times.includes(period));
  const allToday   = meds.flatMap((m: any) => m.times.map((t: string) => ({ m, t })));
  const doneToday  = allToday.filter(({ m, t }: any) => taken(who, m.id, t)).length;

  return (
    <div dir="rtl" style={bg}>
      {msg && <Toast msg={msg} />}
      {saving && <Saving />}
      <Header title={`${who==="יהודה"?"👴":"👵"} ${who}`} onBack={() => { setWho(null); setScreen("today"); }} extra={`${doneToday}/${allToday.length} היום`} />
      <div style={{ display:"flex", background:"#fff", borderBottom:"2px solid #eee" }}>
        {[["today","היום"],["list","התרופות שלי"]].map(([id,label]) => (
          <button key={id} onClick={() => setScreen(id)} style={{
            flex:1, padding:"16px", border:"none", background:"none", cursor:"pointer",
            fontSize:18, fontWeight:800,
            color:screen===id?"#222":"#aaa",
            borderBottom:screen===id?"3px solid #222":"3px solid transparent",
          }}>{label}</button>
        ))}
      </div>
      <div style={{ padding:"16px 16px 40px", maxWidth:500, margin:"0 auto" }}>
        {screen==="today" && <>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {TIMES.map(t => {
              const cnt = meds.filter((m: any) => m.times.includes(t)).length;
              const dn  = meds.filter((m: any) => m.times.includes(t) && taken(who,m.id,t)).length;
              const active = period===t;
              return (
                <button key={t} onClick={() => setPeriod(t)} style={{
                  flex:1, padding:"12px 4px", border:"none", borderRadius:16,
                  background:active?"#222":"#fff", color:active?"#fff":"#555",
                  fontSize:15, fontWeight:800, cursor:"pointer",
                  boxShadow:active?"0 4px 12px rgba(0,0,0,0.15)":"0 2px 6px rgba(0,0,0,0.06)",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                }}>
                  <span style={{ fontSize:22 }}>{TIME_ICONS[t]}</span>
                  <span>{t}</span>
                  {cnt>0 && <span style={{ fontSize:13, opacity:0.7 }}>{dn}/{cnt}</span>}
                </button>
              );
            })}
          </div>
          {periodMeds.length===0
            ? <div style={{ textAlign:"center", fontSize:22, color:"#aaa", marginTop:40 }}>אין תרופות ל{period}</div>
            : periodMeds.map((med: any) => {
              const t = taken(who, med.id, period);
              const isAb = med.notes?.includes("אנטיביוטיקה");
              return (
                <div key={med.id} onClick={() => toggle(who, med.id, period)} style={{
                  background:t?"#e8faf8":"#fff",
                  border:`3px solid ${t?"#4ECDC4":isAb?"#FFB347":"#e0e0e0"}`,
                  borderRadius:20, padding:"20px 22px", marginBottom:14,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:18,
                  boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
                }}>
                  <div style={{ width:54, height:54, borderRadius:"50%", flexShrink:0, background:t?"#4ECDC4":isAb?"#FFB347":"#eee", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, fontWeight:900, color:(isAb&&!t)?"#fff":"inherit" }}>
                    {t?"✓":isAb?"💉":"○"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:24, fontWeight:800 }}>{med.name}</div>
                    {med.dose  && <div style={{ fontSize:18, color:"#777", marginTop:2 }}>{med.dose}</div>}
                    {med.notes && <div style={{ fontSize:15, color:"#e8a020", marginTop:4 }}>⚠️ {med.notes}</div>}
                  </div>
                </div>
              );
            })
          }
          {doneToday===allToday.length && allToday.length>0 && (
            <div style={{ textAlign:"center", fontSize:26, fontWeight:800, color:"#4ECDC4", marginTop:20 }}>🎉 כל התרופות נלקחו!</div>
          )}
        </>}
        {screen==="list" && meds.map((med: any) => (
          <div key={med.id} style={{ background:"#fff", borderRadius:20, padding:"18px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:22, fontWeight:800 }}>{med.name}</div>
            <div style={{ fontSize:18, color:"#777", marginTop:4 }}>{med.dose}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
              {med.times.map((t: string) => <span key={t} style={{ background:"#f0f0f0", borderRadius:20, padding:"6px 14px", fontSize:16, fontWeight:700 }}>{TIME_ICONS[t]} {t}</span>)}
            </div>
            {med.notes && <div style={{ fontSize:16, color:"#e8a020", marginTop:8 }}>⚠️ {med.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ title, onBack, extra }: { title:string; onBack:()=>void; extra?:string }) {
  return (
    <div style={{ background:"#fff", borderBottom:"3px solid #eee", padding:"18px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <button onClick={onBack} style={{ background:"none", border:"none", fontSize:20, fontWeight:800, cursor:"pointer", color:"#555", fontFamily:"inherit" }}>← חזור</button>
      <div style={{ fontSize:22, fontWeight:900 }}>{title}</div>
      {extra && <div style={{ fontSize:18, fontWeight:700, color:"#4ECDC4" }}>{extra}</div>}
    </div>
  );
}
function Toast({ msg }: { msg:string }) {
  return <div style={{ position:"fixed", top:24, left:"50%", transform:"translateX(-50%)", background:"#222", color:"#fff", padding:"14px 32px", borderRadius:40, fontSize:22, fontWeight:700, zIndex:999, whiteSpace:"nowrap" }}>{msg}</div>;
}
function Saving() {
  return (
    <>
      <style>{`@keyframes p{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
      <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", background:"#222", color:"#fff", borderRadius:30, padding:"8px 18px", fontSize:15, fontWeight:700, zIndex:998, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ECDC4", animation:"p 1s infinite" }} />
        שומר...
      </div>
    </>
  );
}

const bg: any  = { minHeight:"100vh", background:"#f5f5f0", fontFamily:"'Arial Hebrew', Arial, sans-serif", color:"#111" };
const lbl: any = { fontSize:18, fontWeight:800, color:"#555", marginBottom:8 };
const inp: any = { width:"100%", padding:"16px", fontSize:22, fontFamily:"inherit", border:"3px solid #ddd", borderRadius:16, marginBottom:20, boxSizing:"border-box", outline:"none", textAlign:"right", background:"#fff" };
const iconBtn: any = { background:"none", border:"none", fontSize:22, cursor:"pointer", padding:"4px 8px" };
