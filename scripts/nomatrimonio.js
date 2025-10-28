import * as nav from './_helpers.js'
import * as aws from './_awsinbox.js'

export const nomatrimonio = async (req, res) => {
    const { rut, claveunica, username, email } = req.body
    if (nav.missingParams(res, { rut, claveunica, username, email })) return

    let page
    try {
        page = await nav.iniBrowser(false)
        await nav.goto(page, 'https://solicitudeswebrc.srcei.cl/InfoNoMat/web/init.srcei')
        await nav.clickBtn(page, '#idCheckAceptaTerminos')
        await nav.claveunica2(page, rut, claveunica, '#idBtnEnviarMat')

        const to = aws.rnduser()
        await nav.typeField(page, '#email', to)
        await nav.typeField(page, '#emailConfirm', to)
        await nav.clickBtn(page, '#idBtnContinuar')
        const base64 = await aws.waitForAttachment(to)

        if (!base64) {
            return res.status(502).json({ success: false, msg: 'Error in NoMatrimonio', error: 'No PDF received' })
        }

        return res.status(200).json({ success: true, msg: 'NoMatrimonio OK', data: base64 })

    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error in NoMatrimonio', error: err?.message || err })

    } finally {
        await nav.endBrowser(page)
    }
}
