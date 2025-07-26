import * as nav from './_helpers.js'

export const test = async (req, res) => {
    let browser
    try {
        const page = await nav.iniBrowser()
        browser = page.browser()
        const ip = await page.evaluate(async () => {
            const res = await fetch('https://api.ipify.org?format=json')
            return await res.text()
        })

        return res.json({ success: true, ip })

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message })

    } finally {
        if (browser) await browser.close()
    }
}
