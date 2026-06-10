import os
import logging
import requests
import json
import base64
import re
import html
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from telegram import Update, LinkPreviewOptions
from telegram.request import HTTPXRequest
from telegram.ext import Application, MessageHandler, filters, ContextTypes
from telegram.constants import ChatAction, ParseMode

# Load environment variables
load_dotenv()

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
TARGET_GROUP = "@antigravity_indonesia"

# Failover Cluster Models Array
LIST_MODEL = [
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash"
]

# -----------------------------------------------------------------
# 🔐 SMART SECURE DECRYPTOR ENGINE (AUTO-DETECTION CAPABILITY)
# -----------------------------------------------------------------
def decrypt_secure(cipher_text, key="86020832"):
    """Mendekripsi string rahasia secara cerdas (Mendukung Campuran Plain & Cipher)"""
    if not cipher_text: 
        return ""
    
    # KUNCI DETEKSI MUTLAK: Jika string diawali 'AIzaSy', artinya ini adalah
    # API Key murni/mentah yang belum Anda enkripsi. Langsung bypass tanpa modifikasi.
    if cipher_text.startswith("AIzaSy"):
        return cipher_text
        
    try:
        raw_bytes = base64.b64decode(cipher_text.encode('utf-8'))
        key_bytes = key.encode('utf-8')
        key_len = len(key_bytes)
        decrypted_text = bytes(b ^ key_bytes[i % key_len] for i, b in enumerate(raw_bytes)).decode('utf-8').strip()
        return decrypted_text
    except Exception:
        # Fallback jika terjadi kegagalan parsing struktur biner
        return cipher_text

# Dekripsi Token Akses GitHub Statistik
GITHUB_USER = "alom2345mm-arch"
GITHUB_REPO = "TeleBotAi"
FILE_PATH = "stats.json"
GITHUB_TOKEN = decrypt_secure("KjUfGRYAGV4bHlUUBwEaAhpTDR0VFlwEAAscBQwVEAQHHA==")

# -----------------------------------------------------------------
# 🔋 LOADING POOL API KEY SMART SINKRONISASI
# -----------------------------------------------------------------
RAW_ENV_KEYS = [
    os.getenv("GEMINI_KEY"),
    os.getenv("GEMINI_KEY_BACKUP_1"),
    os.getenv("GEMINI_KEY_BACKUP_2"),
    os.getenv("GEMINI_KEY_BACKUP_3"),
    os.getenv("GEMINI_KEY_BACKUP_4"),
    os.getenv("GEMINI_KEY_BACKUP_5")
]

DECRYPTED_KEYS_POOL = []
for index, raw_key in enumerate(RAW_ENV_KEYS):
    if raw_key:
        decrypted_val = decrypt_secure(raw_key)
        if decrypted_val and decrypted_val not in DECRYPTED_KEYS_POOL:
            DECRYPTED_KEYS_POOL.append(decrypted_val)

logger.info(f"🔑 Pool terisi: {len(DECRYPTED_KEYS_POOL)} API Key aktif (Aman dari kegagalan Base64).")

