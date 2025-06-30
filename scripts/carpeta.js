import * as nav from './_helpers.js'

export async function carpeta(req, res) {
    const { rut, claveunica } = typeof req.body === 'object' && req.body !== null ? req.body : {}
    let page

    try {
        page = await nav.iniBrowser()
        // login
        await nav.goto(page, 'https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoRutClave.html')
        await nav.claveunica(page, rut, claveunica, '#myHref')

        // carpeta tributaria
        await nav.goto(page, 'https://zeus.sii.cl/dii_cgi/carpeta_tributaria/cte_acreditar_renta_01.cgi')
        await nav.clickBtn(page, 'input[value="Continuar"]')
        const { name, email, company } = nav.getRandomPerson()
        await nav.typeField(page, '#d_nombre', name)
        await nav.typeField(page, '#d_email', email)
        await page.select('#frm_instituciones', '999')
        await nav.typeField(page, '#txtInstitucion', company)
        await nav.clickBtn(page, '#chkautorizo')
        await nav.clickNav(page, 'input[value="Enviar"]')
        const base64 = await nav.popupBase64(page, 'input[name="guardarPdf"]')

        if (!base64) {
            return res.status(502).json({ msg: 'SII error', error: json?.Error || json })
        }

        return res.status(200).json({ msg: 'ok', data: base64 })

    } catch (err) {
        return res.status(500).json({
            msg: 'Internal error SII',
            error: err.message || err,
        })

    } finally {
        await nav.endBrowser(page)
    }
}

