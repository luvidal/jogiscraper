import os from 'os'
import fs from 'fs'
import path from 'path'
import https from 'https'
import * as nav from './_helpers.js'

export async function pdfcdp(page, selector, timeout = 15000) {
    const tmpBase = path.join(os.tmpdir(), 'puppeteer-downloads-')
    const downloadDir = fs.mkdtempSync(tmpBase)
    console.log('[pdfcdp] 🟡 Download dir:', downloadDir)

    const client = await page.target().createCDPSession() // CDP for download interception
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadDir
    })

    const before = new Set(fs.readdirSync(downloadDir))
    console.log('[pdfcdp] 🖱️ Clicking selector:', selector)
    await nav.clickBtn(page, selector)

    const file = await waitForFile(downloadDir, before, timeout).catch(() => null)
    if (!file) throw new Error('❌ No PDF was downloaded')

    const filePath = path.join(downloadDir, file)
    const base64 = fs.readFileSync(filePath).toString('base64')

    fs.rmSync(downloadDir, { recursive: true, force: true })
    console.log('[pdfcdp] ✅ PDF read and encoded as base64')
    return base64
}

function waitForFile(dir, beforeSet, timeout = 60000) {
    console.log('⏳ Waiting for download. Files in dir:', fs.readdirSync(dir))
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeout
        const check = () => {
            const after = fs.readdirSync(dir)
            const diff = after.find(f => !beforeSet.has(f))
            if (diff) return resolve(diff)
            if (Date.now() > deadline) return reject(new Error(`Download timeout after ${timeout / 1000} seconds`))
            setTimeout(check, 300)
        }
        check()
    })
}

export async function screen(page) {
    const buffer = await page.screenshot({ fullPage: true, type: 'png' })
    return buffer.toString('base64')
}

export async function popup(page, selector) {
    const waitPopup = new Promise(r => page.once('popup', r))

    let frame
    for (const f of page.frames()) {
        try {
            if (await f.$(selector)) {
                frame = f
                break
            }
        } catch (_) { }
    }
    if (!frame) throw new Error(`❌ Frame with selector ${selector} not found`)

    await frame.evaluate(sel => {
        const btn = document.querySelector(sel)
        if (!btn) throw new Error('❌ Button not found')
        btn.click()
    }, selector)

    const popup = await waitPopup
    await new Promise(r => setTimeout(r, 3000))

    const url = popup.url()
    const cookies = await page.cookies()
    const headers = {
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; '),
        'User-Agent': await page.evaluate(() => navigator.userAgent),
        'Accept': 'application/pdf'
    }

    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`❌ Fetch failed: ${res.status}`)

    return Buffer.from(await res.arrayBuffer()).toString('base64')
}
