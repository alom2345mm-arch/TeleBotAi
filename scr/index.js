export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const userText = update.message.text;

          // 1. KONEKSI KE API GEMINI
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_KEY}`;
          const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userText }] }]
            })
          });
          
          const data = await response.json();
          const balasanAi = data.candidates[0].content.parts[0].text || "Maaf, AI sedang sibuk.";

          // 2. SIMPAN HISTORY KE DB CLOUDFLARE D1
          if (env.DB) {
            await env.DB.prepare(
              "INSERT INTO logs_chat (pesan_masuk, balasan_ai) VALUES (?, ?)"
            ).bind(userText, balasanAi).run();
          }

          // 3. KIRIM BALIK BALASAN KE TELEGRAM
          await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: balasanAi
            })
          });
        }
      } catch (e) {
        return new Response("Error: " + e.message);
      }
    }
    return new Response("Bot Engine Online!");
  }
};
