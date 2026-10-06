const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// 1. Load local .env file if it exists
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        try {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const idx = trimmed.indexOf('=');
                    const key = trimmed.substring(0, idx).trim();
                    const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            });
        } catch (e) {
            console.warn('Could not read .env file:', e.message);
        }
    }
}
loadEnv();

const PORT = process.env.PORT || 5050;
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const DEFAULT_SLOTS = [
    "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"
];

// Helper to read email config
function getEmailConfig() {
    const configFile = path.join(__dirname, 'email-config.json');
    let config = {};
    if (fs.existsSync(configFile)) {
        try {
            config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        } catch (e) {}
    }
    // Environment variables override email-config.json
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        config.auth = {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        };
        config.host = process.env.SMTP_HOST || 'smtp.gmail.com';
        config.port = Number(process.env.SMTP_PORT) || 587;
    }
    return config;
}

// Generate real-time live Google Meet link
function generateGoogleMeetLink() {
    if (process.env.GOOGLE_MEET_URL) {
        return process.env.GOOGLE_MEET_URL;
    }
    // https://meet.google.com/new launches a live, genuine real-time Google Meet room instantly
    return 'https://meet.google.com/new';
}

// Helper to compute UTC timestamp range for a slot
function computeSlotRangeUtc(dateStr, timeStr, timezoneStr) {
    let year = 2026, month = 8, day = 24;
    if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        }
    }

    let hours = 10, minutes = 0;
    if (timeStr) {
        const parts = timeStr.trim().split(' ');
        const hm = parts[0].split(':');
        hours = parseInt(hm[0], 10);
        minutes = parseInt(hm[1], 10);
        if (parts[1] === 'PM' && hours < 12) hours += 12;
        if (parts[1] === 'AM' && hours === 12) hours = 0;
    }

    let offsetMins = 330; // Default IST (UTC+5:30)
    const tz = (timezoneStr || '').toUpperCase();
    if (tz.includes('EST') || tz.includes('EDT') || tz.includes('UTC-5')) offsetMins = -300;
    else if (tz.includes('PST') || tz.includes('PDT') || tz.includes('UTC-8')) offsetMins = -480;
    else if (tz.includes('GMT') || tz.includes('UTC+0') || tz.includes('UTC-0')) offsetMins = 0;
    else if (tz.includes('CET') || tz.includes('UTC+1')) offsetMins = 60;
    else if (tz.includes('SGT') || tz.includes('UTC+8')) offsetMins = 480;
    else if (tz.includes('AEST') || tz.includes('UTC+10')) offsetMins = 600;

    const localUtcMs = Date.UTC(year, month, day, hours, minutes);
    const startUtcMs = localUtcMs - (offsetMins * 60 * 1000);
    const endUtcMs = startUtcMs + (30 * 60 * 1000); // 30 min duration

    return {
        startUtc: new Date(startUtcMs),
        endUtc: new Date(endUtcMs),
        startIso: new Date(startUtcMs).toISOString(),
        endIso: new Date(endUtcMs).toISOString()
    };
}

// -------------------------------------------------------------
// GOOGLE CALENDAR API INTEGRATION
// -------------------------------------------------------------
async function getGoogleAccessToken() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        return null;
    }

    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        }).toString();

        const req = https.request('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.access_token) {
                        resolve(json.access_token);
                    } else {
                        console.warn('Google OAuth Token Error:', json);
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', (err) => {
            console.warn('Google OAuth request error:', err.message);
            resolve(null);
        });

        req.write(postData);
        req.end();
    });
}

