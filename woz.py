# Creating synthetic "Wizard of Oz" dataset: 100 subjects (subject_id 0-99) and ~10,000 events.
# This will create two CSVs in /mnt/data: subjects.csv and events.csv
# It will also display small samples of the generated data.

import random
from datetime import date, datetime, timedelta, time as dtime
import json
import numpy as np
import pandas as pd
import os

random.seed(42)
np.random.seed(42)

NUM_SUBJECTS = 100  # subject_id 0..99
SUBJECT_IDS = list(range(NUM_SUBJECTS))

# Small pools of realistic first and last names (mixed from common US names)
first_names = [
    "Liam","Noah","Oliver","Elijah","James","William","Benjamin","Lucas","Henry","Alexander",
    "Mason","Michael","Ethan","Daniel","Jacob","Logan","Jackson","Levi","Sebastian","Mateo",
    "Jack","Owen","Theodore","Aiden","Samuel","Joseph","John","David","Wyatt","Matthew",
    "Luke","Asher","Carter","Julian","Grayson","Leo","Jayden","Gabriel","Isaac","Lincoln",
    "Anthony","Hudson","Dylan","Ezra","Thomas","Charles","Christopher","Maverick","Josiah",
    "Isaiah","Andrew","Elias","Joshua","Nathan","Caleb","Ryan","Adrian","Miles","Eli",
    "Nolan","Christian","Aaron","Cameron","Colton","Luca","Mia","Olivia","Emma","Ava",
    "Charlotte","Sophia","Amelia","Isabella","Harper","Evelyn","Camila","Gianna","Abigail",
    "Luna","Ella","Elizabeth","Sofia","Emily","Avery","Mila","Scarlett","Eleanor","Madison",
    "Layla","Penelope","Aria","Chloe","Grace","Ellie","Nora","Hazel","Zoey","Riley",
    "Victoria","Lily","Aurora","Violet","Nova","Hannah","Emilia","Zoe","Stella"
]

last_names = [
    "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
    "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
    "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
    "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green",
    "Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Gomez",
    "Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins"
]

# Race categories and approximate probabilities (based on 2020 US distributions; used for realism)
race_choices = ["White", "Hispanic", "Black", "Asian", "Other"]
race_probs = [0.60, 0.19, 0.12, 0.06, 0.03]  # approx — see cited sources in the chat response

# Dosing choices and probabilities
doses_choices = [1,2,3,4]
doses_probs = [0.05, 0.6, 0.3, 0.05]

pills_per_dose_choices = [1,2,3]
pills_probs = [0.75, 0.2, 0.05]

# Height and weight means (converted to metric) from CDC faststats reference:
# Men: 68.9 in (~175 cm), 199 lb (~90.3 kg)
# Women: 63.5 in (~161 cm), 171.8 lb (~78.0 kg)
male_height_mean_cm = 175.0
male_height_sd_cm = 7.0
male_weight_mean_kg = 90.3
male_weight_sd_kg = 15.0

female_height_mean_cm = 161.0
female_height_sd_cm = 6.0
female_weight_mean_kg = 78.0
female_weight_sd_kg = 13.0

# Date range for events (last 180 days)
today = date.today()
start_date = today - timedelta(days=180)
days_range = (today - start_date).days

subjects_rows = []
events_rows = []

