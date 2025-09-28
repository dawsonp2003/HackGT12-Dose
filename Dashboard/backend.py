import socket
from datetime import datetime, timedelta
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

# Supabase setup
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global state
previous_weight = 0.0
previous_subject_id = -1

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


# TCP server loop
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    print(f"Listening on {HOST}:{PORT}...")

    while True:
        conn, addr = s.accept()
        conn.settimeout(60)
        print(f"Connected by {addr}")
        with conn:
            buffer = ""
            while True:
                try:
                    data = conn.recv(1024)
                except socket.timeout:
                    print("Socket timeout, closing connection.")
                    break
                if not data:
                    print(f"Connection closed by {addr}")
                    break

                buffer += data.decode()

                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue

                    now = datetime.now().strftime("%H:%M:%S")
                    print(f"{now}: {line}")

                    # try:
                    #     grams = float(line)
                    #     print(f"Grams: {grams}")
                    #     # insert_to_supabase(grams)
                    # except ValueError:
                    #     continue
