import os from 'os'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import AnonymizeUA from 'puppeteer-extra-plugin-anonymize-ua'

puppeteer.use(StealthPlugin())
puppeteer.use(AnonymizeUA({ customFn: ua => ua.replace('HeadlessChrome/', 'Chrome/') }))
const userDataMap = new WeakMap()

export async function iniBrowser(withProxy = true) {
    const tmpBase = path.join(os.tmpdir(), 'puppeteer-profile-')
    const userDataDir = fs.mkdtempSync(tmpBase)

    const r = () => Math.floor(Math.random() * 80)
    const viewport = { width: 1024 + r(), height: 768 + r() }

    const args = [
        `--window-size=${viewport.width},${viewport.height}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--lang=es-CL,es',
        '--timezone=America/Santiago',
        '--disable-blink-features=AutomationControlled',
    ]

    if (withProxy) {
        const proxyHost = process.env.OXYLABS_HOST
        const proxyPort = process.env.OXYLABS_PORT
        args.unshift(`--proxy-server=http://${proxyHost}:${proxyPort}`)
    }

    const isDev = process.env.ENVIRONMENT === 'development'
    const browser = await puppeteer.launch({
        headless: isDev ? false : 'new',
        executablePath: process.env.BROWSER_PATH,
        slowMo: 50,
        args,
        userDataDir,
        ignoreHTTPSErrors: true,
    })

    const page = await browser.newPage()
    await page.setDefaultNavigationTimeout(60000)
    await page.setDefaultTimeout(60000)

    if (isDev) page.on('console', msg => { console.log('[browser]', msg.text()) })
    page.on('dialog', async dialog => {
        console.log('[dialog]', dialog.message())
        await dialog.accept()
    })
    console.log('Using auth →', process.env.OXYLABS_USER, process.env.OXYLABS_PASS ? '****' : '(no pass)')

    if (withProxy) await page.authenticate({
        username: process.env.OXYLABS_USER,
        password: process.env.OXYLABS_PASS,
    });
    userDataMap.set(page, userDataDir)

    await page.setUserAgent(process.env.BROWSER_UA)
    await page.setViewport(viewport)
    await page.setExtraHTTPHeaders({ 'accept-language': 'es-CL,es;q=0.9' })

    await page.emulateTimezone('America/Santiago')
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
        Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] })
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] })
        navigator.mediaDevices = {
            getUserMedia: () => Promise.reject(new Error('Not implemented'))
        }
    })

    return page
}

export async function endBrowser(page) {
    if (!page || page.isClosed()) return
    try {
        const browser = page.browser()
        await page.close().catch(() => { })
        await browser.close()
    } catch (err) {
        console.error('⚠️ Failed to close browser:', err)
    }

    const dir = userDataMap.get(page)
    if (dir?.includes(os.tmpdir())) {
        try {
            fs.rmSync(dir, { recursive: true, force: true })
        } catch (err) {
            console.error('⚠️ Failed to delete temp dir:', err)
        }
    }
}

export function sleep(seconds = 1, delta = 0.5) {
    const ms = seconds * 1000;
    const deltaMs = delta * 1000;
    const jitter = (Math.random() * 2 - 1) * deltaMs;
    const finalMs = Math.max(0, ms + jitter);
    return new Promise(res => setTimeout(res, finalMs));
}

const waitVisible = (page, selector, timeout = 60000) =>
    page.waitForSelector(selector, { visible: true, timeout })

export async function clickBtn(page, selector) {
    await waitVisible(page, selector)
    await sleep(1)
    await page.click(selector)
    await sleep(2, 0)
}

export async function clickNav(page, selector) {
    await waitVisible(page, selector)
    await sleep(1)
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        page.click(selector)
    ])
    await sleep(3, 0)
}

export async function typeField(page, selector, value) {
    await waitVisible(page, selector)
    await page.focus(selector)
    await page.click(selector, { clickCount: 3 })
    await page.keyboard.press('Backspace')
    for (const char of value) {
        await page.keyboard.type(char)
        await sleep(0.1, 0.05)
    }
}

export async function selectByLabel(page, selector, label) {
    const value = await page.$eval(
        selector,
        (select, label) => {
            const option = Array.from(select.options).find((opt) => opt.label === label)
            return option?.value || null
        },
        label
    )
    if (!value) throw new Error(`Option with label "${label}" not found in ${selector}`)
    await page.select(selector, value)
}

export async function goto(page, url, options = {}, retries = 1) {
    const merged = { waitUntil: 'domcontentloaded', timeout: 20000, ...options };
    for (let i = 0; i <= retries; i++) {
        try {
            await page.goto(url, merged);
            await sleep(3, 0);
            return;
        } catch (err) {
            console.warn(`⚠️ Navigation failed for ${url}. Attempt ${i + 1} of ${retries + 1}. Error: ${err.message}`);
            if (i === retries) throw err;
            await sleep(1, 0);
        }
    }
}

export async function claveunica(page, rut, pwd, selector) {
    await clickNav(page, selector)
    await typeField(page, '#uname', rut)
    await typeField(page, '#pword', pwd)
    await clickNav(page, '#login-submit')
}

export async function claveunica2(page, rut, pwd, selector) {
    await clickNav(page, selector)
    await typeField(page, '#cu_inputRUN', rut)
    await typeField(page, '#cu_inputClaveUnica', pwd)
    await clickNav(page, '#cu_btnIngresar')
}

export function missingParams(res, params) {
    const missing = Object.entries(params)
        .filter(([_, v]) => !v)
        .map(([k]) => k.toUpperCase())

    if (missing.length) {
        res.status(400).json({ success: false, msg: `Falta(n): ${missing.join(', ')}` })
        return true
    }

    return false
}