for sid in SUBJECT_IDS:
    sex = random.choice(["M", "F"])
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    # age: truncated normal between 18 and 85
    age = int(np.clip(np.random.normal(45, 18), 18, 85))
    race = np.random.choice(race_choices, p=race_probs)
    
    if sex == "M":
        height = float(np.clip(np.random.normal(male_height_mean_cm, male_height_sd_cm), 150, 200))
        weight = float(np.clip(np.random.normal(male_weight_mean_kg, male_weight_sd_kg), 50, 160))
    else:
        height = float(np.clip(np.random.normal(female_height_mean_cm, female_height_sd_cm), 140, 190))
        weight = float(np.clip(np.random.normal(female_weight_mean_kg, female_weight_sd_kg), 40, 140))
    
    pill_count = int(random.randint(30, 180))
    doses_per_day = int(np.random.choice(doses_choices, p=doses_probs))
    pills_per_dose = int(np.random.choice(pills_per_dose_choices, p=pills_probs))
    
    # grams per pill between 0.25 and 1.0 g (typical small pill mass in grams for demo purposes)
    grams_per_pill = round(float(np.round(np.random.uniform(0.25, 1.0), 3)), 3)
    
    # Create dosing windows as JSON object: evenly spaced times between 06:00 and 22:00
    earliest = 6 * 60  # minutes after midnight
    latest = 22 * 60
    if doses_per_day == 1:
        scheduled_minutes = [11 * 60]  # around 11:00
    else:
        interval = (latest - earliest) / (doses_per_day - 1)
        scheduled_minutes = [int(earliest + i * interval) for i in range(doses_per_day)]
    dosing_windows = {}
    for i, mins in enumerate(scheduled_minutes):
        hh = mins // 60
        mm = mins % 60
        dosing_windows[f"window_{i+1}"] = f"{hh:02d}:{mm:02d}"
    
    subjects_rows.append({
        "subject_id": sid,
        "first_name": first_name,
        "last_name": last_name,
        "age": age,
        "race": race,
        "sex": sex,
        "weight": round(weight,2),
        "height": round(height,2),
        "pill_count": pill_count,
        "doses_per_day": doses_per_day,
        "pills_per_dose": pills_per_dose,
        "dosing_windows": json.dumps(dosing_windows),
        "grams_per_pill": grams_per_pill,
        "num_anomalies": 0,
        "adherence_score": 1
    })
    
    # Create events for this subject: 80-120 events
    n_events = random.randint(80, 120)
    for _ in range(n_events):
        # random day in range
        day_offset = random.randint(0, days_range)
        event_date = start_date + timedelta(days=day_offset)
        
        # choose one scheduled window and add jitter (normal with sd=20 minutes)
        scheduled = random.choice(scheduled_minutes)
        jitter = int(np.clip(np.random.normal(0, 20), -60, 60))
        event_minutes = scheduled + jitter
        # clamp to 0..1439
        event_minutes = int(np.clip(event_minutes, 0, 23*60+59))
        hh = event_minutes // 60
        mm = event_minutes % 60
        event_time = dtime(hh, mm, random.choice([0,0,0,30]))  # occasionally :30 seconds
        
        # Determine pills taken: mostly equals pills_per_dose, small chance of missed/extra/partial
        r = random.random()
        if r < 0.01:
            pills_taken = 0.0
            anomaly = "missed"
        elif r < 0.03:
            pills_taken = pills_per_dose + 1
            anomaly = "extra"
        elif r < 0.035:
            pills_taken = max(0.5, pills_per_dose * 0.5)
            anomaly = "partial"
        else:
            pills_taken = pills_per_dose
            anomaly = None
        
        # grams measured with small measurement noise
        grams = round(pills_taken * grams_per_pill * float(np.random.normal(1.0, 0.02)), 3)
        if grams < 0:
            grams = 0.0
        
        events_rows.append({
            "subject_id": sid,
            "event_date": event_date.isoformat(),
            "event_time": event_time.strftime("%H:%M:%S"),
            "grams": grams,
            "anomaly_id": anomaly if anomaly is not None else ""
        })

# Build DataFrames
subjects_df = pd.DataFrame(subjects_rows)
events_df = pd.DataFrame(events_rows)

# --- Make grams a monotonic bottle reading (+pillCount/adherence/anomalyId) ---

# Join subject info needed for simulation
ev = events_df.merge(
    subjects_df[["subject_id", "pill_count", "pills_per_dose", "grams_per_pill"]],
    on="subject_id", how="left"
)

# Build a timestamp and sort
ev["ts"] = pd.to_datetime(ev["event_date"] + " " + ev["event_time"])
ev = ev.sort_values(["subject_id", "ts"]).reset_index(drop=True)