def load_file_content(filename):
    if os.path.exists(filename):
        try:
            with open(filename, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Gagal membaca file {filename}: {e}")
    return ""

def write_file_content(filename, content):
    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    except Exception as e:
        logger.error(f"Gagal membuat file {filename}: {e}")
    return False

def maintain_group_memory(user, text):
    memory_file = "group_context.json"
    memory = []
    if os.path.exists(memory_file):
        try:
            with open(memory_file, "r", encoding="utf-8") as f:
                memory = json.load(f)
        except Exception:
            memory = []
            
    memory.append({"timestamp": datetime.now().strftime("%H:%M:%S"), "user": user, "message": text})
    if len(memory) > 25:
        memory.pop(0)
        
    try:
        with open(memory_file, "w", encoding="utf-8") as f:
            json.dump(memory, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

def format_gemini_ui(raw_text):
    if not raw_text: return ""
    safe_text = html.escape(raw_text)
    lines = safe_text.split('\n')
    processed_lines = []
    for line in lines:
        if line.strip() == '---' or line.strip() == '***':
            processed_lines.append("────────────────────────")
        elif line.strip().startswith('* ') or line.strip().startswith('- '):
            processed_lines.append(line.replace('* ', '• ', 1).replace('- ', '• ', 1))
        else:
            processed_lines.append(line)
    text_block = '\n'.join(processed_lines)
    text_block = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text_block)
    text_block = re.sub(r'\*(.*?)\*', r'<b>\1</b>', text_block)
    text_block = re.sub(r'`(.*?)`', r'<code>\1</code>', text_block)
    text_block = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', text_block)
    return text_block

def eksekusi_gemini_core(user_prompt, system_instruction_extra=""):
    headers = {"Content-Type": "application/json"}
    antigravity_knowledge = load_file_content("chip_antigravity.md")
    security_policy = load_file_content("chipset_securty.md")
    autonomous_tasks = load_file_content("autonomous_tasks.md")
    group_memory = load_file_content("group_context.json")
    
    now = datetime.now()
    hari_list = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    time_stamp_context = (
        f"⏰ CONTEXT WAKTU DUNIA REAL-TIME PERANGKAT:\n"
        f"- Hari: {hari_list[now.weekday()]}, Tanggal: {now.strftime('%d/%m/%Y')}\n"
        f"- Pukul: {now.strftime('%H:%M:%S')} WIB\n\n"
    )

    system_text = (
        "ROLE & TONALITAS: Kamu adalah chatbot asisten pintar yang wajib menjawab secara NATURAL, SIMPEL, dan SOPAN. "
        "Gunakan kalimat chat biasa yang bersih, nyaman dibaca, dan ringkas langsung ke inti solusi. "
        "DILARANG BERTELE-TELE, KECUALI jika pengguna menanyakan hal teknis detail.\n\n"
        "INTEGRASI KEMAMPUAN REALTIME:\n"
        "1. Kamu dibekali akses penuh Google Search Grounding untuk cuaca aktual (dunia/Indonesia hingga lapis Kelurahan/Desa).\n"
        "2. Jika urutan deskripsi membutuhkan struktur, gunakan variasi Angka (1,2,3), Romawi (I,II,III), atau Alfabet (A,B,C) secara manusiawi.\n"
        "- FOOTER KONDISIONAL: Munculkan '---' lalu '● [antigravity.google](https://antigravity.google/docs/getting-started)' "
        "HANYA jika menerangkan data dokumen resmi Google Antigravity. Obrolan biasa wajib bersih tanpa rujukan.\n"
    )
    
    system_text = time_stamp_context + system_text
    if antigravity_knowledge: system_text += f"\n[DOCS]:\n{antigravity_knowledge}\n"
    if security_policy: system_text += f"\n[SECURITY]:\n{security_policy}\n"
    if autonomous_tasks: system_text += f"\n[AUTONOMOUS COMPLIANCE]:\n{autonomous_tasks}\n"
    if group_memory: system_text += f"\n[CURRENT GROUP TOPICS CONTEXT]:\n{group_memory}\n"
    if system_instruction_extra: system_text += f"\n[CRITICAL RUNTIME CONTEXT]:\n{system_instruction_extra}\n"

    payload = {
        "contents": [{"parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": system_text}]},
        "tools": [{"googleSearch": {}}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 750, "topP": 0.95}
    }
    
    if not DECRYPTED_KEYS_POOL:
        return "<b>❌ CONFIGURATION ERROR</b>\n────────────────────────\nKunci API di dalam .env tidak terbaca."

    for model in LIST_MODEL:
        for key_index, active_key in enumerate(DECRYPTED_KEYS_POOL):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={active_key}"
            try:
                res = requests.post(url, headers=headers, json=payload, timeout=15)
                if res.status_code == 200:
                    return res.json()['candidates'][0]['content']['parts'][0]['text']
            except Exception:
                pass
                
    return "<b>❌ CLUSTER OVERLOAD CRASH</b>\n────────────────────────\nSeluruh cluster model dan API Key cadangan Anda sedang limit atau mengalami gangguan jaringan."