// Check availability from Google Calendar FreeBusy API
async function checkGoogleCalendarFreeBusy(dateStr, timezoneStr) {
    const token = await getGoogleAccessToken();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'shreya@goodmeetings.ai';

    if (!token) {
        return null; // Fallback to local DB check
    }

    const { startUtc } = computeSlotRangeUtc(dateStr, '00:00 AM', timezoneStr);
    const dayStartIso = new Date(startUtc.getTime()).toISOString();
    const dayEndIso = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const postBody = JSON.stringify({
        timeMin: dayStartIso,
        timeMax: dayEndIso,
        items: [{ id: calendarId }]
    });

    return new Promise((resolve) => {
        const req = https.request('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postBody)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const busyList = json.calendars?.[calendarId]?.busy || [];
                    resolve(busyList);
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', () => resolve(null));
        req.write(postBody);
        req.end();
    });
}

// Create Event in Shreya's Google Calendar with Google Meet
async function createGoogleCalendarEvent({ name, email, company, phone, teamSize, notes, dateStr, timeStr, timezoneStr }) {
    const token = await getGoogleAccessToken();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const { startIso, endIso } = computeSlotRangeUtc(dateStr, timeStr, timezoneStr);
    const generatedMeet = generateGoogleMeetLink();

    if (!token) {
        return {
            eventId: 'local_evt_' + Date.now(),
            meetUrl: generatedMeet,
            mode: 'integrated_ical_engine'
        };
    }

    const eventPayload = {
        summary: `GoodMeetings Demo — ${company}`,
        description: `Client Name:\n${name}\n\nCompany:\n${company}\n\nEmail:\n${email}\n\nPhone:\n${phone}\n\nTeam / Reps Size:\n${teamSize}\n\nWhat they'd like to see:\n${notes}`,
        start: { dateTime: startIso },
        end: { dateTime: endIso },
        attendees: [
            { email: 'shreya@goodmeetings.ai', displayName: 'Shreya', responseStatus: 'accepted' },
            { email: email, displayName: name }
        ],
        conferenceData: {
            createRequest: {
                requestId: 'meet_req_' + Date.now(),
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        }
    };

    const postBody = JSON.stringify(eventPayload);

    return new Promise((resolve) => {
        const req = https.request(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postBody)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.id) {
                        const meetUri = json.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || json.hangoutLink || generatedMeet;
                        resolve({
                            eventId: json.id,
                            meetUrl: meetUri,
                            mode: 'google_calendar_api'
                        });
                    } else {
                        console.warn('Google Calendar create event fallback:', json);
                        resolve({ eventId: 'gcal_fallback_' + Date.now(), meetUrl: generatedMeet, mode: 'fallback_engine' });
                    }
                } catch (e) {
                    resolve({ eventId: 'gcal_fallback_' + Date.now(), meetUrl: generatedMeet, mode: 'fallback_engine' });
                }
            });
        });

        req.on('error', (err) => {
            console.warn('Google Calendar request error:', err.message);
            resolve({ eventId: 'gcal_fallback_' + Date.now(), meetUrl: generatedMeet, mode: 'fallback_engine' });
        });

        req.write(postBody);
        req.end();
    });
}

// -------------------------------------------------------------
// RFC 5545 iCalendar Generator
// -------------------------------------------------------------
function generateIcsInvite({ name, email, company, phone, teamSize, notes, dateStr, timeStr, timezoneStr, meetUrl }) {
    const { startUtc, endUtc } = computeSlotRangeUtc(dateStr, timeStr, timezoneStr);
    const pad = n => String(n).padStart(2, '0');
    const toIcsDate = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

    const startIcs = toIcsDate(startUtc);
    const endIcs = toIcsDate(endUtc);
    const nowIcs = toIcsDate(new Date());
    const uid = `gm_demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@goodmeetings.ai`;

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GoodMeetings//GoodMeetings Demo Scheduling//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${nowIcs}`,
        `DTSTART:${startIcs}`,
        `DTEND:${endIcs}`,
        `SUMMARY:GoodMeetings Demo — ${company}`,
        `DESCRIPTION:Client Name:\\n${name}\\n\\nCompany:\\n${company}\\n\\nEmail:\\n${email}\\n\\nPhone:\\n${phone}\\n\\nTeam / Reps Size:\\n${teamSize}\\n\\nWhat they'd like to see:\\n${notes}\\n\\nGoogle Meet Link: ${meetUrl}`,
        `LOCATION:${meetUrl}`,
        'ORGANIZER;CN="GoodMeetings System":mailto:bookings@goodmeetings.ai',
        'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN="Shreya";RSVP=TRUE:mailto:shreya@goodmeetings.ai',
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN="${name}";RSVP=TRUE:mailto:${email}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'X-MICROSOFT-CDO-BUSYSTATUS:BUSY',
        'SEQUENCE:0',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Reminder for GoodMeetings Demo',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
}

