import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 't.clement@cactus-codex.com'

export async function sendOTPEmail(email: string, code: string, name: string) {
  const { error } = await resend.emails.send({
    from: `Cactus Codex <${FROM}>`,
    to: email,
    subject: `[${code}] — Votre code de connexion Cactus Codex`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Code de connexion</title>
</head>
<body style="margin:0;padding:0;background:#060d08;font-family:'Courier New',monospace">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111a12;border:1px solid #233428;border-radius:12px;overflow:hidden">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #192b1b">
              <div style="font-family:'Courier New',monospace;font-size:11px;color:#384e3c;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">// CACTUS CODEX</div>
              <div style="font-size:22px;font-weight:900;color:#4ade80;letter-spacing:2px">CONTROL CENTER</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px">
              <p style="color:#6fa876;font-size:13px;margin:0 0 6px">Bonjour <strong style="color:#d8eedd">${name}</strong>,</p>
              <p style="color:#384e3c;font-size:12px;margin:0 0 28px;line-height:1.7">
                Vous avez demandé un accès sécurisé au Control Center de Cactus Codex.<br>
                Voici votre code de vérification à usage unique, valable <strong style="color:#6fa876">10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#0a120c;border:1px solid #2d6b45;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
                <div style="font-family:'Courier New',monospace;font-size:9px;color:#384e3c;letter-spacing:3px;margin-bottom:12px;text-transform:uppercase">Code de vérification</div>
                <div style="font-size:40px;font-weight:900;color:#4ade80;letter-spacing:16px;font-family:'Courier New',monospace">${code}</div>
              </div>

              <p style="color:#384e3c;font-size:11px;margin:0;line-height:1.8">
                ⚠ Ce code expire dans 10 minutes.<br>
                ⚠ Ne partagez jamais ce code.<br>
                ⚠ Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #192b1b">
              <div style="font-family:'Courier New',monospace;font-size:9px;color:#384e3c;letter-spacing:2px">
                cactus-codex.com — Système de sécurité automatisé
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  })

  if (error) {
    console.error('[Email] Erreur envoi OTP:', error)
    throw new Error('Échec de l\'envoi du code')
  }
}
