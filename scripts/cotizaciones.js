import * as nav from './_helpers.js'

export const cotizaciones = async (req, res) => {
    const { rut, claveunica } = req.body
    if (nav.missingParams(res, { rut, claveunica })) return

    let page
    try {
        page = await nav.iniBrowser()

        await nav.goto(page, 'https://webafiliados.afc.cl/WUI.AAP.OVIRTUAL/Default.aspx')
        await nav.solveRecaptcha(page)
        await nav.claveunica(page, rut, claveunica, '#btnCU')

        await nav.goto(page, 'https://webafiliados.afc.cl/WUI.AAP.OVIRTUAL/WebAfiliados/Certificados/Certificados.aspx')
        await nav.clickBtn(page, 'a[onclick*="ValidaPensionado"]')
        await nav.clickBtn(page, '#btnAcordcotacred')
        await nav.clickBtn(page, '#contentPlaceHolder_btnCotAcred')

        const base64 = await nav.forceDownloadPdfAsBase64(page, '#btnDescargaCotPagadas')
        if (!base64) {
            return res.status(502).json({ msg: 'AFC error', error: 'No PDF received' })
        }

        return res.status(200).json({ msg: 'ok', data: base64 })

    } catch (err) {
        return res.status(500).json({ msg: 'Internal error SII', error: err?.message || err })

    } finally {
        await nav.endBrowser(page)
    }
}
