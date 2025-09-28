from datetime import datetime, timedelta
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

# Supabase setup
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global state
previous_weight = 0.0
previous_subject_id = -1
gramsPerPill = -1

# Server setup
HOST = "0.0.0.0"
PORT = 5005


def insert_to_supabase(grams):
    global previous_weight, previous_subject_id

    now = datetime.now()
    event_date = now.strftime("%m/%d/%y")
    event_time = now.strftime("%I:%M %p")

    # Get latest subjectId
    res = supabase.table("subjects").select("subjectId").order("subjectId", desc=True).limit(1).execute()
    if not res.data:
        print("No subjects found in database.")
        return

    subject_id = res.data[0]["subjectId"]
    if subject_id != previous_subject_id:
        print("New subjectId:", subject_id)
        previous_subject_id = subject_id

    # Get subject details
    subj = supabase.table("subjects").select(
        "pillWeight, prescription, dosingWindows, currAdherenceScore"
    ).eq("subjectId", subject_id).execute()
    subj_data = subj.data[0]

    pill_weight = subj_data["pillWeight"]
    prescription = subj_data["prescription"]  # JSON: should include "pillsPerDose" and "pillCount"
    dosing_windows = subj_data["dosingWindows"]  # JSON with window labels & times

    pills_per_dose = int(prescription.get("pillsPerDose", 1))
    pill_count = int(prescription.get("pillCount", 0))

    grams_per_pill = pill_weight if pill_weight else grams / max(1, pill_count)
    gramsPerPill = grams_per_pill  # Update global reference value

    # --- Anomaly detection ---
    anomaly_id = "0"  # default = no anomaly

    # Count pills taken
    pills_taken = round((previous_weight - grams) / grams_per_pill) if grams_per_pill > 0 else 0
    if pills_taken != pills_per_dose:
        anomaly_id = "3"  # wrong count

    # Timing anomaly check
    event_dt = datetime.strptime(f"{event_date} {event_time}", "%m/%d/%y %I:%M %p")
    in_any_window = False
    WINDOW_MARGIN = timedelta(minutes=30)

    if dosing_windows:
        for label, t in dosing_windows.items():
            sched_time = datetime.strptime(f"{event_date} {t}", "%m/%d/%y %H:%M")
            if sched_time - WINDOW_MARGIN <= event_dt <= sched_time + WINDOW_MARGIN:
                in_any_window = True
                break

        if not in_any_window:
            nearest = min(
                [datetime.strptime(f"{event_date} {t}", "%m/%d/%y %H:%M") for t in dosing_windows.values()],
                key=lambda x: abs((x - event_dt).total_seconds()),
            )
            if event_dt < nearest:
                anomaly_id = "1"  # too early
            else:
                anomaly_id = "2"  # too late

    # --- Adherence score ---
    events_today = supabase.table("events").select("anomalyId").eq("subjectId", subject_id).eq("date", event_date).execute()
    total_events = len(events_today.data) + 1
    bad_events = sum(1 for e in events_today.data if e["anomalyId"] != "0") + (1 if anomaly_id != "0" else 0)
    adherence_score = str(int(100 * (1 - bad_events / total_events))) if total_events > 0 else "100"

    # --- Update subject ---
    supabase.table("subjects").update({
        "currAdherenceScore": float(adherence_score),
        "pillWeight": grams_per_pill
    }).eq("subjectId", subject_id).execute()

    # --- Save event ---
    data = {
        "subjectId": subject_id,
        "date": event_date,
        "time": event_time,
        "grams": str(grams),
        "anomalyId": anomaly_id,
        "adherenceScore": adherence_score,
        "pillCount": pill_count
    }
    response = supabase.table("events").insert(data).execute()
    print("Inserted:", data)
    print("Response:", response)

    previous_weight = grams





from flask import Flask, request, render_template_string, redirect, url_for

app = Flask(__name__)

HTML = """
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f9f9f9;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
      .container {
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        text-align: center;
      }
      input[type="number"] {
        width: 200px;
        padding: 12px;
        font-size: 18px;
        border: 1px solid #ccc;
        border-radius: 8px;
        margin-bottom: 15px;
        text-align: center;
      }
      button {
        padding: 12px 20px;
        font-size: 18px;
        background-color: #007BFF;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }
      button:hover {
        background-color: #0056b3;
      }
      .reference {
        margin-top: 15px;
        font-size: 16px;
        color: #444;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Enter Grams</h2>
      <form action="/submit" method="POST">
        <input type="number" step="0.01" name="grams" placeholder="Enter grams" required>
        <br>
        <button type="submit">Send</button>
      </form>
      {% if gramsPerPill != -1 %}
        <div class="reference">
          For Reference: {{ gramsPerPill }}g per pill
        </div>
      {% endif %}
    </div>
  </body>
</html>
"""

@app.route("/", methods=["GET"])
def index():
    return render_template_string(HTML, gramsPerPill=gramsPerPill)

@app.route("/submit", methods=["POST"])
def submit():
    grams = float(request.form["grams"])
    print(f"[Web Input] Grams: {grams}")
    insert_to_supabase(grams)
    # Redirect back to the main page after submission
    return redirect(url_for("index"))

if __name__ == "__main__":
    app.run(port=5000)
