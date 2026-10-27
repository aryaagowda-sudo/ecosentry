import React, { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  X,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Trash2,
  AlertCircle,
  HelpCircle,
  Filter
} from 'lucide-react'
import {
  STANDARD_TOOLBOX_EVENTS,
  INCIDENT_CATEGORIES,
  SEVERITY_LEVELS,
  RECOMMENDED_CUSTOM_EMOJIS
} from '../../data/toolboxEvents'

export default function IncidentToolbox({
  isOpen,
  onToggle,
  onStartDrag,
  customItems = [],
  onAddCustomItem,
  onDeleteCustomItem
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCustomModal, setShowCustomModal] = useState(false)

  // Custom event creation form state
  const [customTitle, setCustomTitle] = useState('')
  const [customEmoji, setCustomEmoji] = useState('⚠️')
  const [customCategory, setCustomCategory] = useState('threat')
  const [customSeverity, setCustomSeverity] = useState('high')
  const [customDescription, setCustomDescription] = useState('')
  const [customError, setCustomError] = useState('')

  // Combine standard events with user-created custom items
  const allItems = useMemo(() => {
    return [...STANDARD_TOOLBOX_EVENTS, ...customItems]
  }, [customItems])

  // Filter items based on category and search query
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchDesc = item.defaultDescription?.toLowerCase().includes(q)
        const matchCat = item.categoryLabel?.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchCat) return false
      }
      return true
    })
  }, [allItems, selectedCategory, searchQuery])

  // Handle saving new custom event type
  const handleSaveCustomEvent = (e) => {
    e.preventDefault()
    if (!customTitle.trim()) {
      setCustomError('Please enter an event title.')
      return
    }

    const newItem = {
      id: `custom-${Date.now()}`,
      type: `custom_${customTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: customTitle.trim(),
      icon: customEmoji || '⚠️',
      category: customCategory,
      categoryLabel: INCIDENT_CATEGORIES.find((c) => c.id === customCategory)?.label || 'General',
      defaultSeverity: customSeverity,
      defaultDescription:
        customDescription.trim() || `Field observation for ${customTitle.trim()}.`,
      color: SEVERITY_LEVELS.find((s) => s.id === customSeverity)?.color || '#C94232',
      isCustom: true
    }

    onAddCustomItem(newItem)

    // Reset and close
    setCustomTitle('')
    setCustomEmoji('⚠️')
    setCustomCategory('threat')
    setCustomSeverity('high')
    setCustomDescription('')
    setCustomError('')
    setShowCustomModal(false)
  }

  return (
    <aside
      className={`incident-toolbox-container ${isOpen ? 'expanded' : 'collapsed'}`}
      aria-label="Incident Toolbox"
    >
      {/* Collapsed toggle strip */}
      {!isOpen && (
        <button
          className="toolbox-collapsed-tab"
          onClick={onToggle}
          title="Open Incident Toolbox (Drag & Drop)"
          aria-label="Open Incident Toolbox"
        >
          <div className="tab-icon-row">
            <span className="tab-dot" />
            <span className="tab-vertical-text">INCIDENT TOOLBOX</span>
          </div>
          <ChevronLeft size={14} className="tab-chevron" />
        </button>
      )}

      {/* Expanded full panel */}
      {isOpen && (
        <div className="toolbox-panel-inner">
          {/* 1. Header with Title & Collapse */}
          <div className="toolbox-header">
            <div className="toolbox-header-title">
              <span className="toolbox-live-dot" />
              <h3>INCIDENT TOOLBOX</h3>
              <span className="toolbox-badge">{filteredItems.length}</span>
            </div>
            <button
              className="btn-toolbox-collapse"
              onClick={onToggle}
              title="Collapse Incident Toolbox"
              aria-label="Collapse Incident Toolbox"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* 2. Drag Guidance Notice */}
          <div className="toolbox-instruction-banner">
            <GripVertical size={13} className="instruction-icon" />
            <span>Click & drag any event card onto the 3D terrain to log an incident.</span>
          </div>

          {/* 3. Search Bar */}
          <div className="toolbox-search-wrapper">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search incident types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="toolbox-search-input"
            />
            {searchQuery && (
              <button
                className="btn-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* 4. Category Tabs */}
          <div className="toolbox-category-tabs">
            {INCIDENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`category-tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 5. Draggable Cards List */}
          <div className="toolbox-card-list">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`toolbox-event-card severity-${item.defaultSeverity}`}
                onPointerDown={(e) => {
                  // Only initiate drag on left mouse click or touch
                  if (e.button !== undefined && e.button !== 0) return
                  onStartDrag(item, e)
                }}
                title={`Drag "${item.title}" onto 3D forest map • Severity: ${item.defaultSeverity}`}
                role="button"
                tabIndex={0}
              >
                <div className="card-drag-handle">
                  <GripVertical size={13} />
                </div>

                <div className="card-emoji-box">
                  <span className="card-emoji">{item.icon}</span>
                </div>

                <div className="card-info-col">
                  <div className="card-title-row">
                    <span className="card-title-text">{item.title}</span>
                    {item.isCustom && (
                      <button
                        className="btn-delete-custom-card"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteCustomItem?.(item.id)
                        }}
                        title="Delete custom event type"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <div className="card-meta-row">
                    <span className={`card-severity-pill ${item.defaultSeverity}`}>
                      {item.defaultSeverity}
                    </span>
                    <span className="card-category-hint">
                      {item.categoryLabel || item.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="toolbox-empty-state">
                <AlertCircle size={18} style={{ color: 'var(--text-muted)' }} />
                <span>No event types matching "{searchQuery}"</span>
                <button
                  className="btn-link-action"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('all')
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Custom Event Creator Action Card */}
            <div
              className="toolbox-event-card custom-add-card"
              onClick={() => setShowCustomModal(true)}
              role="button"
              tabIndex={0}
              title="Create a custom event type"
            >
              <div className="card-emoji-box add">
                <Plus size={16} />
              </div>
              <div className="card-info-col">
                <span className="card-title-text">Create Custom Event</span>
                <span className="card-desc-snippet">
                  Define title, custom icon, category & severity
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Custom Event Creation Dialog Modal */}
      {showCustomModal && (
        <div className="toolbox-modal-overlay" onClick={() => setShowCustomModal(false)}>
          <div className="toolbox-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="toolbox-modal-header">
              <div className="header-title-group">
                <Plus size={15} style={{ color: 'var(--accent-green)' }} />
                <h4>Create Custom Event Type</h4>
              </div>
              <button
                className="btn-modal-close"
                onClick={() => setShowCustomModal(false)}
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomEvent} className="toolbox-modal-form">
              {customError && <div className="form-error-banner">{customError}</div>}

              {/* Event Title */}
              <div className="form-field-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Poaching Snare Wire, Drone Sighting..."
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value)
                    setCustomError('')
                  }}
                  required
                  autoFocus
                />
              </div>

              {/* Emoji Icon Picker */}
              <div className="form-field-group">
                <label>Event Icon / Emoji</label>
                <div className="emoji-quick-picker">
                  {RECOMMENDED_CUSTOM_EMOJIS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      className={`emoji-btn ${customEmoji === emoji ? 'selected' : ''}`}
                      onClick={() => setCustomEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value.slice(0, 2))}
                    className="custom-emoji-input"
                    title="Enter custom emoji"
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Category & Severity Grid */}
              <div className="form-grid-2">
                <div className="form-field-group">
                  <label>Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  >
                    <option value="threat">Poaching & Threats</option>
                    <option value="wildlife">Wildlife & Welfare</option>
                    <option value="operations">Operations & Hardware</option>
                    <option value="general">General & Patrol</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Default Severity</label>
                  <select
                    value={customSeverity}
                    onChange={(e) => setCustomSeverity(e.target.value)}
                  >
                    <option value="critical">Critical (Red)</option>
                    <option value="high">High (Orange)</option>
                    <option value="medium">Medium (Yellow)</option>
                    <option value="low">Low (Blue)</option>
                    <option value="informational">Informational (Green)</option>
                  </select>
                </div>
              </div>

              {/* Default Description */}
              <div className="form-field-group">
                <label>Default Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide context or standard procedure when this event occurs..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                />
              </div>

              <div className="toolbox-modal-actions">
                <button
                  type="button"
                  className="btn-action-cancel"
                  onClick={() => setShowCustomModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-action-submit">
                  Add to Toolbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}
