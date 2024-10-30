from flask import Flask, render_template, request, redirect, url_for
import sqlite3
import uuid
import json
from datetime import datetime

app = Flask(__name__)

# データベースの初期化
def init_db():
    conn = sqlite3.connect('schedule.db')
    c = conn.cursor()
    # グループテーブル
    c.execute('''CREATE TABLE IF NOT EXISTS groups
                 (id TEXT PRIMARY KEY, description TEXT)''')
    # スケジュールテーブル
    c.execute('''CREATE TABLE IF NOT EXISTS schedules
                 (group_id TEXT, member_name TEXT, start TEXT, end TEXT,
                  UNIQUE(group_id, member_name, start, end))''')
    conn.commit()
    conn.close()

init_db()

# メインページ
@app.route('/')
def index():
    return render_template('index.html')

# グループ作成
@app.route('/create_group', methods=['POST'])
def create_group():
    group_id = str(uuid.uuid4())
    description = request.form.get('description', '')
    conn = sqlite3.connect('schedule.db')
    c = conn.cursor()
    c.execute('INSERT INTO groups (id, description) VALUES (?, ?)', (group_id, description))
    conn.commit()
    conn.close()
    return redirect(url_for('group', group_id=group_id))

# グループページ
@app.route('/group/<group_id>')
def group(group_id):
    group_url = request.url
    conn = sqlite3.connect('schedule.db')
    c = conn.cursor()
    c.execute('SELECT description FROM groups WHERE id=?', (group_id,))
    result = c.fetchone()
    description = result[0] if result else ''
    conn.close()
    return render_template('group.html', group_id=group_id, group_url=group_url, description=description)

# スケジュール取得
@app.route('/get_schedules/<group_id>')
def get_schedules(group_id):
    conn = sqlite3.connect('schedule.db')
    c = conn.cursor()
    c.execute('SELECT member_name, start, end FROM schedules WHERE group_id=?', (group_id,))
    schedules = c.fetchall()
    conn.close()
    events = []
    for s in schedules:
        events.append({
            'title': s[0],
            'start': s[1],
            'end': s[2]
        })
    return json.dumps(events)

# スケジュール追加
@app.route('/add_schedule', methods=['POST'])
def add_schedule():
    data = request.get_json()
    group_id = data['group_id']
    member_name = data['member_name']
    start = data['start']
    end = data['end']
    conn = sqlite3.connect('schedule.db')
    c = conn.cursor()
    # 既に同じメンバーが同じ時間枠に候補を入力していないか確認
    c.execute('SELECT * FROM schedules WHERE group_id=? AND member_name=? AND start=? AND end=?',
              (group_id, member_name, start, end))
    existing = c.fetchone()
    if existing:
        conn.close()
        return 'Already exists', 400
    c.execute('INSERT INTO schedules (group_id, member_name, start, end) VALUES (?, ?, ?, ?)',
              (group_id, member_name, start, end))
    conn.commit()
    conn.close()
    return 'Success', 200

# スケジュール削除
@app.route('/delete_schedule', methods=['POST'])
def delete_schedule():
    data = request.get_json()
    group_id = data['group_id']
    member_name = data['member_name']
    start = data['start']
    end = data['end']
    conn = sqlite3.connect('schedule.db')
    c = conn.cursor()
    c.execute('DELETE FROM schedules WHERE group_id=? AND member_name=? AND start=? AND end=?',
              (group_id, member_name, start, end))
    conn.commit()
    conn.close()
    return 'Success', 200

# 最終候補日取得
@app.route('/final_candidates/<group_id>')
def final_candidates(group_id):
    conn = sqlite3.connect('schedule.db')
    c = conn.cursor()
    # 希望者数を異なる名前でカウントするクエリ
    c.execute('''SELECT start, COUNT(DISTINCT member_name) as count 
                 FROM schedules 
                 WHERE group_id=? 
                 GROUP BY start 
                 ORDER BY count DESC''', (group_id,))
    candidates = c.fetchall()
    conn.close()
    return json.dumps(candidates)

if __name__ == '__main__':
    app.run(debug=True)