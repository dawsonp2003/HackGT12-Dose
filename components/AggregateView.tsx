'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from './SupabaseClient'

type SubjectRow = {
  subjectId: number | string
  firstName: string | null
  lastName: string | null
  currAdherenceScore: number | null // 0..1 in DB
}

type SubjectForChart = {
  subjectId: string
  firstName: string
  lastName: string
  adherence: number // 0..100
}

// 20% buckets
const createHistogramData = (subjects: SubjectForChart[]) => {
  const buckets = [
    { range: '0-20%',   min: 0,  max: 20,  count: 0, subjects: [] as SubjectForChart[] },
    { range: '21-40%',  min: 21, max: 40,  count: 0, subjects: [] as SubjectForChart[] },
    { range: '41-60%',  min: 41, max: 60,  count: 0, subjects: [] as SubjectForChart[] },
    { range: '61-80%',  min: 61, max: 80,  count: 0, subjects: [] as SubjectForChart[] },
    { range: '81-100%', min: 81, max: 100, count: 0, subjects: [] as SubjectForChart[] },
  ]

  for (const s of subjects) {
    const b = buckets.find(b => s.adherence >= b.min && s.adherence <= b.max)
    if (b) { b.count++; b.subjects.push(s) }
  }

  return buckets.map(b => ({
    range: b.range,
    count: b.count,
    percentage: subjects.length ? Math.round((b.count / subjects.length) * 100) : 0,
    subjects: b.subjects,
  }))
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg max-w-[260px]">
        <p className="text-white font-medium">{label}</p>
        <p className="text-gray-300 text-sm">{data.count} subjects ({data.percentage}%)</p>
        <div className="mt-2 max-h-32 overflow-y-auto">
          <p className="text-gray-400 text-xs mb-1">Subjects:</p>
          {data.subjects.map((s: SubjectForChart) => (
            <p key={s.subjectId} className="text-gray-300 text-xs truncate">
              {s.firstName} {s.lastName} ({s.adherence}%)
            </p>
          ))}
        </div>
      </div>
    )
  }
  return null
}



export default function AggregateView() {
  const [subjects, setSubjects] = useState<SubjectForChart[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch subjects
  useEffect(() => {
    let mounted = true

    const fetchSubjects = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('subjects')
        .select('subjectId, firstName, lastName, currAdherenceScore')

      if (error) {
        console.error('subjects fetch error:', error)
        if (mounted) { setSubjects([]); setLoading(false) }
        return
      }

      const mapped: SubjectForChart[] = (data as SubjectRow[]).map(r => ({
        subjectId: String(r.subjectId),
        firstName: r.firstName ?? '',
        lastName:  r.lastName ?? '',
        adherence: Math.max(0, Math.min(100, Math.round((r.currAdherenceScore ?? 0) * 100))),
      }))

      if (mounted) { setSubjects(mapped); setLoading(false) }
    }

    fetchSubjects()

    // Live updates (optional but nice)
    const ch = supabase.channel('subjects-aggregate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, fetchSubjects)
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(ch) }
  }, [])

  // Derived data
  const histogramData = useMemo(() => createHistogramData(subjects), [subjects])
  const totalSubjects = subjects.length
  const averageAdherence = useMemo(
    () => (totalSubjects ? Math.round(subjects.reduce((s, x) => s + x.adherence, 0) / totalSubjects) : 0),
    [subjects, totalSubjects]
  )
  const highAdherence = useMemo(() => subjects.filter(s => s.adherence >= 80).length, [subjects])
  const lowAdherence  = useMemo(() => subjects.filter(s => s.adherence < 60).length, [subjects])

  const excellentAdherence = useMemo(
    () => subjects.filter(s => s.adherence >= 90).length,
    [subjects]
  )

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header & Stats */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {loading ? '—' : totalSubjects}
                </div>
                <div className="text-gray-300 text-sm">Total Subjects</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {loading ? '—' : `${averageAdherence}%`}
                </div>
                <div className="text-gray-300 text-sm">Average Adherence</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {loading ? '—' : highAdherence}
                </div>
                <div className="text-gray-300 text-sm">High Adherence (≥80%)</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {loading ? '—' : lowAdherence}
                </div>
                <div className="text-gray-300 text-sm">Low Adherence (&lt;60%)</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histogram */}
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Adherence Score Distribution</CardTitle>
            <p className="text-gray-400 text-sm">Number of subjects in each adherence range</p>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="range"
                    stroke="#9CA3AF"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    label={{ value: 'Number of Subjects', angle: -90, position: 'insideLeft' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Breakdown */}
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Adherence Breakdown</CardTitle>
            <p className="text-gray-400 text-sm">Detailed view of subjects in each range</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-400">Loading…</div>
            ) : (
              <div className="space-y-4">
                {histogramData.map((bucket, i) => (
                  <div key={i} className="border border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-white font-medium">{bucket.range}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-300 text-sm">{bucket.count} subjects</span>
                        <span className="text-gray-400 text-sm">({bucket.percentage}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${bucket.percentage}%` }}
                      />
                    </div>

                    <div className="max-h-24 overflow-y-auto">
                      {bucket.subjects.length ? (
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {bucket.subjects.map(s => (
                            <div key={s.subjectId} className="text-gray-300 truncate">
                              {s.firstName} {s.lastName} ({s.adherence}%)
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm italic">No subjects in this range</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div className="mt-6">
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-400">Loading…</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {totalSubjects ? Math.round((highAdherence / totalSubjects) * 100) : 0}%
                  </div>
                  <div className="text-gray-300">of subjects have high adherence (≥80%)</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">
                    {totalSubjects ? Math.round((lowAdherence / totalSubjects) * 100) : 0}%
                  </div>
                  <div className="text-gray-300">of subjects need improvement (&lt;60%)</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {excellentAdherence}
                  </div>
                  <div className="text-gray-300">subjects with excellent adherence (≥90%)</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
