export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =====================================================================
    // 1. WEB CONSOLE REQUEST (Pengganti handle_web_console_request / Web Terminal)
    // =====================================================================
    if (url.pathname === "/execute") {
      const cmd = url.searchParams.get("cmd");
      let responseBody = "";
      
      if (cmd) {
        const decodedCmd = decodeURIComponent(cmd);
        // Karena Cloudflare Workers serverless (tidak ada bash OS seperti Termux), 
        // kita berikan kontrol diagnostik database D1 via Web Console.
        try {
          if (decodedCmd === "status") {
            responseBody = "Engine Core Live Status: [RUNNING]";
          } else if (decodedCmd.toLowerCase().startsWith("select")) {
            const dbQuery = await env.DB.prepare(decodedCmd).all();
            responseBody = JSON.stringify(dbQuery.results, null, 2);
          } else {
            responseBody = `Command '${decodedCmd}' diterima. Lingkungan Cloudflare membatasi subprocess lokal OS.`;
          }
        } catch (e) {
          responseBody = `Error: ${e.message}`;
        }
      } else {
        responseBody = "Engine Core Live Status: [RUNNING]";
      }

      return new Response(responseBody, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    }

    // =====================================================================
    // 2. TELEGRAM WEBHOOK INCOMING MESSAGE HANDLER
    // =====================================================================
    if (request.method === "POST") {
      try {
        const update = await request.json();

        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const userId = update.message.from.id ? update.message.from.id.toString() : "";
          const username = update.message.from.username || "";
          const userText = update.message.text;

          // Trigger Action Mengetik (Typing...)
          await sendChatAction(chatId, env.TELEGRAM_TOKEN);

          // Proteksi Otoritas Mutlak Pencipta (@DummyXXX)
          let extraContext = "";
          if (username.toLowerCase() === "dummyxxx") {
            extraContext = "⚠️ KONTROL OTORITAS MUTLAK PENCIPTA (@DummyXXX) AKTIF.\n";
          }

          // Membaca Data Dokumen Pengetahuan dari D1 (Pengganti file .md lokal Termux)
          const docs = await loadKnowledgeFromD1(env);

          // Eksekusi Pemanggilan Core Gemini Engine dengan Fallback Multi-Key & Multi-Model
          const balasanMentahAi = await eksekusiGeminiCore(userText, extraContext, docs, env);

          // Format UI Output ke HTML Telegram (Pengganti format_gemini_ui)
          const outputFinalHtml = formatGeminiUi(balasanMentahAi);

          // Simpan Histori ke Database D1 secara Asynchronous
          if (env.DB) {
            try {
              await env.DB.prepare(
                "INSERT INTO logs_chat (user_id, username, pesan_masuk, balasan_ai) VALUES (?, ?, ?, ?)"
              )
              .bind(userId, username, userText, balasanMentahAi)
              .run();
            } catch (dbErr) {
              // Jika tabel belum dibentuk, bot tetap melanjutkan pengiriman pesan agar tidak stuck
            }
          }

          // Kirim Balasan ke API Telegram dengan Proteksi Link Preview
          await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: outputFinalHtml,
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
        // Abaikan error parsing agar Webhook Telegram tidak me-looping request gagal
        return new Response("OK", { status: 200 });
      }
    }

    return new Response("Bot Engine Active", { status: 200 });
  }
};

// =====================================================================
// 3. SECURE DECRYPTION SYSTEM (XOR Cipher Decryptor)
// =====================================================================
function decryptSecure(cipherText, key = "86020832") {
  if (!cipherText) return "";
  if (cipherText.startsWith("AIzaSy")) return cipherText; // Kunci mentah asli tanpa enkripsi
  try {
    const rawBytes = atob(cipherText);
    let decrypted = "";
    for (let i = 0; i < rawBytes.length; i++) {
      const b = rawBytes.charCodeAt(i);
      const k = key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(b ^ k);
    }
    return decrypted.trim();
  } catch (e) {
    return cipherText;
  }
}

