import socket
from datetime import datetime
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

# Supabase setup
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global subject_id
SUBJECT_ID = 0

# Global previous weight
previous_weight = 0.0

# Server setup
HOST = "0.0.0.0"  # Listen on all interfaces
PORT = 5005

def insert_to_supabase(grams):
    now = datetime.now()
    event_date = now.strftime("%Y-%m-%d")
    event_time = now.strftime("%H:%M:%S")

    ##get greatest current subject_id
    res = supabase.table("subjects").select("id").order("id", desc=True).limit(1).execute()
    if res.data and len(res.data) > 0:
        SUBJECT_ID = res.data[0]['id']
        print("Using subject_id:", SUBJECT_ID)
    else:
        print("No subjects found in database.")
        return
    ##if weight is starting from 0, calculate weight per pill
    if (previous_weight <= 0.1):
        grams_per_pill = grams / supabase.table("subjects").select("pill_count").eq("subject_id", SUBJECT_ID).execute()
        supabase.table("subjects").update({"grams_per_pill": grams_per_pill}).eq("id", SUBJECT_ID).execute()
    ##

    data = {
        "subject_id": SUBJECT_ID,
        "event_date": event_date,
        "event_time": event_time,
        "grams": grams,
        "anomaly_id": None  # Leave blank for now
    }

    response = supabase.table("events").insert(data).execute()
    print("Inserted:", data)
    print("Response:", response)

# Create TCP server
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))

    while True:
        s.listen()
        print(f"Listening on {HOST}:{PORT}...")
        conn, addr = s.accept()
        conn.settimeout(15)  # 15 second timeout
        print(f"Connected by {addr}")
        with conn:
            buffer = ""
            while True:
                try:
                    data = conn.recv(1024)
                except:
                    print("Socket timeout, closing connection.")
                    break
                if not data:
                    print(f"Connection closed by {addr}")
                    break

                buffer += data.decode()

                # Process complete lines (ESP sends with println -> newline)
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue

                    now = datetime.now()
                    event_time = now.strftime("%H:%M:%S")
                    print(f"{event_time} Received: {line}")

                    try:
                        grams = float(line) - 19.68  # tare weight
                        print(f"Grams: {grams}")
                        # insert_to_supabase(grams)
                    except ValueError:
                        print("Non-numeric message:", line)
