import { useReview } from '../contexts/ReviewContext'
import { Review } from '../types'
import './FilterPanel.css'

const FilterPanel: React.FC = () => {
  const { filters, setFilters } = useReview()

  const handleStatusChange = (status: Review['status'], checked: boolean) => {
    const currentStatuses = filters.status || []
    if (checked) {
      setFilters({ ...filters, status: [...currentStatuses, status] })
    } else {
      setFilters({
        ...filters,
        status: currentStatuses.filter((s) => s !== status),
      })
    }
  }

  const handlePriorityChange = (priority: Review['priority'], checked: boolean) => {
    const currentPriorities = filters.priority || []
    if (checked) {
      setFilters({ ...filters, priority: [...currentPriorities, priority] })
    } else {
      setFilters({
        ...filters,
        priority: currentPriorities.filter((p) => p !== priority),
      })
    }
  }

  return (
    <div className="filter-panel">
      <h3 className="filter-title">Filters</h3>
      <div className="filter-section">
        <h4 className="filter-section-title">Status</h4>
        {(['draft', 'open', 'in-progress', 'approved', 'rejected'] as Review['status'][]).map((status) => (
          <label key={status} className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.status?.includes(status) || false}
              onChange={(e) => handleStatusChange(status, e.target.checked)}
            />
            <span>{status}</span>
          </label>
        ))}
      </div>
      <div className="filter-section">
        <h4 className="filter-section-title">Priority</h4>
        {(['low', 'medium', 'high', 'critical'] as Review['priority'][]).map((priority) => (
          <label key={priority} className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.priority?.includes(priority) || false}
              onChange={(e) => handlePriorityChange(priority, e.target.checked)}
            />
            <span>{priority}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default FilterPanel

