'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Pill, AlertTriangle, CheckCircle, ChevronDown, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import NewSubjectForm from './NewSubjectForm'
import SubjectDropdown from './SubjectDropdown'
import type { Subject } from './SubjectDropdown'
import AggregateView from './AggregateView'
import { supabase } from './SupabaseClient'



// Dummy data
// Mock subjects data - will be replaced with Supabase API calls

// Default subject data (current subject)

const stats = {
  pillCount: '24/30',
  anomalies: 4,
  adherence: 90
}

const dateKeyLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dateKeyFromMs = (ms: number) => dateKeyLocal(new Date(ms));

// Filter options
const timelinessOptions = ['All', 'On time', 'Anomaly']
const dateRangeOptions = ['All', 'Last 7 days', 'Last 30 days', 'Last 90 days']
const isDoseSizeAnomaly = (e: any) => Number(e.anomalyId) === 3;

// Calendar Heatmap Component
const CalendarHeatmap = ({
    data,
  }: {
    data: Array<{ day?: number; status: 'good' | 'partial' | 'missed' | 'nodata' | 'empty'; title?: string }>
  }) => {
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    const chipClass = (s: string) =>
      s === 'good'   ? 'bg-green-500'
    : s === 'partial'? 'bg-yellow-500'
    : s === 'missed' ? 'bg-red-500'
    : s === 'nodata' ? 'bg-gray-500'
    : /* empty */      'bg-transparent'

    return (
      <div className="grid grid-cols-7 gap-y-2 text-center">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-xs text-gray-400">
            {day}
          </div>
        ))}
        {data.map((item, idx) => (
          <div key={idx} className="flex justify-center">
            <div
              className={`w-6 h-6 rounded-sm ${chipClass(item.status)}`}
              title={item.title ?? ''}
            />
          </div>
        ))}
      </div>
    )
  }
  
// Circular Adherence Gauge Component
const CircularGauge = ({ percentage }: { percentage: number }) => {
  const radius = 55
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  const getColor = (pct: number) => {
    if (pct < 60) return '#ef4444' // red
    if (pct < 80) return '#eab308' // yellow
    return '#22c55e' // green
  }

  return (
    <div className="relative w-36 h-36 right-10 top-10">
      <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#374151"
          strokeWidth="10"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={getColor(percentage)}
          strokeWidth="10"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{percentage}%</div>
          <div className="text-sm text-gray-400">Adherence</div>
        </div>
      </div>
    </div>
  )
}

// ---- Date helpers (robust across browsers) ----
const buildTakenAt = (dateVal?: any, timeVal?: any): number | undefined => {
  // If time is already an ISO/timestamp, prefer it
  if (typeof timeVal === 'string' && timeVal.includes('T')) return new Date(timeVal).getTime();

  const dStr = String(dateVal ?? '');          // e.g. "2025-08-09"
  const tStr = String(timeVal ?? '00:00:00');  // e.g. "06:00" | "06:00:00"

  const [y, m, d] = dStr.split('-').map(n => parseInt(n, 10));
  if (!y || !m || !d) return undefined;
  const [hh, mm, ss] = tStr.split(':').map(n => parseInt(n, 10));

  // Create a local Date so it formats nicely in the user's TZ
  const dt = new Date(y, (m - 1), d, hh || 0, mm || 0, ss || 0);
  return dt.getTime();
};

const fmtDate = (ms?: number) =>
  ms ? new Date(ms).toLocaleDateString() : '-';

const fmtTime = (ms?: number) =>
  ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

const pillFrac = (left?: number, total?: number) => {
  const hasLeft = left !== undefined && left !== null;
  const hasTotal = total !== undefined && total !== null;
  if (hasLeft && hasTotal) return `${left} / ${total}`;
  return hasLeft ? String(left) : '—';
};