// =====================================================================
// 4. GEMINI INTERACTION CORE ENGINE (Mendukung Multi-Key & Multi-Model Fallback)
// =====================================================================
async function eksekusiGeminiCore(userPrompt, extraContext, docs, env) {
  // Array Model Berdasarkan Prioritas Anda
  const listModel = ["gemini-3.1-flash-lite-preview", "gemini-2.5-flash-lite", "gemini-1.5-flash"];

  // Pengumpulan Kunci dari Pool Environment Cloudflare Variables
  const rawEnvKeys = [
    env.GEMINI_KEY,
    env.GEMINI_KEY_BACKUP_1,
    env.GEMINI_KEY_BACKUP_2,
    env.GEMINI_KEY_BACKUP_3,
    env.GEMINI_KEY_BACKUP_4,
    env.GEMINI_KEY_BACKUP_5
  ];

  const decryptedKeysPool = [];
  for (const rawKey of rawEnvKeys) {
    if (rawKey) {
      const val = decryptSecure(rawKey);
      if (val && !decryptedKeysPool.includes(val)) {
        decryptedKeysPool.push(val);
      }
    }
  }

  if (decryptedKeysPool.length === 0) {
    return "Kunci API di dalam Cloudflare Environment Variables tidak terbaca.";
  }

  // Pengaturan Waktu Dunia Real-Time WIB Berdasarkan Parameter Lokal Anda
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', weekday: 'long' };
  const hariIntl = new Intl.DateTimeFormat('id-ID', options).format(now);
  const wibString = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const timeStampContext = `⏰ CONTEXT WAKTU DUNIA REAL-TIME:\n- Hari: ${hariIntl}, Tanggal/Waktu: ${wibString} WIB\n\n`;

  const systemText = 
    timeStampContext +
    "ROLE & TONALITAS: Kamu adalah chatbot asisten pintar yang wajib menjawab secara NATURAL, SIMPEL, dan SOPAN.\n\n" +
    "INTEGRASI KEMAMPUAN REALTIME:\n" +
    "1. Kamu dibekali akses penuh Google Search Grounding untuk cuaca aktual.\n" +
    "2. Jika urutan deskripsi membutuhkan struktur, gunakan variasi Angka (1,2,3), Romawi (I,II,III), atau Alfabet (A,B,C) secara manusiawi.\n" +
    "- FOOTER KONDISIONAL: Munculkan '---' lalu '● [antigravity.google](https://antigravity.google/docs/getting-started)' HANYA jika menerangkan data dokumen resmi Google Antigravity.\n\n" +
    extraContext + "\n" +
    `[DOCS]:\n${docs.antigravity}\n` +
    `[SECURITY]:\n${docs.security}\n` +
    `[AUTONOMOUS COMPLIANCE]:\n${docs.autonomous}\n`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemText }] },
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 750, topP: 0.95 }
  };

  // Loop Mitigasi: Coba Semua Model x Semua Kunci Cadangan Sampai Dapat Status 200 OK
  for (const model of listModel) {
    for (const activeKey of decryptedKeysPool) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });

        if (response.status === 200) {
          const resJson = await response.json();
          return resJson.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        // Abaikan dan langsung lompat ke kombinasi key/model cadangan berikutnya
      }
    }
  }

  return "Seluruh cluster model dan API Key cadangan Anda sedang limit.";
}

// =====================================================================
// 5. PARSING TEXT FORMATTING PROTOCOL (Markdown HTML Parser)
// =====================================================================
function formatGeminiUi(rawText) {
  if (!rawText) return "";
  
  // Escape HTML tag bawaan agar tidak merusak sistem render parser Telegram
  let safeText = rawText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = safeText.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed === '---' || trimmed === '***') {
      return "────────────────────────";
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      return line.replace('* ', '• ').replace('- ', '• ');
    }
    return line;
  });

  let textBlock = processedLines.join('\n');
  
  // Regex Replacement Penyelarasan Markup UI Telegram HTML
  textBlock = textBlock.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  textBlock = textBlock.replace(/\*(.*?)\*/g, '<b>$1</b>');
  textBlock = textBlock.replace(/`(.*?)`/g, '<code>$1</code>');
  textBlock = textBlock.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  return textBlock;
}

// =====================================================================
// 6. INFRASTRUCTURE COMPONENT HELPERS
// =====================================================================
async function sendChatAction(chatId, token) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" })
    });
  } catch (e) {}
}

async function loadKnowledgeFromD1(env) {
  const defaultDocs = {
    antigravity: "Default Antigravity Knowledge Base Profile.",
    security: "Standard Core System Chipset Security Policy Protocol.",
    autonomous: "Compliance Checklist Task Force Protocols."
  };

  if (!env.DB) return defaultDocs;

  try {
    // Membaca secara dinamis data knowledge dari tabel D1 pengganti berkas .md fisik Anda
    const query = await env.DB.prepare("SELECT key, content FROM bot_knowledge").all();
    if (query && query.results) {
      query.results.forEach(row => {
        if (row.key === 'chip_antigravity') defaultDocs.antigravity = row.content;
        if (row.key === 'chipset_securty') defaultDocs.security = row.content;
        if (row.key === 'autonomous_tasks') defaultDocs.autonomous = row.content;
      });
    }
  } catch (e) {
    // Jalankan fallback data default jika tabel D1 belum siap diisi
  }
  return defaultDocs;
}
