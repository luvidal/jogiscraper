
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms * 1000));

const apiKey = process.env.TWOCAPTCHA_API_KEY

const poll = async (params) => {
    const isImage = params.method === 'base64';
    const body = new URLSearchParams({ key: apiKey, json: '1' });

    for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            body.append(key, params[key]);
        }
    }

    if (!isImage) {
        body.set('googlekey', params.sitekey);
        body.delete('sitekey'); // Remove original 'sitekey' if replaced by 'googlekey'
    }

    try {
        const response = await fetch('http://2captcha.com/in.php', {
            method: 'POST',
            body,
        });
        const { request: id } = await response.json();

        if (!id || id.startsWith('ERROR')) {
            throw new Error(`2Captcha submission error: ${id}`);
        }

        while (true) {
            await sleep(10)
            const resPoll = await fetch(`http://2captcha.com/res.php?key=${apiKey}&action=get&id=${id}&json=1`);
            const { status, request } = await resPoll.json();

            if (status === 1) {
                return request
            }
            if (request !== 'CAPCHA_NOT_READY') {
                throw new Error(request)
            }
        }
    } catch (error) {
        console.error('2Captcha polling failed:', error);
        throw error;
    }
}


const solveRecaptcha = async (page) => {
    const box = await page.$('.g-recaptcha');
    if (!box) {
        console.error('⚠️ reCAPTCHA not found on page.');
        return;
    }

    const sitekey = await page.$eval('.g-recaptcha', (el) => el.getAttribute('data-sitekey'));
    const pageUrl = await page.url();
    const token = await poll({ method: 'userrecaptcha', sitekey, pageurl: pageUrl });

    await page.waitForSelector('#g-recaptcha-response', { visible: true, timeout: 10000 }).catch(() => {
        console.warn('g-recaptcha-response element not visible within timeout, proceeding anyway.');
    });

    await page.evaluate((solvedToken) => {
        const el = document.querySelector('#g-recaptcha-response');
        if (!el) {
            console.warn('#g-recaptcha-response element not found during evaluation.');
            return;
        }
        if (el instanceof HTMLTextAreaElement) {
            el.style.display = 'block';
            el.value = solvedToken;
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
        } else {
            console.error('Element #g-recaptcha-response is not a textarea.')
        }
    }, token);

    await sleep(3)
}

const solveImageCaptcha = async (page) => {
    const img = await page.$('img[src^="data:image/png;base64,"]');
    if (!img) {
        console.error('⚠️ Image CAPTCHA not found on page.');
        return;
    }

    try {
        const base64 = await img.evaluate((el) => el.src.split(',')[1]);
        const token = await poll({ method: 'base64', body: base64 });

        await page.type('#ans', token);
        await page.click('#jar');
    } catch (err) {
        console.error('❌ Image CAPTCHA failed:', err.message);
    }
}