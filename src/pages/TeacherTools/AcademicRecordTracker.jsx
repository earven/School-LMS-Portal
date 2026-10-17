import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useStudents } from '../../context/StudentContext';
import { useSections } from '../../context/SectionContext';
import { db } from '../../firebase';
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import './AcademicRecordTracker.css';

const DOCUMENT_TYPES = [
  'Form 137 / SF10 (Permanent Record)',
  'Report Card / SF9 (Progress Report)',
  'Certificate of Good Moral Character',
  'Certificate of Enrollment',
  'Certificate of Graduation',
  'Diploma',
  'Other (specify)'
];

const STATUS_OPTIONS = {
  In: [
    { value: 'Pending Submission', label: 'Pending Submission' },
    { value: 'Received', label: 'Received' },
    { value: 'Missing Information', label: 'Missing Information' },
    { value: 'Cancelled', label: 'Cancelled' }
  ],
  Out: [
    { value: 'Pending Request', label: 'Pending Request' },
    { value: 'Processing', label: 'Processing' },
    { value: 'Ready for Release', label: 'Ready for Release' },
    { value: 'Released', label: 'Released' },
    { value: 'Cancelled', label: 'Cancelled' }
  ]
};

const AcademicRecordTracker = () => {
  const { user } = useAuth();
  const { settings, sessionAcademicYear } = useSettings();
  const { students } = useStudents();
  const { sections } = useSections();

  const activeAcademicYear = sessionAcademicYear || settings?.academicYear || '';

  // State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [academicYearFilter, setAcademicYearFilter] = useState(activeAcademicYear);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal / Form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  
  // Form fields
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [transactionType, setTransactionType] = useState('In');
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [customDocType, setCustomDocType] = useState('');
  const [party, setParty] = useState('');
  const [purpose, setPurpose] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Pending Submission');
  const [remarks, setRemarks] = useState('');

  // Fetch transmittal logs
  useEffect(() => {
    if (!activeAcademicYear) return;
    
    setLoadingLogs(true);
    const q = query(
      collection(db, 'academic_document_logs'),
      where('academicYear', '==', academicYearFilter)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLogs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by date descending, then createdAt descending
        fetchedLogs.sort((a, b) => {
          const dateDiff = new Date(b.date || '') - new Date(a.date || '');
          if (dateDiff !== 0) return dateDiff;
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
        setLogs(fetchedLogs);
        setLoadingLogs(false);
      },
      (err) => {
        console.error('Error fetching academic document logs:', err);
        setLoadingLogs(false);
      }
    );

    return () => unsubscribe();
  }, [academicYearFilter, activeAcademicYear]);

  // Section names mapping
  const sectionNameMap = useMemo(() => {
    const map = {};
    sections.forEach((sec) => {
      map[sec.id] = `${sec.gradeLevel} - ${sec.name}`;
    });
    return map;
  }, [sections]);

  // Search students for form selector
  const filteredStudentsForSearch = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const queryStr = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.id.includes(queryStr) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(queryStr)
    );
  }, [studentSearch, students]);

  // Filter logs for the table display
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesType = typeFilter === 'All' || log.type === typeFilter;
      const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
      const studentNameLower = (log.studentName || '').toLowerCase();
      const studentLrnLower = (log.studentId || '').toLowerCase();
      const docTypeLower = (log.documentType || '').toLowerCase();
      const partyLower = (log.party || '').toLowerCase();
      const queryLower = searchTerm.toLowerCase();

      const matchesSearch =
        !searchTerm ||
        studentNameLower.includes(queryLower) ||
        studentLrnLower.includes(queryLower) ||
        docTypeLower.includes(queryLower) ||
        partyLower.includes(queryLower);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [logs, typeFilter, statusFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const incoming = logs.filter((l) => l.type === 'In').length;
    const outgoing = logs.filter((l) => l.type === 'Out').length;
    const pending = logs.filter(
      (l) => l.status.startsWith('Pending') || l.status === 'Processing'
    ).length;
    return { total, incoming, outgoing, pending };
  }, [logs]);

  // Handle transaction type change in form
  const handleTypeChange = (newType) => {
    setTransactionType(newType);
    // Auto-update status to match the selected type defaults
    const defaultStatus = STATUS_OPTIONS[newType][0].value;
    setStatus(defaultStatus);
  };

  const handleOpenAdd = () => {
    setEditingLog(null);
    setSelectedStudent(null);
    setStudentSearch('');
    setTransactionType('In');
    setDocumentType(DOCUMENT_TYPES[0]);
    setCustomDocType('');
    setParty('');
    setPurpose('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setStatus(STATUS_OPTIONS.In[0].value);
    setRemarks('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (log) => {
    setEditingLog(log);
    
    // Find linked student
    const stud = students.find((s) => s.id === log.studentId);
    setSelectedStudent(stud || {
      id: log.studentId,
      firstName: log.studentName.split(', ')[1] || '',
      lastName: log.studentName.split(', ')[0] || log.studentName,
      gradeLevel: log.studentGradeLevel || '',
      sectionId: ''
    });
    setStudentSearch('');
    setTransactionType(log.type);
    
    if (DOCUMENT_TYPES.includes(log.documentType)) {
      setDocumentType(log.documentType);
      setCustomDocType('');
    } else {
      setDocumentType('Other (specify)');
      setCustomDocType(log.documentType);
    }
    
    setParty(log.party || '');
    setPurpose(log.purpose || '');
    setTransactionDate(log.date || new Date().toISOString().split('T')[0]);
    setStatus(log.status);
    setRemarks(log.remarks || '');
    setShowFormModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Please select a student.');
      return;
    }

    const finalDocType = documentType === 'Other (specify)' ? customDocType : documentType;
    if (!finalDocType.trim()) {
      alert('Please specify the document type.');
      return;
    }

    const payload = {
      studentId: selectedStudent.id,
      studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName} ${selectedStudent.middleName || ''}`.trim(),
      studentGradeLevel: selectedStudent.gradeLevel || '',
      studentSectionName: sectionNameMap[selectedStudent.sectionId] || '',
      type: transactionType,
      documentType: finalDocType,
      party,
      purpose,
      date: transactionDate,
      status,
      remarks,
      handledBy: user.displayName || user.email,
      academicYear: academicYearFilter,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingLog) {
        // Edit log
        await updateDoc(doc(db, 'academic_document_logs', editingLog.id), payload);
        alert('Transmittal log updated successfully!');
      } else {
        // Add log
        await addDoc(collection(db, 'academic_document_logs'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        alert('Transmittal log recorded successfully!');
      }
      setShowFormModal(false);
    } catch (err) {
      console.error('Error saving transmittal log:', err);
      alert('Failed to save transmittal log.');
    }
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this transmittal log? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'academic_document_logs', logId));
      alert('Transmittal log deleted.');
    } catch (err) {
      console.error('Error deleting transmittal log:', err);
      alert('Failed to delete transmittal log.');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'Date',
      'Type',
      'LRN',
      'Student Name',
      'Grade & Section',
      'Document',
      'Party',
      'Purpose',
      'Status',
      'Remarks',
      'Handled By'
    ];

    const rows = filteredLogs.map((log) => [
      log.date || '',
      log.type === 'In' ? 'Incoming (In)' : 'Outgoing (Out)',
      log.studentId || '',
      `"${log.studentName || ''}"`,
      `"${log.studentGradeLevel || ''} - ${log.studentSectionName || ''}"`,
      `"${log.documentType || ''}"`,
      `"${log.party || ''}"`,
      `"${log.purpose || ''}"`,
      log.status || '',
      `"${log.remarks || ''}"`,
      `"${log.handledBy || ''}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Academic_Record_Logs_${academicYearFilter}_${typeFilter}_${statusFilter}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tracker-container">
      {/* Header */}
      <div className="tracker-header">
        <div>
          <h1>Academic Record Tracker</h1>
          <p className="subtitle">School transmittals and records movement log (Admin Portal)</p>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          + Log Transmittal
        </button>
      </div>

      {/* KPI Dashboard */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Logs</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card incoming">
          <span className="stat-label">Incoming (In)</span>
          <span className="stat-value">{stats.incoming}</span>
        </div>
        <div className="stat-card outgoing">
          <span className="stat-label">Outgoing (Out)</span>
          <span className="stat-value">{stats.outgoing}</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-label">Pending / Processing</span>
          <span className="stat-value">{stats.pending}</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="toolbar-card">
        <div className="filter-group">
          <div className="filter-item">
            <label>School Year</label>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Direction</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="All">All Directions</option>
              <option value="In">Incoming (In)</option>
              <option value="Out">Outgoing (Out)</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Pending Submission">Pending Submission</option>
              <option value="Pending Request">Pending Request</option>
              <option value="Processing">Processing</option>
              <option value="Ready for Release">Ready for Release</option>
              <option value="Received">Received</option>
              <option value="Released">Released</option>
              <option value="Missing Information">Missing Information</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="filter-search-row">
          <input
            type="text"
            className="search-input"
            placeholder="Search by student, LRN, document or party..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn-secondary" onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="ledger-table-container">
        {loadingLogs ? (
          <div className="table-loader">
            <div className="spinner"></div>
            <p>Loading transmittal ledger...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No transmittal records found</h3>
            <p>Try resetting filters or log a new document transmittal.</p>
          </div>
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>LRN & Student Name</th>
                <th>Grade / Section</th>
                <th>Document Details</th>
                <th>Party / Institution</th>
                <th>Purpose</th>
                <th>Status</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="date-cell">{log.date}</td>
                  <td>
                    <span className={`direction-badge ${log.type}`}>
                      {log.type === 'In' ? 'IN' : 'OUT'}
                    </span>
                  </td>
                  <td className="student-cell">
                    <strong>{log.studentName}</strong>
                    <span className="lrn-sub">{log.studentId}</span>
                  </td>
                  <td>
                    <span className="grade-badge">
                      {log.studentGradeLevel ? `${log.studentGradeLevel}` : '—'}
                    </span>
                    <span className="section-sub">
                      {log.studentSectionName || 'No Section'}
                    </span>
                  </td>
                  <td className="doc-cell">
                    <strong>{log.documentType}</strong>
                    {log.remarks && <p className="remarks-hint">{log.remarks}</p>}
                  </td>
                  <td className="party-cell">{log.party || '—'}</td>
                  <td className="purpose-cell">{log.purpose || '—'}</td>
                  <td>
                    <span className={`status-badge status-${log.status.toLowerCase().replace(/ /g, '-')}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn-edit" onClick={() => handleOpenEdit(log)}>
                      Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(log.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Form Modal */}
      {showFormModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingLog ? 'Edit Transmittal Log' : 'Log New Document Transmittal'}</h2>
              <button className="close-btn" onClick={() => setShowFormModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              {/* Type Selection */}
              <div className="form-group-row">
                <label className="input-label">Direction</label>
                <div className="type-toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${transactionType === 'In' ? 'active In' : ''}`}
                    onClick={() => handleTypeChange('In')}
                  >
                    Incoming Record (In)
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${transactionType === 'Out' ? 'active Out' : ''}`}
                    onClick={() => handleTypeChange('Out')}
                  >
                    Outgoing Record (Out)
                  </button>
                </div>
              </div>

              {/* Student Search Selector */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="input-label">Select Student *</label>
                {selectedStudent ? (
                  <div className="selected-student-card">
                    <div>
                      <strong>
                        {selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.middleName || ''}
                      </strong>
                      <span className="details-sub">
                        LRN: {selectedStudent.id} | {selectedStudent.gradeLevel} {selectedStudent.sectionId ? `(${sectionNameMap[selectedStudent.sectionId] || ''})` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-link-remove"
                      onClick={() => setSelectedStudent(null)}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type LRN or Student Name..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                    />
                    {showStudentDropdown && filteredStudentsForSearch.length > 0 && (
                      <div className="student-search-dropdown">
                        {filteredStudentsForSearch.map((s) => (
                          <div
                            key={s.id}
                            className="student-dropdown-item"
                            onClick={() => {
                              setSelectedStudent(s);
                              setShowStudentDropdown(false);
                            }}
                          >
                            <span className="dropdown-name">
                              {s.lastName}, {s.firstName}
                            </span>
                            <span className="dropdown-lrn">
                              LRN: {s.id} | {s.gradeLevel}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {showStudentDropdown && studentSearch.trim() && filteredStudentsForSearch.length === 0 && (
                      <div className="student-search-dropdown">
                        <div className="student-dropdown-no-results">No students found</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="form-grid-2">
                {/* Document Type */}
                <div className="form-group">
                  <label className="input-label">Document *</label>
                  <select
                    className="form-input"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Document Specify */}
                {documentType === 'Other (specify)' && (
                  <div className="form-group">
                    <label className="input-label">Specify Document Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Certificate of Graduation"
                      value={customDocType}
                      onChange={(e) => setCustomDocType(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="form-grid-2">
                {/* Receiving/Submitting Party */}
                <div className="form-group">
                  <label className="input-label">
                    {transactionType === 'In' ? 'Submitting Party / Previous School' : 'Receiving Party / Requestor'}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={transactionType === 'In' ? 'e.g. Quezon City High School' : 'e.g. Mother / FEU University'}
                    value={party}
                    onChange={(e) => setParty(e.target.value)}
                  />
                </div>

                {/* Purpose */}
                <div className="form-group">
                  <label className="input-label">Purpose</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Transfer, Employment, Scholarship"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                {/* Date */}
                <div className="form-group">
                  <label className="input-label">Date of Transaction</label>
                  <input
                    type="date"
                    className="form-input"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
                </div>

                {/* Status */}
                <div className="form-group">
                  <label className="input-label">Status</label>
                  <select
                    className="form-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS[transactionType].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div className="form-group">
                <label className="input-label">Remarks</label>
                <textarea
                  className="form-input textarea-input"
                  placeholder="Additional details (e.g. courier tracking numbers, dry seal, notes...)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowFormModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingLog ? 'Save Changes' : 'Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicRecordTracker;
