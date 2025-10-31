import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: false }));

const BREVO_API = "https://api.brevo.com/v3";
const API_KEY = process.env.BREVO_API_KEY;

// IDs aus Env
const LIST_ID_SUPERFOOD = Number(process.env.BREVO_LIST_ID_SUPERFOOD);

// Danke-Seite (Frontend)
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
  return res.redirect(`${THANKYOU_URL}?error=method`);
});

// POST: Kontakt in Liste anlegen (Single-Opt-In)
app.post("/api/subscribe-form", async (req, res) => {
  try {
    const email = (req.body.email || "").trim();
    if (!email) return res.redirect(`${THANKYOU_URL}?error=missing`);

    // Richtiger Payload für POST /contacts
    const payload = {
      email,
      listIds: [LIST_ID_SUPERFOOD],
      updateEnabled: true // falls Kontakt schon existiert -> Liste wird ergänzt
    };
    console.log("[CONTACT] Request payload:", payload);

    if (!API_KEY || !Number.isInteger(LIST_ID_SUPERFOOD)) {
      console.error("[CONTACT] Abgebrochen: ungültige Konfiguration");
      return res.redirect(`${THANKYOU_URL}?error=config`);
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

    // 201 = erstellt, 204 = geupdatet (je nach API-Version/Status)
    if (r.status !== 201 && r.status !== 204) {
      console.error("[CONTACT] Fehler:", r.status, txt);
      return res.redirect(`${THANKYOU_URL}?error=brevo_${r.status}`);
    }

    // Erfolg -> Danke
    return res.redirect(`${THANKYOU_URL}?ok=1`);
  } catch (e) {
    console.error("[CONTACT] Exception:", e);
    return res.redirect(`${THANKYOU_URL}?error=server`);
  }
});

// Healthcheck
app.get("/", (_req, res) => res.send("Brevo-Connector läuft 🚀"));
app.listen(process.env.PORT || 3000, () => console.log("Server gestartet auf Port 3000"));
