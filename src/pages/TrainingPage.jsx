import React, { useState, useEffect, useMemo } from "react";
import { Check, Facebook } from "lucide-react";
import { createQpayInvoice, checkQpayPayment, registerTraining, getTrainingSlots } from "../api.js";
import { T, money, inputStyle, formatMnDate } from "../components/storefront.jsx";

function toDateInputValue(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function saturdaysInCurrentMonth() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const year = now.getFullYear(), month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dates = [];
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === 6 && d > now) dates.push(d);
  }
  return dates;
}

const TRAINING_FEE = 50000;

const TRAINING_CAPACITY = 18;

export default function TrainingPage({ setView }) {
  const saturdays = useMemo(() => saturdaysInCurrentMonth(), []);
  const [form, setForm] = useState({ name: "", phone: "", date: saturdays[0] ? toDateInputValue(saturdays[0]) : "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [slots, setSlots] = useState({}); // { 'YYYY-MM-DD': takenCount }
  const [phase, setPhase] = useState("form"); // form | payment | done
  const [payment, setPayment] = useState(null); // { registrationId, invoice }
  const [payError, setPayError] = useState("");

  const dateKeys = useMemo(() => saturdays.map(toDateInputValue), [saturdays]);

  useEffect(() => {
    let cancelled = false;
    getTrainingSlots(dateKeys).then((rows) => {
      if (cancelled) return;
      const map = {};
      rows.forEach((r) => { map[r.training_date] = Number(r.taken) || 0; });
      setSlots(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [dateKeys]);

  const infoCards = [
    { label: "Хугацаа", value: "Бямба гарагт, 10:00-13:00 цагийн хооронд явагдана" },
    { label: "Сургалтын төлбөр", value: "50,000₮ / 1 хүн" },
    { label: "Багтаамж", value: "Нэг өдрийн сургалтын багтаамж нь 18 хүн" },
    { label: "Лавлах утасны дугаар", value: "91997525"},
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.phone.trim().length < 6 || !form.date) {
      setStatus({ state: "error", message: "Нэр, утасны дугаараа зөв бөглөнө үү." });
      return;
    }
    setStatus({ state: "submitting", message: "" });
    try {
      const registrationId = await registerTraining({ name: form.name, phone: form.phone, trainingDate: form.date });
      const invoice = await createQpayInvoice({
        registrationId, kind: "training",
        description: `CUPPA сургалт бүртгэл #${registrationId}`,
      });
      setPayment({ registrationId, invoice });
      setPhase("payment");
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
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 20px 100px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 6 }}>QPay-ээр төлөх</h1>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, marginBottom: 26 }}>
          Сургалтын бүртгэл #{payment.registrationId} — {money(TRAINING_FEE)}
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
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.inkSoft, marginBottom: 20 }}>
          Төлбөр хийгдэхийг автоматаар шалгаж байна…
        </div>
        {payError && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{payError}</div>}
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "90px 20px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.moss, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Check size={30} color="#fff" />
        </div>
        <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Бүртгэл, төлбөр амжилттай!</h1>
        <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.inkSoft }}>Баярлалаа. Та бусдыгаа хүндэтгэн сонгосон өдрөө цагаа баримтлан ирээрэй. Танд амжилт хүсье! <li>Сургалт болох хаяг: СБД-7р хороо Улсын их дэлгүүрийн чанх хойно 8-р байр Монголын баристагийн холбоо.</li></p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        position: "fixed", inset: 0, backgroundImage: "url(/surgalt.png)",
        backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
      }} />
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px", position: "relative" }}>
      <div className="cuppa-training-hero" style={{
        display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr", gap: 30, alignItems: "center",
        minHeight: "78vh", paddingTop: 50, paddingBottom: 30,
      }}>
        <div>
          <img src="/training-hero-latte.jpg" alt="Цэсний сургалтын өдөр" className="cuppa-training-hero-media" style={{
            width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 20,
            boxShadow: "0 14px 34px rgba(36,28,20,.2)", display: "block",
          }} />
          <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginTop: 14, textAlign: "center" }}>
            CUPPA-гийн цэсний жор, орц найрлагыг гараар дадлагажуулан сурна.
          </p>
        </div>
        <div className="cuppa-training-hero-title" style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 34, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Сургалт</h1>
          <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 15, color: T.inkSoft, lineHeight: 1.6 }}>
            Нэг өдрийн BASIC меню сургалт
          </p>
        </div>
        <div>
          <img src="/training-hero-class.jpg" alt="Ундааны дадлага сургалт" className="cuppa-training-hero-media" style={{
            width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 20,
            boxShadow: "0 14px 34px rgba(36,28,20,.2)", display: "block",
          }} />
          <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginTop: 14, textAlign: "center" }}>
            Өнгө өнгийн меню, смүүтийг мэргэжлийн орцоор хэрхэн хийхийг сурна.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 440, margin: "0 auto", textAlign: "center", padding: "0 0 100px" }}>
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: "6px 22px", maxWidth: 440, margin: "0 auto 36px", textAlign: "left" }}>
        {infoCards.map((c, i) => (
          <div key={c.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, padding: "13px 0",
            borderTop: i > 0 ? `1px solid ${T.line}` : "none",
          }}>
            <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft, flexShrink: 0 }}>{c.label}</span>
            <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 14.5, fontWeight: 700, color: T.ink, textAlign: "right" }}>{c.value}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{
        background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 26,
        display: "flex", flexDirection: "column", gap: 14, textAlign: "left", maxWidth: 440, margin: "0 auto",
      }}>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Сургалтанд бүртгүүлэх</div>
        <input required placeholder="Нэр" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        <input required placeholder="Утасны дугаар" inputMode="numeric" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 8) })} style={inputStyle} />
        {saturdays.length > 0 ? (
          <select required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle}>
            {saturdays.map((d) => {
              const key = toDateInputValue(d);
              const remaining = Math.max(0, TRAINING_CAPACITY - (slots[key] || 0));
              return (
                <option key={key} value={key} disabled={remaining === 0}>
                  {formatMnDate(d)} (Бямба) — {remaining === 0 ? "Дүүрсэн" : `${remaining} сул суудал`}
                </option>
              );
            })}
          </select>
        ) : (
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft }}>
            Энэ сард үлдсэн сургалтын өдөр алга. Дараа сар шинэчлэгдэхийг хүлээнэ үү.
          </div>
        )}
        <button type="submit" disabled={status.state === "submitting" || saturdays.length === 0} style={{
          background: T.ink, color: T.cream, border: "none", borderRadius: 999, padding: "12px 26px",
          fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14,
          cursor: (status.state === "submitting" || saturdays.length === 0) ? "default" : "pointer",
          opacity: (status.state === "submitting" || saturdays.length === 0) ? 0.7 : 1,
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

      <button onClick={() => setView({ name: "training-status" })} style={{
        background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 20,
        fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft, textDecoration: "underline",
      }}>Аль хэдийн бүртгүүлсэн үү? Бүртгэлээ шалгах</button>
      <br />

      <a href="https://www.facebook.com/story.php?story_fbid=1718737009910137&id=100053215639953&mibextid=wwXIfr&rdid=bRHS4Vps7cW2axeE#"
        target="_blank" rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20,
          color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 13, textDecoration: "none",
        }}>
        <Facebook size={14} /> Дэлгэрэнгүй мэдээлэл
      </a>
      </div>
    </div>
    </div>
  );
}
