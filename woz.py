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
race_choices = ["White", "Hispanic/Latino", "Black/African American", "Asian", "Other/Multiracial"]
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

# Update num_anomalies per subject (count non-empty anomaly_id)
anomaly_counts = events_df[events_df["anomaly_id"] != ""].groupby("subject_id").size().to_dict()
subjects_df["num_anomalies"] = subjects_df["subject_id"].map(lambda x: int(anomaly_counts.get(x, 0)))

# Summary stats
total_events = len(events_df)
per_subject_counts = events_df.groupby("subject_id").size()
min_ev, max_ev = int(per_subject_counts.min()), int(per_subject_counts.max())

print(f"Created {len(subjects_df)} subjects and {total_events} events (per-subject events range: {min_ev}-{max_ev})")

# Save CSVs
os.makedirs("/mnt/data", exist_ok=True)
subjects_csv = "/mnt/data/subjects.csv"
events_csv = "/mnt/data/events.csv"

subjects_df.to_csv(subjects_csv, index=False)
events_df.to_csv(events_csv, index=False)

# Display small samples to the user in the UI
from caas_jupyter_tools import display_dataframe_to_user
display_dataframe_to_user("subjects_sample", subjects_df.head(10))
display_dataframe_to_user("events_sample", events_df.sample(10))

# Also return a small JSON summary for the notebook output
{"subjects_csv": subjects_csv, "events_csv": events_csv, "num_subjects": len(subjects_df), "total_events": total_events, "min_events_per_subject": min_ev, "max_events_per_subject": max_ev}
