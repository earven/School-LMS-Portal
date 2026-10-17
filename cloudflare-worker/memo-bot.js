// cloudflare-worker/memo-bot.js

export default {
  async fetch(request, rawEnv) {
    const env = {
      ...rawEnv,
      TELEGRAM_BOT_TOKEN: String(rawEnv.TELEGRAM_BOT_TOKEN || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
      ADMIN_TELEGRAM_ID: String(rawEnv.ADMIN_TELEGRAM_ID || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
      FIREBASE_API_KEY: String(rawEnv.FIREBASE_API_KEY || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
      FIREBASE_PROJECT_ID: String(rawEnv.FIREBASE_PROJECT_ID || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
      ADMIN_EMAIL: String(rawEnv.ADMIN_EMAIL || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
      ADMIN_PASSWORD: String(rawEnv.ADMIN_PASSWORD || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
    };

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const payload = await request.json();
      console.log("DEBUG - Received payload:", JSON.stringify(payload));
      
      const message = payload.message;

      // Ignore if payload is not a message (e.g. edited_message, inline_query)
      if (!message || !message.chat || !message.text) {
        console.log("DEBUG - Ignored non-message or empty text payload");
        return new Response('OK', { status: 200 });
      }

      const chatId = message.chat.id;
      const fromId = message.from?.id;
      console.log("DEBUG - Message details: text =", message.text, "chatId =", chatId, "fromId =", fromId, "ADMIN_TELEGRAM_ID =", env.ADMIN_TELEGRAM_ID);

      // Whitelist check: only process messages from the whitelisted admin
      if (String(fromId) !== String(env.ADMIN_TELEGRAM_ID)) {
        console.log("DEBUG - Whitelist check failed!");
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, '⚠️ Unauthorized access.');
        return new Response('OK', { status: 200 });
      }

      const text = message.text.trim();
      const sessionKey = `session_${chatId}`;
      const sessionData = await env.BOT_SESSIONS.get(sessionKey);
      let session = sessionData ? JSON.parse(sessionData) : null;

      // Handle Cancel / Help commands
      if (text.startsWith('/cancel')) {
        if (session) {
          await env.BOT_SESSIONS.delete(sessionKey);
          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ Memo posting cancelled.');
        } else {
          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, 'No active session to cancel.');
        }
        return new Response('OK', { status: 200 });
      }

      if (text.startsWith('/help') || text.startsWith('/start')) {
        const helpText = `📌 <b>School LMS Memo Bot Help</b>\n\n` +
          `Copy a memo title and link from Messenger and send it here in this format:\n\n` +
          `<code>[Memo Title]\n[Memo URL]</code>\n\n` +
          `<b>Example:</b>\n` +
          `<code>OM-014 s.2026 – Bridge Project TWG\nhttps://drive.google.com/file/d/123xyz/view</code>\n\n` +
          `<b>Commands:</b>\n` +
          `/cancel - Reset and discard current flow\n` +
          `/help - Display this manual`;
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, helpText);
        return new Response('OK', { status: 200 });
      }

      // Check if text is a new link posting (contains a link)
      const urlRegex = /(https?:\/\/[^\s]+)/;
      const urlMatch = text.match(urlRegex);

      if (urlMatch) {
        const memoUrl = urlMatch[0];
        // Extract title by removing the URL from text and trimming
        let memoTitle = text.replace(memoUrl, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

        // If no title was provided, try to extract a generic name or ask
        if (!memoTitle) {
          try {
            const parsedUrl = new URL(memoUrl);
            const pathname = parsedUrl.pathname;
            const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
            if (lastPart && lastPart.length > 2 && !lastPart.includes('.')) {
              memoTitle = lastPart;
            } else {
              memoTitle = `Memo - ${new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }
          } catch {
            memoTitle = `Memo - ${new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          }
        }

        // Save to KV Session state (10-minute expiration)
        const newSession = {
          state: 'awaiting_category',
          memo: {
            title: memoTitle,
            driveLink: memoUrl
          }
        };

        await env.BOT_SESSIONS.put(sessionKey, JSON.stringify(newSession), { expirationTtl: 600 });

        const promptText = `📌 <b>Memo Details Captured</b>\n\n` +
          `<b>Title:</b> ${memoTitle}\n` +
          `<b>Link:</b> ${memoUrl}\n\n` +
          `✍️ <i>To change the title, simply reply with the new title now.</i>\n\n` +
          `📁 <b>Select Category to Post:</b>\n` +
          `1. School Memo 🏫\n` +
          `2. DepEd Memo 🇵🇭\n` +
          `3. Department Memo 📁\n` +
          `4. Division Memo 🏛️\n` +
          `5. Advisory 📢\n` +
          `6. Other 📌\n\n` +
          `<i>Reply with a number (1-6) or send /cancel to reset.</i>`;

        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, promptText);
        return new Response('OK', { status: 200 });
      }

      // Conversation Flow: Category Selection State or Title Edit State
      if (session && session.state === 'awaiting_category') {
        const categorySelection = parseInt(text);
        if (!isNaN(categorySelection) && categorySelection >= 1 && categorySelection <= 6) {
          const categories = {
            1: { id: 'school', label: 'School Memo 🏫' },
            2: { id: 'deped', label: 'DepEd Memo 🇵🇭' },
            3: { id: 'department', label: 'Department Memo 📁' },
            4: { id: 'division', label: 'Division Memo 🏛️' },
            5: { id: 'advisory', label: 'Advisory 📢' },
            6: { id: 'other', label: 'Other 📌' }
          };

          const selected = categories[categorySelection];
          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, `⏳ Posting memo to LMS under category: ${selected.label}...`);

          try {
            // 1. Authenticate to Firebase REST API as Admin
            const authRes = await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: env.ADMIN_EMAIL,
                  password: env.ADMIN_PASSWORD,
                  returnSecureToken: true
                })
              }
            );

            if (!authRes.ok) {
              const authErr = await authRes.json();
              throw new Error(`Firebase Auth failed: ${authErr.error?.message || authRes.statusText}`);
            }

            const authData = await authRes.json();
            const idToken = authData.idToken;
            const adminUid = authData.localId;

            // 2. Fetch Active Users in the Portal to Notify
            const usersRes = await fetch(
              `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users?pageSize=300`,
              {
                headers: { 'Authorization': `Bearer ${idToken}` }
              }
            );

            if (!usersRes.ok) {
              throw new Error(`Failed to retrieve user list: ${usersRes.statusText}`);
            }

            const usersData = await usersRes.json();
            const recipientUids = [];

            if (usersData.documents) {
              for (const doc of usersData.documents) {
                const fields = doc.fields || {};
                const role = fields.role?.stringValue;
                if (role === 'teacher' || role === 'admin' || role === 'system_admin') {
                  const nameParts = doc.name.split('/');
                  const uid = nameParts[nameParts.length - 1];
                  if (uid) recipientUids.push(uid);
                }
              }
            }

            // 3. Construct Batch Commits for Firestore REST API
            const memoId = crypto.randomUUID();
            const writes = [];

            // Write A: Add Memo document
            writes.push({
              update: {
                name: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/memos/${memoId}`,
                fields: {
                  title: { stringValue: session.memo.title },
                  category: { stringValue: selected.id },
                  description: { stringValue: 'Posted via Telegram Bot.' },
                  driveLink: { stringValue: session.memo.driveLink },
                  createdBy: { stringValue: adminUid },
                  createdByName: { stringValue: 'Admin (Telegram Bot)' },
                  createdAt: { timestampValue: new Date().toISOString() }
                }
              }
            });

            // Write B: Add Notifications for recipients
            const groupId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            const notifTitle = `📌 New Memo: ${session.memo.title}`;
            const notifMessage = `A new ${selected.label} has been posted by Admin (Telegram Bot). Click to view it.`;

            for (const uid of recipientUids) {
              const notifId = crypto.randomUUID();
              writes.push({
                update: {
                  name: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/notifications/${notifId}`,
                  fields: {
                    groupId: { stringValue: groupId },
                    title: { stringValue: notifTitle },
                    message: { stringValue: notifMessage },
                    recipientId: { stringValue: uid },
                    senderId: { stringValue: adminUid },
                    senderName: { stringValue: 'Admin (Telegram Bot)' },
                    type: { stringValue: 'memo' },
                    link: { stringValue: '/teacher-tools/memo-stocker' },
                    read: { booleanValue: uid === adminUid },
                    acknowledged: { booleanValue: uid === adminUid },
                    createdAt: { timestampValue: new Date().toISOString() }
                  }
                }
              });
            }

            // 4. Send Batch Request
            const commitRes = await fetch(
              `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ writes })
              }
            );

            if (!commitRes.ok) {
              const commitErr = await commitRes.json();
              throw new Error(`Firestore Commit failed: ${JSON.stringify(commitErr)}`);
            }

            // Success: Clear Session and Reply
            await env.BOT_SESSIONS.delete(sessionKey);

            const successText = `✅ <b>Memo posted to Memo Stocker!</b>\n\n` +
              `📌 <b>Title:</b> ${session.memo.title}\n` +
              `📁 <b>Category:</b> ${selected.label}\n` +
              `👥 <b>Staff:</b> ${recipientUids.length} staff member(s) have been notified.`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, successText);

          } catch (dbErr) {
            console.error(dbErr);
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, `❌ <b>Database Error:</b> ${dbErr.message}`);
          }

          return new Response('OK', { status: 200 });
        } else {
          // If the reply is not a number 1-6, treat it as editing the title!
          session.memo.title = text;
          await env.BOT_SESSIONS.put(sessionKey, JSON.stringify(session), { expirationTtl: 600 });

          const promptText = `✏️ <b>Title updated to:</b> ${text}\n\n` +
            `📁 <b>Select Category to Post:</b>\n` +
            `1. School Memo 🏫\n` +
            `2. DepEd Memo 🇵🇭\n` +
            `3. Department Memo 📁\n` +
            `4. Division Memo 🏛️\n` +
            `5. Advisory 📢\n` +
            `6. Other 📌\n\n` +
            `<i>Reply with a number (1-6) to post, send another text to update the title, or send /cancel.</i>`;

          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, promptText);
          return new Response('OK', { status: 200 });
        }
      }

      // No active session and no link found in text
      await sendTelegramMessage(
        env.TELEGRAM_BOT_TOKEN, 
        chatId, 
        '⚠️ <b>No active session.</b> Please send the memo link (starting with http/https) along with the title.'
      );

    } catch (err) {
      console.error(err);
    }

    return new Response('OK', { status: 200 });
  }
};

async function sendTelegramMessage(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Telegram API error: ${res.status} ${res.statusText} - ${errText}`);
  }
}
