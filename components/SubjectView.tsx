'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Pill, AlertTriangle, CheckCircle, ChevronDown, Filter } from 'lucide-react'

// Dummy data
const subjectData = {
  subjectId: '12345',
  firstName: 'John',
  lastName: 'Doe',
  age: 30,
  race: 'Male',
  weight: '70 kg',
  height: '180 cm',
  prescription: {
    dosesPerDay: 2,
    pillsPerDose: 2
  },
  dosingWindows: [
    { start: '08:00', end: '08:30' },
    { start: '20:00', end: '20:30' }
  ]
}

const pillCountData = [
  { time: '10:00', count: 45 },
  { time: '12:00', count: 42 },
  { time: '13:00', count: 38 },
  { time: '14:00', count: 32 },
  { time: '15:00', count: 22 }
]

const eventLogData = [
  {
    date: '9/26/2025',
    time: '14:06',
    timeliness: 'On time',
    doseSize: 2,
    pillCount: '24 / 30',
    isAnomaly: false
  },
  {
    date: '9/25/2025',
    time: '8:23',
    timeliness: 'Early',
    doseSize: 2,
    pillCount: '26 / 30',
    isAnomaly: true
  },
  {
    date: '9/24/2025',
    time: '13:59',
    timeliness: 'On time',
    doseSize: 1,
    pillCount: '28 / 30',
    isAnomaly: true
  }
]

const stats = {
  pillCount: '24/30',
  anomalies: 4,
  adherence: 90
}

// Calendar heatmap data (last 30 days)
const calendarData = [
  { day: 1, status: 'good' }, { day: 2, status: 'good' }, { day: 3, status: 'partial' }, { day: 4, status: 'good' },
  { day: 5, status: 'good' }, { day: 6, status: 'missed' }, { day: 7, status: 'good' }, { day: 8, status: 'good' },
  { day: 9, status: 'partial' }, { day: 10, status: 'good' }, { day: 11, status: 'good' }, { day: 12, status: 'good' },
  { day: 13, status: 'good' }, { day: 14, status: 'partial' }, { day: 15, status: 'good' }, { day: 16, status: 'good' },
  { day: 17, status: 'good' }, { day: 18, status: 'missed' }, { day: 19, status: 'good' }, { day: 20, status: 'good' },
  { day: 21, status: 'good' }, { day: 22, status: 'partial' }, { day: 23, status: 'good' }, { day: 24, status: 'good' },
  { day: 25, status: 'good' }, { day: 26, status: 'good' }, { day: 27, status: 'partial' }, { day: 28, status: 'good' },
  { day: 29, status: 'good' }, { day: 30, status: 'good' }
]

// Filter options
const timelinessOptions = ['All', 'On time', 'Early', 'Late']
const doseSizeOptions = ['All', '1', '2']
const dateRangeOptions = ['All', 'Last 7 days', 'Last 30 days', 'Last 90 days']

// Calendar Heatmap Component
const CalendarHeatmap = ({ data }: { data: Array<{ day: number; status: string }> }) => {
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  
    return (
      <div className="grid grid-cols-7 gap-y-2 text-center">
        {daysOfWeek.map(day => (
          <div key={day} className="text-xs text-gray-400">{day}</div>
        ))}
        {data.map((item, index) => (
          <div key={index} className="flex justify-center">
            <div
              className={`w-6 h-6 rounded-sm ${
                item.status === 'good' ? 'bg-green-500' :
                item.status === 'partial' ? 'bg-yellow-500' :
                item.status === 'missed' ? 'bg-red-500' : 'bg-gray-600'
              }`}
              title={`Day ${item.day}: ${item.status}`}
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
    <div className="relative w-36 h-36">
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

export default function SubjectView() {
  const [timelinessFilter, setTimelinessFilter] = useState('All')
  const [doseSizeFilter, setDoseSizeFilter] = useState('All')
  const [dateRangeFilter, setDateRangeFilter] = useState('All')

  const filteredEvents = eventLogData.filter(event => {
    if (timelinessFilter !== 'All' && event.timeliness !== timelinessFilter) return false
    if (doseSizeFilter !== 'All' && event.doseSize.toString() !== doseSizeFilter) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        {/* Tabs */}
        <div className="flex justify-between items-center mb-6">
            <div className="flex bg-gray-800 rounded-lg p-1">
                <button className="px-4 py-2 text-gray-400 rounded-md transition-colors">
                Aggregate View
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-md transition-colors">
                Subject View
                </button>
            </div>
            <h1 className="text-4xl font-bold text-white">Dose</h1>
        </div>
        

        {/* App Name */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <Button variant="secondary" className="bg-gray-600 text-white hover:bg-gray-500">
              Choose Subject
            </Button>
            <Button variant="outline" className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              + New Subject
            </Button>
          </div>
          
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Patient Profile and Adherence */}
        <div className="space-y-6">
          {/* Patient Profile Card */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Patient Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-10">
              {/* Patient Details */}
              <div className="space-y-3 w-1/3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Subject ID:</span>
                  <span className="text-white font-medium">{subjectData.subjectId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">First Name:</span>
                  <span className="text-white font-medium">{subjectData.firstName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Last Name:</span>
                  <span className="text-white font-medium">{subjectData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Age:</span>
                  <span className="text-white font-medium">{subjectData.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Race:</span>
                  <span className="text-white font-medium">{subjectData.race}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Weight:</span>
                  <span className="text-white font-medium">{subjectData.weight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Height:</span>
                  <span className="text-white font-medium">{subjectData.height}</span>
                </div>
              </div>
              <div className="space-y-6 w-2/3 justify-center"> 
              {/* Prescription */}
              <div className="space-y-3">
                <h3 className="text-white font-semibold text-lg">Prescription</h3>
                <div className="text-gray-300">
                  {subjectData.prescription.dosesPerDay} doses/day, {subjectData.prescription.pillsPerDose} pills/dose
                </div>
              </div>

              {/* Dosing Windows */}
              <div className="space-y-3">
                <h3 className="text-white font-semibold text-lg">Dosing Windows</h3>
                <div className="space-y-2">
                  {subjectData.dosingWindows.map((window, index) => (
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
                <CircularGauge percentage={stats.adherence} />
              </div>
                
              
              </div>
            </CardContent>
          </Card>

          {/* Adherence Calendar - Full Width */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold">Adherence Calendar</CardTitle>
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
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={pillCountData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    domain={[20, 50]}
                    ticks={[20, 30, 40, 50]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#374151', 
                      border: '1px solid #4B5563',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Event Log Table */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold">Event Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
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
                      <div className="flex items-center space-x-2">
                        <span>Dose Size</span>
                        <select
                          value={doseSizeFilter}
                          onChange={(e) => setDoseSizeFilter(e.target.value)}
                          className="bg-gray-600 text-white text-xs px-2 py-1 rounded border-gray-500"
                        >
                          {doseSizeOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-300">Pill Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event, index) => (
                    <TableRow key={index} className="border-gray-600 hover:bg-gray-600">
                      <TableCell className="text-white">{event.date}</TableCell>
                      <TableCell className="text-white">{event.time}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          event.timeliness === 'On time' 
                            ? 'bg-gray-600 text-gray-300' 
                            : 'bg-red-500 text-white'
                        }`}>
                          {event.timeliness === 'On time' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {event.timeliness}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          event.doseSize === 2 
                            ? 'bg-gray-600 text-gray-300' 
                            : 'bg-red-500 text-white'
                        }`}>
                          <Pill className="w-3 h-3 mr-1" />
                          {event.doseSize}
                        </span>
                      </TableCell>
                      <TableCell className="text-white">{event.pillCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
