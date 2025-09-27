'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Mock data for aggregate view - will be replaced with Supabase API calls
const mockSubjects = [
  { subjectId: '12345', firstName: 'John', lastName: 'Doe', adherence: 90 },
  { subjectId: '67890', firstName: 'Sarah', lastName: 'Smith', adherence: 75 },
  { subjectId: '11111', firstName: 'Michael', lastName: 'Johnson', adherence: 95 },
  { subjectId: '22222', firstName: 'Emily', lastName: 'Davis', adherence: 60 },
  { subjectId: '33333', firstName: 'David', lastName: 'Wilson', adherence: 85 },
  { subjectId: '44444', firstName: 'Lisa', lastName: 'Brown', adherence: 40 },
  { subjectId: '55555', firstName: 'James', lastName: 'Taylor', adherence: 100 },
  { subjectId: '66666', firstName: 'Maria', lastName: 'Garcia', adherence: 30 },
  { subjectId: '77777', firstName: 'Robert', lastName: 'Anderson', adherence: 80 },
  { subjectId: '88888', firstName: 'Jennifer', lastName: 'Martinez', adherence: 65 },
  { subjectId: '99999', firstName: 'William', lastName: 'Lee', adherence: 55 },
  { subjectId: '10101', firstName: 'Patricia', lastName: 'White', adherence: 45 },
  { subjectId: '20202', firstName: 'Christopher', lastName: 'Harris', adherence: 70 },
  { subjectId: '30303', firstName: 'Linda', lastName: 'Clark', adherence: 25 },
  { subjectId: '40404', firstName: 'Daniel', lastName: 'Lewis', adherence: 88 },
  { subjectId: '50505', firstName: 'Barbara', lastName: 'Walker', adherence: 92 },
  { subjectId: '60606', firstName: 'Matthew', lastName: 'Hall', adherence: 35 },
  { subjectId: '70707', firstName: 'Susan', lastName: 'Allen', adherence: 78 },
  { subjectId: '80808', firstName: 'Anthony', lastName: 'Young', adherence: 82 },
  { subjectId: '90909', firstName: 'Jessica', lastName: 'King', adherence: 67 }
]

// Function to create histogram data with 20% buckets
const createHistogramData = (subjects: typeof mockSubjects) => {
  const buckets = [
    { range: '0-20%', min: 0, max: 20, count: 0, subjects: [] as (typeof mockSubjects[0])[] },
    { range: '21-40%', min: 21, max: 40, count: 0, subjects: [] as (typeof mockSubjects[0])[] },
    { range: '41-60%', min: 41, max: 60, count: 0, subjects: [] as (typeof mockSubjects[0])[] },
    { range: '61-80%', min: 61, max: 80, count: 0, subjects: [] as (typeof mockSubjects[0])[] },
    { range: '81-100%', min: 81, max: 100, count: 0, subjects: [] as (typeof mockSubjects[0])[] }
  ]

  subjects.forEach(subject => {
    const bucket = buckets.find(b => subject.adherence >= b.min && subject.adherence <= b.max)
    if (bucket) {
      bucket.count++
      bucket.subjects.push(subject)
    }
  })

  return buckets.map(bucket => ({
    range: bucket.range,
    count: bucket.count,
    percentage: Math.round((bucket.count / subjects.length) * 100),
    subjects: bucket.subjects
  }))
}

const histogramData = createHistogramData(mockSubjects)

// Calculate aggregate statistics
const totalSubjects = mockSubjects.length
const averageAdherence = Math.round(mockSubjects.reduce((sum, subject) => sum + subject.adherence, 0) / totalSubjects)
const highAdherence = mockSubjects.filter(s => s.adherence >= 80).length
const lowAdherence = mockSubjects.filter(s => s.adherence < 60).length

// Custom tooltip for the histogram
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
        <p className="text-white font-medium">{label}</p>
        <p className="text-gray-300 text-sm">
          {data.count} subjects ({data.percentage}%)
        </p>
        <div className="mt-2 max-h-32 overflow-y-auto">
          <p className="text-gray-400 text-xs mb-1">Subjects:</p>
          {data.subjects.map((subject: any, index: number) => (
            <p key={index} className="text-gray-300 text-xs">
              {subject.firstName} {subject.lastName} ({subject.adherence}%)
            </p>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export default function AggregateView() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-6">Dose - Aggregate View</h1>
        
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalSubjects}</div>
                <div className="text-gray-300 text-sm">Total Subjects</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{averageAdherence}%</div>
                <div className="text-gray-300 text-sm">Average Adherence</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{highAdherence}</div>
                <div className="text-gray-300 text-sm">High Adherence (≥80%)</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{lowAdherence}</div>
                <div className="text-gray-300 text-sm">Low Adherence (&lt;60%)</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adherence Histogram */}
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Adherence Score Distribution</CardTitle>
            <p className="text-gray-400 text-sm">Number of subjects in each adherence range</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
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
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Breakdown */}
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Adherence Breakdown</CardTitle>
            <p className="text-gray-400 text-sm">Detailed view of subjects in each range</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {histogramData.map((bucket, index) => (
                <div key={index} className="border border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-white font-medium">{bucket.range}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300 text-sm">{bucket.count} subjects</span>
                      <span className="text-gray-400 text-sm">({bucket.percentage}%)</span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${bucket.percentage}%` }}
                    ></div>
                  </div>
                  
                  {/* Subject list */}
                  <div className="max-h-24 overflow-y-auto">
                    {bucket.subjects.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {bucket.subjects.map((subject, subIndex) => (
                          <div key={subIndex} className="text-gray-300 truncate">
                            {subject.firstName} {subject.lastName} ({subject.adherence}%)
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
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="mt-6">
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {Math.round((highAdherence / totalSubjects) * 100)}%
                </div>
                <div className="text-gray-300">of subjects have high adherence (≥80%)</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {Math.round((lowAdherence / totalSubjects) * 100)}%
                </div>
                <div className="text-gray-300">of subjects need improvement (&lt;60%)</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {histogramData.find(b => b.range === '81-100%')?.count || 0}
                </div>
                <div className="text-gray-300">subjects with excellent adherence (81-100%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
