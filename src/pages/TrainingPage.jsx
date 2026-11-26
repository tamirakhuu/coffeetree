import React, { useState, useEffect, useRef } from "react";
import { Check, Facebook, GraduationCap, Clock, Wallet, Users, Phone } from "lucide-react";
import { createQpayInvoice, checkQpayPayment, registerTraining, getTrainingSlots } from "../api.js";
import { T, inputStyle, sideLabel } from "../theme.js";
import { money, formatMnDate } from "../utils/format.js";

const TRAINING_FEE = 50000;

const TRAINING_PHOTOS = [
  { src: "/training-hero-latte.jpg", alt: "Цэсний сургалтын өдөр", caption: "CUPPA-гийн цэсний жор, орц найрлагыг гараар дадлагажуулан сурна." },
  { src: "/training-hero-class.jpg", alt: "Ундааны дадлага сургалт", caption: "Өнгө өнгийн меню, смүүтийг мэргэжлийн орцоор хэрхэн хийхийг сурна." },
];

function PageWash() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: -1,
      background: `radial-gradient(1100px 600px at 18% -10%, rgba(184,134,46,.12), transparent 60%),
        radial-gradient(900px 500px at 100% 10%, rgba(72,88,58,.10), transparent 55%),
        linear-gradient(180deg, ${T.cream} 0%, #FBF8F2 35%, ${T.paper} 100%)`,
    }} />
  );
}

