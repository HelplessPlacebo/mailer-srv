import type {VercelRequest, VercelResponse} from '@vercel/node';
import nodemailer from 'nodemailer';

function setCors(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({success: false, error: 'Only POST allowed'});
    }

    try {
        const body = (req.body && typeof req.body === 'object') ? req.body : {};
        const {name, phone, message} = body ?? {};

        const smtpHost = process.env.SMTP_HOST ?? 'smtp.yandex.ru';
        const smtpPort = Number(process.env.SMTP_PORT ?? 465);
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const recipient = process.env.RECIPIENT_EMAIL;

        if (!smtpUser || !smtpPass || !recipient) {
            console.error('Missing SMTP or recipient configuration');
            return res.status(500).json({success: false, error: 'SMTP or recipient not configured'});
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {user: smtpUser, pass: smtpPass},
        });

        const htmlMessage = `
      <p><strong>Имя:</strong> ${escapeHtml(name ?? '-')}</p>
      <p><strong>Телефон:</strong> ${escapeHtml(phone ?? '-')}</p>
      <p><strong>Сообщение:</strong><br/>${escapeHtml((message ?? '-')).replace(/\n/g, '<br/>')}</p>
    `;

        const mailOptions = {
            from: `"Сайт УРАЛПРОМТ" <${smtpUser}>`,
            to: recipient,
            subject: 'Запрос коммерческого предложения',
            text: `Имя: ${name ?? '-'}\nТелефон: ${phone ?? '-'}\nСообщение:\n${message ?? '-'}`,
            html: htmlMessage,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info?.messageId ?? info);
        return res.status(200).json({success: true});
    } catch (err) {
        console.error('Send error:', err);
        return res.status(500).json({success: false, error: String(err)});
    }
}

function escapeHtml(str: unknown) {
    const s = String(str ?? '');
    return s.replace(/[&<>"']/g, (c) => {
        switch (c) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            case "'":
                return '&#39;';
            default:
                return c;
        }
    });
}
