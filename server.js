import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: false }));

const BREVO_API = "https://api.brevo.com/v3";
const API_KEY = process.env.BREVO_API_KEY;
const DOI_TEMPLATE_ID = parseInt(process.env.BREVO_DLI_TEMPLATE_ID, 10);
const LIST_ID_SUPERFOOD = parseInt(process.env.BREVO_LIST_ID_SUPERFOOD, 10);

// Danke-Seite NACH Formular-Absenden (Frontend-URL!)
const THANKYOU_URL = process.env.THANKYOU_URL; // z.B. https://checkliste.onrender.com/danke
// Danke/Redirect NACH DOI-Klick (in der DOI-Mail)
const REDIRECT_URL = process.env.BREVO_REDIRECT_URL; // z.B. https://checkliste.onrender.com/danke?confirmed=1

app.post("/api/subscribe-form", async (req, res) => {
  try {
    const email = (req.body.email || "").trim();
    if (!email) return res.redirect(`${THANKYOU_URL}?error=missing`);

    const payload = {
      email,
      includeListIds: [LIST_ID_SUPERFOOD],
      templateId: DOI_TEMPLATE_ID,
      redirectionUrl: REDIRECT_URL
    };

    await fetch(`${BREVO_API}/contacts/doubleOptinConfirmation`, {
      method: "POST",
      headers: { "api-key": API_KEY, "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    // Immer zurück zur Danke-Seite deiner Landingpage
    return res.redirect(THANKYOU_URL);
  } catch {
    return res.redirect(`${THANKYOU_URL}?error=server`);
  }
});

app.get("/", (_, res) => res.send("OK"));
app.listen(process.env.PORT || 3000);