export default function SubjectView() {
  const [timelinessFilter, setTimelinessFilter] = useState('All')
  const [dateRangeFilter, setDateRangeFilter] = useState('All')
  const [isNewSubjectFormOpen, setIsNewSubjectFormOpen] = useState(false)

  const [selectedSubject, setSelectedSubject] = useState<Subject>({} as Subject)
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [currentView, setCurrentView] = useState<'subject' | 'aggregate'>('subject')

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*");

      if (error) {
        console.error("Error fetching subjects:", error);
        return;
      }

      if (data && data.length > 0) {
        const parsed = data.map(row => {
          let prescription = row.prescription;
          let dosingWindows = row.dosingWindows;

          // Handle prescription
          if (typeof prescription === "string") {
            try {
              prescription = JSON.parse(prescription);
            } catch {
              prescription = null;
            }
          }

          if (!prescription) {
            prescription = {
              dosesPerDay: 0,
              pillsPerDose: 0,
              totalPillsPrescribed: 0,
            };
          }

          // Handle dosingWindows
          if (typeof dosingWindows === "string") {
            try {
              dosingWindows = JSON.parse(dosingWindows);
            } catch {
              dosingWindows = [];
            }
          }
          if (!Array.isArray(dosingWindows)) {
            dosingWindows = [];
          }

          return {
            ...row,
            prescription,
            dosingWindows,
          };
        });

        console.log("Parsed data:", parsed);
        setSubjects(parsed);
        setSelectedSubject(parsed[0]); // auto-pick first
      }
    };

    fetchSubjects();
  }, []);


  const filteredEvents = events.filter(event => {
    if (timelinessFilter !== 'All' && event.timeliness !== timelinessFilter) return false;
    return true;
  });

  const getKey = (r: any) =>
    r && r.subjectId != null && r.takenAtMs != null
      ? `${String(r.subjectId)}|${r.takenAtMs}`
      : undefined;

  const fetchEvents = async (subjectId: string | number) => {
    setEventsLoading(true);

    const sidNum = Number(subjectId);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('subjectId', sidNum)           // bigint match
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(200);

    console.log('[events] fetch', { error, count: data?.length, sample: data?.[0] });

    if (error) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }

    // Normalize to fields your table uses
    const normalized = (data ?? []).map((r: any) => {
      const takenAtMs = buildTakenAt(r.date, r.time);
      const anomalyId = Number(r.anomalyId) || 0;
      const adherenceScore = r.adherenceScore != null ? Number(r.adherenceScore) : undefined;

      return {
        subjectId: r.subjectId,
        date: r.date,
        time: r.time,
        takenAtMs,
        timeliness: anomalyId !== 0 ? 'Anomaly' : 'On time',
        // NOTE: we no longer derive doseSize here
        pillCount: r.pillCount != null ? Number(r.pillCount) : undefined,
        grams: r.grams != null ? Number(r.grams) : undefined,
        adherenceScore,
        anomalyId,
      };
    });

    setEvents(recomputeDoseSizes(normalized));
    setEventsLoading(false);
  };


  useEffect(() => {
    const sid = selectedSubject?.subjectId;
    if (sid == null) return;

    const sidNum = Number(sid);
    console.log('[events] selectedSubject:', selectedSubject);
    fetchEvents(sidNum);

    const normalize = (r: any) => {
      const takenAtMs = buildTakenAt(r.date, r.time);
      const timeliness = r.anomalyId && Number(r.anomalyId) !== 0 ? 'Anomaly' : 'On time';
      return {
        subjectId: r.subjectId,
        date: r.date,
        time: r.time,
        takenAtMs,
        timeliness,
        doseSize: r.grams ?? r.doseSize ?? 1,
        pillCount: r.pillCount,
        grams: r.grams,
        adherenceScore: r.adherenceScore,
        anomalyId: r.anomalyId,
      };
    };

    const channel = supabase
      .channel(`events:subject:${sidNum}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `subjectId=eq.${sidNum}` },
        ({ new: row }) => {
          const normalized = normalize(row); // your normalize that does NOT set doseSize
          setEvents(prev => {
            const k = getKey(normalized);
            if (!k) return prev;
            const i = prev.findIndex(e => getKey(e) === k);
            const next = i >= 0 ? prev.map((e, idx) => (idx === i ? normalized : e))
                                : [normalized, ...prev];
            return recomputeDoseSizes(next);
          });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `subjectId=eq.${sidNum}` },
        ({ new: row }) => {
          const normalized = normalize(row);
          setEvents(prev => {
            const k = getKey(normalized);
            if (!k) return prev;
            const next = prev.map(e => (getKey(e) === k ? normalized : e));
            return recomputeDoseSizes(next);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedSubject?.subjectId]);




  const handleSubjectSelect = (subject: any) => {
    setSelectedSubject(subject);
    fetchEvents(Number(subject.subjectId));
  };

  const handleNewSubjectSubmit = async (newSubjectData: any) => {
    console.log('New subject data:', newSubjectData)

    // Map to your table’s columns and types
    const payload = {
      firstName: newSubjectData.firstName,
      lastName: newSubjectData.lastName,
      age: newSubjectData.age,
      sex: newSubjectData.sex,
      race: newSubjectData.race,
      weight: newSubjectData.weight,       // number or string, match DB
      height: newSubjectData.height,       // number or string, match DB
      prescription: newSubjectData.prescription,        // or JSON.stringify(...)
      dosingWindows: newSubjectData.dosingWindows,      // or JSON.stringify(...)
      currAdherenceScore: newSubjectData.currAdherenceScore ?? 1.0,
      pillWeight: newSubjectData.pillWeight ?? 0.0
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error inserting subject:', error)
      alert(error.message || 'Failed to add subject.')
      return
    }

    // `data` is the inserted row
    setSubjects(prev => [...prev, data])
    setSelectedSubject(data)
    alert(`New subject "${data.firstName} ${data.lastName}" added successfully!`)
  }

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth()) // 0-11

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const calendarYears = useMemo(() => {
    const years = new Set<number>()
    for (const e of events) {
      const key = typeof e.date === 'string' ? e.date.slice(0,10)
        : typeof e.takenAtMs === 'number' ? dateKeyFromMs(e.takenAtMs)
        : undefined
      if (!key) continue
      years.add(Number(key.slice(0,4)))
    }
    if (years.size === 0) {
      const y = now.getFullYear()
      return [y - 2, y - 1, y, y + 1]
    }
    return Array.from(years).sort((a,b) => a - b)
  }, [events])

  const gotoPrevMonth = () => {
    setCalMonth(m => {
      if (m === 0) { setCalYear(y => y - 1); return 11 }
      return m - 1
    })
  }
  const gotoNextMonth = () => {
    setCalMonth(m => {
      if (m === 11) { setCalYear(y => y + 1); return 0 }
      return m + 1
    })
  }

  const calendarData = useMemo(() => {
    const dosesPerDay =
      Number(selectedSubject?.prescription?.dosesPerDay) > 0
        ? Number(selectedSubject!.prescription!.dosesPerDay)
        : 2

    // Per-day rollup + anomaly flags
    const byDate: Record<string, { count: number; hasAnomaly: boolean; missedA3: boolean }> = {}

    // Track min/max event day (midnight) to distinguish "no data" vs "missed"
    let minMs: number | undefined
    let maxMs: number | undefined

    const pushMinMax = (ms?: number) => {
      if (ms == null || Number.isNaN(ms)) return
      const d = new Date(ms); d.setHours(0,0,0,0)
      const dayMs = d.getTime()
      minMs = minMs === undefined ? dayMs : Math.min(minMs, dayMs)
      maxMs = maxMs === undefined ? dayMs : Math.max(maxMs, dayMs)
    }

    for (const e of events) {
      const key =
        (typeof e.date === 'string' && e.date.length >= 10) ? e.date.slice(0,10)
        : (typeof e.takenAtMs === 'number') ? dateKeyFromMs(e.takenAtMs)
        : undefined
      if (!key) continue

      if (!byDate[key]) byDate[key] = { count: 0, hasAnomaly: false, missedA3: false }
      byDate[key].count += 1
      const anomaly = Number(e.anomalyId) || 0
      const adherZero = Number(e.adherenceScore) === 0
      byDate[key].hasAnomaly ||= anomaly !== 0
      byDate[key].missedA3  ||= (anomaly === 3 && adherZero)

      // update min/max from key
      const [y,m,d] = key.split('-').map(Number)
      pushMinMax(new Date(y, m - 1, d).getTime())
    }

    // Build month grid
    const first = new Date(calYear, calMonth, 1)
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const leading = first.getDay()

    const cells: Array<{ day?: number; status: 'good'|'partial'|'missed'|'nodata'|'empty'; title?: string }> = []

    for (let i = 0; i < leading; i++) cells.push({ status: 'empty' })

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calYear, calMonth, day)
      const key = dateKeyLocal(d)
      const stats = byDate[key]

      const dm = new Date(calYear, calMonth, day).setHours(0,0,0,0)
      const outOfRange =
        minMs === undefined || maxMs === undefined || dm < minMs || dm > maxMs

      let status: 'good'|'partial'|'missed'|'nodata'
      if (outOfRange) status = 'nodata'
      else if (!stats || stats.count === 0) status = 'missed'
      else if (stats.missedA3) status = 'missed'
      else if (stats.hasAnomaly || stats.count < dosesPerDay) status = 'partial'
      else status = 'good'

      cells.push({
        day,
        status,
        title: `${key}: ${status}${
          stats ? ` (${stats.count}/${dosesPerDay}${stats.missedA3 ? ', anomaly3+no change' : stats.hasAnomaly ? ', anomaly' : ''})` : ''
        }`,
      })
    }

    return cells
  }, [events, selectedSubject, calYear, calMonth])

  const pillCountSeries = useMemo(() => {
    // keep only rows that have a numeric pillCount
    const rows = events.filter(
      (e) => e.pillCount != null && !Number.isNaN(Number(e.pillCount))
    );
    if (rows.length === 0) return [];

    // pick the most recent calendar date with data
    const latestMs = Math.max(
      ...rows.map((r) => r.takenAtMs ?? buildTakenAt(r.date, r.time) ?? 0)
    );
    const latestDayKey = dateKeyFromMs(latestMs);

    // collect that day's readings, sorted by time
    const dayRows = rows
      .filter((r) => {
        const ms = r.takenAtMs ?? buildTakenAt(r.date, r.time);
        if (!ms) return false;
        return dateKeyFromMs(ms) === latestDayKey;
      })
      .sort(
        (a, b) =>
          (a.takenAtMs ?? buildTakenAt(a.date, a.time) ?? 0) -
          (b.takenAtMs ?? buildTakenAt(b.date, b.time) ?? 0)
      )
      .map((r) => {
        const ms = r.takenAtMs ?? buildTakenAt(r.date, r.time)!;
        return {
          time: new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          count: Number(r.pillCount),
        };
      });

    return dayRows;
  }, [events]);

  const tenDayChart = useMemo(() => {
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // map events -> [{ time: ms, count: number }]
    const pts = events
      .map(e => ({
        time: Number(e.takenAtMs ?? buildTakenAt(e.date, e.time)),
        count: Number(e.pillCount),
      }))
      .filter(p => Number.isFinite(p.time) && Number.isFinite(p.count))
      .sort((a, b) => a.time - b.time);

    // end of window = last reading (or "now" if you prefer)
    const endRef = pts.length ? pts[pts.length - 1].time : Date.now();

    // snap to calendar boundaries: [midnight 10 days ago, midnight after endRef]
    const endDay = new Date(endRef); endDay.setHours(24, 0, 0, 0);
    const startDay = new Date(endDay); startDay.setDate(startDay.getDate() - 9);
    const domain: [number, number] = [startDay.getTime(), endDay.getTime()];

    // keep only points that fall inside the 10-day window
    const data = pts.filter(p => p.time >= domain[0] && p.time <= domain[1]);

    // daily ticks
    const ticks: number[] = [];
    for (let t = domain[0]; t <= domain[1]; t += ONE_DAY) ticks.push(t);

    return { data, domain, ticks };
  }, [events]);

  const recomputeDoseSizes = (rows: any[]) => {
    // chronological (oldest → newest)
    const asc = [...rows].sort(
      (a, b) => (a.takenAtMs ?? 0) - (b.takenAtMs ?? 0)
    );

    let prev: any | undefined;
    for (const r of asc) {
      let dose = 0;
      if (prev && prev.pillCount != null && r.pillCount != null) {
        const diff = Number(prev.pillCount) - Number(r.pillCount);
        // negative diff means a refill; treat as 0 taken at this event
        dose = diff >= 0 ? diff : 0;
      }
      r.doseSize = dose;
      prev = r;
    }

    // return to newest-first for your table
    return asc.sort((a, b) => (b.takenAtMs ?? 0) - (a.takenAtMs ?? 0));
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        
        {/* Header */}
        <header className="relative h-20 mb-8">
          {/* Left tabs, vertically centered in the same bar */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  currentView === 'aggregate' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setCurrentView('aggregate')}
              >
                Aggregate View
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  currentView === 'subject' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setCurrentView('subject')}
              >
                Subject View
              </button>
            </div>
          </div>

          {/* Right-aligned logo, centered vertically in the bar */}
          <h1 className="absolute right-0 top-[80%] -translate-y-1/2 pr-2 text-4xl font-bold text-white font-ttchocolate">
            Dose
          </h1>
        </header>

        {/* Subject Selection - Only show in subject view */}
        {currentView === 'subject' && (
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <SubjectDropdown
                subjects={subjects}
                selectedSubject={selectedSubject}
                onSubjectSelect={handleSubjectSelect}
                placeholder="Choose Subject"
              />
              <Button 
                variant="outline" 
                className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                onClick={() => setIsNewSubjectFormOpen(true)}
              >
                + New Subject
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {currentView === 'aggregate' ? (
        <AggregateView />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Patient Profile and Adherence */}
        <div className="space-y-6">
          {/* Patient Profile Card */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Patient Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-16">
              {/* Patient Details */}
              <div className="space-y-3 w-1/3">
                <div className="flex justify-between">
                  <span className="text-gray-300">First Name:</span>
                  <span className="text-white font-medium">{selectedSubject.firstName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Last Name:</span>
                  <span className="text-white font-medium">{selectedSubject.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Age:</span>
                  <span className="text-white font-medium">{selectedSubject.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Sex:</span>
                  <span className="text-white font-medium capitalize">{selectedSubject.sex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Race:</span>
                  <span className="text-white font-medium">{selectedSubject.race}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Weight:</span>
                  <span className="text-white font-medium">{selectedSubject.weight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Height:</span>
                  <span className="text-white font-medium">{selectedSubject.height}</span>
                </div>
              </div>
              <div className="space-y-6 w-2/3 justify-center"> 
              {/* Prescription */}
              <div className="space-y-3">
                <h3 className="text-white font-semibold text-lg">Prescription</h3>
                <div className="text-gray-300 space-y-1">
                  {selectedSubject?.prescription && (
                    <>
                      <div>
                        {selectedSubject.prescription.dosesPerDay} doses/day,{" "}
                        {selectedSubject.prescription.pillsPerDose} pills/dose
                      </div>
                      <div>
                        Total prescribed: {selectedSubject.prescription.totalPillsPrescribed} pills
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Dosing Windows */}
              <div className="space-y-3">
                <h3 className="text-white font-semibold text-lg">Dosing Windows</h3>
                <div className="space-y-2">
                  {selectedSubject?.dosingWindows?.map((window, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300">
                        {window.start} - {window.end}
                      </span>
                    </div>
                  ))}
                </div>
                </div>
                </div>
                
                {/* Circular Adherence Gauge - No Card Wrapper */}
              <div className="flex items-left  ">
                <CircularGauge percentage={selectedSubject.currAdherenceScore * 100} />
              </div>
                
              
              </div>
            </CardContent>
          </Card>

          {/* Adherence Calendar - Full Width */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-semibold">Adherence Calendar</CardTitle>

              <div className="flex items-center gap-2">
                <button
                  onClick={gotoPrevMonth}
                  className="px-2 py-1 rounded-md bg-gray-600 text-white hover:bg-gray-500"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={calMonth}
                  onChange={(e) => setCalMonth(Number(e.target.value))}
                  className="bg-gray-700 text-white text-sm px-2 py-1 rounded border-gray-600"
                >
                  {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>

                <select
                  value={calYear}
                  onChange={(e) => setCalYear(Number(e.target.value))}
                  className="bg-gray-700 text-white text-sm px-2 py-1 rounded border-gray-600"
                >
                  {calendarYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <button
                  onClick={gotoNextMonth}
                  className="px-2 py-1 rounded-md bg-gray-600 text-white hover:bg-gray-500"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>

            <CardContent>
              <CalendarHeatmap data={calendarData} />
              {/* Legend */}
              <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  <span className="text-gray-300">Good</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                  <span className="text-gray-300">Partial</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                  <span className="text-gray-300">Missed</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
                  <span className="text-gray-300">No data</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Analytics and Event Log */}
        <div className="space-y-6">

          {/* Pill Count Over Time Chart */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold">Pill Count Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tenDayChart.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={tenDayChart.domain}
                    ticks={tenDayChart.ticks}
                    tickFormatter={(ms) => new Date(ms as number).toLocaleDateString()}
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip
                    labelFormatter={(ms) => new Date(ms as number).toLocaleString()}
                    contentStyle={{ backgroundColor: '#374151', border: '1px solid #4B5563', borderRadius: 6, color: '#F9FAFB' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>


              {pillCountSeries.length === 0 && (
                <div className="text-gray-400 text-sm mt-2">No pill count readings yet.</div>
              )}
            </CardContent>
          </Card>


          {/* Event Log Table */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold">Event Log</CardTitle>
            </CardHeader>
            <CardContent>
              {/* fixed height + scroll, so it doesn't extend past the calendar */}
              <div className="h-[300px] md:h-[305px] overflow-y-auto rounded-md">
                <Table>
                  {/* keep header visible while scrolling */}
                  <TableHeader className="sticky top-0 bg-gray-700 z-10">
                    <TableRow className="border-gray-600 hover:bg-gray-600">
                    <TableHead className="text-gray-300">
                      <div className="flex items-center space-x-2">
                        <span>Date</span>
                        <select
                          value={dateRangeFilter}
                          onChange={(e) => setDateRangeFilter(e.target.value)}
                          className="bg-gray-600 text-white text-xs px-2 py-1 rounded border-gray-500"
                        >
                          {dateRangeOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-300">Time</TableHead>
                    <TableHead className="text-gray-300">
                      <div className="flex items-center space-x-2">
                        <span>Timeliness</span>
                        <select
                          value={timelinessFilter}
                          onChange={(e) => setTimelinessFilter(e.target.value)}
                          className="bg-gray-600 text-white text-xs px-2 py-1 rounded border-gray-500"
                        >
                          {timelinessOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-300">
                      <span>Dose Size</span>
                      </TableHead>
                    <TableHead className="text-gray-300">Pill Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsLoading && (
                    <TableRow className="border-gray-600">
                      <TableCell colSpan={5} className="text-gray-300">Loading events…</TableCell>
                    </TableRow>
                  )}
                  {filteredEvents.map((event, index) => (
                    <TableRow key={getKey(event) ?? index} className="border-gray-600 hover:bg-gray-600">
                      <TableCell className="text-white">{fmtDate(event.takenAtMs)}</TableCell>
                      <TableCell className="text-white">{fmtTime(event.takenAtMs)}</TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              event.timeliness === 'On time'
                                ? 'bg-gray-600 text-gray-300'
                                : 'bg-red-500 text-white'
                            }`}
                          >
                            {event.timeliness === 'On time'
                              ? <CheckCircle className="w-3 h-3 mr-1" />
                              : <AlertTriangle className="w-3 h-3 mr-1" />}
                            {event.timeliness}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDoseSizeAnomaly(event)
                                ? 'bg-red-500 text-white'     // only red when anomalyId === 3
                                : 'bg-gray-600 text-gray-300' // otherwise gray
                            }`}
                            title={isDoseSizeAnomaly(event) ? 'Dose size mismatch (anomaly 3)' : 'Expected dose size'}
                          >
                            <Pill className="w-3 h-3 mr-1" />
                            {event.doseSize}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        {pillFrac(
                          Number(event.pillCount),
                          Number(selectedSubject?.prescription?.totalPillsPrescribed)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* New Subject Form Modal */}
      <NewSubjectForm
        isOpen={isNewSubjectFormOpen}
        onClose={() => setIsNewSubjectFormOpen(false)}
        onSubmit={handleNewSubjectSubmit}
      />
    </div>
  )
}
