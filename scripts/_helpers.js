import os from 'os'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import AnonymizeUA from 'puppeteer-extra-plugin-anonymize-ua'

puppeteer.use(StealthPlugin())
puppeteer.use(AnonymizeUA({
    customFn: ua => ua.replace('HeadlessChrome/', 'Chrome/')
}))
const userDataMap = new WeakMap()

export async function iniBrowser() {
    const tmpBase = path.join(os.tmpdir(), 'puppeteer-profile-')
    const userDataDir = fs.mkdtempSync(tmpBase)

    const r = () => Math.floor(Math.random() * 80)
    const viewport = { width: 1024 + r(), height: 768 + r() }
    const proxyHost = process.env.DECODO_HOST
    const proxyPort = 10001 + Math.floor(Math.random() * 7)

    const args = [
        `--proxy-server=http://${proxyHost}:${proxyPort}`,
        `--window-size=${viewport.width},${viewport.height}`,
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--lang=es-CL,es',
        '--timezone=America/Santiago',
        '--disable-blink-features=AutomationControlled',
    ]

    const browser = await puppeteer.launch({
        headless: process.env.ENVIRONMENT === 'development' ? false : 'new',
        executablePath: process.env.BROWSER_PATH,
        slowMo: 50,
        args,
        userDataDir,
        ignoreHTTPSErrors: true,
        defaultViewport: null,
    })

    const page = await browser.newPage()
    await page.authenticate({
        username: process.env.DECODO_USER,
        password: process.env.DECODO_PASS,
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

export function sleep(seconds = 1) {
    const ms = seconds * 1000
    const jitter = Math.floor(Math.random() * 1000)
    return new Promise(res => setTimeout(res, ms + jitter))
}

const waitVisible = (page, selector, timeout = 10000) =>
    page.waitForSelector(selector, { visible: true, timeout })

export async function typeField(page, selector, value) {
    await waitVisible(page, selector)
    await page.focus(selector)
    await page.click(selector, { clickCount: 3 })
    await page.keyboard.press('Backspace')
    for (const char of value) {
        await page.keyboard.type(char)
        await sleep(0.06)
    }
}

export async function clickBtn(page, selector) {
    await waitVisible(page, selector)
    await sleep(1)
    await page.click(selector)
    await sleep(1)
}

export async function clickNav(page, selector) {
    await waitVisible(page, selector)
    await sleep(1)
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        page.click(selector)
    ])
    await sleep(1)
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
    const merged = { waitUntil: 'domcontentloaded', timeout: 20000, ...options }
    for (let i = 0; i <= retries; i++) {
        try {
            await page.goto(url, merged)
            await sleep(1)
            return
        } catch (err) {
            if (i === retries) throw err
            console.warn(`⚠️ Retry ${i + 1}: Failed to navigate to ${url}`)
            await sleep(2)
        }
    }
}

export async function claveunica(page, rut, pwd, selector) {
    await clickNav(page, selector)
    await typeField(page, '#uname', rut)
    await typeField(page, '#pword', pwd)
    await clickNav(page, '#login-submit')
    await sleep(2)
}

export async function claveunica2(page, rut, pwd, selector) {
    await clickNav(page, selector)
    await typeField(page, '#cu_inputRUN', rut)
    await typeField(page, '#cu_inputClaveUnica', pwd)
    await clickNav(page, '#cu_btnIngresar')
    await sleep(2)
}

export async function forceDownloadPdfAsBase64(page, selector, timeout = 10000) {
    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-downloads-'))

    const client = await page.createCDPSession()
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadDir
    })

    const before = new Set(fs.readdirSync(downloadDir))
    await page.click(selector)

    const file = await waitForFile(downloadDir, before, timeout)
    const filePath = path.join(downloadDir, file)
    const base64 = fs.readFileSync(filePath).toString('base64')

    fs.rmSync(downloadDir, { recursive: true, force: true })
    return base64
}

function waitForFile(dir, beforeSet, timeout) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeout
        const check = () => {
            const after = fs.readdirSync(dir)
            const diff = after.find(f => !beforeSet.has(f))
            if (diff) return resolve(diff)
            if (Date.now() > deadline) return reject(new Error('Download timeout'))
            setTimeout(check, 300)
        }
        check()
    })
}

export async function getScreenBase64(page) {
    const buffer = await page.screenshot({ fullPage: true, type: 'png' })
    return buffer.toString('base64')
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
