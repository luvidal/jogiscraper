
const poll = async (params) => {
    const apiKey = process.env.TWOCAPTCHA_API_KEY
    const body = new URLSearchParams({ key: apiKey, json: '1', ...params })
    if (params.method !== 'base64') {
        body.set('googlekey', params.sitekey)
        body.delete('sitekey')
    }
    const { request: id } = await (await fetch('http://2captcha.com/in.php', { method: 'POST', body })).json()
    if (!id || id.startsWith('ERROR')) throw new Error(`2Captcha submission error: ${id}`)

    while (true) {
        await sleep(10)
        const { status, request } = await (await fetch(`http://2captcha.com/res.php?key=${apiKey}&action=get&id=${id}&json=1`)).json()
        if (status === 1) return request
        if (request !== 'CAPCHA_NOT_READY') throw new Error(request)
    }
}

export const solveRecaptcha = async (page) => {
    const sitekey = await page.$eval('.g-recaptcha', el => el.getAttribute('data-sitekey')).catch(() => null)
    if (!sitekey) return console.warn('⚠️ reCAPTCHA not found')
    const token = await poll({ method: 'userrecaptcha', sitekey, pageurl: page.url() })

    await page.waitForSelector('#g-recaptcha-response', { visible: true, timeout: 10000 }).catch(() => { })
    await page.evaluate(t => {
        const el = document.querySelector('#g-recaptcha-response')
        if (el instanceof HTMLTextAreaElement) {
            el.style.display = 'block'
            el.value = t
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
        }
    }, token)

    await sleep(3)
}

export function sleep(seconds = 1) {
    const ms = seconds * 1000
    const jitter = Math.floor(Math.random() * 1000)
    return new Promise(res => setTimeout(res, ms + jitter))
}