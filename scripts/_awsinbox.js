import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { simpleParser } from 'mailparser'

const s3 = new S3Client({ region: process.env.AWS_REGION })
const Bucket = 'jogi-sesattachments'

export const waitForAttachment = async (email) => {
    const deadline = Date.now() + 60_000

    while (Date.now() < deadline) {
        const list = await s3.send(new ListObjectsV2Command({ Bucket }))
        const emails = list.Contents?.sort((a, b) => b.LastModified - a.LastModified) || []

        for (const obj of emails) {
            const get = await s3.send(new GetObjectCommand({ Bucket, Key: obj.Key }))
            const raw = await streamToBuffer(get.Body)
            const parsed = await simpleParser(raw)

            const to = parsed.to?.value?.map(r => r.address) || []
            if (!to.includes(email)) continue

            const attachment = parsed.attachments?.[0]
            if (attachment) {
                await s3.send(new DeleteObjectCommand({ Bucket, Key: obj.Key }))
                return attachment.content.toString('base64')
            }
        }

        await new Promise(r => setTimeout(r, 2000))
    }

    return null
}

const streamToBuffer = stream =>
    new Promise((resolve, reject) => {
        const chunks = []
        stream.on('data', chunk => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
    })

export function rnduser() {
    const surnames = [
        'fernandez', 'sanchez', 'gonzalez', 'rodriguez', 'martinez',
        'perez', 'lopez', 'garcia', 'jimenez', 'ruiz',
        'hernandez', 'diaz', 'moreno', 'muñoz', 'gomez',
        'vidal', 'ramos', 'soto', 'castro', 'silva',
        'rivera', 'morales', 'ortega', 'flores', 'vasquez'
    ]

    const consonants = 'bcdfghjklmnpqrstvwxyz'
    const vowels = 'aeiou'

    const c = consonants[Math.floor(Math.random() * consonants.length)]
    const v = vowels[Math.floor(Math.random() * vowels.length)]
    const surname = surnames[Math.floor(Math.random() * surnames.length)]

    return `${c}${v}${surname}@inbound.jogi.cl`
}