import * as nav from './_helpers.js'

export async function matrimonio(req, res) {
  const { rut, documento } = req.body
  if (nav.missingParams(res, { rut, documento })) return

  const clean = s => (s || '').replace(/[.-]/g, '')

  const body = JSON.stringify({
    RequestData: {
      RolUnicoNacionalCertificate: clean(rut),
      RolUnicoNacionalApplicant: clean(rut),
      DocumentNumberApplicant: clean(documento),
    }
  })

  try {
    const resp = await fetch(
      'https://api.khipu.com/v1/cl/services/registrocivil.cl/marriage-certificate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.KHIPU_TOKEN}`,
        },
        body,
      }
    )

    const text = await resp.text()
    const json = JSON.parse(text)
    const base64 = json?.Data?.CertificadoMatrimonio?.Documento

    if (!base64) {
      return res.status(502).json({ success: false, msg: 'Error in Matrimonio', error: json?.Error || json })
    }
    return res.status(200).json({ success: true, msg: 'Matrimonio OK', data: base64 })

  } catch (err) {
    return res.status(500).json({ success: false, msg: 'Error in Matrimonio', error: err.message || err })
  }
}
