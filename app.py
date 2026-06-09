import os
import subprocess
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS

app = Flask(__name__, template_folder='.', static_folder='static')
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/execute', methods=['POST'])
def execute():
    data = request.get_json() or {}
    command = data.get('command', '').strip()
    if not command: return jsonify({"output": ""})
    try:
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=os.getcwd())
        stdout, stderr = process.communicate()
        return jsonify({"output": stdout or stderr or "[Selesai dijalankan]"})
    except Exception as e:
        return jsonify({"output": str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7860, debug=False)
