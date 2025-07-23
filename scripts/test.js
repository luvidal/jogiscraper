import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

export const test = async (req, res) => {
    console.log('🧪 BROWSER_PATH used:', process.env.BROWSER_PATH)
    let browser
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                `--proxy-server=http://${process.env.DECODO_HOST}:${process.env.DECODO_PORT}`,
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        })

        const page = await browser.newPage()

        await page.authenticate({
            username: process.env.DECODO_USER,
            password: process.env.DECODO_PASS
        })

        await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle2' })
        const content = await page.evaluate(() => document.body.innerText)
        const ip = JSON.parse(content).origin

        return res.json({ success: true, proxyIp: ip })
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message })
    } finally {
        if (browser) await browser.close()
    }
}