# Map WOZ anomaly labels to numeric id + adherence + dose multiplier
# 0 = on time/normal, 1 = extra, 2 = partial, 3 = missed
def anomaly_props(label, pills_per_dose):
    if label == "missed":   # no change
        return 3, 0.0, 0.0
    if label == "partial":  # ~half dose
        return 2, 0.8, max(0.5, pills_per_dose * 0.5)
    if label == "extra":    # one extra pill
        return 1, 0.9, pills_per_dose + 1
    return 0, 1.0, pills_per_dose  # normal

pill_counts = []
bottle_grams = []
anom_ids = []
adherences = []

state = {}  # per-subject state: pills_left, capacity, prev_grams

for i, row in ev.iterrows():
    sid = row["subject_id"]
    if sid not in state:
        state[sid] = {
            "pills_left": float(row["pill_count"]),
            "capacity":   float(row["pill_count"]),
            "prev_grams": float(row["pill_count"]) * float(row["grams_per_pill"]),
        }

    pills_left = state[sid]["pills_left"]
    cap        = state[sid]["capacity"]
    gpp        = float(row["grams_per_pill"])

    an_id, adh, dose_pills = anomaly_props(row["anomaly_id"], float(row["pills_per_dose"]))

    # Refill if not enough pills for the intended dose
    if pills_left < dose_pills and an_id != 3:  # don't refill for a missed dose; allow bottle to sit
        pills_left = cap

    # Apply dose (missed => 0)
    pills_left = max(0.0, pills_left - dose_pills)

    # Bottle reading after the event
    base_grams = pills_left * gpp
    noisy = base_grams * float(np.random.normal(1.0, 0.003))  # tiny noise
    # Enforce monotonic non-increasing unless we refilled this step
    prev = state[sid]["prev_grams"]
    refilled = base_grams > prev  # this only happens when we refilled above
    grams_read = noisy if refilled else min(noisy, prev)

    # Save state & outputs
    state[sid]["pills_left"] = pills_left
    state[sid]["prev_grams"] = grams_read

    pill_counts.append(int(round(pills_left)))
    bottle_grams.append(round(grams_read, 3))
    anom_ids.append(an_id)
    adherences.append(adh)

# Write back to a schema your app expects
ev["pillCount"] = pill_counts
ev["grams"] = bottle_grams
ev["anomalyId"] = anom_ids
ev["adherenceScore"] = adherences

# Finalize columns / names
events_df_fixed = (
    ev[["subject_id", "event_date", "event_time", "grams", "anomalyId", "adherenceScore", "pillCount"]]
    .rename(columns={"subject_id":"subjectId", "event_date":"date", "event_time":"time"})
)

# From here on, use the fixed events
events_df = events_df_fixed.copy()

# Update num_anomalies per subject from fixed events (anomalyId != 0)
anomaly_counts = (
    events_df.loc[events_df["anomalyId"] != 0]
             .groupby("subjectId").size()
)
subjects_df["num_anomalies"] = (
    subjects_df["subject_id"].map(anomaly_counts).fillna(0).astype(int)
)

# Summary stats (use fixed events)
total_events = len(events_df)
per_subject_counts = events_df.groupby("subjectId").size()
min_ev, max_ev = int(per_subject_counts.min()), int(per_subject_counts.max())

print(f"Created {len(subjects_df)} subjects and {total_events} events (per-subject events range: {min_ev}-{max_ev})")

# Save CSVs (do not overwrite with the old df)
os.makedirs("/mnt/data", exist_ok=True)
subjects_csv = "/mnt/data/subjects.csv"
events_csv = "/mnt/data/events.csv"

subjects_df.to_csv(subjects_csv, index=False)
events_df.to_csv(events_csv, index=False)

# Show samples from the FIXED events
from caas_jupyter_tools import display_dataframe_to_user
display_dataframe_to_user("subjects_sample", subjects_df.head(10))
display_dataframe_to_user("events_sample", events_df.sample(10))

{"subjects_csv": subjects_csv, "events_csv": events_csv,
 "num_subjects": len(subjects_df), "total_events": total_events,
 "min_events_per_subject": min_ev, "max_events_per_subject": max_ev}
