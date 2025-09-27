from supabase import create_client, Client
from datetime import date, time
from config import SUPABASE_URL, SUPABASE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ------------------------
# Insert a subject
# ------------------------
def add_subject():
    data = {
        "first_name": "Alice",
        "last_name": "Johnson",
        "age": 30,
        "race": "White",
        "sex": "F",
        "weight": 65.5,
        "height": 170.2,
        "bottle_id": "BOTTLE123",
        "pill_count": 90,
        "doses_per_day": 3,
        "pills_per_dose": 1,
        "dosing_windows": {"morning": "08:00", "noon": "12:00", "evening": "20:00"},
        "grams_per_pill": 0.5,
        "num_anomalies": 0
    }
    res = supabase.table("subjects").insert(data).execute()
    print("Inserted subject:", res.data)

# ------------------------
# Insert an event
# ------------------------
def add_event(subject_id: int):
    data = {
        "subject_id": subject_id,
        "event_date": str(date.today()),
        "event_time": str(time(14, 30)),
        "grams": 0.5,
        "anomaly_id": None
    }
    res = supabase.table("events").insert(data).execute()
    print("Inserted event:", res.data)

# ------------------------
# Query subjects
# ------------------------
def get_subjects():
    res = supabase.table("subjects").select("*").execute()
    for row in res.data:
        print(row)

# ------------------------
# Query events for a subject
# ------------------------
def get_events(subject_id: int):
    res = supabase.table("events").select("*").eq("subject_id", subject_id).execute()
    for row in res.data:
        print(row)


if __name__ == "__main__":
    add_subject()
    get_subjects()
    add_event(subject_id=1)  # assumes subject with ID=1 exists
    get_events(subject_id=1)
