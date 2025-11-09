import { useState, useEffect } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  getWeek,
  startOfISOWeek,
  endOfISOWeek,
} from 'date-fns'
import './Calendar.css'

const Calendar = ({ selectedDate, onDateSelect, markedDates = [] }) => {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [viewMode, setViewMode] = useState('month') // 'day', 'week', 'month', 'year'

  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate)
    }
  }, [selectedDate])

  const isDateMarked = (date) => {
    return markedDates.some((markedDate) => isSameDay(markedDate, date))
  }

  const renderDayView = () => {
    return (
      <div className="calendar-day-view">
        <div className="day-header">
          <button onClick={() => setCurrentDate(subDays(currentDate, 1))}>
            ←
          </button>
          <h3>{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
          <button onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            →
          </button>
        </div>
        <div className="day-content">
          <button
            className={`day-cell ${isSameDay(currentDate, selectedDate) ? 'selected' : ''} ${isDateMarked(currentDate) ? 'marked' : ''}`}
            onClick={() => onDateSelect(currentDate)}
          >
            <span className="day-number">{format(currentDate, 'd')}</span>
            <span className="day-name">{format(currentDate, 'EEEE')}</span>
          </button>
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfISOWeek(currentDate)
    const weekEnd = endOfISOWeek(currentDate)
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return (
      <div className="calendar-week-view">
        <div className="week-header">
          <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
            ←
          </button>
          <h3>
            Week {getWeek(currentDate)} - {format(weekStart, 'MMM d')} to{' '}
            {format(weekEnd, 'MMM d, yyyy')}
          </h3>
          <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
            →
          </button>
        </div>
        <div className="week-grid">
          {weekDays.map((day, idx) => (
            <button
              key={idx}
              className={`week-day-cell ${isSameDay(day, selectedDate) ? 'selected' : ''} ${isDateMarked(day) ? 'marked' : ''}`}
              onClick={() => onDateSelect(day)}
            >
              <span className="day-name">{format(day, 'EEE')}</span>
              <span className="day-number">{format(day, 'd')}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="calendar-month-view">
        <div className="month-header">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            ←
          </button>
          <h3>{format(currentDate, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            →
          </button>
        </div>
        <div className="month-weekdays">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={idx} className="weekday-header">
              {day}
            </div>
          ))}
        </div>
        <div className="month-grid">
          {days.map((day, idx) => (
            <button
              key={idx}
              className={`month-day-cell ${!isSameMonth(day, currentDate) ? 'other-month' : ''} ${isSameDay(day, selectedDate) ? 'selected' : ''} ${isDateMarked(day) ? 'marked' : ''}`}
              onClick={() => onDateSelect(day)}
            >
              {format(day, 'd')}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderYearView = () => {
    const yearStart = startOfYear(currentDate)
    const yearEnd = endOfYear(currentDate)
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })

    return (
      <div className="calendar-year-view">
        <div className="year-header">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 12))}>
            ←
          </button>
          <h3>{format(currentDate, 'yyyy')}</h3>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 12))}>
            →
          </button>
        </div>
        <div className="year-grid">
          {months.map((month, idx) => (
            <button
              key={idx}
              className={`year-month-cell ${isSameMonth(month, currentDate) ? 'current-month' : ''}`}
              onClick={() => {
                setCurrentDate(month)
                setViewMode('month')
              }}
            >
              {format(month, 'MMM')}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-container">
      <div className="calendar-view-selector">
        <button
          className={viewMode === 'day' ? 'active' : ''}
          onClick={() => setViewMode('day')}
        >
          Day
        </button>
        <button
          className={viewMode === 'week' ? 'active' : ''}
          onClick={() => setViewMode('week')}
        >
          Week
        </button>
        <button
          className={viewMode === 'month' ? 'active' : ''}
          onClick={() => setViewMode('month')}
        >
          Month
        </button>
        <button
          className={viewMode === 'year' ? 'active' : ''}
          onClick={() => setViewMode('year')}
        >
          Year
        </button>
      </div>
      <div className="calendar-content">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'year' && renderYearView()}
      </div>
      <button
        className="today-btn"
        onClick={() => {
          const today = new Date()
          setCurrentDate(today)
          onDateSelect(today)
        }}
      >
        Today
      </button>
    </div>
  )
}

export default Calendar

