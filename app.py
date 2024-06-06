import os, json, base64, re
from flask import Flask, request, jsonify, render_template, Response
from dotenv import load_dotenv
import anthropic

load_dotenv()
app = Flask(__name__)
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── Khung giờ chuẩn TDTU ────────────────────────────────────────────────────
TIET_MAP = {
    1: "07:00", 2: "07:50", 3: "08:40", 4: "09:40",
    5: "10:30", 6: "11:20", 7: "12:30", 8: "13:20",
    9: "14:10", 10: "15:10", 11: "16:00", 12: "16:50"
}

PROMPT = """Bạn là AI chuyên đọc thời khoá biểu của sinh viên trường TDTU (Tôn Đức Thắng).
Hãy phân tích ảnh thời khoá biểu và trả về JSON với format CHÍNH XÁC sau, KHÔNG thêm text nào khác:

{
  "classes": [
    {
      "subject": "Tên môn học",
      "room": "Phòng học (ví dụ: A101)",
      "day": 2,
      "tiet_start": 1,
      "tiet_end": 3,
      "weeks": "1-15"
    }
  ]
}

Quy tắc:
- "day": 2=Thứ 2, 3=Thứ 3, 4=Thứ 4, 5=Thứ 5, 6=Thứ 6, 7=Thứ 7
- "tiet_start" và "tiet_end": số tiết theo TDTU (1-12)
- Nếu không thấy rõ thông tin nào, bỏ qua môn đó
- Chỉ trả về JSON, không giải thích gì thêm"""


def tiet_to_time(tiet):
    return TIET_MAP.get(int(tiet), "07:00")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/parse-schedule", methods=["POST"])
def parse_schedule():
    data = request.get_json()
    image_b64 = data.get("image")
    member_name = data.get("name", "Thành viên")

    if not image_b64:
        return jsonify({"error": "Không có ảnh"}), 400

    # Detect media type
    media_type = "image/jpeg"
    if image_b64.startswith("data:"):
        header, image_b64 = image_b64.split(",", 1)
        if "png" in header:
            media_type = "image/png"
        elif "webp" in header:
            media_type = "image/webp"

    try:
        msg = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_b64
                        }
                    },
                    {"type": "text", "text": PROMPT}
                ]
            }]
        )

        raw = msg.content[0].text.strip()

        # Strip markdown fences if any
        raw = re.sub(r"```json|```", "", raw).strip()
        parsed = json.loads(raw)

        # Enrich with time strings
        for cls in parsed.get("classes", []):
            cls["time_start"] = tiet_to_time(cls["tiet_start"])
            cls["time_end"] = tiet_to_time(cls["tiet_end"] + 1) if cls["tiet_end"] < 12 else "17:40"
            cls["member"] = member_name

        return jsonify({"success": True, "data": parsed["classes"]})

    except json.JSONDecodeError:
        return jsonify({"error": "Không đọc được lịch từ ảnh, thử lại với ảnh rõ hơn"}), 422
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/merge-schedules", methods=["POST"])
def merge_schedules():
    """Tổng hợp lịch tất cả thành viên, tìm khung giờ rảnh chung."""
    data = request.get_json()
    all_schedules = data.get("schedules", [])  # list of {name, classes:[]}

    # Build busy map: {day: {tiet: [members busy]}}
    busy = {d: {t: [] for t in range(1, 13)} for d in range(2, 8)}
    all_classes = []

    for member_sched in all_schedules:
        name = member_sched["name"]
        for cls in member_sched["classes"]:
            d = cls["day"]
            for t in range(cls["tiet_start"], cls["tiet_end"] + 1):
                if d in busy and t in busy[d]:
                    busy[d][t].append(name)
            all_classes.append(cls)

    member_names = [s["name"] for s in all_schedules]

    # Find free slots (all members free)
    free_slots = []
    for d in range(2, 8):
        for t in range(1, 13):
            if len(busy[d][t]) == 0 and len(member_names) > 0:
                free_slots.append({
                    "day": d,
                    "tiet": t,
                    "time": tiet_to_time(t)
                })

    return jsonify({
        "success": True,
        "classes": all_classes,
        "free_slots": free_slots,
        "members": member_names
    })


@app.route("/sw.js")
def service_worker():
    sw = """
const CACHE = 'lichclb-v1';
const ASSETS = ['/', '/static/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always go network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({error:'Không có mạng. Vui lòng kết nối internet để đọc lịch.'}),
        {headers:{'Content-Type':'application/json'}})
    ));
    return;
  }
  // Cache-first for everything else (UI shell)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
"""
    return Response(sw, mimetype='application/javascript',
                    headers={'Service-Worker-Allowed': '/'})


@app.route("/static/manifest.json")
def manifest():
    data = {
        "name": "Lịch CLB TDTU",
        "short_name": "LịchCLB",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#fafaf8",
        "theme_color": "#2a6b4a",
        "icons": []
    }
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