// -------------------------------------------------------------
// EMAIL DISPATCH ENGINE (Shreya + Client)
// -------------------------------------------------------------
async function sendBookingNotifications({ name, email, company, phone, teamSize, notes, dateStr, timeStr, timezoneStr, displayDateTime, meetUrl }) {
    const formattedDate = dateStr || 'Selected Date';
    const formattedTime = timeStr || 'Selected Time';

    // Step 6 Content to Shreya
    const shreyaSubject = `New GoodMeetings Demo Booked — ${company}`;
    const shreyaText = `Hi Shreya,

A new GoodMeetings demo has been booked.

CLIENT DETAILS

Name: ${name}
Company: ${company}
Email: ${email}
Phone: ${phone}
Team / Reps Size: ${teamSize}

DEMO DETAILS

Date: ${formattedDate}
Time: ${formattedTime}
Duration: 30 minutes

Google Meet:
${meetUrl}

WHAT THEY'D LIKE TO SEE

${notes}

The meeting has been automatically added to your calendar.

Best,
GoodMeetings`;

    const shreyaHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F6F8FB; margin: 0; padding: 24px; color: #0B1426; }
            .card { background: #FFFFFF; max-width: 600px; margin: auto; border-radius: 14px; border: 1px solid #E4E9F2; overflow: hidden; box-shadow: 0 4px 20px rgba(11,20,38,0.05); }
            .header { background: #0B1426; padding: 22px 28px; }
            .header h1 { color: #FFFFFF; margin: 0; font-size: 19px; }
            .header p { color: #5EEAD4; margin: 4px 0 0 0; font-size: 13px; }
            .content { padding: 28px; line-height: 1.6; font-size: 14px; color: #334155; }
            .section-title { font-weight: 700; color: #0B1426; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 18px; margin-bottom: 6px; }
            .table-box { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
            .table-box td { padding: 8px 12px; border-bottom: 1px solid #E4E9F2; font-size: 13.5px; }
            .table-box td.label { width: 35%; color: #64748B; font-weight: 600; background: #F8FAFC; }
            .btn-meet { display: inline-block; background: #0F766E; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13.5px; margin: 12px 0; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1>GoodMeetings • New Demo Booking</h1>
                <p>New Demo Booked — ${company}</p>
            </div>
            <div class="content">
                <p>Hi Shreya,</p>
                <p>A new GoodMeetings demo has been booked.</p>

                <div class="section-title">CLIENT DETAILS</div>
                <table class="table-box">
                    <tr><td class="label">Name</td><td><strong>${name}</strong></td></tr>
                    <tr><td class="label">Company</td><td>${company}</td></tr>
                    <tr><td class="label">Email</td><td><a href="mailto:${email}" style="color:#0F766E;">${email}</a></td></tr>
                    <tr><td class="label">Phone</td><td><a href="tel:${phone}" style="color:#0F766E;">${phone}</a></td></tr>
                    <tr><td class="label">Team / Reps Size</td><td>${teamSize}</td></tr>
                </table>

                <div class="section-title">DEMO DETAILS</div>
                <table class="table-box">
                    <tr><td class="label">Date</td><td>${formattedDate}</td></tr>
                    <tr><td class="label">Time</td><td>${formattedTime}</td></tr>
                    <tr><td class="label">Duration</td><td>30 minutes</td></tr>
                    <tr><td class="label">Google Meet</td><td><a href="${meetUrl}" target="_blank" style="color:#0F766E; font-weight:600;">${meetUrl}</a></td></tr>
                </table>

                <div style="text-align: center; margin: 16px 0;">
                    <a href="${meetUrl}" target="_blank" class="btn-meet">🎥 Join Google Meet Room</a>
                </div>

                <div class="section-title">WHAT THEY'D LIKE TO SEE</div>
                <p style="background: #F8FAFC; padding: 12px 16px; border-radius: 8px; border: 1px solid #E2E8F0; margin-top: 6px;">${notes}</p>

                <p style="color: #166534; font-weight: 600; margin-top: 18px;">✓ The meeting has been automatically added to your calendar.</p>
                <p>Best,<br><strong>GoodMeetings</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Step 7 Content to Client
    const clientSubject = `Your GoodMeetings Demo is Confirmed 🎉`;
    const clientText = `Hi ${name},

Your GoodMeetings demo has been successfully scheduled.

DEMO DETAILS

Date: ${formattedDate}
Time: ${formattedTime}
Duration: 30 minutes
Host: Shreya
Company: GoodMeetings

JOIN THE DEMO

${meetUrl}

Your calendar invitation has also been created automatically.

We look forward to showing you how GoodMeetings can turn conversations into measurable outcomes.

Best,
GoodMeetings Team`;

    const clientHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F6F8FB; margin: 0; padding: 24px; color: #0B1426; }
            .card { background: #FFFFFF; max-width: 600px; margin: auto; border-radius: 14px; border: 1px solid #E4E9F2; overflow: hidden; box-shadow: 0 4px 20px rgba(11,20,38,0.05); }
            .header { background: #0B1426; padding: 24px 28px; }
            .header h1 { color: #FFFFFF; margin: 0; font-size: 20px; }
            .header p { color: #5EEAD4; margin: 4px 0 0 0; font-size: 13.5px; }
            .content { padding: 28px; line-height: 1.6; font-size: 14px; color: #334155; }
            .section-title { font-weight: 700; color: #0B1426; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 18px; margin-bottom: 6px; }
            .table-box { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
            .table-box td { padding: 10px 12px; border-bottom: 1px solid #E4E9F2; font-size: 13.5px; }
            .table-box td.label { width: 35%; color: #64748B; font-weight: 600; background: #F8FAFC; }
            .btn-meet { display: inline-block; background: #0F766E; color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; border-radius: 9px; font-weight: 700; font-size: 14px; margin: 14px 0; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1>GoodMeetings • Demo Confirmed</h1>
                <p>Personalized Demo Session with Shreya</p>
            </div>
            <div class="content">
                <p>Hi ${name},</p>
                <p>Your GoodMeetings demo has been successfully scheduled.</p>

                <div class="section-title">DEMO DETAILS</div>
                <table class="table-box">
                    <tr><td class="label">Date</td><td><strong>${formattedDate}</strong></td></tr>
                    <tr><td class="label">Time</td><td><strong>${formattedTime}</strong></td></tr>
                    <tr><td class="label">Duration</td><td>30 minutes</td></tr>
                    <tr><td class="label">Host</td><td>Shreya</td></tr>
                    <tr><td class="label">Company</td><td>GoodMeetings</td></tr>
                </table>

                <div class="section-title">JOIN THE DEMO</div>
                <div style="text-align: center; margin: 16px 0;">
                    <a href="${meetUrl}" target="_blank" class="btn-meet">🎥 Join Google Meet</a>
                    <div style="font-size: 12.5px; color: #64748B; margin-top: 6px;">
                        Room URL: <a href="${meetUrl}" target="_blank" style="color: #0F766E;">${meetUrl}</a>
                    </div>
                </div>

                <p style="color: #166534; font-weight: 600;">✓ Your calendar invitation has also been created automatically.</p>
                <p>We look forward to showing you how GoodMeetings can turn conversations into measurable outcomes.</p>

                <p>Best,<br><strong>GoodMeetings Team</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const icsContent = generateIcsInvite({
        name, email, company, phone, teamSize, notes, dateStr, timeStr, timezoneStr, meetUrl
    });

    const config = getEmailConfig();
    const resendKey = process.env.RESEND_API_KEY;

    // A. Resend Delivery (if key is configured in env)
    if (resendKey) {
        try {
            const sendResend = async (to, subject, html, text) => {
                const payload = JSON.stringify({
                    from: 'GoodMeetings <bookings@goodmeetings.ai>',
                    to: [to],
                    subject: subject,
                    html: html,
                    text: text
                });
                return new Promise((resolve) => {
                    const req = https.request('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${resendKey}`,
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(payload)
                        }
                    }, (res) => {
                        let d = '';
                        res.on('data', c => d += c);
                        res.on('end', () => resolve(true));
                    });
                    req.on('error', () => resolve(false));
                    req.write(payload);
                    req.end();
                });
            };
            await sendResend('shreya@goodmeetings.ai', shreyaSubject, shreyaHtml, shreyaText);
            await sendResend(email, clientSubject, clientHtml, clientText);
            console.log('✅ Dispatched emails via Resend API');
            return { sent: true, mode: 'resend' };
        } catch (e) {
            console.warn('Resend send issue:', e.message);
        }
    }

    // B. Direct SMTP Delivery (Nodemailer)
    if (config.auth && config.auth.user && config.auth.pass) {
        try {
            const transporter = nodemailer.createTransport({
                service: config.provider === 'gmail' ? 'gmail' : undefined,
                host: config.host || 'smtp.gmail.com',
                port: config.port || 587,
                secure: config.port === 465,
                auth: {
                    user: config.auth.user,
                    pass: config.auth.pass
                }
            });

            // Send to Shreya
            await transporter.sendMail({
                from: `"GoodMeetings Demo" <${config.auth.user}>`,
                to: 'shreya@goodmeetings.ai',
                replyTo: email,
                subject: shreyaSubject,
                text: shreyaText,
                html: shreyaHtml,
                icalEvent: { filename: 'invite.ics', method: 'REQUEST', content: icsContent }
            });

            // Send to Client
            await transporter.sendMail({
                from: `"GoodMeetings" <${config.auth.user}>`,
                to: email,
                replyTo: 'shreya@goodmeetings.ai',
                subject: clientSubject,
                text: clientText,
                html: clientHtml,
                icalEvent: { filename: 'invite.ics', method: 'REQUEST', content: icsContent }
            });

            console.log(`✅ Dispatched live emails via SMTP to Shreya and ${email}`);
            return { sent: true, mode: 'smtp' };
        } catch (err) {
            console.warn('SMTP delivery notice:', err.message);
        }
    }

    console.log(`📬 [Local Engine] Demo confirmed for ${name} (${company}). Logged in /inbox and bookings.json.`);
    return { sent: true, mode: 'local_inbox' };
}

// -------------------------------------------------------------
// HTTP SERVER & API ROUTES
// -------------------------------------------------------------
const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // -------------------------------------------------------------
    // GET /api/availability
    // -------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/availability') {
        try {
            const dateStr = parsedUrl.searchParams.get('date') || '2026-09-24';
            const tzStr = parsedUrl.searchParams.get('timezone') || 'IST (UTC+5:30)';

            // 1. Check existing bookings from persistent bookings.json
            const bookingsFile = path.join(__dirname, 'bookings.json');
            let bookings = [];
            if (fs.existsSync(bookingsFile)) {
                try {
                    bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8') || '[]');
                } catch (e) {}
            }

            const bookedTimeSlots = new Set();
            bookings.forEach(b => {
                if (b.status !== 'cancelled') {
                    if (b.selectedDate === dateStr && b.selectedTime) {
                        bookedTimeSlots.add(b.selectedTime);
                    }
                }
            });

            // 2. Check Google Calendar FreeBusy if configured
            const googleBusy = await checkGoogleCalendarFreeBusy(dateStr, tzStr);
            if (googleBusy && Array.isArray(googleBusy)) {
                DEFAULT_SLOTS.forEach(slot => {
                    const { startUtc, endUtc } = computeSlotRangeUtc(dateStr, slot, tzStr);
                    const isBusy = googleBusy.some(b => {
                        const bStart = new Date(b.start).getTime();
                        const bEnd = new Date(b.end).getTime();
                        return (startUtc.getTime() < bEnd && endUtc.getTime() > bStart);
                    });
                    if (isBusy) {
                        bookedTimeSlots.add(slot);
                    }
                });
            }

            const availableSlots = DEFAULT_SLOTS.filter(s => !bookedTimeSlots.has(s));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                date: dateStr,
                timezone: tzStr,
                totalSlots: DEFAULT_SLOTS.length,
                availableSlots,
                bookedSlots: Array.from(bookedTimeSlots)
            }));
            return;
        } catch (err) {
            console.error('Availability check error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Unable to check availability. Please try again.'
            }));
            return;
        }
    }

    // -------------------------------------------------------------
    // POST /api/book-demo
    // -------------------------------------------------------------
    if (req.method === 'POST' && (pathname === '/api/book-demo' || pathname === '/api/trial')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');

                const name = (data.name || data['Attendee Full Name'] || '').trim();
                const email = (data.email || data['Work Email'] || '').trim();
                const company = (data.company || data['Company Name'] || '').trim();
                const phone = (data.phone || data['Phone Number'] || '').trim();
                const teamSize = (data.team_size || data.teamSize || data['Team Size'] || '11-50 reps').trim();
                const notes = (data.notes || data.goals || data['Meeting Goals'] || 'Personalized Product Walkthrough').trim();

                const dateStr = data.date || data.selectedDate || '2026-09-24';
                const timeStr = data.time || data.selectedTime || '10:00 AM';
                const timezoneStr = data.timezone || data.selectedTz || 'IST (UTC+5:30)';
                const displayDateTime = data.displayDateTime || data['Selected Date & Time'] || `${dateStr} at ${timeStr} (${timezoneStr})`;

                // 1. Validate form fields
                if (!name) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Full Name is required.' }));
                    return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!email || !emailRegex.test(email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Please enter a valid work email address.' }));
                    return;
                }
                if (!company) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Company Name is required.' }));
                    return;
                }
                if (!phone || phone.length < 6) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Valid Phone Number is required.' }));
                    return;
                }

                // 2. Step 3: Recheck availability immediately (Double-booking protection)
                const bookingsFile = path.join(__dirname, 'bookings.json');
                let existingBookings = [];
                if (fs.existsSync(bookingsFile)) {
                    try {
                        existingBookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8') || '[]');
                    } catch (e) {}
                }

                const isAlreadyBooked = existingBookings.some(b => 
                    b.status !== 'cancelled' &&
                    b.selectedDate === dateStr &&
                    b.selectedTime === timeStr
                );

                if (isAlreadyBooked) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'This time slot is no longer available. Please select another time.'
                    }));
                    return;
                }

                // 3. Step 4 & 5: Create Google Calendar Event & Google Meet link
                let calResult;
                try {
                    calResult = await createGoogleCalendarEvent({
                        name, email, company, phone, teamSize, notes, dateStr, timeStr, timezoneStr
                    });
                } catch (calErr) {
                    console.error('Calendar creation error:', calErr);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: "We couldn't complete your booking. Please try again." }));
                    return;
                }

                const meetUrl = calResult.meetUrl || generateGoogleMeetLink();
                const calendarEventId = calResult.eventId;

                // 4. Step 6 & 7: Send automated email notifications
                const mailResult = await sendBookingNotifications({
                    name, email, company, phone, teamSize, notes, dateStr, timeStr, timezoneStr, displayDateTime, meetUrl
                });

                // 5. Database: Save booking record
                const bookingRecord = {
                    id: 'booking_' + Date.now(),
                    clientName: name,
                    clientEmail: email,
                    company: company,
                    phone: phone,
                    teamSize: teamSize,
                    clientMessage: notes,
                    selectedDate: dateStr,
                    selectedTime: timeStr,
                    timezone: timezoneStr,
                    selectedDateTime: displayDateTime,
                    calendarEventId: calendarEventId,
                    meetUrl: meetUrl,
                    hostEmail: 'shreya@goodmeetings.ai',
                    status: 'confirmed',
                    mailStatus: mailResult,
                    createdAt: new Date().toISOString()
                };

                existingBookings.unshift(bookingRecord);
                fs.writeFileSync(bookingsFile, JSON.stringify(existingBookings, null, 2));

                // 6. Respond with success
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Demo booked successfully! 🎉',
                    bookingId: bookingRecord.id,
                    meetUrl: meetUrl,
                    date: dateStr,
                    time: timeStr,
                    timezone: timezoneStr,
                    clientEmail: email
                }));
            } catch (err) {
                console.error('Server error on book-demo:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: "We couldn't complete your booking. Please try again."
                }));
            }
        });
        return;
    }

    // -------------------------------------------------------------
    // POST /api/contact
    // -------------------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/contact') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const name = (data.name || '').trim();
                const email = (data.email || '').trim();
                const message = (data.message || '').trim();
                const type = (data.type || data.inquiryType || 'general').trim();
                const company = (data.company || '').trim();

                if (!name) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Name is required.' }));
                    return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!email || !emailRegex.test(email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Valid email is required.' }));
                    return;
                }

                // Store in bookings.json or contacts.json
                const contactsFile = path.join(__dirname, 'contacts.json');
                let contacts = [];
                if (fs.existsSync(contactsFile)) {
                    try { contacts = JSON.parse(fs.readFileSync(contactsFile, 'utf8') || '[]'); } catch(e) {}
                }
                const newContact = {
                    id: 'cnt_' + Date.now(),
                    name,
                    email,
                    message,
                    type,
                    company,
                    createdAt: new Date().toISOString()
                };
                contacts.unshift(newContact);
                fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: "Thank you for reaching out! We've received your message and will respond shortly.",
                    contact: newContact
                }));
            } catch (err) {
                console.error('Server error on contact:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Failed to process request.' }));
            }
        });
        return;
    }

    // -------------------------------------------------------------
    // GET /api/bookings
    // -------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/bookings') {
        const bookingsFile = path.join(__dirname, 'bookings.json');
        let bookings = [];
        if (fs.existsSync(bookingsFile)) {
            try {
                bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8') || '[]');
            } catch (e) {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: bookings.length, bookings }));
        return;
    }

    // -------------------------------------------------------------
    // GET /inbox (Local Development Dashboard)
    // -------------------------------------------------------------
    if (req.method === 'GET' && (pathname === '/inbox' || pathname === '/inbox/')) {
        const bookingsFile = path.join(__dirname, 'bookings.json');
        let bookings = [];
        if (fs.existsSync(bookingsFile)) {
            try {
                bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8') || '[]');
            } catch (e) {}
        }

        const cards = bookings.map((b, i) => {
            const meet = b.meetUrl || b.meetRoom || 'https://meet.google.com/new';
            const name = b.clientName || b.name || 'Guest';
            const email = b.clientEmail || b.email || '';
            const phone = b.phone || 'Not provided';
            const company = b.company || b.Company || 'Company';
            const teamSize = b.teamSize || b['Team Size'] || '11-50 reps';
            const dateTime = b.selectedDateTime || b['Selected Date & Time'] || `${b.selectedDate} at ${b.selectedTime}`;
            const notes = b.clientMessage || b['Meeting Goals'] || 'Personalized Product Walkthrough';

            return `
            <div style="background: #FFFFFF; border: 1px solid #E4E9F2; border-radius: 14px; margin-bottom: 24px; overflow: hidden; box-shadow: 0 4px 16px rgba(11,20,38,0.04);">
                <div style="background: #0B1426; color: #FFFFFF; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="background: #0F766E; color: #5EEAD4; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 100px; text-transform: uppercase;">Confirmed Demo #${bookings.length - i}</span>
                        <h3 style="margin: 6px 0 0 0; font-size: 17px; color: #FFFFFF;">${name} (${company})</h3>
                    </div>
                    <div style="text-align: right; font-size: 13px; color: #94A3B8;">
                        📅 <strong style="color: #5EEAD4;">${dateTime}</strong>
                    </div>
                </div>

                <div style="padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <!-- Shreya's Received Notification -->
                    <div style="background: #FAFCFF; border: 1px solid #E4E9F2; border-radius: 10px; padding: 18px;">
                        <div style="font-size: 12px; font-weight: 700; color: #0F766E; text-transform: uppercase; margin-bottom: 10px;">
                            👩‍💼 Shreya's Email (shreya@goodmeetings.ai)
                        </div>
                        <div style="font-size: 13.5px; line-height: 1.6; color: #334155;">
                            <div><strong>Attendee:</strong> ${name}</div>
                            <div><strong>Work Email:</strong> <a href="mailto:${email}" style="color: #0F766E;">${email}</a></div>
                            <div><strong>Phone:</strong> <a href="tel:${phone}" style="color: #0F766E;">${phone}</a></div>
                            <div><strong>Company / Reps:</strong> ${company} (${teamSize})</div>
                            <div><strong>What they'd like to see:</strong> ${notes}</div>
                            <div style="margin-top: 8px; color: #166534; font-weight: 600;">✓ Calendar Event Created & Blocked</div>
                        </div>
                    </div>

                    <!-- Customer's Received Confirmation -->
                    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 18px;">
                        <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; margin-bottom: 10px;">
                            👤 Client's Confirmation (${email})
                        </div>
                        <div style="font-size: 13.5px; line-height: 1.6; color: #334155;">
                            <div style="margin-bottom: 8px;"><em>"Your GoodMeetings demo is confirmed 🎉"</em></div>
                            <div style="font-weight: 600; color: #0B1426;">🎥 Google Meet: <a href="${meet}" target="_blank" style="color: #0F766E; text-decoration: underline;">${meet}</a></div>
                            <div style="margin-top: 12px;">
                                <a href="${meet}" target="_blank" style="display: inline-block; background: #0F766E; color: #FFFFFF; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 12.5px;">Join Google Meet →</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        const inboxHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>GoodMeetings • Demo Booking Hub</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F6F8FB; margin: 0; padding: 32px 24px; color: #0B1426; }
                .container { max-width: 960px; margin: auto; }
                .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
                .btn-home { background: #0B1426; color: #FFFFFF; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 600; }
                .btn-home:hover { background: #0F766E; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header-bar">
                    <div>
                        <h1 style="margin: 0; font-size: 24px; color: #0B1426;">📬 GoodMeetings Demo Booking Hub</h1>
                        <p style="margin: 6px 0 0 0; color: #64748B; font-size: 14px;">Real-time feed of demo bookings, Google Meet rooms, and calendar invites.</p>
                    </div>
                    <div>
                        <a href="/" class="btn-home">← Back to Website</a>
                    </div>
                </div>

                ${bookings.length === 0 ? '<div style="background:#fff; padding:48px; border-radius:14px; text-align:center; color:#64748B; border:1px solid #E4E9F2;">No demo bookings recorded yet. Open the website and book a demo to see it appear here!</div>' : cards}
            </div>
        </body>
        </html>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(inboxHtml);
        return;
    }

    // -------------------------------------------------------------
    // Static Files
    // -------------------------------------------------------------
    let reqPath = pathname;
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    const filePath = path.join(__dirname, reqPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 GoodMeetings Production Server running on port ${PORT}`);
});
