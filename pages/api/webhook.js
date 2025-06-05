// pages/api/webhook.js

let messages = []; // In-memory store (replace with DB for production)

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Return saved messages
    return res.status(200).json(messages);
  }

  if (req.method === 'POST') {
    const body = req.body;

    // WhatsApp Business webhook payload check
    if (body.object === 'whatsapp_business_account') {
      body.entry.forEach(entry => {
        entry.changes.forEach(change => {
          const message = change.value.messages?.[0];
          const contact = change.value.contacts?.[0];
          if (message && contact) {
            const msgObj = {
              from: contact.wa_id,
              text: message.text?.body || '[Non-text message]',
              timestamp: Date.now(),
            };
            messages.push(msgObj);
            console.log('Received message:', msgObj);
          }
        });
      });
      return res.status(200).end();
    } else {
      return res.status(404).end();
    }
  }

  // For webhook verification (GET with challenge)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('Webhook verified');
      return res.status(200).send(challenge);
    } else {
      return res.status(403).end();
    }
  }

  return res.status(405).end(); // Method not allowed
}
