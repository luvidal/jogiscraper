import nodemailer from 'nodemailer'
import { htmlToText } from 'html-to-text'

const isDev = process.env.NODE_ENV !== 'production'

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function sendEmail({ to, subject, html, attachments = [] }) {
  if (!isEmail(to)) throw new Error('Invalid email')

  const { SES_SMTP_USER: user, SES_SMTP_PASS: pass } = process.env
  if (!user || !pass) {
    console.warn('Missing SES SMTP credentials - email not sent')
    return null
  }

  const transport = nodemailer.createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: isDev ? 587 : 465,
    secure: !isDev,
    auth: { user, pass }
  })

  try {
    const result = await transport.sendMail({
      from: 'no-reply@jogi.cl',
      to: to.trim().toLowerCase(),
      subject,
      html,
      text: htmlToText(html),
      attachments
    })
    return result
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export async function sendNewRequestNotification({ requestId, rut, email, documento, documents, deliveryMethod, claveunica }) {
  const docList = Array.isArray(documents) ? documents : [documents]
  const deliveryList = Array.isArray(deliveryMethod) ? deliveryMethod : [deliveryMethod]

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #020617 0%, #0e7490 55%, #020617 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .footer { background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { text-align: left; padding: 10px; background: #0e7490; color: white; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f2f2f2; }
        .docs-list { margin: 10px 0; padding-left: 20px; }
        .docs-list li { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Nueva Solicitud Recibida</h2>
        </div>
        <div class="content">
          <p>Se ha recibido una nueva solicitud de documentos:</p>

          <table>
            <tr>
              <th colspan="2">Datos de la Solicitud</th>
            </tr>
            <tr>
              <td><strong>ID Solicitud</strong></td>
              <td>#${requestId}</td>
            </tr>
            <tr>
              <td><strong>RUT</strong></td>
              <td>${rut}</td>
            </tr>
            <tr>
              <td><strong>Documento</strong></td>
              <td>${documento || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>ClaveÚnica</strong></td>
              <td>${claveunica || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Email Solicitante</strong></td>
              <td>${email}</td>
            </tr>
            <tr>
              <td><strong>Método de Entrega</strong></td>
              <td>${deliveryList.join(', ')}</td>
            </tr>
            <tr>
              <td><strong>Fecha/Hora</strong></td>
              <td>${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</td>
            </tr>
          </table>

          <h3>Documentos Solicitados (${docList.length})</h3>
          <ul class="docs-list">
            ${docList.map(doc => `<li>${doc}</li>`).join('')}
          </ul>

          <p style="margin-top: 20px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
            ⏳ <strong>Estado:</strong> En proceso de recopilación
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} JogiScraper</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: 'luvidal@edictus.com',
    subject: `Nueva Solicitud #${requestId} - ${docList.length} documento(s)`,
    html
  })
}

export async function sendRequestNotification({ requestId, rut, email, documents, results }) {
  const successCount = results.filter(r => r.success).length
  const totalCount = results.length
  const status = successCount === totalCount ? 'completada' : 'parcial'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #020617 0%, #0e7490 55%, #020617 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .result-item { margin: 10px 0; padding: 12px; border-radius: 6px; border-left: 4px solid; }
        .success { background: #d4edda; border-left-color: #28a745; }
        .error { background: #f8d7da; border-left-color: #dc3545; }
        .footer { background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        table { width: 100%; margin: 15px 0; }
        th { text-align: left; padding: 8px; background: #e9ecef; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Nueva Solicitud en JogiScraper</h2>
        </div>
        <div class="content">
          <h3>Detalles de la Solicitud</h3>
          <table>
            <tr>
              <th>ID de Solicitud</th>
              <td><strong>#${requestId}</strong></td>
            </tr>
            <tr>
              <th>RUT</th>
              <td>${rut}</td>
            </tr>
            <tr>
              <th>Email Solicitante</th>
              <td>${email}</td>
            </tr>
            <tr>
              <th>Estado</th>
              <td><strong>${status.toUpperCase()}</strong> (${successCount}/${totalCount} exitosos)</td>
            </tr>
          </table>

          <h3>Documentos Solicitados</h3>
          ${results.map(result => `
            <div class="result-item ${result.success ? 'success' : 'error'}">
              <strong>${result.success ? '✓' : '✗'} ${result.service}</strong>
              <br>
              <small>${result.msg || (result.success ? 'Completado' : 'Error')}</small>
            </div>
          `).join('')}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} JogiScraper - Herramienta de automatización de descargas</p>
        </div>
      </div>
    </body>
    </html>
  `

  const subject = `Nueva Solicitud #${requestId} - ${status.charAt(0).toUpperCase() + status.slice(1)}`

  return sendEmail({
    to: 'luvidal@edictus.com',
    subject,
    html
  })
}

export async function sendFilesEmail({ to, rut, requestId, files }) {
  const fileList = files.map(f => f.filename).join(', ')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #020617 0%, #0e7490 55%, #020617 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .footer { background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .file-list { margin: 15px 0; padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #28a745; }
        .file-list ul { margin: 10px 0 0 0; padding-left: 20px; }
        .file-list li { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Documentos Listos</h2>
        </div>
        <div class="content">
          <p>Hola,</p>
          <p>Los documentos solicitados para el RUT <strong>${rut}</strong> están listos y adjuntos a este correo.</p>

          <div class="file-list">
            <strong>Archivos adjuntos (${files.length}):</strong>
            <ul>
              ${files.map(f => `<li>${f.filename}</li>`).join('')}
            </ul>
          </div>

          <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            Si tiene alguna pregunta, no dude en contactarnos.
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} JogiScraper</p>
        </div>
      </div>
    </body>
    </html>
  `

  // Convert files to nodemailer attachment format
  const attachments = files.map(f => ({
    filename: f.filename,
    content: f.content,
    contentType: f.contentType
  }))

  return sendEmail({
    to,
    subject: `Documentos Listos - Solicitud #${requestId}`,
    html,
    attachments
  })
}
