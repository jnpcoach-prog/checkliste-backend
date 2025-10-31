import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: false }));

const BREVO_API = "https://api.brevo.com/v3";
const API_KEY = process.env.BREVO_API_KEY;

// IDs strikt aus Env lesen und prüfen
const DOI_TEMPLATE_ID = Number(process.env.BREVO_DLI_TEMPLATE_ID ?? process.env.BREVO_DLI_TEMPLATE_ID2);
const LIST_ID_SUPERFOOD = Number(process.env.BREVO_LIST_ID_SUPERFOOD);

// Danke-Seiten (hart gesetzt)
const THANKYOU_URL = "https://checkliste.onrender.com/danke";
const REDIRECT_URL  = "https://checkliste.onrender.com/danke?confirmed=1";

function invalid(msg) {
  console.error("[CONFIG] " + msg, {
    DOI_TEMPLATE_ID, LIST_ID_SUPERFOOD,
    hasApiKey: Boolean(API_KEY && API_KEY.startsWith("xkeysib-"))
  });
}

if (!API_KEY) invalid("BREVO_API_KEY fehlt!");
if (!Number.isInteger(DOI_TEMPLATE_ID)) invalid("BREVO_DLI_TEMPLATE_ID fehlt/ist ungültig!");
if (!Number.isInteger(LIST_ID_SUPERFOOD)) invalid("BREVO_LIST_ID_SUPERFOOD fehlt/ist ungültig!");

// Falls jemand /api/subscribe-form per GET aufruft, hübsch zur Danke-Seite umleiten
app.get("/api/subscribe-form", (req, res) => {
  return res.redirect("https://checkliste.onrender.com/danke?error=method");
});

app.post("/api/subscribe-form", async (req, res) => {
  try {
    const email = (req.body.email || "").trim();
    if (!email) return res.redirect(`${THANKYOU_URL}?error=missing`);

    // Vor dem Call: Payload ins Log
    const payload = {
      email,
      includeListIds: [LIST_ID_SUPERFOOD],
      templateId: DOI_TEMPLATE_ID,
      redirectionUrl: REDIRECT_URL
    };
    console.log("[DOI] Request payload:", payload);

    // Basiskonfiguration prüfen – wenn ungültig, gar nicht erst callen
    if (!API_KEY || !Number.isInteger(DOI_TEMPLATE_ID) || !Number.isInteger(LIST_ID_SUPERFOOD)) {
      console.error("[DOI] Abgebrochen: ungültige Konfiguration");
      return res.redirect(`${THANKYOU_URL}?error=config`);
    }

    const r = await fetch(`${BREVO_API}/contacts/doubleOptinConfirmation`, {
      method: "POST",
      headers: { "api-key": API_KEY, "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const txt = await r.text();
    console.log("[DOI] Brevo response:", r.status, txt || "(leer)");

    if (!r.ok) {
      console.error("[DOI] Fehler:", r.status, txt);
      return res.redirect(`${THANKYOU_URL}?error=brevo_${r.status}`);
    }

    return res.redirect(`${THANKYOU_URL}?ok=1`);
  } catch (e) {
    console.error("[DOI] Exception:", e);
    return res.redirect(`${THANKYOU_URL}?error=server`);
  }
});

app.get("/", (_, res) => res.send("Brevo-Connector läuft 🚀"));
app.listen(process.env.PORT || 3000, () => console.log("Server gestartet auf Port 3000"));
