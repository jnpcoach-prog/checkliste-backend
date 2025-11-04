import express from "express";
import fetch from "node-fetch";
import cors from "cors"; // <-- KORREKTUR 1: Mein Syntax-Fehler (import statt require)

const app = express();
app.use(express.urlencoded({ extended: false }));

// --- ANFANG KORREKTUR 2: Der CORS-FIX (gegen "Ups, schiefgelaufen") ---
// HIERMUSST DU DEINE LIVE-DOMAIN EINTRAGEN!
// (Die URL, auf der deine index.html mit dem Formular liegt)
const allowedOrigin = "https://checkliste.jnp-coach.com"; // <-- BITTE ANPASSEN, WENN FALSCH!

const corsOptions = {
  origin: allowedOrigin 
};

app.use(cors(corsOptions));
// --- ENDE KORREKTUR 2 ---


const BREVO_API = "https://api.brevo.com/v3";
const API_KEY = process.env.BREVO_API_KEY;

// IDs aus Env
const LIST_ID_SUPERFOOD = Number(process.env.BREVO_LIST_ID_SUPERFOOD);

// Danke-Seite (Frontend) - WIRD JETZT NICHT MEHR FÜR DEN REDIRECT BENÖTIGT
const THANKYOU_URL = "https://checkliste.onrender.com/danke";

function invalid(msg) {
  console.error("[CONFIG] " + msg, {
    LIST_ID_SUPERFOOD,
    hasApiKey: Boolean(API_KEY && API_KEY.startsWith("xkeysib-"))
  });
}

if (!API_KEY) invalid("BREVO_API_KEY fehlt!");
if (!Number.isInteger(LIST_ID_SUPERFOOD)) invalid("BREVO_LIST_ID_SUPERFOOD fehlt/ist ungültig!");

// GET auf die API-Route -> sauber zur Danke-Seite
app.get("/api/subscribe-form", (_req, res) => {
  // Diese Weiterleitung ist OK (falls jemand die URL direkt aufruft)
  return res.redirect(`${THANKYOU_URL}?error=method`);
});

// POST: Kontakt in Liste anlegen (Single-Opt-In)
app.post("/api/subscribe-form", async (req, res) => {
  try {
    const email = (req.body.email || "").trim();

    // --- ANFANG KORREKTUR 3: (Logik-Fehler: res.json statt res.redirect) ---
    if (!email) {
      console.error("[CONTACT] Abgebrochen: E-Mail fehlt");
      return res.status(400).json({ success: false, error: 'missing_email' });
    }

    // Richtiger Payload für POST /contacts
    const payload = {
      email,
      listIds: [LIST_ID_SUPERFOOD],
      updateEnabled: true // falls Kontakt schon existiert -> Liste wird ergänzt
    };
    console.log("[CONTACT] Request payload:", payload);

    if (!API_KEY || !Number.isInteger(LIST_ID_SUPERFOOD)) {
      console.error("[CONTACT] Abgebrochen: ungültige Konfiguration");
      return res.status(500).json({ success: false, error: 'invalid_config' });
    }

    const r = await fetch(`${BREVO_API}/contacts`, {
      method: "POST",
      headers: {
        "api-key": API_KEY,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const txt = await r.text();
    console.log("[CONTACT] Brevo response:", r.status, txt || "(leer)");

    // 201 = erstellt, 204 = geupdatet
    if (r.status !== 201 && r.status !== 204) {
      console.error("[CONTACT] Brevo-Fehler:", r.status, txt);
      return res.status(500).json({ success: false, error: `brevo_error_${r.status}` });
    }

    // ERFOLG! Sende eine "OK"-Nachricht an das Pop-up-Script
    return res.status(200).json({ success: true, brevo_response: txt });
  } catch (e) {
    console.error("[CONTACT] Exception:", e);
    return res.status(500).json({ success: false, error: 'server_exception' });
  }
  // --- ENDE KORREKTUR 3 ---
});

// Healthcheck
app.get("/", (_req, res) => res.send("Brevo-Connector läuft 🚀"));
app.listen(process.env.PORT || 3000, () => console.log("Server gestartet auf Port 3000"));
