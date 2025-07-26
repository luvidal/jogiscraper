import * as nav from './_helpers.js'
import * as rnd from './_random.js'
import * as b64 from './_base64.js'

export const carpeta = async (req, res) => {
    const { rut, claveunica } = req.body
    if (nav.missingParams(res, { rut, claveunica })) return

    let page
    try {
        page = await nav.iniBrowser(false)
        await nav.goto(page, 'https://misiir.sii.cl/cgi_misii/siihome.cgi')
        await nav.claveunica(page, rut, claveunica, '#myHref')
        await nav.goto(page, 'https://zeus.sii.cl/dii_cgi/carpeta_tributaria/cte_acreditar_renta_01.cgi')
        await nav.clickBtn(page, 'input[value="Continuar"]')
        const { name, email, company } = rnd.person()
        await nav.typeField(page, '#d_nombre', name)
        await nav.typeField(page, '#d_email', email)
        await page.select('#frm_instituciones', '999')
        await nav.typeField(page, '#txtInstitucion', company)
        await nav.clickBtn(page, '#chkautorizo')
        await nav.clickNav(page, 'input[value="Enviar"]')
        const base64 = await b64.popup(page, 'input[name="guardarPdf"]')

        if (!base64) {
            return res.status(502).json({ success: false, msg: 'Error in Carpeta', error: 'No PDF received' })
        }

        return res.status(200).json({ success: true, msg: 'Carpeta OK', data: base64 })

    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error in Carpeta', error: err?.message || err })

    } finally {
        await nav.endBrowser(page)
    }
}
