// =====================================================================
// DEFINISI FUNGSI PEMBANTU (Diletakkan di atas agar aman dari Hoisting Error)
// =====================================================================

async function sendChatAction(chatId, token) {
  if (!token) return;
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
    const query = await env.DB.prepare("SELECT key, content FROM bot_knowledge").all();
    if (query && query.results) {
      query.results.forEach(row => {
        if (row.key === 'chip_antigravity') defaultDocs.antigravity = row.content;
        if (row.key === 'chipset_securty') defaultDocs.security = row.content;
        if (row.key === 'autonomous_tasks') defaultDocs.autonomous = row.content;
      });
    }
  } catch (e) {}
  return defaultDocs;
}

function decryptSecure(cipherText, key = "86020832") {
  if (!cipherText) return "";
  if (cipherText.startsWith("AIzaSy")) return cipherText; 
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

async function eksekusiGeminiCore(userPrompt, extraContext, docs, env) {
  const listModel = ["gemini-3.1-flash-lite-preview", "gemini-2.5-flash-lite", "gemini-1.5-flash"];

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

  for (const model of listModel) {
    for (const activeKey of decryptedKeysPool) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 200) {
          const resJson = await response.json();
          return resJson.candidates[0].content.parts[0].text;
        }
      } catch (e) {}
    }
  }

  return "Seluruh cluster model dan API Key cadangan Anda sedang limit.";
}

function formatGeminiUi(rawText) {
  if (!rawText) return "";
  
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
  
  textBlock = textBlock.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  textBlock = textBlock.replace(/\*(.*?)\*/g, '<b>$1</b>');
  textBlock = textBlock.replace(/`(.*?)`/g, '<code>$1</code>');
  textBlock = textBlock.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  return textBlock;
}

// =====================================================================
// CORE INTERFACE HANDLER (Export Default Event Listener Cloudflare)
// =====================================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/execute") {
      const cmd = url.searchParams.get("cmd");
      let responseBody = "";
      
      if (cmd) {
        const decodedCmd = decodeURIComponent(cmd);
        try {
          if (decodedCmd === "status") {
            responseBody = "Engine Core Live Status: [RUNNING]";
          } else if (decodedCmd.toLowerCase().startsWith("select")) {
            const dbQuery = await env.DB.prepare(decodedCmd).all();
            responseBody = JSON.stringify(dbQuery.results, null, 2);
          } else {
            responseBody = `Command '${decodedCmd}' diterima. Perangkat Web Workers mengisolasi eksekusi terminal sistem operasi Linux.`;
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

    if (request.method === "POST") {
      try {
        const update = await request.json();

        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const userId = update.message.from.id ? update.message.from.id.toString() : "";
          const username = update.message.from.username || "";
          const userText = update.message.text;

          await sendChatAction(chatId, env.TELEGRAM_TOKEN);

          let extraContext = "";
          if (username.toLowerCase() === "dummyxxx") {
            extraContext = "⚠️ KONTROL OTORITAS MUTLAK PENCIPTA (@DummyXXX) AKTIF.\n";
          }

          const docs = await loadKnowledgeFromD1(env);
          const balasanMentahAi = await eksekusiGeminiCore(userText, extraContext, docs, env);
          const outputFinalHtml = formatGeminiUi(balasanMentahAi);

          if (env.DB) {
            try {
              await env.DB.prepare(
                "INSERT INTO logs_chat (user_id, username, pesan_masuk, balasan_ai) VALUES (?, ?, ?, ?)"
              )
              .bind(userId, username, userText, balasanMentahAi)
              .run();
            } catch (dbErr) {}
          }

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
        return new Response("OK", { status: 200 });
      }
    }

    return new Response("Bot Engine Active", { status: 200 });
  }
};
