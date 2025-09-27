'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, User } from 'lucide-react'

export interface Subject {
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
  dosingWindows: Array<{
    start: string
    end: string
  }>
  currAdherenceScore: number
  pillWeight: number
}

interface SubjectDropdownProps {
  subjects: Subject[]
  selectedSubject: Subject | null
  onSubjectSelect: (subject: Subject) => void
  placeholder?: string
}

export default function SubjectDropdown({ 
  subjects, 
  selectedSubject, 
  onSubjectSelect, 
  placeholder = "Choose Subject" 
}: SubjectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSubjectSelect = (subject: Subject) => {
    onSubjectSelect(subject)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="secondary"
        className="bg-gray-600 text-white hover:bg-gray-500 min-w-[200px] justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span className="truncate">
            {selectedSubject 
              ? `${selectedSubject.firstName} ${selectedSubject.lastName}` 
              : placeholder
            }
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {subjects.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No subjects available
            </div>
          ) : (
            subjects.map((subject) => (
              <button
                key={subject.subjectId}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                onClick={() => handleSubjectSelect(subject)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {subject.firstName} {subject.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {subject.subjectId}
                      </div>
                    </div>
                  </div>
                  {selectedSubject?.subjectId === subject.subjectId && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
