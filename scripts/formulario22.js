import * as nav from './_helpers.js'

export const formulario22 = async (req, res) => {
    const { rut, claveunica, year } = req.body
    let page

    try {
        page = await nav.iniBrowser()

        await nav.goto(page, 'https://misiir.sii.cl/cgi_misii/siihome.cgi')
        await nav.claveunica(page, rut, claveunica, '#myHref')

        await nav.goto(page, 'https://www4.sii.cl/consultaestadof22ui/#!/default')
        await nav.selectByLabel(page, 'select[data-ng-model="vm.selectedOption"]', year)
        await nav.clickNav(page, 'button[ng-click="vm.Consultar()"]')
        await nav.clickNav(page, 'button[ng-click="vm.f22Compacto()"]')

        const base64 = await nav.forceDownloadPdfAsBase64(page, 'button[ng-click="vm.crearPdf()"]')
        if (!base64) {
            return res.status(502).json({ msg: 'SII error', error: 'No PDF received' })
        }

        return res.status(200).json({ msg: 'ok', data: base64 })

    } catch (err) {
        return res.status(500).json({ msg: 'Internal error SII', error: err?.message || err })

    } finally {
        await nav.endBrowser(page)
    }
}
