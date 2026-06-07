/**
 * Sandbox Schedule Generator Algorithm
 * Greedily assigns teachers to sections and timeslots based on specializations and constraints.
 */

const formatTime = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const hasTimeOverlap = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

/**
 * Parses time string HH:MM to minutes from midnight
 */
const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const generateSchedule = (teachers, sections, existingLoads = [], config) => {
  const {
    subjects = [], // [{ name: 'Math', durationMins: 60, timesPerWeek: 4 }]
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periods = [] // [{ startTime: '07:30', endTime: '08:20', type: 'Class' }]
  } = config;

  const parsedPeriods = periods.map(p => ({
    ...p,
    start: parseTime(p.startTime),
    end: parseTime(p.endTime)
  }));

  const generatedLoads = [];
  const diagnostics = [];
  
  // Track availability
  // teacherId -> day -> [ {start, end} ] (busy slots)
  const teacherBusy = {};
  // teacherId -> total loads (count)
  const teacherLoadCount = {};
  // teacherId -> day -> total minutes
  const teacherDailyMins = {};

  teachers.forEach(t => {
    teacherBusy[t.id] = { Monday:[], Tuesday:[], Wednesday:[], Thursday:[], Friday:[] };
    teacherDailyMins[t.id] = { Monday:0, Tuesday:0, Wednesday:0, Thursday:0, Friday:0 };
    teacherLoadCount[t.id] = 0;
  });
  
  // sectionId -> day -> [ {start, end} ]
  const sectionBusy = {};
  sections.forEach(s => sectionBusy[s.id] = { Monday:[], Tuesday:[], Wednesday:[], Thursday:[], Friday:[] });

  // Pre-fill existing loads (in sandbox, this might be empty, but we support it)
  existingLoads.forEach(load => {
    if (!load.schedule || !load.schedule.days) return;
    const sStart = parseTime(load.schedule.startTime);
    const sEnd = parseTime(load.schedule.endTime);
    const duration = sEnd - sStart;
    
    load.schedule.days.forEach(day => {
      if (teacherBusy[load.teacherId] && teacherBusy[load.teacherId][day]) {
        teacherBusy[load.teacherId][day].push({ start: sStart, end: sEnd });
        teacherDailyMins[load.teacherId][day] += duration;
        teacherLoadCount[load.teacherId]++;
      }
      if (load.sectionId && sectionBusy[load.sectionId] && sectionBusy[load.sectionId][day]) {
        sectionBusy[load.sectionId][day].push({ start: sStart, end: sEnd });
      }
    });
  });

  // For each section, for each required subject, find a teacher and schedule slots
  for (const section of sections) {
    for (const subjectConf of subjects) {
      
      // Find eligible teachers, sorted by current load count ascending (workload balancing)
      const eligibleTeachers = teachers
        .filter(t => {
          if (!t.specialization || t.specialization.trim() === '') return true;
          const specs = Array.isArray(t.specialization) ? t.specialization : t.specialization.split(',').map(s => s.trim());
          return specs.some(s => s.toLowerCase() === subjectConf.name.toLowerCase());
        })
        .sort((a, b) => (teacherLoadCount[a.id] ?? 0) - (teacherLoadCount[b.id] ?? 0));

      if (eligibleTeachers.length === 0) {
        diagnostics.push(`No teacher found with specialization matching "${subjectConf.name}" (or blank).`);
        continue;
      }

      // Try to schedule `timesPerWeek` slots
      let slotsScheduled = 0;
      const shuffledDays = [...days].sort(() => Math.random() - 0.5);

      for (const day of shuffledDays) {
        if (slotsScheduled >= subjectConf.timesPerWeek) break;

        // Ensure we don't schedule the same subject multiple times on the same day for a section
        // (Usually, a section has a subject once a day max)
        const hasSubjectToday = generatedLoads.some(l => l.sectionId === section.id && l.subject === subjectConf.name && l.schedule.days.includes(day));
        if (hasSubjectToday) continue;

        let foundSlot = false;
        let reasons = { breakOverlap: 0, sectionBusy: 0, maxDaily: 0, maxWeekly: 0, teacherBusy: 0, noTeachers: 0, noSlotsInWindow: 0 };
        
        let checkedAnySlot = false;
        
        for (const period of parsedPeriods) {
          if (period.type === 'Break') continue; // Skip breaks
          
          checkedAnySlot = true;
          const currentSlotStart = period.start;
          const currentSlotEnd = period.end;
          const periodDuration = period.end - period.start;
          
          // Check if this subject requires a longer duration than the period
          // The user specified "I will just ensure that all subjects and period are matching in lengths"
          // so we assume 1 subject maps to 1 period regardless of durationMins.

          // Section busy?
          const sBusy = sectionBusy[section.id][day].some(b => hasTimeOverlap(currentSlotStart, currentSlotEnd, b.start, b.end));
          if (sBusy) { reasons.sectionBusy++; continue; }

          // Find available teacher checking constraints
          let rejectedDueToDaily = false;
          let rejectedDueToWeekly = false;
          let rejectedDueToOverlap = false;

          const availableTeacher = eligibleTeachers.find(t => {
            if (teacherLoadCount[t.id] >= t.maxLoadsPerWeek) { rejectedDueToWeekly = true; return false; }
            if (teacherDailyMins[t.id][day] + periodDuration > t.maxMinsPerDay) { rejectedDueToDaily = true; return false; }
            const tBusy = teacherBusy[t.id][day].some(b => hasTimeOverlap(currentSlotStart, currentSlotEnd, b.start, b.end));
            if (tBusy) { rejectedDueToOverlap = true; return false; }
            return true;
          });

          if (availableTeacher) {
            // Book it
            sectionBusy[section.id][day].push({ start: currentSlotStart, end: currentSlotEnd });
            teacherBusy[availableTeacher.id][day].push({ start: currentSlotStart, end: currentSlotEnd });
            teacherDailyMins[availableTeacher.id][day] += periodDuration;
            teacherLoadCount[availableTeacher.id]++;
            
            generatedLoads.push({
              id: `gen_${Date.now()}_${Math.random()}`,
              teacherId: availableTeacher.id,
              teacherName: availableTeacher.firstName || availableTeacher.name, // Support both formats
              subject: subjectConf.name,
              gradeLevel: section.gradeLevel || 'Simulation',
              sectionId: section.id,
              sectionName: section.name,
              schedule: {
                days: [day],
                startTime: formatTime(currentSlotStart),
                endTime: formatTime(currentSlotEnd)
              },
              isGenerated: true
            });
            
            slotsScheduled++;
            foundSlot = true;
            break; // Move to next day
          } else {
            if (rejectedDueToWeekly) reasons.maxWeekly++;
            else if (rejectedDueToDaily) reasons.maxDaily++;
            else if (rejectedDueToOverlap) reasons.teacherBusy++;
            else reasons.noTeachers++;
          }
        }
        
        if (!checkedAnySlot) reasons.noSlotsInWindow++;
        
        // If we didn't find a slot on this day, record the primary reason
        if (!foundSlot) {
           let primaryReason = '';
           if (reasons.noSlotsInWindow > 0) primaryReason = `No valid Class periods defined.`;
           else if (reasons.maxWeekly > 0 && reasons.maxWeekly >= reasons.maxDaily) primaryReason = `All eligible teachers reached Max Loads/Week.`;
           else if (reasons.maxDaily > 0) primaryReason = `All eligible teachers reached Max Mins/Day.`;
           else if (reasons.teacherBusy > 0) primaryReason = `Eligible teachers are busy with other classes.`;
           else if (reasons.sectionBusy > 0) primaryReason = `Section has no empty periods available.`;
           
           if (!section._failedReasons) section._failedReasons = {};
           if (!section._failedReasons[subjectConf.name]) section._failedReasons[subjectConf.name] = primaryReason;
        }
      }
      
      if (slotsScheduled < subjectConf.timesPerWeek) {
        let r = section._failedReasons && section._failedReasons[subjectConf.name] ? section._failedReasons[subjectConf.name] : 'Unknown';
        diagnostics.push(`Could only schedule ${slotsScheduled}/${subjectConf.timesPerWeek} slots for ${subjectConf.name} in ${section.name}. Reason: ${r}`);
      }
    }
  }

  return { loads: generatedLoads, diagnostics };
};
