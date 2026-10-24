// Modèles d'e-mails d'authentification, en français. Collés dans Supabase :
// Authentication > Emails > Templates (une page par modèle). Couleurs en hex : les clients mail ignorent oklch.
import { writeFileSync } from "node:fs";

const page = (title, body, button, url, after) => `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#f4f1ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf9;border:1px solid #e2dccf;border-radius:8px;">
<tr><td style="padding:28px 32px 8px;font-family:Georgia,'Times New Roman',serif;color:#2d5a3d;font-size:15px;">Mon Arbre Généalogique</td></tr>
<tr><td style="padding:8px 32px 0;font-family:Georgia,'Times New Roman',serif;color:#1d2a22;font-size:24px;line-height:1.3;">${title}</td></tr>
<tr><td style="padding:14px 32px 0;font-family:Arial,Helvetica,sans-serif;color:#33413a;font-size:16px;line-height:1.6;">${body}</td></tr>
${button ? `<tr><td style="padding:24px 32px 8px;"><a href="${url}" style="display:inline-block;background:#2d5a3d;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 24px;border-radius:6px;">${button}</a></td></tr>` : ""}
<tr><td style="padding:16px 32px 28px;font-family:Arial,Helvetica,sans-serif;color:#5b665f;font-size:13px;line-height:1.6;">${after}</td></tr>
</table>
<p style="font-family:Arial,Helvetica,sans-serif;color:#7a837c;font-size:12px;margin:16px 0 0;">Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.</p>
</td></tr></table></body></html>`;

const ignore = "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message : rien ne sera modifié.";
const link = (u) =>
  `Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br><span style="word-break:break-all;color:#2d5a3d;">${u}</span>`;

export const TEMPLATES = {
  "confirm-sign-up": {
    subject: "Confirmez votre adresse e-mail",
    html: page(
      "Bienvenue !",
      "Il reste une étape pour commencer votre arbre : confirmer que cette adresse e-mail est bien la vôtre.",
      "Confirmer mon adresse",
      "{{ .ConfirmationURL }}",
      `${link("{{ .ConfirmationURL }}")}<br><br>${ignore}`,
    ),
  },
  "invite-user": {
    subject: "On vous invite sur Mon Arbre Généalogique",
    html: page(
      "Vous êtes invité(e)",
      "Un membre de votre famille vous invite à découvrir son arbre généalogique et à le compléter avec lui.",
      "Accepter l'invitation",
      "{{ .ConfirmationURL }}",
      `${link("{{ .ConfirmationURL }}")}<br><br>Vous ne connaissez pas l'expéditeur ? Ignorez ce message.`,
    ),
  },
  "magic-link": {
    subject: "Votre lien de connexion",
    html: page(
      "Connexion à votre arbre",
      "Cliquez sur le bouton pour vous connecter, sans mot de passe. Le lien ne sert qu'une fois.",
      "Me connecter",
      "{{ .ConfirmationURL }}",
      `Ou saisissez ce code : <strong style="font-size:16px;color:#1d2a22;">{{ .Token }}</strong><br><br>${ignore}`,
    ),
  },
  "change-email-address": {
    subject: "Confirmez votre nouvelle adresse e-mail",
    html: page(
      "Changement d'adresse",
      "Vous avez demandé à remplacer {{ .Email }} par {{ .NewEmail }}. Confirmez pour terminer le changement.",
      "Confirmer la nouvelle adresse",
      "{{ .ConfirmationURL }}",
      `${link("{{ .ConfirmationURL }}")}<br><br>${ignore}`,
    ),
  },
  "reset-password": {
    subject: "Choisissez un nouveau mot de passe",
    html: page(
      "Mot de passe oublié",
      "Pas de souci, cela arrive. Cliquez sur le bouton pour choisir un nouveau mot de passe.",
      "Choisir un nouveau mot de passe",
      "{{ .ConfirmationURL }}",
      `${link("{{ .ConfirmationURL }}")}<br><br>${ignore}`,
    ),
  },
  reauthentication: {
    subject: "Votre code de confirmation",
    html: page(
      "Confirmez que c'est bien vous",
      `Saisissez ce code dans l'application pour continuer :<br><strong style="display:inline-block;margin-top:12px;font-size:26px;letter-spacing:4px;color:#1d2a22;">{{ .Token }}</strong>`,
      "",
      "",
      ignore,
    ),
  },
};

if (process.argv[2] === "--write")
  for (const [k, t] of Object.entries(TEMPLATES))
    writeFileSync(new URL(`./${k}.html`, import.meta.url), `<!-- Sujet : ${t.subject} -->\n${t.html}\n`);
