import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabase";

// ── Helpers ──────────────────────────────────────────────────────
const fmt = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const parseNum = (s) => Number(String(s).replace(/[^\d]/g, "")) || 0;
const newCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

// Read the bill code from the URL (?bill=XXXXXX). Empty = home screen.
const codeFromUrl = () =>
  new URLSearchParams(window.location.search).get("bill") || "";

// ── "Remember me" — store this person's id+name on THIS device ────
const ME_KEY = "bagibill_me";
const loadMe = () => {
  try {
    return JSON.parse(localStorage.getItem(ME_KEY) || "null");
  } catch {
    return null;
  }
};
const saveMe = (me) => localStorage.setItem(ME_KEY, JSON.stringify(me));

export default function App() {
  const [me, setMe] = useState(loadMe());          // {id, name}
  const [billCode, setBillCode] = useState(codeFromUrl());

  if (!billCode) return <Home me={me} setMe={setMe} setBillCode={setBillCode} />;
  return <Bill code={billCode} me={me} setMe={setMe} />;
}

// ════════════════════════════════════════════════════════════════
//  HOME — create a new bill, or your name if first time
// ════════════════════════════════════════════════════════════════
function Home({ me, setMe, setBillCode }) {
  const [name, setName] = useState(me?.name || "");
  const [bank, setBank] = useState("");

  const ensureMe = useCallback(async () => {
    if (me) return me;
    const { data, error } = await supabase
      .from("people")
      .insert({ name: name.trim(), bank: bank.trim() })
      .select()
      .single();
    if (error) {
      alert("Could not save your name: " + error.message);
      return null;
    }
    const m = { id: data.id, name: data.name };
    saveMe(m);
    setMe(m);
    return m;
  }, [me, name, bank, setMe]);

  const createBill = async () => {
    if (!name.trim()) return alert("Enter your name first.");
    const m = await ensureMe();
    if (!m) return;
    const code = newCode();
    const { error } = await supabase
      .from("bills")
      .insert({ code, title: "Split Bill", primary_id: m.id });
    if (error) return alert(error.message);
    await supabase.from("bill_members").insert({ bill_id: await billId(code), person_id: m.id });
    window.history.pushState({}, "", `?bill=${code}`);
    setBillCode(code);
  };

  return (
    <Shell>
      <Header />
      <Section label={me ? `Welcome back, ${me.name}` : "Your name"}>
        {!me && (
          <>
            <input className="bb-input" placeholder="Your name" value={name}
              onChange={(e) => setName(e.target.value)} />
            <input className="bb-input" style={{ marginTop: 8 }}
              placeholder="Your bank · account no. (optional)"
              value={bank} onChange={(e) => setBank(e.target.value)} />
          </>
        )}
        <button className="bb-btn" style={{ width: "100%", marginTop: 12 }} onClick={createBill}>
          Create a new bill
        </button>
        <p className="bb-note">
          You'll get a share link. Drop it in your WhatsApp group  — anyone who taps it joins this bill.
        </p>
      </Section>
    </Shell>
  );
}

aqync function billId(code) {
  const { data } = await supabase.from("bills").select("id").eq("code", code).single();
  return data?.id;
}
