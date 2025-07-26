import * as nav from './_helpers.js'
import * as cpt from './_recaptcha.js'
import * as b64 from './_base64.js'

export const cotizaciones = async (req, res) => {
    const { rut, claveunica } = req.body
    if (nav.missingParams(res, { rut, claveunica })) return

    let page
    try {
        page = await nav.iniBrowser(false)
        await nav.goto(page, 'https://webafiliados.afc.cl/WUI.AAP.OVIRTUAL/Default.aspx')
        await cpt.solveRecaptcha(page)
        await nav.claveunica(page, rut, claveunica, '#btnCU')
        await nav.goto(page, 'https://webafiliados.afc.cl/WUI.AAP.OVIRTUAL/WebAfiliados/Certificados/Certificados.aspx')
        await nav.clickBtn(page, 'a[onclick*="ValidaPensionado"]')
        await nav.clickBtn(page, '#btnAcordcotacred')
        await nav.clickBtn(page, '#contentPlaceHolder_btnCotAcred')

        const base64 = await b64.pdfcdp(page, '#btnDescargaCotPagadas')
        if (!base64) {
            return res.status(502).json({ success: false, msg: 'Error in Cotizaciones', error: 'No PDF received' })
        }

        return res.status(200).json({ success: true, msg: 'Cotizaciones OK', data: base64 })

    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error in Cotizaciones', error: err?.message || err })

    } finally {
        await nav.endBrowser(page)
    }
}
