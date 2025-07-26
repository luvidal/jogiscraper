import * as nav from './_helpers.js'
import * as b64 from './_base64.js'

export const deuda = async (req, res) => {
    const { rut, claveunica } = req.body
    if (nav.missingParams(res, { rut, claveunica })) return

    let page
    try {
        page = await nav.iniBrowser()
        await nav.goto(page, 'https://conocetudeuda.cmfchile.cl/informe-deudas/622/w3-contents.html')
        await nav.claveunica(page, rut, claveunica, '#linkCU')
        const base64 = await b64.pdfcdp(page, 'a.btn-descargar')

        if (!base64) {
            return res.status(502).json({ success: false, msg: 'Error in Deuda', error: 'No PDF received' })
        }

        return res.status(200).json({ success: true, msg: 'Deuda OK', data: base64 })

    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error in Deuda', error: err?.message || err })

    } finally {
        await nav.endBrowser(page)
    }
}