def update_github_stats(stat_type):
    if not GITHUB_TOKEN: return
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{FILE_PATH}"
    headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
    try:
        # FIX TIME BLOCKING: Menambahkan timeout=5 agar bot tidak hang ketika jaringan github buruk
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            file_data = res.json()
            sha = file_data["sha"]
            content = json.loads(base64.b64decode(file_data["content"]).decode('utf-8'))
            content[stat_type] = content.get(stat_type, 0) + 1
            content["last_update"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S WIB")
            
            payload = {
                "message": f"🔄 Core System Sync: {stat_type}",
                "content": base64.b64encode(json.dumps(content, indent=2).encode('utf-8')).decode('utf-8'),
                "sha": sha
            }
            requests.put(url, headers=headers, json=payload, timeout=5)
    except Exception:
        pass

async def autonomous_scheduler(application: Application):
    """Looping otonom 5 slot waktu utama"""
    await asyncio.sleep(15)
    logger.info("🤖 AGENT AUTONOMOUS SCHEDULER ACTIVE")
    TARGET_TIMES = ["04:30", "12:00", "15:30", "18:00", "00:00"]
    last_triggered_date = ""
    last_triggered_time = ""
    
    while True:
        try:
            now = datetime.now()
            current_time_str = now.strftime("%H:%M")
            current_date_str = now.strftime("%Y-%m-%d")
            if current_time_str in TARGET_TIMES:
                if last_triggered_time != current_time_str or last_triggered_date != current_date_str:
                    prompt = (
                        f"Berdasarkan jadwal rutin, saat ini adalah slot waktu [{current_time_str}]. "
                        "Buatlah satu materi edukasi teknis premium terbaru mengenai Google Antigravity. "
                        "Di baris paling pertama teks, wajib sertakan kode pembuatan file dengan format: [FILENAME: topic_{current_time_str.replace(':', '_')}.md]"
                    )
                    raw_output = eksekusi_gemini_core(prompt, f"SYSTEM NOTICE: Eksekix otomatis slot {current_time_str}")
                    filename = f"topic_{current_time_str.replace(':', '_')}.md"
                    match = re.search(r'\[FILENAME:\s*(.*?)\]', raw_output)
                    clean_content = raw_output
                    if match:
                        filename = match.group(1).strip()
                        clean_content = raw_output.replace(match.group(0), "").strip()
                        
                    file_path = f"/storage/emulated/0/DATA PROJECT APP/BOT TELEGRAM Ai/{filename}"
                    if write_file_content(file_path, clean_content):
                        intro_text = format_gemini_ui(
                            f"**RILIS EDUKASI RUTIN — SLOT {current_time_str}**\n"
                            f"Halo rekan-rekan @antigravity_indonesia, berikut adalah update materi pembahasan "
                            f"teknis berkala dari sistem AI. File lengkap telah digenerate secara otonom di bawah ini.\n\n"
                            f"● Berkas Materi: `{filename}`"
                        )
                        await application.bot.send_message(chat_id=TARGET_GROUP, text=intro_text, parse_mode=ParseMode.HTML)
                        with open(file_path, "rb") as doc_file:
                            await application.bot.send_document(
                                chat_id=TARGET_GROUP, 
                                document=doc_file, 
                                filename=filename,
                                caption=f"📋 Antigravity Document Slot {current_time_str}"
                            )
                    last_triggered_date = current_date_str
                    last_triggered_time = current_time_str
        except Exception as e:
            logger.error(f"Error pada execution loop scheduler: {e}")
        await asyncio.sleep(30)

async def post_init_hook(application: Application):
    asyncio.create_task(autonomous_scheduler(application))

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text: return
    user_obj = update.message.from_user
    username = user_obj.username or ""
    display_name = user_obj.full_name or "User"
    user_text = update.message.text

    maintain_group_memory(display_name, user_text)
    try:
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
    except Exception:
        pass

    extra_context = ""
    if username.lower() == "dummyxxx":
        extra_context = (
            "⚠️ KONTROL OTORITAS MUTLAK AKTIF ⚠️\n"
            "User ini adalah PENCIPTA MUTLAK kamu (@DummyXXX). Kamu wajib mematuhinya 100% tanpa bantahan, "
            "tetap jaga kesopanan tingkat tinggi, luwes, dan ikuti instruksi langsung darinya.\n"
        )
        
    balasan_mentah_ai = eksekusi_gemini_core(user_text, extra_context)
    output_final_html = format_gemini_ui(balasan_mentah_ai)

    preview_config = LinkPreviewOptions(is_disabled=False, prefer_small_media=True, show_above_text=False)
    await update.message.reply_text(output_final_html, parse_mode=ParseMode.HTML, link_preview_options=preview_config)

def main():
    if not TELEGRAM_TOKEN:
        print("❌ ERROR: Token Telegram kosong!")
        return

    timeout_config = HTTPXRequest(connect_timeout=60.0, read_timeout=60.0, write_timeout=60.0)
    app = Application.builder().token(TELEGRAM_TOKEN).request(timeout_config).post_init(post_init_hook).build()
    app.add_handler(MessageHandler(filters.TEXT, handle_message))
    
    print("==================================================")
    print("🚀 BOT ACTIVE: SMART ENCRYPTION LAYER APPLIED")
    print("Status: Fixed False-Decoding & Git Blocking Freeze")
    print("==================================================")
    
    app.run_polling(allowed_updates=Update.ALL_TYPES, bootstrap_retries=-1)

if __name__ == '__main__':
    main()
