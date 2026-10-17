import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useStudents } from '../../context/StudentContext';
import { useSections } from '../../context/SectionContext';
import { db } from '../../firebase';
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { generateLabLogExcel, exportLabLogsToCSV } from '../../utils/labLogGenerator';
import { buildFullName } from '../../utils/personnelName';
import './ComputerLabLogPage.css';

const PURPOSES = [
  'Research & Internet',
  'Class / Hands-on Activity',
  'Coding & Programming',
  'Document Typing & Printing',
  'Academic Remediation',
  'Free Time / Project Work',
  'Other / DepEd Portal Access'
];

const STATIONS = Array.from({ length: 40 }, (_, i) => `PC-${String(i + 1).padStart(2, '0')}`);

// Friendly audio chime synthesizer (no external audio assets required)
const playChime = (type = 'success') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'timeout') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(523.25, now + 0.12); // C5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'warn') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(329.63, now); // E4
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Audio autoplay or audio context unavailable
  }
};

const formatTime12h = (dateObj = new Date()) => {
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ComputerLabLogPage = () => {
  const { user } = useAuth();
  const { settings, sessionAcademicYear } = useSettings();
  const { students } = useStudents();
  const { sections } = useSections();

  const activeAcademicYear = sessionAcademicYear || settings?.academicYear || '';
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  // Main Mode: 'management' vs 'kiosk'
  const [viewMode, setViewMode] = useState('management');

  // Logs state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Fallback enrolment students cache for unmatched LRNs
  const [enrolmentStudents, setEnrolmentStudents] = useState([]);

  // Filter states
  const [dateFilterMode, setDateFilterMode] = useState('today'); // 'today', 'yesterday', 'this_week', 'this_month', 'all', 'custom'
  const [customStartDate, setCustomStartDate] = useState(getTodayDateStr());
  const [customEndDate, setCustomEndDate] = useState(getTodayDateStr());
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'completed'
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Kiosk / Scan state
  const [scanInput, setScanInput] = useState('');
  const [kioskPurpose, setKioskPurpose] = useState(PURPOSES[0]);
  const [kioskStation, setKioskStation] = useState('Open Workstation');
  const [activeFeedback, setActiveFeedback] = useState(null); // { type: 'timein'|'timeout'|'unknown', student, log, message }
  const [countdown, setCountdown] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Unknown LRN registration modal in Kiosk
  const [unregisteredModal, setUnregisteredModal] = useState(null); // { lrn, firstName, lastName, sectionName, gradeLevel, purpose, station }

  // Management modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    lrn: '',
    studentName: '',
    sectionName: '',
    gradeLevel: 'Grade 7',
    date: getTodayDateStr(),
    timeIn: formatTime12h(),
    timeOut: '',
    purpose: PURPOSES[0],
    stationNumber: 'Open Workstation',
    remarks: ''
  });

  const scanInputRef = useRef(null);
  const resetTimerRef = useRef(null);

  // Clock ticker for Kiosk Mode
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Direct masterlist across all academic years
  const [masterlistStudents, setMasterlistStudents] = useState([]);

  // Fetch all students directly from Firestore (ensures all learners are available regardless of active AY filter)
  useEffect(() => {
    if (!user || !user.role || user.role === 'pending') return;

    const unsub = onSnapshot(collection(db, 'students'), (snapshot) => {
      const list = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          docId: docSnap.id,
          id: d.id || docSnap.id,
          ...d,
          lrn: d.lrn || d.id || docSnap.id
        };
      });
      setMasterlistStudents(list);
    }, (err) => {
      console.warn("Direct students collection snapshot fallback notice:", err);
    });

    return () => unsub();
  }, [user]);

  // Fetch enrolment students as fallback
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'enrolment_students'), (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        lrn: d.data().lrn || d.id,
        ...d.data()
      }));
      setEnrolmentStudents(list);
    });
    return () => unsub();
  }, []);

  // Fetch computer lab logs from Firestore
  useEffect(() => {
    setLoadingLogs(true);
    let q;
    if (activeAcademicYear) {
      q = query(
        collection(db, 'computer_lab_logs'),
        where('academicYear', '==', activeAcademicYear)
      );
    } else {
      q = query(collection(db, 'computer_lab_logs'));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        // Sort descending: active in lab first, then newest date & timeIn
        fetched.sort((a, b) => {
          if (!a.timeOut && b.timeOut) return -1;
          if (a.timeOut && !b.timeOut) return 1;
          const diff = (b.date || '').localeCompare(a.date || '');
          if (diff !== 0) return diff;
          return (b.timeIn || '').localeCompare(a.timeIn || '');
        });

        setLogs(fetched);
        setLoadingLogs(false);
      },
      (err) => {
        console.error('Failed to load lab logs:', err);
        setLoadingLogs(false);
      }
    );

    return () => unsubscribe();
  }, [activeAcademicYear]);

  // Section name lookup map
  const sectionMap = useMemo(() => {
    const map = new Map();
    sections.forEach((sec) => {
      map.set(sec.id, sec.name);
    });
    return map;
  }, [sections]);

  // Flexible LRN matching supporting numbers, strings, dashes, prefixes, and sample IDs
  const matchesLrn = useCallback((st, queryStr) => {
    if (!st || !queryStr) return false;
    const cleanQuery = String(queryStr).trim().toLowerCase();
    const queryDigits = cleanQuery.replace(/\D/g, '');

    const candidates = [
      st.lrn,
      st.id,
      st.docId,
      st.studentId,
      st.learnerReferenceNumber
    ].filter(Boolean).map((v) => String(v).trim().toLowerCase());

    for (const cand of candidates) {
      if (cand === cleanQuery) return true;
      const candDigits = cand.replace(/\D/g, '');
      if (queryDigits && candDigits && candDigits === queryDigits) return true;
      if (cand.includes('-')) {
        const parts = cand.split('-');
        const lastPart = parts[parts.length - 1];
        if (lastPart === cleanQuery) return true;
        if (queryDigits && lastPart.replace(/\D/g, '') === queryDigits) return true;
      }
    }
    return false;
  }, []);

  // Format learner object uniformly
  const formatLearnerObject = useCallback((st) => {
    if (!st) return null;
    const fullName = buildFullName({
      lastName: st.lastName,
      firstName: st.firstName,
      middleName: st.middleName,
      nameExtension: st.extension || st.nameExtension
    }) || st.fullName || `${st.lastName || ''}, ${st.firstName || ''}`.trim() || 'Learner';

    let secName = st.sectionName || st.section || st.targetSection;
    if (!secName && st.sectionId) {
      const sec = sections.find((s) => s.id === st.sectionId || s.name === st.sectionId);
      secName = sec ? sec.name : st.sectionId;
    }

    let resolvedLrn = String(st.lrn || st.id || st.docId || '').trim();
    if (resolvedLrn.includes('-')) {
      const parts = resolvedLrn.split('-');
      const last = parts[parts.length - 1];
      if (/^\d{6,}$/.test(last)) {
        resolvedLrn = last;
      }
    }

    return {
      id: st.id || st.docId,
      docId: st.docId || st.id,
      lrn: resolvedLrn,
      fullName,
      firstName: st.firstName || '',
      lastName: st.lastName || '',
      sectionName: secName || 'Unassigned',
      gradeLevel: st.gradeLevel || st.gradeToEnroll || 'Grade 7',
      photoUrl: st.photoUrl || null,
      gender: st.gender || ''
    };
  }, [sections]);

  // In-memory fast learner lookup
  const findLearnerByLrn = useCallback((lrnQuery) => {
    const cleanLrn = String(lrnQuery || '').trim();
    if (!cleanLrn) return null;

    // 1. Direct masterlist across all school years
    const match1 = masterlistStudents.find((s) => matchesLrn(s, cleanLrn));
    if (match1) return formatLearnerObject(match1);

    // 2. Active students from context
    const match2 = students.find((s) => matchesLrn(s, cleanLrn));
    if (match2) return formatLearnerObject(match2);

    // 3. Enrolment students list
    const match3 = enrolmentStudents.find((s) => matchesLrn(s, cleanLrn));
    if (match3) return formatLearnerObject(match3);

    return null;
  }, [masterlistStudents, students, enrolmentStudents, matchesLrn, formatLearnerObject]);

  // Comprehensive async learner resolution with direct Firestore queries
  const resolveLearnerAsync = useCallback(async (lrnQuery) => {
    // 1. Check in-memory first (instant)
    const inMem = findLearnerByLrn(lrnQuery);
    if (inMem) return inMem;

    const cleanLrn = String(lrnQuery || '').trim();
    const cleanDigits = cleanLrn.replace(/\D/g, '');

    try {
      // 2. Query students collection by 'lrn' field
      let snap = await getDocs(query(collection(db, 'students'), where('lrn', '==', cleanLrn), limit(1)));
      if (snap.empty && cleanDigits) {
        snap = await getDocs(query(collection(db, 'students'), where('lrn', '==', cleanDigits), limit(1)));
      }

      // 3. Query students collection by 'id' field
      if (snap.empty) {
        snap = await getDocs(query(collection(db, 'students'), where('id', '==', cleanLrn), limit(1)));
      }
      if (snap.empty && cleanDigits) {
        snap = await getDocs(query(collection(db, 'students'), where('id', '==', cleanDigits), limit(1)));
      }

      // 4. Try direct doc ID
      if (snap.empty) {
        const directDoc = await getDoc(doc(db, 'students', cleanLrn));
        if (directDoc.exists()) {
          return formatLearnerObject({ docId: directDoc.id, id: directDoc.id, ...directDoc.data() });
        }
        if (activeAcademicYear) {
          const ayDoc = await getDoc(doc(db, 'students', `${activeAcademicYear}-${cleanLrn}`));
          if (ayDoc.exists()) {
            return formatLearnerObject({ docId: ayDoc.id, id: ayDoc.id, ...ayDoc.data() });
          }
        }
      } else {
        const d = snap.docs[0];
        return formatLearnerObject({ docId: d.id, id: d.id, ...d.data() });
      }

      // 5. Query enrolment_students collection
      let enrSnap = await getDocs(query(collection(db, 'enrolment_students'), where('lrn', '==', cleanLrn), limit(1)));
      if (enrSnap.empty && cleanDigits) {
        enrSnap = await getDocs(query(collection(db, 'enrolment_students'), where('lrn', '==', cleanDigits), limit(1)));
      }
      if (enrSnap.empty) {
        const enrDoc = await getDoc(doc(db, 'enrolment_students', cleanLrn));
        if (enrDoc.exists()) {
          return formatLearnerObject({ docId: enrDoc.id, id: enrDoc.id, ...enrDoc.data() });
        }
      } else {
        const d = enrSnap.docs[0];
        return formatLearnerObject({ docId: d.id, id: d.id, ...d.data() });
      }
    } catch (err) {
      console.warn('Direct Firestore student query fallback notice:', err);
    }

    return null;
  }, [findLearnerByLrn, formatLearnerObject, activeAcademicYear]);

  // Focus LRN input when entering kiosk mode or clearing feedback
  useEffect(() => {
    if (viewMode === 'kiosk' && !activeFeedback && !unregisteredModal) {
      scanInputRef.current?.focus();
    }
  }, [viewMode, activeFeedback, unregisteredModal]);

  // Auto-reset countdown timer for Kiosk feedback card
  useEffect(() => {
    if (activeFeedback) {
      setCountdown(3);
      resetTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(resetTimerRef.current);
            setActiveFeedback(null);
            setScanInput('');
            setTimeout(() => scanInputRef.current?.focus(), 50);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(resetTimerRef.current);
    }
  }, [activeFeedback]);

  // Manual dismissal of feedback card
  const handleDismissFeedback = () => {
    if (resetTimerRef.current) clearInterval(resetTimerRef.current);
    setActiveFeedback(null);
    setScanInput('');
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  // Perform Student Scan / LRN Login or Logout
  const processLrnEntry = async (rawLrn) => {
    const lrn = String(rawLrn || '').trim();
    if (!lrn) return;

    const today = getTodayDateStr();
    const nowTimeStr = formatTime12h();
    const now = new Date();

    // Check if student currently has an active log today (Timed In, not Timed Out)
    const activeLog = logs.find(
      (log) => matchesLrn(log, lrn) && log.date === today && !log.timeOut
    );

    if (activeLog) {
      // Learner is already inside -> Perform TIME OUT
      try {
        let durationMinutes = null;
        if (activeLog.timeIn) {
          // Calculate duration
          const inParts = activeLog.timeIn.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (inParts) {
            let [_, hours, mins, modifier] = inParts;
            hours = parseInt(hours, 10);
            mins = parseInt(mins, 10);
            if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;

            const inDate = new Date();
            inDate.setHours(hours, mins, 0, 0);

            const diffMs = Math.max(0, now.getTime() - inDate.getTime());
            durationMinutes = Math.round(diffMs / 60000);
          }
        }

        const logRef = doc(db, 'computer_lab_logs', activeLog.id);
        await updateDoc(logRef, {
          timeOut: nowTimeStr,
          timeOutTimestamp: serverTimestamp(),
          durationMinutes: durationMinutes != null ? durationMinutes : 0
        });

        if (soundEnabled) playChime('timeout');

        setActiveFeedback({
          type: 'timeout',
          studentName: activeLog.studentName,
          lrn: activeLog.lrn,
          sectionName: activeLog.sectionName,
          stationNumber: activeLog.stationNumber,
          timeIn: activeLog.timeIn,
          timeOut: nowTimeStr,
          durationMinutes,
          message: `Logged out successfully! Stay duration: ${durationMinutes != null ? `${durationMinutes} mins` : 'Completed'}.`
        });
      } catch (err) {
        console.error('Error timing out student:', err);
        alert('Failed to log time-out. Please check connection.');
      }
      return;
    }

    // Learner is NOT currently active -> Perform TIME IN
    const learner = await resolveLearnerAsync(lrn);

    if (!learner) {
      // LRN not found in records -> prompt for quick guest/visitor info
      if (soundEnabled) playChime('warn');
      setUnregisteredModal({
        lrn,
        firstName: '',
        lastName: '',
        sectionName: 'Visitor / Unregistered',
        gradeLevel: 'Grade 7',
        purpose: kioskPurpose,
        stationNumber: kioskStation
      });
      return;
    }

    // Learner found -> Record Time In
    try {
      const newLog = {
        lrn: learner.lrn,
        studentName: learner.fullName,
        sectionName: learner.sectionName,
        gradeLevel: learner.gradeLevel,
        photoUrl: learner.photoUrl || null,
        date: today,
        timeIn: nowTimeStr,
        timeInTimestamp: serverTimestamp(),
        timeOut: null,
        timeOutTimestamp: null,
        durationMinutes: null,
        purpose: kioskPurpose,
        stationNumber: kioskStation,
        academicYear: activeAcademicYear,
        loggedBy: user?.uid || 'kiosk_terminal',
        remarks: ''
      };

      await addDoc(collection(db, 'computer_lab_logs'), newLog);

      if (soundEnabled) playChime('success');

      setActiveFeedback({
        type: 'timein',
        studentName: learner.fullName,
        lrn: learner.lrn,
        sectionName: learner.sectionName,
        stationNumber: kioskStation,
        photoUrl: learner.photoUrl,
        timeIn: nowTimeStr,
        purpose: kioskPurpose,
        message: 'Welcome to the Computer Laboratory!'
      });
    } catch (err) {
      console.error('Error recording time in:', err);
      alert('Failed to record time-in. Please try again.');
    }
  };

  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (scanInput.trim()) {
      processLrnEntry(scanInput);
    }
  };

  // Submit unregistered learner
  const handleSaveUnregistered = async (e) => {
    e.preventDefault();
    if (!unregisteredModal) return;

    const today = getTodayDateStr();
    const nowTimeStr = formatTime12h();
    const studentName = `${unregisteredModal.lastName || ''}, ${unregisteredModal.firstName || ''}`.trim() || 'Guest Student';

    try {
      const newLog = {
        lrn: unregisteredModal.lrn,
        studentName,
        sectionName: unregisteredModal.sectionName || 'Visitor',
        gradeLevel: unregisteredModal.gradeLevel || 'Grade 7',
        date: today,
        timeIn: nowTimeStr,
        timeInTimestamp: serverTimestamp(),
        timeOut: null,
        timeOutTimestamp: null,
        durationMinutes: null,
        purpose: unregisteredModal.purpose || kioskPurpose,
        stationNumber: unregisteredModal.stationNumber || kioskStation,
        academicYear: activeAcademicYear,
        loggedBy: user?.uid || 'kiosk_terminal',
        remarks: 'Manual visitor entry'
      };

      await addDoc(collection(db, 'computer_lab_logs'), newLog);
      if (soundEnabled) playChime('success');

      setUnregisteredModal(null);
      setActiveFeedback({
        type: 'timein',
        studentName,
        lrn: unregisteredModal.lrn,
        sectionName: unregisteredModal.sectionName,
        stationNumber: unregisteredModal.stationNumber,
        timeIn: nowTimeStr,
        purpose: unregisteredModal.purpose,
        message: 'Welcome! Visitor registered and logged in.'
      });
    } catch (err) {
      console.error('Error saving unregistered visitor:', err);
      alert('Failed to record visitor. Please try again.');
    }
  };

  // Manual Time Out from table
  const handleManualTimeOut = async (logItem) => {
    const nowTimeStr = formatTime12h();
    const now = new Date();
    let durationMinutes = null;

    if (logItem.timeIn) {
      const inParts = logItem.timeIn.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (inParts) {
        let [_, hours, mins, modifier] = inParts;
        hours = parseInt(hours, 10);
        mins = parseInt(mins, 10);
        if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;

        const inDate = new Date();
        inDate.setHours(hours, mins, 0, 0);

        const diffMs = Math.max(0, now.getTime() - inDate.getTime());
        durationMinutes = Math.round(diffMs / 60000);
      }
    }

    try {
      const logRef = doc(db, 'computer_lab_logs', logItem.id);
      await updateDoc(logRef, {
        timeOut: nowTimeStr,
        timeOutTimestamp: serverTimestamp(),
        durationMinutes: durationMinutes != null ? durationMinutes : 0
      });
    } catch (err) {
      console.error('Failed to time out record:', err);
      alert('Failed to update log.');
    }
  };

  // Delete Log
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to permanently delete this lab log entry?')) return;
    try {
      await deleteDoc(doc(db, 'computer_lab_logs', logId));
    } catch (err) {
      console.error('Error deleting log:', err);
      alert('Failed to delete log.');
    }
  };

  // Save or Update Manual Modal Log
  const handleSaveManualLog = async (e) => {
    e.preventDefault();
    try {
      if (editingLog) {
        // Calculate duration if timeIn & timeOut exist
        let durationMinutes = editingLog.durationMinutes;
        if (manualForm.timeIn && manualForm.timeOut) {
          const parseTime = (tStr) => {
            const p = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!p) return null;
            let [_, h, m, mod] = p;
            h = parseInt(h, 10);
            m = parseInt(m, 10);
            if (mod.toUpperCase() === 'PM' && h < 12) h += 12;
            if (mod.toUpperCase() === 'AM' && h === 12) h = 0;
            return h * 60 + m;
          };
          const inMins = parseTime(manualForm.timeIn);
          const outMins = parseTime(manualForm.timeOut);
          if (inMins != null && outMins != null && outMins >= inMins) {
            durationMinutes = outMins - inMins;
          }
        }

        const logRef = doc(db, 'computer_lab_logs', editingLog.id);
        await updateDoc(logRef, {
          ...manualForm,
          durationMinutes: durationMinutes != null ? durationMinutes : null
        });
      } else {
        await addDoc(collection(db, 'computer_lab_logs'), {
          ...manualForm,
          academicYear: activeAcademicYear,
          loggedBy: user?.uid || 'manual_entry',
          createdAt: serverTimestamp()
        });
      }

      setShowManualModal(false);
      setEditingLog(null);
    } catch (err) {
      console.error('Error saving manual log:', err);
      alert('Failed to save log.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (logItem) => {
    setEditingLog(logItem);
    setManualForm({
      lrn: logItem.lrn || '',
      studentName: logItem.studentName || '',
      sectionName: logItem.sectionName || '',
      gradeLevel: logItem.gradeLevel || 'Grade 7',
      date: logItem.date || getTodayDateStr(),
      timeIn: logItem.timeIn || '',
      timeOut: logItem.timeOut || '',
      purpose: logItem.purpose || PURPOSES[0],
      stationNumber: logItem.stationNumber || 'Open Workstation',
      remarks: logItem.remarks || ''
    });
    setShowManualModal(true);
  };

  // Open Create Manual Modal
  const handleOpenCreateManual = () => {
    setEditingLog(null);
    setManualForm({
      lrn: '',
      studentName: '',
      sectionName: '',
      gradeLevel: 'Grade 7',
      date: getTodayDateStr(),
      timeIn: formatTime12h(),
      timeOut: '',
      purpose: PURPOSES[0],
      stationNumber: 'Open Workstation',
      remarks: ''
    });
    setShowManualModal(true);
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const today = getTodayDateStr();

    return logs.filter((log) => {
      // Date filter
      if (dateFilterMode === 'today') {
        if (log.date !== today) return false;
      } else if (dateFilterMode === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
        if (log.date !== yStr) return false;
      } else if (dateFilterMode === 'this_week') {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        const startStr = startOfWeek.toISOString().split('T')[0];
        if ((log.date || '') < startStr || (log.date || '') > today) return false;
      } else if (dateFilterMode === 'this_month') {
        const [currY, currM] = today.split('-');
        const [logY, logM] = (log.date || '').split('-');
        if (currY !== logY || currM !== logM) return false;
      } else if (dateFilterMode === 'custom') {
        if ((log.date || '') < customStartDate || (log.date || '') > customEndDate) return false;
      }

      // Status filter
      if (statusFilter === 'active' && log.timeOut) return false;
      if (statusFilter === 'completed' && !log.timeOut) return false;

      // Section filter
      if (sectionFilter !== 'all' && log.sectionName !== sectionFilter) return false;

      // Purpose filter
      if (purposeFilter !== 'all' && log.purpose !== purposeFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchLrn = (log.lrn || '').toLowerCase().includes(q);
        const matchName = (log.studentName || '').toLowerCase().includes(q);
        const matchSec = (log.sectionName || '').toLowerCase().includes(q);
        const matchStation = (log.stationNumber || '').toLowerCase().includes(q);
        if (!matchLrn && !matchName && !matchSec && !matchStation) return false;
      }

      return true;
    });
  }, [logs, dateFilterMode, customStartDate, customEndDate, statusFilter, sectionFilter, purposeFilter, searchTerm]);

  // Statistics Summary
  const stats = useMemo(() => {
    const today = getTodayDateStr();
    const todayLogs = logs.filter((l) => l.date === today);
    const activeInLab = todayLogs.filter((l) => !l.timeOut).length;
    const completedSessions = todayLogs.filter((l) => l.timeOut).length;

    // Average duration of completed today
    const durations = todayLogs.filter((l) => l.durationMinutes != null).map((l) => l.durationMinutes);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    // Top section today
    const secCounts = {};
    todayLogs.forEach((l) => {
      const sec = l.sectionName || 'Unassigned';
      secCounts[sec] = (secCounts[sec] || 0) + 1;
    });
    let topSection = 'None';
    let maxSecCount = 0;
    Object.entries(secCounts).forEach(([sec, count]) => {
      if (count > maxSecCount) {
        maxSecCount = count;
        topSection = sec;
      }
    });

    return {
      totalToday: todayLogs.length,
      activeInLab,
      completedSessions,
      avgDuration,
      topSection: maxSecCount > 0 ? `${topSection} (${maxSecCount})` : '—'
    };
  }, [logs]);

  // Export to Excel handler
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const dateRangeDesc = dateFilterMode === 'today'
        ? `Today (${getTodayDateStr()})`
        : dateFilterMode === 'this_month'
          ? 'This Month'
          : dateFilterMode === 'custom'
            ? `${customStartDate} to ${customEndDate}`
            : 'All Filtered Records';

      const buffer = await generateLabLogExcel({
        logs: filteredLogs,
        schoolName: settings.schoolName || 'School Name',
        schoolYear: activeAcademicYear,
        labName: settings.labName || 'Computer Laboratory',
        dateRangeText: dateRangeDesc,
        preparedByName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'ICT Coordinator',
        preparedByTitle: user?.position || 'ICT Coordinator / Lab Custodian',
        principalName: settings.principalName || 'School Principal',
        principalTitle: 'School Principal'
      });

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Computer_Lab_Visitors_Log_${getTodayDateStr()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Failed to generate Excel logbook.');
    } finally {
      setExporting(false);
    }
  };

  // Export to CSV handler
  const handleExportCSV = () => {
    exportLabLogsToCSV(filteredLogs, `Computer_Lab_Visitors_${getTodayDateStr()}.csv`);
  };

  // Keyboard shortcut listener for Kiosk Mode: Esc to exit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && viewMode === 'kiosk') {
        setViewMode('management');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  return (
    <div className={`lab-log-container ${viewMode === 'kiosk' ? 'kiosk-active' : ''}`}>
      {/* ─────────────────────────────────────────────────────────────
          KIOSK MODE (FULLSCREEN / ENTRANCE TERMINAL)
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'kiosk' ? (
        <div className="lab-kiosk-view">
          {/* Top Kiosk Bar */}
          <div className="kiosk-header-bar">
            <div className="kiosk-brand">
              <span className="kiosk-icon">🖥️</span>
              <div>
                <h1 className="kiosk-title">{settings.schoolName || 'School LMS Portal'}</h1>
                <p className="kiosk-subtitle">Computer Laboratory — Visitor Sign-In & Attendance Terminal</p>
              </div>
            </div>

            <div className="kiosk-header-right">
              {/* Digital Clock */}
              <div className="kiosk-live-clock">
                <span className="clock-time">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
                <span className="clock-date">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Sound Toggle */}
              <button
                type="button"
                className={`kiosk-sound-btn ${soundEnabled ? 'active' : ''}`}
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Chime Sound Enabled' : 'Chime Sound Muted'}
              >
                {soundEnabled ? '🔔 Sound On' : '🔕 Muted'}
              </button>

              {/* Exit Kiosk Mode Button */}
              <button
                type="button"
                className="kiosk-exit-btn"
                onClick={() => setViewMode('management')}
                title="Exit to Logbook Dashboard (Press ESC)"
              >
                ✕ Exit Kiosk
              </button>
            </div>
          </div>

          {/* Kiosk Main Content Area */}
          <div className="kiosk-body">
            {/* Left/Center Interactive Terminal */}
            <div className="kiosk-terminal-card">
              <div className="kiosk-badge-status">
                <span className="pulse-dot"></span>
                <span>Ready to Scan or Enter LRN</span>
              </div>

              <h2 className="terminal-instruction">Scan or Enter Learner Reference Number (LRN)</h2>
              <p className="terminal-help">Type or scan your 12-digit DepEd LRN below. Press Enter to record attendance.</p>

              {/* Kiosk Configuration Bar: Purpose & Station */}
              <div className="kiosk-config-row">
                <div className="kiosk-config-field">
                  <label htmlFor="kiosk-purpose-select">Purpose of Visit:</label>
                  <select
                    id="kiosk-purpose-select"
                    value={kioskPurpose}
                    onChange={(e) => setKioskPurpose(e.target.value)}
                    className="kiosk-select"
                  >
                    {PURPOSES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="kiosk-config-field">
                  <label htmlFor="kiosk-station-select">Assigned PC / Station:</label>
                  <select
                    id="kiosk-station-select"
                    value={kioskStation}
                    onChange={(e) => setKioskStation(e.target.value)}
                    className="kiosk-select"
                  >
                    <option value="Open Workstation">Open Workstation</option>
                    {STATIONS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LRN Input Form */}
              <form onSubmit={handleScanSubmit} className="kiosk-scan-form">
                <div className="kiosk-input-wrapper">
                  <span className="kiosk-input-icon">🔍</span>
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScanInput(val);
                      const digits = val.replace(/\D/g, '');
                      // If exact 12-digit DepEd LRN is scanned or typed, auto-trigger
                      if (digits.length === 12 && val.trim().length <= 14) {
                        processLrnEntry(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (scanInput.trim()) {
                          processLrnEntry(scanInput);
                        }
                      }
                    }}
                    placeholder="Enter or scan LRN (e.g. 123456789012)..."
                    className="kiosk-lrn-input"
                    autoFocus
                    disabled={Boolean(activeFeedback)}
                  />
                  {scanInput && (
                    <button
                      type="button"
                      className="kiosk-clear-btn"
                      onClick={() => setScanInput('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0' }}>
                  ✓ {masterlistStudents.length || students.length || 0} learners ready in database • Press Enter to submit
                </div>

                <div className="kiosk-action-btns">
                  <button
                    type="submit"
                    className="kiosk-submit-btn"
                    disabled={!scanInput.trim() || Boolean(activeFeedback)}
                  >
                    Confirm Sign-In / Sign-Out
                  </button>
                </div>
              </form>

              {/* On-Screen Numeric Keypad for Touch Terminals */}
              <div className="kiosk-keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '⌫'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`keypad-btn ${k === 'Clear' ? 'clear-key' : ''} ${k === '⌫' ? 'backspace-key' : ''}`}
                    onClick={() => {
                      if (k === 'Clear') {
                        setScanInput('');
                        scanInputRef.current?.focus();
                      } else if (k === '⌫') {
                        setScanInput((prev) => prev.slice(0, -1));
                        scanInputRef.current?.focus();
                      } else {
                        if (scanInput.length < 12) {
                          const nextVal = scanInput + k;
                          setScanInput(nextVal);
                          if (nextVal.length === 12) {
                            processLrnEntry(nextVal);
                          }
                        }
                        scanInputRef.current?.focus();
                      }
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Side: Live Headcount & Recent Lab Activity */}
            <div className="kiosk-side-panel">
              <div className="kiosk-summary-card">
                <div className="kiosk-stat-row">
                  <div className="kiosk-stat-item">
                    <span className="kiosk-stat-val text-emerald">{stats.activeInLab}</span>
                    <span className="kiosk-stat-label">Currently In Lab</span>
                  </div>
                  <div className="kiosk-stat-item">
                    <span className="kiosk-stat-val text-blue">{stats.totalToday}</span>
                    <span className="kiosk-stat-label">Total Visitors Today</span>
                  </div>
                </div>
              </div>

              <div className="kiosk-recent-list-card">
                <div className="recent-list-header">
                  <h3>Recent Visitors Today</h3>
                  <span className="recent-count-tag">{logs.filter((l) => l.date === getTodayDateStr()).length} logged</span>
                </div>

                <div className="kiosk-recent-scroller">
                  {logs.filter((l) => l.date === getTodayDateStr()).slice(0, 8).map((item) => (
                    <div key={item.id} className="kiosk-recent-row">
                      <div className="recent-avatar">
                        {item.photoUrl ? (
                          <img src={item.photoUrl} alt={item.studentName} />
                        ) : (
                          <span>{(item.studentName || 'L').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="recent-info">
                        <div className="recent-name">{item.studentName}</div>
                        <div className="recent-sub">
                          <span>{item.sectionName}</span> • <span className="recent-station">{item.stationNumber || 'Open'}</span>
                        </div>
                      </div>
                      <div className="recent-time-badge">
                        {!item.timeOut ? (
                          <span className="tag-in">🟢 {item.timeIn}</span>
                        ) : (
                          <span className="tag-out">✓ Out {item.timeOut}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {logs.filter((l) => l.date === getTodayDateStr()).length === 0 && (
                    <div className="empty-kiosk-list">
                      <span>💻</span>
                      <p>No visitors logged today yet.</p>
                      <small>Enter an LRN to start logging attendance.</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Modal / Overlay for Sign-In / Sign-Out */}
          {activeFeedback && (
            <div className="kiosk-feedback-backdrop">
              <div className={`kiosk-feedback-modal ${activeFeedback.type}`}>
                <div className="feedback-icon-bubble">
                  {activeFeedback.type === 'timein' ? '🎉' : '👋'}
                </div>

                <span className="feedback-badge">
                  {activeFeedback.type === 'timein' ? 'TIME IN RECORDED' : 'TIME OUT COMPLETED'}
                </span>

                <h2 className="feedback-student-name">{activeFeedback.studentName}</h2>
                <div className="feedback-meta-chips">
                  <span className="chip-lrn">LRN: {activeFeedback.lrn}</span>
                  <span className="chip-section">{activeFeedback.sectionName}</span>
                  <span className="chip-station">{activeFeedback.stationNumber}</span>
                </div>

                <div className="feedback-details-box">
                  {activeFeedback.type === 'timein' ? (
                    <>
                      <div className="detail-item">
                        <span className="detail-label">Time In:</span>
                        <span className="detail-val font-mono">{activeFeedback.timeIn}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Purpose:</span>
                        <span className="detail-val">{activeFeedback.purpose}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="detail-item">
                        <span className="detail-label">Time In:</span>
                        <span className="detail-val font-mono">{activeFeedback.timeIn}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Time Out:</span>
                        <span className="detail-val font-mono">{activeFeedback.timeOut}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-val font-bold text-emerald">
                          {activeFeedback.durationMinutes != null ? `${activeFeedback.durationMinutes} mins` : 'Completed'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <p className="feedback-msg">{activeFeedback.message}</p>

                <div className="feedback-countdown-bar">
                  <div className="countdown-timer">Ready for next student in {countdown}s...</div>
                  <button
                    type="button"
                    className="feedback-dismiss-btn"
                    onClick={handleDismissFeedback}
                  >
                    Next Student Now ➔
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unregistered Learner / Guest Modal */}
          {unregisteredModal && (
            <div className="kiosk-feedback-backdrop">
              <div className="kiosk-unregistered-modal">
                <div className="unregistered-header">
                  <span className="unreg-icon">⚠️</span>
                  <div>
                    <h3>LRN Not Found in Masterlist</h3>
                    <p>LRN <strong className="font-mono">{unregisteredModal.lrn}</strong> is not yet enrolled in the database. Please provide visitor details to log in:</p>
                  </div>
                </div>

                <form onSubmit={handleSaveUnregistered} className="unregistered-form">
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        required
                        value={unregisteredModal.firstName}
                        onChange={(e) => setUnregisteredModal({ ...unregisteredModal, firstName: e.target.value })}
                        placeholder="e.g. Maria"
                        className="modal-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        required
                        value={unregisteredModal.lastName}
                        onChange={(e) => setUnregisteredModal({ ...unregisteredModal, lastName: e.target.value })}
                        placeholder="e.g. Santos"
                        className="modal-input"
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Grade Level</label>
                      <select
                        value={unregisteredModal.gradeLevel}
                        onChange={(e) => setUnregisteredModal({ ...unregisteredModal, gradeLevel: e.target.value })}
                        className="modal-input"
                      >
                        {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Faculty / Staff', 'Visitor'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Section / School / Org</label>
                      <input
                        type="text"
                        value={unregisteredModal.sectionName}
                        onChange={(e) => setUnregisteredModal({ ...unregisteredModal, sectionName: e.target.value })}
                        placeholder="e.g. Diamond or Visitor"
                        className="modal-input"
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Purpose</label>
                      <select
                        value={unregisteredModal.purpose}
                        onChange={(e) => setUnregisteredModal({ ...unregisteredModal, purpose: e.target.value })}
                        className="modal-input"
                      >
                        {PURPOSES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>PC Station</label>
                      <select
                        value={unregisteredModal.stationNumber}
                        onChange={(e) => setUnregisteredModal({ ...unregisteredModal, stationNumber: e.target.value })}
                        className="modal-input"
                      >
                        <option value="Open Workstation">Open Workstation</option>
                        {STATIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="unreg-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setUnregisteredModal(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-confirm">
                      Complete Visitor Sign-In
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            MANAGEMENT VIEW (LOGBOOK DASHBOARD & EXPORTS)
        ───────────────────────────────────────────────────────────── */
        <div className="lab-management-view">
          {/* Main Top Header */}
          <div className="lab-header-panel">
            <div className="lab-title-area">
              <div className="lab-title-icon">💻</div>
              <div>
                <h1 className="lab-main-title">Computer Laboratory Visitors Logbook</h1>
                <p className="lab-main-sub">
                  Monitor laboratory attendance, manage student entries, and export DepEd-compliant visitor lists.
                </p>
              </div>
            </div>

            <div className="lab-top-actions">
              {/* Launch Kiosk Mode Button */}
              <button
                type="button"
                className="btn-launch-kiosk"
                onClick={() => {
                  setViewMode('kiosk');
                  setActiveFeedback(null);
                  setScanInput('');
                }}
              >
                <span>🖥️</span> Launch Kiosk / Scan Terminal
              </button>

              {/* Manual Add Log Entry */}
              <button
                type="button"
                className="btn-action-primary"
                onClick={handleOpenCreateManual}
              >
                <span>➕</span> Add Entry Manually
              </button>

              {/* Export to Excel */}
              <button
                type="button"
                className="btn-action-export excel"
                onClick={handleExportExcel}
                disabled={exporting || filteredLogs.length === 0}
                title="Download formatted Excel (.xlsx) Logbook"
              >
                <span>📊</span> {exporting ? 'Generating...' : 'Export Excel (.xlsx)'}
              </button>

              {/* Export to CSV */}
              <button
                type="button"
                className="btn-action-export csv"
                onClick={handleExportCSV}
                disabled={filteredLogs.length === 0}
                title="Download CSV spreadsheet"
              >
                <span>📄</span> Export CSV
              </button>

              {/* Print Logbook */}
              <button
                type="button"
                className="btn-action-export print"
                onClick={() => setShowPrintModal(true)}
                disabled={filteredLogs.length === 0}
                title="Print DepEd Logbook format"
              >
                <span>🖨️</span> Print Logbook
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="lab-stats-grid">
            <div className="lab-stat-card card-emerald">
              <div className="stat-card-icon">🟢</div>
              <div className="stat-card-info">
                <span className="stat-card-val">{stats.activeInLab}</span>
                <span className="stat-card-label">Currently Inside Lab</span>
              </div>
            </div>

            <div className="lab-stat-card card-blue">
              <div className="stat-card-icon">👥</div>
              <div className="stat-card-info">
                <span className="stat-card-val">{stats.totalToday}</span>
                <span className="stat-card-label">Total Visitors Today</span>
              </div>
            </div>

            <div className="lab-stat-card card-indigo">
              <div className="stat-card-icon">⏱️</div>
              <div className="stat-card-info">
                <span className="stat-card-val">
                  {stats.avgDuration != null ? `${stats.avgDuration} mins` : '—'}
                </span>
                <span className="stat-card-label">Avg. Lab Duration</span>
              </div>
            </div>

            <div className="lab-stat-card card-amber">
              <div className="stat-card-icon">🏫</div>
              <div className="stat-card-info">
                <span className="stat-card-val truncate" title={stats.topSection}>
                  {stats.topSection}
                </span>
                <span className="stat-card-label">Top Section Today</span>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="lab-toolbar-card">
            <div className="toolbar-row-top">
              {/* Date Filters */}
              <div className="date-filter-group">
                <span className="filter-label">Date Filter:</span>
                <div className="btn-segmented">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'this_week', label: 'This Week' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'all', label: 'All Dates' },
                    { id: 'custom', label: 'Custom' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`seg-btn ${dateFilterMode === tab.id ? 'active' : ''}`}
                      onClick={() => setDateFilterMode(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="status-filter-group">
                <span className="filter-label">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="toolbar-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Inside Lab</option>
                  <option value="completed">Completed (Timed Out)</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range Picker if selected */}
            {dateFilterMode === 'custom' && (
              <div className="toolbar-custom-date">
                <label>
                  Start Date:
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="toolbar-date-input"
                  />
                </label>
                <label>
                  End Date:
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="toolbar-date-input"
                  />
                </label>
              </div>
            )}

            {/* Search and Secondary Dropdowns */}
            <div className="toolbar-row-bottom">
              <div className="search-input-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by student name, LRN, section, or PC station..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="toolbar-search-input"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchTerm('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="secondary-filters">
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="toolbar-select"
                >
                  <option value="all">All Sections</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.name}>{sec.name}</option>
                  ))}
                </select>

                <select
                  value={purposeFilter}
                  onChange={(e) => setPurposeFilter(e.target.value)}
                  className="toolbar-select"
                >
                  <option value="all">All Purposes</option>
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Visitor Logbook Table */}
          <div className="lab-table-card">
            <div className="table-header-status">
              <h3>
                Laboratory Visitors Record ({filteredLogs.length})
              </h3>
              <span className="table-meta-summary">
                Showing {filteredLogs.length} of {logs.length} total logs
              </span>
            </div>

            {loadingLogs ? (
              <div className="table-loading-box">
                <div className="spinner"></div>
                <p>Loading laboratory visitors record...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="table-empty-box">
                <span className="empty-icon">📂</span>
                <h4>No Visitor Records Found</h4>
                <p>No logbook records match the selected date and filters.</p>
                <button
                  type="button"
                  className="btn-action-primary mt-2"
                  onClick={handleOpenCreateManual}
                >
                  Add a Visitor Entry
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="lab-logbook-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Duration</th>
                      <th>LRN</th>
                      <th>Student / Visitor Name</th>
                      <th>Grade & Section</th>
                      <th>Station</th>
                      <th>Purpose</th>
                      <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, index) => {
                      const isActive = !log.timeOut;
                      return (
                        <tr key={log.id} className={isActive ? 'row-active' : ''}>
                          <td className="text-center text-muted font-mono">{index + 1}</td>
                          <td>
                            {isActive ? (
                              <span className="badge-status-in">🟢 In Lab</span>
                            ) : (
                              <span className="badge-status-out">✓ Done</span>
                            )}
                          </td>
                          <td className="font-mono text-sm">{log.date || '—'}</td>
                          <td className="font-mono font-bold text-sm text-emerald">
                            {log.timeIn || '—'}
                          </td>
                          <td className="font-mono text-sm">
                            {log.timeOut || (
                              <button
                                type="button"
                                className="btn-table-timeout"
                                onClick={() => handleManualTimeOut(log)}
                                title="Record Time Out right now"
                              >
                                ⏱️ Time Out
                              </button>
                            )}
                          </td>
                          <td className="text-sm">
                            {log.durationMinutes != null ? (
                              <span className="duration-tag">{log.durationMinutes} min{log.durationMinutes === 1 ? '' : 's'}</span>
                            ) : isActive ? (
                              <span className="text-muted italic">In session...</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="font-mono font-bold text-sm">{log.lrn || '—'}</td>
                          <td>
                            <div className="student-name-cell">
                              <span className="font-bold">{log.studentName || '—'}</span>
                              {log.remarks && <small className="text-muted">{log.remarks}</small>}
                            </div>
                          </td>
                          <td>
                            <span className="section-pill">{log.sectionName || log.gradeLevel || '—'}</span>
                          </td>
                          <td>
                            <span className="station-pill">{log.stationNumber || 'Open'}</span>
                          </td>
                          <td className="text-sm">{log.purpose || 'Class Activity'}</td>
                          <td className="text-center">
                            <div className="table-actions-cell">
                              <button
                                type="button"
                                className="action-icon-btn edit"
                                onClick={() => handleOpenEdit(log)}
                                title="Edit Record"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="action-icon-btn delete"
                                onClick={() => handleDeleteLog(log.id)}
                                title="Delete Record"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Manual Entry / Edit Modal */}
          {showManualModal && (
            <div className="modal-backdrop">
              <div className="modal-dialog">
                <div className="modal-header">
                  <h3>{editingLog ? 'Edit Laboratory Visitor Entry' : 'Add Manual Laboratory Visitor Entry'}</h3>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setShowManualModal(false)}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveManualLog} className="modal-form">
                  <div className="form-group">
                    <label>Learner Reference Number (LRN)</label>
                    <input
                      type="text"
                      value={manualForm.lrn}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setManualForm((prev) => ({ ...prev, lrn: val }));
                        // Auto-lookup name & section if found
                        if (val.trim().length >= 3) {
                          const matched = await resolveLearnerAsync(val);
                          if (matched) {
                            setManualForm((prev) => ({
                              ...prev,
                              lrn: matched.lrn,
                              studentName: matched.fullName,
                              sectionName: matched.sectionName,
                              gradeLevel: matched.gradeLevel
                            }));
                          }
                        }
                      }}
                      placeholder="Enter LRN (auto-fills student details)"
                      className="modal-input font-mono"
                    />
                  </div>

                  <div className="form-group">
                    <label>Student / Visitor Full Name *</label>
                    <input
                      type="text"
                      required
                      value={manualForm.studentName}
                      onChange={(e) => setManualForm({ ...manualForm, studentName: e.target.value })}
                      placeholder="LastName, FirstName MiddleName"
                      className="modal-input"
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Grade Level</label>
                      <select
                        value={manualForm.gradeLevel}
                        onChange={(e) => setManualForm({ ...manualForm, gradeLevel: e.target.value })}
                        className="modal-input"
                      >
                        {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Faculty / Staff', 'Visitor'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Section Name</label>
                      <input
                        type="text"
                        value={manualForm.sectionName}
                        onChange={(e) => setManualForm({ ...manualForm, sectionName: e.target.value })}
                        placeholder="e.g. Diamond"
                        className="modal-input"
                      />
                    </div>
                  </div>

                  <div className="form-row-3">
                    <div className="form-group">
                      <label>Date *</label>
                      <input
                        type="date"
                        required
                        value={manualForm.date}
                        onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                        className="modal-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Time In *</label>
                      <input
                        type="text"
                        required
                        value={manualForm.timeIn}
                        onChange={(e) => setManualForm({ ...manualForm, timeIn: e.target.value })}
                        placeholder="e.g. 09:30 AM"
                        className="modal-input font-mono"
                      />
                    </div>
                    <div className="form-group">
                      <label>Time Out (optional)</label>
                      <input
                        type="text"
                        value={manualForm.timeOut}
                        onChange={(e) => setManualForm({ ...manualForm, timeOut: e.target.value })}
                        placeholder="e.g. 10:45 AM"
                        className="modal-input font-mono"
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Purpose of Visit</label>
                      <select
                        value={manualForm.purpose}
                        onChange={(e) => setManualForm({ ...manualForm, purpose: e.target.value })}
                        className="modal-input"
                      >
                        {PURPOSES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Station / PC No.</label>
                      <select
                        value={manualForm.stationNumber}
                        onChange={(e) => setManualForm({ ...manualForm, stationNumber: e.target.value })}
                        className="modal-input"
                      >
                        <option value="Open Workstation">Open Workstation</option>
                        {STATIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Remarks / Notes</label>
                    <input
                      type="text"
                      value={manualForm.remarks}
                      onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })}
                      placeholder="Optional notes or observations"
                      className="modal-input"
                    />
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setShowManualModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-confirm">
                      {editingLog ? 'Save Changes' : 'Save Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Printable Official Logbook Modal */}
          {showPrintModal && (
            <div className="modal-backdrop">
              <div className="print-modal-dialog">
                <div className="print-modal-header no-print">
                  <h3>DepEd Computer Laboratory Logbook Print Preview</h3>
                  <div className="print-actions">
                    <button
                      type="button"
                      className="btn-action-primary"
                      onClick={() => window.print()}
                    >
                      🖨️ Print Now
                    </button>
                    <button
                      type="button"
                      className="modal-close-btn"
                      onClick={() => setShowPrintModal(false)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="printable-logbook-content" id="printable-logbook">
                  {/* DepEd Official Header */}
                  <div className="print-header">
                    <p className="print-republic">Republic of the Philippines</p>
                    <p className="print-dept">Department of Education</p>
                    <h2 className="print-school-name">{settings.schoolName || 'School Name'}</h2>
                    <h3 className="print-doc-title">COMPUTER LABORATORY VISITOR & ATTENDANCE LOGBOOK</h3>
                  </div>

                  <div className="print-meta-grid">
                    <div><strong>Academic Year:</strong> {activeAcademicYear || '—'}</div>
                    <div><strong>Date Coverage:</strong> {dateFilterMode === 'today' ? getTodayDateStr() : dateFilterMode}</div>
                    <div><strong>Total Visitors:</strong> {filteredLogs.length}</div>
                    <div><strong>Date Printed:</strong> {new Date().toLocaleDateString('en-US')}</div>
                  </div>

                  <table className="print-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35px' }}>No.</th>
                        <th style={{ width: '85px' }}>Date</th>
                        <th style={{ width: '75px' }}>Time In</th>
                        <th style={{ width: '75px' }}>Time Out</th>
                        <th style={{ width: '110px' }}>LRN</th>
                        <th>Learner Name</th>
                        <th style={{ width: '110px' }}>Grade & Section</th>
                        <th style={{ width: '70px' }}>PC No.</th>
                        <th>Purpose of Visit</th>
                        <th style={{ width: '90px' }}>Signature</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((item, idx) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ textAlign: 'center' }}>{item.date || '—'}</td>
                          <td style={{ textAlign: 'center' }}>{item.timeIn || '—'}</td>
                          <td style={{ textAlign: 'center' }}>{item.timeOut || '—'}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{item.lrn || '—'}</td>
                          <td>{item.studentName || '—'}</td>
                          <td>{item.sectionName || item.gradeLevel || '—'}</td>
                          <td style={{ textAlign: 'center' }}>{item.stationNumber || 'Open'}</td>
                          <td>{item.purpose || 'Class Activity'}</td>
                          <td style={{ borderBottom: '1px solid #333' }}></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Signatories */}
                  <div className="print-signatories">
                    <div className="signatory-col">
                      <p className="signatory-label">Prepared by:</p>
                      <div className="signatory-space"></div>
                      <p className="signatory-name">{`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'ICT COORDINATOR'}</p>
                      <p className="signatory-title">{user?.position || 'ICT Coordinator / Lab Custodian'}</p>
                    </div>

                    <div className="signatory-col">
                      <p className="signatory-label">Noted by:</p>
                      <div className="signatory-space"></div>
                      <p className="signatory-name">{(settings.principalName || 'SCHOOL HEAD / PRINCIPAL').toUpperCase()}</p>
                      <p className="signatory-title">School Principal</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComputerLabLogPage;
