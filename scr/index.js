export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =====================================================================
    // 1. WEB TERMINAL / CONSOLE SYSTEM (Menggantikan handle_web_console_request & SSH Tunnel)
    // =====================================================================
    if (url.pathname === "/execute") {
      const cmd = url.searchParams.get("cmd");
      if (cmd) {
        // Catatan: Cloudflare Workers bersifat serverless (tidak memiliki akses bash OS lokal seperti Termux).
        // Kita alihkan perintah evaluasi skrip internal via JS eval atau pengecekan database.
        try {
          if (cmd === "status") {
            return new Response("Engine Core Live Status: [RUNNING] 24/7", { headers: corsHeaders() });
          }
          // Contoh eksekusi query D1 langsung via web konsol untuk debugging harian Anda
          if (cmd.startsWith("SELECT") || cmd.startsWith("select")) {
            const result = await env.DB.prepare(cmd).all();
            return new Response(JSON.stringify(result, null, 2), { 
              headers: { "Content-Type": "application/json", ...corsHeaders() } 
            });
          }
          return new Response(`Command '${cmd}' received but Cloudflare environment restricts native subprocess.getoutput.`, { headers: corsHeaders() });
        } catch (e) {
          return new Response(`Error: ${e.message}`, { headers: corsHeaders() });
        }
      }
      return new Response("Engine Core Live Status: [RUNNING]", { headers: corsHeaders() });
    }

    // =====================================================================
    // 2. BOT TELEGRAM INCOMING WEBHOOK PROTOCOL
    // =====================================================================
    if (request.method === "POST") {
      try {
        const update = await request.json();

        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const userId = update.message.from.id.toString();
          const username = update.message.from.username || "NoUsername";
          const userText = update.message.text;

          // Trigger Sinyal Mengetik (Typing...)
          await sendChatAction(chatId, env.TELEGRAM_TOKEN);

          // Otoritas Mutlak Pencipta (@DummyXXX)
          let extraContext = "";
          if (username.toLowerCase() === "dummyxxx") {
            extraContext = "⚠️ KONTROL OTORITAS MUTLAK PENCIPTA (@DummyXXX) AKTIF.\n";
          }

          // Inisialisasi basis pengetahuan (Mengambil dari D1 atau defaults)
          const docs = await loadKnowledgeDocs(env);

          // Eksekusi Pemanggilan Core Gemini API dengan fallback Keys
          const balasanMentahAi = await eksekusiGeminiCore(userText, extraContext, docs, env);
          
          // Format Output Text ke HTML Telegram (Menggantikan format_gemini_ui)
          const outputFinalHtml = formatGeminiUi(balasanMentahAi);

          // Simpan riwayat chat secara permanen ke Cloudflare D1
          if (env.DB) {
            await env.DB.prepare(
              "INSERT INTO logs_chat (user_id, username, pesan_masuk, balasan_ai) VALUES (?, ?, ?, ?)"
            )
            .bind(userId, username, userText, balasanMentahAi)
            .run();
          }

          // Kirim Pesan Kembali ke Telegram
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
        return new Response("OK", { status: 200 }); // Tetap return 200 agar Telegram tidak melakukan perulangan webhook error
      }
    }

    return new Response("Bot Engine Online 24/7", { status: 200 });
  }
};

// =====================================================================
// 3. ENKRIPSI & DEKRIPSI PROTOCOL HELPER
// =====================================================================
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

// =====================================================================
// 4. GEMINI INTERACTION CORE ENGINE (Mendukung Multi-Key & Multi-Model Fallback)
// =====================================================================
async function eksekusiGeminiCore(userPrompt, extraContext, docs, env) {
  const listModel = ["gemini-2.5-flash", "gemini-1.5-flash"];
  
  // Mengumpulkan kunci cadangan dari environment variables Cloudflare
  const rawEnvKeys = [
    env.GEMINI_KEY,
    env.GEMINI_KEY_BACKUP_1,
    env.GEMINI_KEY_BACKUP_2,
    env.GEMINI_KEY_BACKUP_3
  ];

  const decryptedKeysPool = [];
  for (const rawKey of rawEnvKeys) {
    if (rawKey) {
      const val = decryptSecure(rawKey);
      if (val && !decryptedKeysPool.includes(val)) decryptedKeysPool.push(val);
    }
  }

  if (decryptedKeysPool.length === 0) {
    return "Kritis: Kunci API Gemini di dalam Cloudflare Variables tidak terbaca atau kosong.";
  }

  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const formatter = new Intl.DateTimeFormat('id-ID', options);
  const parts = formatter.formatToParts(now);
  const hari = parts.find(p => p.type === 'weekday').value;
  const wibString = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  const systemText = 
    `⏰ CONTEXT WAKTU DUNIA REAL-TIME:\n- Hari: ${hari}, Waktu/Tanggal: ${wibString} WIB\n\n` +
    `ROLE & TONALITAS: Kamu adalah chatbot asisten pintar yang wajib menjawab secara NATURAL, SIMPEL, dan SOPAN.\n\n` +
    `INTEGRASI KEMAMPUAN REALTIME:\n` +
    `1. Kamu dibekali akses penuh Google Search Grounding untuk cuaca aktual.\n` +
    `2. Jika urutan deskripsi membutuhkan struktur, gunakan variasi Angka (1,2,3), Romawi (I,II,III), atau Alfabet (A,B,C) secara manusiawi.\n` +
    `- FOOTER KONDISIONAL: Munculkan '---' lalu '● [antigravity.google](https://antigravity.google/docs/getting-started)' HANYA jika menerangkan data dokumen resmi Google Antigravity.\n\n` +
    `${extraContext}\n` +
    `[DOCS]:\n${docs.antigravity}\n` +
    `[SECURITY]:\n${docs.security}\n` +
    `[AUTONOMOUS COMPLIANCE]:\n${docs.autonomous}\n`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemText }] },
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 750, topP: 0.95 }
  };

  // Loop mitigasi limitasi/error API Key (Mencoba semua model dan semua Key)
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
        // Lanjutkan ke kombinasi key/model berikutnya jika error/timeout
      }
    }
  }
  return "Seluruh cluster model dan API Key cadangan Anda sedang mengalami limitasi/gangguan.";
}

// =====================================================================
// 5. PARSING TEXT FORMATTING PROTOCOL (Markdown -> HTML)
// =====================================================================
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

// Helper untuk aksi typing
async function sendChatAction(chatId, token) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" })
    });
  } catch (e) {}
}

// Menggantikan fungsi load_file_content dengan database D1 / Statis struktural
async function loadKnowledgeDocs(env) {
  let docs = {
    antigravity: "Default Antigravity Knowledge Base Profile.",
    security: "Standard Core System Chipset Security Policy Protocol.",
    autonomous: "Compliance Checklist Task Force Protocols."
  };
  
  if (env.DB) {
    try {
      // Jika Anda membuat tabel pengaturan/knowledge di D1, skrip akan membacanya secara dinamis
      const entries = await env.DB.prepare("SELECT key, content FROM bot_knowledge").all();
      if (entries && entries.results) {
        entries.results.forEach(row => {
          if (row.key === 'chip_antigravity') docs.antigravity = row.content;
          if (row.key === 'chipset_securty') docs.security = row.content;
          if (row.key === 'autonomous_tasks') docs.autonomous = row.content;
        });
      }
    } catch(e) {}
  }
  return docs;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "text/plain; charset=utf-8"
  };
}
