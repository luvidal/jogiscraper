import * as nav from './_helpers.js'

export const declaracion = async (req, res) => {
    const { rut, claveunica, year } = req.body
    if (nav.missingParams(res, { rut, claveunica, year })) return

    let page
    try {
        page = await nav.iniBrowser()

        await nav.goto(page, 'https://misiir.sii.cl/cgi_misii/siihome.cgi')
        await nav.claveunica(page, rut, claveunica, '#myHref')

        await nav.goto(page, 'https://www4.sii.cl/consultaestadof22ui/#!/default')
        await nav.selectByLabel(page, 'select[data-ng-model="vm.selectedOption"]', year)
        await nav.clickNav(page, 'button[ng-click="vm.Consultar()"]')
        await nav.sleep(2)

        const base64 = await nav.getScreenBase64(page)
        if (!base64) {
            return res.status(502).json({ success: false, msg: 'Error in Declaracion', error: 'No PDF received' })
        }

        return res.status(200).json({ success: true, msg: 'Declaracion OK', data: base64 })

    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error in Declaracion', error: err?.message || err })

    } finally {
        await nav.endBrowser(page)
    }
}