export default function TrainingPage({ setView }) {
  const [form, setForm] = useState({ name: "", phone: "", date: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [sessions, setSessions] = useState([]);
  const [scheduleStatus, setScheduleStatus] = useState('loading');
  const [phase, setPhase] = useState("form"); // form | payment | done
  const [payment, setPayment] = useState(null); // { registrationId, invoice }
  const [payError, setPayError] = useState("");
  const bookingRequest = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => getTrainingSlots().then((rows) => {
      if (cancelled) return;
      setSessions(rows);
      setScheduleStatus('ready');
      setForm(prev => ({ ...prev, date: rows.some(r => r.training_date === prev.date && r.remaining_seats > 0)
        ? prev.date : rows.find(r => r.remaining_seats > 0)?.training_date || '' }));
    }).catch(() => { if (!cancelled) setScheduleStatus('error'); });
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
  const selectedSession = sessions.find(r => r.training_date === form.date);
  const cannotSubmit = status.state === 'submitting' || scheduleStatus !== 'ready' || !(selectedSession?.remaining_seats > 0);

  const seatsLeft = selectedSession?.remaining_seats;
  const infoCards = [
    { icon: Clock, label: "Хугацаа", value: "Зарласан Бямба, Ням гарагт 10:00–13:00" },
    { icon: Wallet, label: "Сургалтын төлбөр", value: "50,000₮ / 1 хүн" },
    { icon: Users, label: "Сул суудал", value: seatsLeft != null ? `${seatsLeft} хүн` : 'Доорх маягтаас өдрөө сонгоно уу', accent: seatsLeft != null && seatsLeft <= 3 },
    { icon: Phone, label: "Лавлах утасны дугаар", value: "91997525" },
  ];

  const loadTrainingInvoice = async (registrationId) => {
    setPayError('');
    try {
      const invoice = await createQpayInvoice({ registrationId, kind: 'training', description: `CUPPA сургалт бүртгэл #${registrationId}` });
      setPayment({ registrationId, invoice });
    } catch (error) {
      setPayError(error.message || 'Нэхэмжлэл үүсгэж чадсангүй. Дахин оролдоно уу.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cannotSubmit) return;
    if (!form.name.trim() || form.phone.trim().length !== 8 || !form.date) {
      setStatus({ state: "error", message: "Нэр, утасны дугаараа зөв бөглөнө үү." });
      return;
    }
    setStatus({ state: "submitting", message: "" });
    try {
      const key = JSON.stringify([form.name.trim(), form.phone.trim(), form.date]);
      if (bookingRequest.current?.key !== key) bookingRequest.current = { key, requestId: crypto.randomUUID() };
      const registrationId = await registerTraining({ name: form.name, phone: form.phone, trainingDate: form.date, requestId: bookingRequest.current.requestId });
      setPayment({ registrationId, invoice: null });
      setPhase("payment");
      await loadTrainingInvoice(registrationId);
    } catch (err) {
      setStatus({ state: "error", message: err.message || "Бүртгэхэд алдаа гарлаа." });
    }
  };

  useEffect(() => {
    if (phase !== "payment" || !payment?.invoice?.invoiceId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await checkQpayPayment({ invoiceId: payment.invoice.invoiceId, registrationId: payment.registrationId, kind: "training" });
        if (cancelled) return;
        if (res.paid) setPhase("done");
      } catch (err) {
        if (!cancelled) setPayError(err.message);
      }
    };
    const interval = setInterval(poll, 3000);
    poll();
    return () => { cancelled = true; clearInterval(interval); };
  }, [phase, payment]);

  if (phase === "payment") {
    const invoice = payment.invoice;
    if (!invoice) return <div>
      <PageWash />
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "80px 20px 100px", textAlign: "center" }}>
        <div style={{
          background: T.card, border: `1px solid ${T.line}`, borderRadius: 20, padding: 28,
          boxShadow: "0 10px 30px rgba(36,28,20,.08)",
        }}>
          <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 19, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Сургалтын бүртгэл #{payment.registrationId}</h1>
          <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.inkSoft, marginBottom: payError ? 16 : 0 }}>{payError || 'Төлбөрийн нэхэмжлэл үүсгэж байна…'}</p>
          {payError && <button onClick={() => loadTrainingInvoice(payment.registrationId)} style={{
            background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "11px 22px",
            fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
          }}>Төлбөр дахин оролдох</button>}
        </div>
      </div>
    </div>;
    return (
      <div>
        <PageWash />
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "60px 20px 100px", textAlign: "center" }}>
          <div style={{
            background: T.card, border: `1px solid ${T.line}`, borderRadius: 24, padding: "28px 26px",
            boxShadow: "0 14px 36px rgba(36,28,20,.1)",
          }}>
            <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 6 }}>QPay-ээр төлөх</h1>
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, marginBottom: 22 }}>
              Сургалтын бүртгэл #{payment.registrationId} — <b style={{ color: T.ink }}>{money(TRAINING_FEE)}</b>
            </div>
            {invoice.demo && (
              <div style={{
                fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.moss, background: T.cream,
                border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 14px", marginBottom: 20,
              }}>Demo горим — QPay мерчант эрх тохируулаагүй тул {"15 секундийн дараа автоматаар \"төлөгдсөн\" гэж үзнэ."}</div>
            )}
            {invoice.qrImage && (
              <img src={`data:image/png;base64,${invoice.qrImage}`} alt="QPay QR"
                style={{ width: 220, height: 220, borderRadius: 14, border: `1px solid ${T.line}`, background: "#fff", padding: 10 }} />
            )}
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.inkSoft, margin: "18px 0 20px" }}>
              Банкны аппаараа энэ QR кодыг уншуулж төлнө үү.
            </div>
            {invoice.urls?.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>Эсвэл банкны аппаа сонгон шууд төлөх</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {invoice.urls.map((u) => (
                    <a key={u.name} href={u.link} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 5, textDecoration: "none", color: T.ink,
                    }}>
                      <img src={u.logo} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} style={{
                        width: 44, height: 44, borderRadius: 12, objectFit: "contain", border: `1px solid ${T.line}`, background: "#fff",
                      }} />
                      <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 10.5, textAlign: "center", lineHeight: 1.2 }}>{u.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.inkSoft, marginBottom: payError ? 12 : 0 }}>
              Төлбөр хийгдэхийг автоматаар шалгаж байна…
            </div>
            {payError && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{payError}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div>
        <PageWash />
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "90px 20px 110px", textAlign: "center" }}>
          <div style={{
            background: T.card, border: `1px solid ${T.line}`, borderRadius: 24, padding: "34px 28px",
            boxShadow: "0 14px 36px rgba(36,28,20,.1)",
          }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.moss, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Check size={30} color="#fff" />
            </div>
            <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Бүртгэл, төлбөр амжилттай!</h1>
            <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginBottom: 16 }}>
              Баярлалаа. Та бусдыгаа хүндэтгэн сонгосон өдрөө цагаа баримтлан ирээрэй. Танд амжилт хүсье!
            </p>
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left",
              background: T.cream, borderRadius: 12, padding: "12px 14px",
              fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5,
            }}>
              <span style={{ flexShrink: 0 }}>📍</span>
              <span>Сургалт болох хаяг: СБД-7р хороо, Улсын их дэлгүүрийн чанх хойно, 8-р байр, Монголын баристагийн холбоо.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageWash />
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px", position: "relative" }}>
      <div style={{ paddingTop: 44, paddingBottom: 10 }}>
        <div className="cuppa-training-hero-title" style={{ textAlign: "center", marginBottom: 34 }}>
          <div style={{ ...sideLabel, textAlign: "center", marginBottom: 12 }}>CUPPA</div>
          <h1 style={{
            fontFamily: "'Ubuntu', sans-serif", fontSize: 36, fontWeight: 700, color: T.ink, marginBottom: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <GraduationCap size={30} color={T.cherry} /> Сургалт
          </h1>
          <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 15, color: T.inkSoft, lineHeight: 1.6 }}>
            Нэг өдрийн BASIC меню сургалт
          </p>
        </div>

        <div style={{ overflow: "hidden", margin: "0 -20px" }}>
          <div className="cuppa-training-marquee" style={{ display: "flex", width: "max-content", gap: 18, padding: "0 20px" }}>
            {[...TRAINING_PHOTOS, ...TRAINING_PHOTOS].map((p, i) => (
              <div key={i} className="cuppa-training-marquee-item" style={{ flex: "none", width: 180 }}>
                <div style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 14px 30px rgba(36,28,20,.16)", border: `1px solid ${T.line}` }}>
                  <img src={p.src} alt={p.alt} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
                </div>
                <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.inkSoft, lineHeight: 1.5, marginTop: 10, textAlign: "center" }}>
                  {p.caption}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 460, margin: "0 auto", textAlign: "center", padding: "10px 0 100px" }}>
      <div style={{
        background: T.card, border: `1px solid ${T.line}`, borderRadius: 24, textAlign: "left",
        boxShadow: "0 16px 40px rgba(36,28,20,.08)", overflow: "hidden",
      }}>
        <div style={{ padding: "8px 24px" }}>
          {infoCards.map((c, i) => (
            <div key={c.label} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
              borderTop: i > 0 ? `1px solid ${T.line}` : "none",
            }}>
              <div style={{
                width: 36, height: 36, flexShrink: 0, borderRadius: "50%", background: T.cream,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <c.icon size={17} color={c.accent ? T.cherry : T.moss} />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, flexShrink: 0 }}>{c.label}</span>
                <span style={{
                  fontFamily: "'Ubuntu', sans-serif", fontSize: 14, fontWeight: 700, textAlign: "right",
                  color: c.accent ? T.cherry : T.ink,
                }}>{c.value}</span>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{
          borderTop: `1px solid ${T.line}`, background: T.cream, padding: 26,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Сургалтанд бүртгүүлэх</div>
          <input required placeholder="Нэр" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          <input required placeholder="Утасны дугаар" inputMode="numeric" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 8) })} style={inputStyle} />
          {sessions.length > 0 ? (
            <select required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle}>
              <option value="" disabled>Сургалтын өдрөө сонгоно уу</option>
              {sessions.map((session) => {
                const key = session.training_date;
                const d = new Date(key + 'T00:00:00');
                const remaining = session.remaining_seats;
                return (
                  <option key={key} value={key} disabled={remaining === 0}>
                    {formatMnDate(d)} ({d.getDay() === 6 ? 'Бямба' : 'Ням'}) — {remaining === 0 ? "Дүүрсэн" : `${remaining} сул суудал`}
                  </option>
                );
              })}
            </select>
          ) : (
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft }}>
              {scheduleStatus === 'loading' ? 'Хуваарь ачаалж байна…' : scheduleStatus === 'error' ? 'Хуваарь ачаалж чадсангүй. Дахин оролдоно уу.' : 'Одоогоор сургалтын өдөр зарлагдаагүй байна.'}
            </div>
          )}
          {scheduleStatus === 'error' && sessions.length > 0 && <div role="alert">Хуваарь шинэчилж чадсангүй. Түр хүлээгээд дахин оролдоно уу.</div>}
          <button type="submit" disabled={cannotSubmit} style={{
            background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "13px 26px",
            fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14.5,
            cursor: cannotSubmit ? "default" : "pointer",
            opacity: cannotSubmit ? 0.6 : 1,
            boxShadow: cannotSubmit ? "none" : "0 8px 20px rgba(122,46,46,.25)",
          }}>
            {status.state === "submitting" ? "Илгээж байна..." : "Төлбөр төлөх"}
          </button>
          {status.message && (
            <div style={{
              fontFamily: "'Ubuntu', sans-serif", fontSize: 13, textAlign: "center",
              color: status.state === "error" ? T.cherry : T.green,
            }}>{status.message}</div>
          )}
        </form>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 24 }}>
        <button onClick={() => setView({ name: "training-status" })} style={{
          background: T.card, border: `1px solid ${T.line}`, borderRadius: 999, cursor: "pointer", padding: "10px 18px",
          fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, fontWeight: 600, color: T.ink,
        }}>Бүртгэлээ шалгах</button>

        <a href="https://www.facebook.com/story.php?story_fbid=1718737009910137&id=100053215639953&mibextid=wwXIfr&rdid=bRHS4Vps7cW2axeE#"
          target="_blank" rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "transparent",
            border: `1px solid ${T.line}`, borderRadius: 999, padding: "10px 18px",
            color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, fontWeight: 600, textDecoration: "none",
          }}>
          <Facebook size={14} /> Дэлгэрэнгүй мэдээлэл
        </a>
      </div>
      </div>
    </div>
    </div>
  );
}
