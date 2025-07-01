const nodotnslash = s => (s || '').replace(/[.-]/g, '')

export async function matrimonio(req, res) {
  const { rut, documento } = typeof req.body === 'object' && req.body !== null ? req.body : {}

  if (!rut || !documento) {
    return res.status(400).json({ msg: 'Missing rut or documento' })
  }

  rut = nodotnslash(rut)
  documento = nodotnslash(documento)

  const callback = `https://jogi.cl/api/v1/webhooks/khipu/matrimonio/${rut}`

  const body = JSON.stringify({
    RequestData: {
      RolUnicoNacionalCertificate: rut,
      RolUnicoNacionalApplicant: rut,
      DocumentNumberApplicant: documento,
    },
    callback,
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
      return res.status(502).json({ msg: 'Khipu error', error: json?.Error || json })
    }
    return res.status(200).json({ msg: 'ok', data: base64 })

  } catch (err) {
    return res.status(500).json({ msg: 'Internal error contacting Khipu', error: err.message || err })
  }
}
