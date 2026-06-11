export default {
  async fetch(request, env) {
    // Jalur Web Console untuk mengecek status Engine (Menggantikan fungsi handle_web_console_request Termux)
    const url = new URL(request.url);
    if (url.pathname === "/execute" || url.pathname === "/") {
      return new Response("Engine Core Live Status: [RUNNING] via Cloudflare Workers 24/7", {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    }

    // Memproses Webhook Masuk dari Telegram
    if (request.method === "POST") {
      try {
        const update = await request.json();
        
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const userId = update.message.from.id.toString();
          const username = update.message.from.username || "NoUsername";
          const userText = update.message.text;

          // Mengirim sinyal TYPING ke Telegram
          await sendChatAction(chatId, env.TELEGRAM_TOKEN);

          // 1. BASIS PENGETAHUAN (Menggantikan pembacaan file md lokal di Termux)
          // Anda bisa mendefinisikan teks dokumen atau memanggilnya dari KV/D1 di sini
          const antigravityKnowledge = "DOKUMEN RESMI GOOGLE ANTIGRAVITY INDONESIA..."; 
          const securityPolicy = "SECURE PROTOCOL ACTIVE...";

          // 2. LOGIKA OTORITAS MUTLAK (Sama seperti logika @DummyXXX di Termux)
          let extraContext = "";
          if (username.toLowerCase() === "dummyxxx") {
            extraContext = "⚠️ KONTROL OTORITAS MUTLAK PENCIPTA (@DummyXXX) AKTIF.\n";
          }

          const now = new Date();
          const options = { timeZone: 'Asia/Jakarta', hour12: false };
          const wibTime = now.toLocaleString('id-ID', options);
          
          const systemInstruction = 
            `⏰ CONTEXT WAKTU DUNIA REAL-TIME: ${wibTime} WIB\n\n` +
            `ROLE & TONALITAS: Kamu adalah chatbot asisten pintar yang wajib menjawab secara NATURAL, SIMPEL, dan SOPAN.\n\n` +
            `${extraContext}` +
            `INTEGRASI KEMAMPUAN REALTIME:\n` +
            `1. Kamu dibekali akses penuh Google Search Grounding untuk cuaca aktual.\n` +
            `2. Jika urutan deskripsi membutuhkan struktur, gunakan variasi Angka (1,2,3), Romawi (I,II,III), atau Alfabet (A,B,C) secara manusiawi.\n` +
            `- FOOTER KONDISIONAL: Munculkan '---' lalu '● [antigravity.google](https://antigravity.google/docs/getting-started)' HANYA jika menerangkan data dokumen resmi Google Antigravity.\n\n` +
            `[DOCS]:\n${antigravityKnowledge}\n` +
            `[SECURITY]:\n${securityPolicy}\n`;

          // 3. EKSEKUSI MODEL AI GEMINI VIA CLOUDFLARE WORKERS AI
          // Menggunakan model bawaan yang tersedia gratis di Cloudflare
          const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userText }
            ]
          });
          
          let rawAiText = aiResponse.response || "Seluruh cluster model sedang limit.";
          
          // 4. FORMATTING TEXT KE HTML (Menggantikan fungsi format_gemini_ui di Termux)
          const finalHtmlOutput = formatGeminiUiToHtml(rawAiText);

          // 5. SIMPAN LOG AKTIVITAS KE DATABASE CLOUDFLARE D1
          if (env.DB) {
            await env.DB.prepare(
              "INSERT INTO logs_chat (user_id, username, pesan_masuk, balasan_ai) VALUES (?, ?, ?, ?)"
            )
            .bind(userId, username, userText, rawAiText)
            .run();
          }

          // 6. KIRIM BALIK KE TELEGRAM DENGAN MODE PARSE HTML
          await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: finalHtmlOutput,
              parse_mode: "HTML",
              link_preview_options: {
                is_disabled: false,
                prefer_small_media: true,
                show_above_text: false
              }
            })
          });
        }
      } catch (err) {
        return new Response("Error: " + err.message, { status: 500 });
      }
    }

    return new Response("Bot Engine Active", { status: 200 });
  }
};

// Fungsi pembantu untuk mengirim status Typing
async function sendChatAction(chatId, token) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" })
    });
  } catch(e) {}
}

// Fungsi Formatting Gemini UI (Penerjemah Markdown ke HTML Telegram)
function formatGeminiUiToHtml(rawText) {
  if (!rawText) return "";
  
  // Proteksi Escape HTML dasar
  let safeText = rawText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  let lines = safeText.split('\n');
  let processedLines = lines.map(line => {
    let trimmed = line.trim();
    if (trimmed === '---' || trimmed === '***') {
      return "────────────────────────";
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      return line.replace('* ', '• ').replace('- ', '• ');
    }
    return line;
  });

  let textBlock = processedLines.join('\n');
  
  // Regex untuk bold, code, dan link mirip versi Python Termux Anda
  textBlock = textBlock.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  textBlock = textBlock.replace(/\*(.*?)\*/g, '<b>$1</b>');
  textBlock = textBlock.replace(/`(.*?)`/g, '<code>$1</code>');
  textBlock = textBlock.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  return textBlock;
}
