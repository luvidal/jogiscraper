import os from 'os'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import UserAgent from 'user-agents'

// const isDev = process.env.ENVIRONMENT === 'development'

// const executablePath = isDev
//     ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
//     : '/usr/bin/google-chrome'

const r = () => Math.random() * 200 | 0
const viewport = {
    width: 1024 + r(),
    height: 700 + r(),
}

export async function iniBrowser() {
    const tmpBase = path.join(os.tmpdir(), 'puppeteer-profile-')
    const userDataDir = fs.mkdtempSync(tmpBase)
    const userAgent = new UserAgent({ deviceCategory: 'desktop' }).toString()

    const args = [
        `--window-size=${viewport.width},${viewport.height}`,
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
    ]

    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50,
        args,
        userDataDir,
        ignoreHTTPSErrors: true,
        defaultViewport: null,
    })

    const page = await browser.newPage()
    page._userDataDir = userDataDir

    await page.setUserAgent(userAgent)
    await page.setViewport(viewport)

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
        Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] })
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] })
    })

    return page
}

export async function endBrowser(page) {
    if (!page || page.isClosed()) return
    const browser = page.browser()

    try {
        await page.close()
        await browser.close()
    } catch { }

    const dir = page._userDataDir
    if (dir?.includes(os.tmpdir())) {
        try {
            fs.rmSync(dir, { recursive: true, force: true })
        } catch { }
    }
}


function deleteOldProfiles() {
    const dir = path.join(process.cwd(), 'profile')
    const lock = path.join(dir, '.lock')
    const now = Date.now()

    if (fs.existsSync(lock)) return
    try {
        fs.writeFileSync(lock, '')
        fs.readdirSync(dir).forEach(d => {
            const full = path.join(dir, d)
            const ts = parseInt(d)
            if (!isNaN(ts) && now - ts > 86400000) {
                try {
                    fs.rmSync(full, { recursive: true, force: true })
                    writeLog(`Deleted old profile: ${d}`, 'BROWSER')
                } catch { }
            }
        })
    } catch { }
    finally {
        try { fs.unlinkSync(lock) } catch { }
    }
}


export async function typeField(page, selector, value, baseDelay = 60) {
    const delay = baseDelay + Math.floor(Math.random() * baseDelay) // ~60–120ms
    await page.waitForSelector(selector, { visible: true, timeout: 10000 })
    await page.type(selector, value, { delay })
}

export async function clickBtn(page, selector) {
    await page.waitForSelector(selector, { visible: true, timeout: 10000 })
    await sleep(1)
    await page.click(selector)
    await sleep(1)
}

export async function clickNav(page, selector) {
    await page.waitForSelector(selector, { visible: true, timeout: 10000 })
    await sleep(1)
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        page.click(selector),
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

export const delay = (secs) => new Promise(res => setTimeout(res, 1000 * secs))

export function sleep(seconds = 1) {
    const ms = seconds * 1000
    const jitter = Math.floor(Math.random() * 1000) // up to +1s
    return new Promise(res => setTimeout(res, ms + jitter))
}

export async function popupBase64(page, selector, timeout = 15000) {
    await page.waitForSelector(selector, { timeout })

    const [popup] = await Promise.all([
        new Promise(resolve => page.once('popup', resolve)),
        page.click(selector),
    ])

    const response = await popup.waitForResponse(res =>
        res.request().resourceType() === 'document' && res.url().endsWith('.pdf')
    )

    const buffer = await response.buffer()
    return buffer.toString('base64')
}

export async function goto(page, url, options = {}, retries = 1) {
    const merged = { waitUntil: 'domcontentloaded', timeout: 20000, ...options }

    for (let i = 0; i <= retries; i++) {
        try {
            await page.goto(url, merged)
            return
        } catch (err) {
            if (i === retries) throw err
            console.warn(`⚠️ Retry ${i + 1}: Failed to navigate to ${url}`)
            await sleep(2)
        }
    }
}

export async function closeModal(page, selector, timeout = 3000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout })
        await page.click(selector)
        await sleep(1)
    } catch {
        // No modal, continue
    }
}

export async function claveunica(page, rut, pwd, selector) {
    await clickNav(page, selector)
    await typeField(page, '#uname', rut)
    await typeField(page, '#pword', pwd)
    await clickNav(page, '#login-submit')
    await delay(3)
}

const firstNames = [
    'Camila', 'Mateo', 'Florencia', 'Benjamin', 'Antonia', 'Vicente', 'Isidora', 'Lucas',
    'Martina', 'Tomas', 'Josefa', 'Diego', 'Emilia', 'Joaquin', 'Valentina', 'Agustin',
    'Trinidad', 'Matias', 'Fernanda', 'Cristobal', 'Javiera', 'Sebastian', 'Daniela',
    'Ignacio', 'Amanda', 'Maximiliano', 'Paulina', 'Francisco', 'Catalina', 'Ricardo'
]

const lastNames = [
    'Soto', 'Rojas', 'Fuentes', 'Reyes', 'Gonzalez', 'Herrera', 'Ramirez', 'Morales',
    'Navarro', 'Paredes', 'Vega', 'Salinas', 'Araya', 'Leiva', 'Saez', 'Carrasco',
    'Espinoza', 'Munoz', 'Godoy', 'Tapia', 'Aguilera', 'Castro', 'Pinto', 'Figueroa',
    'Olivares', 'Barra', 'Cardenas', 'Uribe', 'Lobos', 'Riveros'
]

const companies = [
    'Aurora Contabilidad', 'Servicios Contables Tolten', 'Norte Asesores', 'Delta Tributaria',
    'Gestion Andes', 'Contadores Elqui', 'Soluciones Fiscales Biobio', 'Estudio Contable Patagonia',
    'Auditax', 'Planifica Chile', 'Balance Sur', 'Contalab', 'Contaluz', 'Andina Fiscal',
    'RentaExpert', 'Consultora Austral', 'Tolten Finanzas', 'Cuentas Claras', 'Integra Tributaria'
]

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export default function getRandomPerson() {
    const first = random(firstNames)
    const last = random(lastNames)
    const name = `${first} ${last}`
    const company = random(companies)
    const base = company.replace(/[^a-zA-Z]/g, '').toLowerCase()
    const domain = Math.random() < 0.5 ? 'gmail.com' : 'hotmail.com'
    const email = `${base}@${domain}`

    return { name, email, company }
}
