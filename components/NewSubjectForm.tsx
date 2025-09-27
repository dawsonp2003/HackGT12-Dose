'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Plus, Minus } from 'lucide-react'

interface DosingWindow {
  start: string
  end: string
}

interface SubjectData {
  subjectId: string
  firstName: string
  lastName: string
  age: number
  sex: string
  race: string
  weight: string
  height: string
  prescription: {
    dosesPerDay: number
    pillsPerDose: number
    totalPillsPrescribed: number
  }
  dosingWindows: DosingWindow[]
}

interface NewSubjectFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (subjectData: SubjectData) => void
}

export default function NewSubjectForm({ isOpen, onClose, onSubmit }: NewSubjectFormProps) {
  const [formData, setFormData] = useState<SubjectData>({
    subjectId: '',
    firstName: '',
    lastName: '',
    age: 0,
    sex: '',
    race: '',
    weight: '',
    height: '',
    prescription: {
      dosesPerDay: 1,
      pillsPerDose: 1,
      totalPillsPrescribed: 30
    },
    dosingWindows: [{ start: '08:00', end: '08:30' }]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update dosing windows when dosesPerDay changes
  useEffect(() => {
    const currentWindows = formData.dosingWindows
    const newDosesPerDay = formData.prescription.dosesPerDay
    
    if (newDosesPerDay > currentWindows.length) {
      // Add new windows
      const newWindows = Array.from({ length: newDosesPerDay - currentWindows.length }, (_, index) => ({
        start: '08:00',
        end: '08:30'
      }))
      setFormData(prev => ({
        ...prev,
        dosingWindows: [...currentWindows, ...newWindows]
      }))
    } else if (newDosesPerDay < currentWindows.length) {
      // Remove excess windows
      setFormData(prev => ({
        ...prev,
        dosingWindows: currentWindows.slice(0, newDosesPerDay)
      }))
    }
  }, [formData.prescription.dosesPerDay])

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof SubjectData],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleDosingWindowChange = (index: number, field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      dosingWindows: prev.dosingWindows.map((window, i) => 
        i === index ? { ...window, [field]: value } : window
      )
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.subjectId.trim()) newErrors.subjectId = 'Subject ID is required'
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (formData.age <= 0) newErrors.age = 'Age must be greater than 0'
    if (!formData.sex.trim()) newErrors.sex = 'Sex is required'
    if (!formData.race.trim()) newErrors.race = 'Race is required'
    if (!formData.weight.trim()) newErrors.weight = 'Weight is required'
    if (!formData.height.trim()) newErrors.height = 'Height is required'
    if (formData.prescription.dosesPerDay <= 0) newErrors['prescription.dosesPerDay'] = 'Doses per day must be greater than 0'
    if (formData.prescription.pillsPerDose <= 0) newErrors['prescription.pillsPerDose'] = 'Pills per dose must be greater than 0'
    if (formData.prescription.totalPillsPrescribed <= 0) newErrors['prescription.totalPillsPrescribed'] = 'Total pills prescribed must be greater than 0'

    // Validate dosing windows
    formData.dosingWindows.forEach((window, index) => {
      if (!window.start) newErrors[`dosingWindow_${index}_start`] = 'Start time is required'
      if (!window.end) newErrors[`dosingWindow_${index}_end`] = 'End time is required'
      if (window.start && window.end && window.start >= window.end) {
        newErrors[`dosingWindow_${index}_end`] = 'End time must be after start time'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
      onClose()
    }
  }

  const handleClose = () => {
    setFormData({
      subjectId: '',
      firstName: '',
      lastName: '',
      age: 0,
      sex: '',
      race: '',
      weight: '',
      height: '',
      prescription: {
        dosesPerDay: 1,
        pillsPerDose: 1,
        totalPillsPrescribed: 30
      },
      dosingWindows: [{ start: '08:00', end: '08:30' }]
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Add New Subject</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subject ID *</label>
                  <input
                    type="text"
                    value={formData.subjectId}
                    onChange={(e) => handleInputChange('subjectId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter subject ID"
                  />
                  {errors.subjectId && <p className="text-red-500 text-xs mt-1">{errors.subjectId}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter first name"
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter last name"
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Age *</label>
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter age"
                    min="1"
                  />
                  {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sex *</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => handleInputChange('sex', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.sex && <p className="text-red-500 text-xs mt-1">{errors.sex}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Race *</label>
                  <select
                    value={formData.race}
                    onChange={(e) => handleInputChange('race', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select race</option>
                    <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                    <option value="Asian">Asian</option>
                    <option value="Black or African American">Black or African American</option>
                    <option value="Pacific Islander">Pacific Islander</option>
                    <option value="White">White</option>
                  </select>
                  {errors.race && <p className="text-red-500 text-xs mt-1">{errors.race}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Weight *</label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 70 kg"
                  />
                  {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Height *</label>
                  <input
                    type="text"
                    value={formData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 180 cm"
                  />
                  {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
                </div>
              </div>
            </div>

            {/* Prescription Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Prescription Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Doses Per Day *</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('prescription.dosesPerDay', Math.max(1, formData.prescription.dosesPerDay - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="number"
                      value={formData.prescription.dosesPerDay}
                      onChange={(e) => handleInputChange('prescription.dosesPerDay', parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      min="1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('prescription.dosesPerDay', formData.prescription.dosesPerDay + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {errors['prescription.dosesPerDay'] && <p className="text-red-500 text-xs mt-1">{errors['prescription.dosesPerDay']}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pills Per Dose *</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('prescription.pillsPerDose', Math.max(1, formData.prescription.pillsPerDose - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="number"
                      value={formData.prescription.pillsPerDose}
                      onChange={(e) => handleInputChange('prescription.pillsPerDose', parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      min="1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('prescription.pillsPerDose', formData.prescription.pillsPerDose + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {errors['prescription.pillsPerDose'] && <p className="text-red-500 text-xs mt-1">{errors['prescription.pillsPerDose']}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Pills Prescribed *</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('prescription.totalPillsPrescribed', Math.max(1, formData.prescription.totalPillsPrescribed - 10))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="number"
                      value={formData.prescription.totalPillsPrescribed}
                      onChange={(e) => handleInputChange('prescription.totalPillsPrescribed', parseInt(e.target.value) || 1)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      min="1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('prescription.totalPillsPrescribed', formData.prescription.totalPillsPrescribed + 10)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {errors['prescription.totalPillsPrescribed'] && <p className="text-red-500 text-xs mt-1">{errors['prescription.totalPillsPrescribed']}</p>}
                </div>
              </div>
            </div>

            {/* Dosing Windows */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dosing Windows ({formData.dosingWindows.length})</h3>
              <div className="space-y-3">
                {formData.dosingWindows.map((window, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-md">
                    <span className="text-sm font-medium w-16">Window {index + 1}:</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={window.start}
                        onChange={(e) => handleDosingWindowChange(index, 'start', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors[`dosingWindow_${index}_start`] && <p className="text-red-500 text-xs mt-1">{errors[`dosingWindow_${index}_start`]}</p>}
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={window.end}
                        onChange={(e) => handleDosingWindowChange(index, 'end', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors[`dosingWindow_${index}_end`] && <p className="text-red-500 text-xs mt-1">{errors[`dosingWindow_${index}_end`]}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">
                Add Subject
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
