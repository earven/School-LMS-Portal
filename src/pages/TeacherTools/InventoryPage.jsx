import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import { usePersonnel } from '../../context/PersonnelContext';
import './InventoryPage.css';

const InventoryPage = () => {
  const { user } = useAuth();
  const { items, masterItems, loading, addItem, deleteItem, addMasterItem, updateMasterItem, deleteMasterItem } = useInventory();
  const { personnel } = usePersonnel();

  const [activeTab, setActiveTab] = useState('master'); // 'master' or 'assignments'

  // Modals state
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  
  // Master Item Form
  const [masterForm, setMasterForm] = useState({
    name: '',
    type: 'Consumable',
    quantity: 1,
    brand: '',
    serialNumber: '',
    condition: 'New',
    notes: '',
    status: 'Available'
  });

  // Assign Form
  const [assignForm, setAssignForm] = useState({
    masterId: null,
    quantity: 1, // How much to give
    assignedTo: '',
    dateAssigned: new Date().toISOString().split('T')[0]
  });
  const [batchAssign, setBatchAssign] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  const fileInputRef = useRef(null);

  const isBulkItem = (type) => type === 'Consumable' || type === 'Books';

  const [filterType, setFilterType] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all');

  const teachers = useMemo(() => {
    const list = personnel?.filter(p => p.role === 'teacher') || [];
    return list.sort((a, b) => {
      const nameA = (a.fullName || a.username || '').toLowerCase();
      const nameB = (b.fullName || b.username || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [personnel]);

  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin';

  // Make teachers only see assignments
  if (!isAdmin && activeTab !== 'assignments') {
    setActiveTab('assignments');
  }

  const displayMasterItems = useMemo(() => {
    let filtered = masterItems;
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }
    return filtered;
  }, [masterItems, filterType]);

  const displayAssignments = useMemo(() => {
    let filtered = items;
    if (!isAdmin) {
      filtered = filtered.filter(item => item.assignedTo === user.uid);
    } else {
      if (filterTeacher !== 'all') {
        filtered = filtered.filter(item => item.assignedTo === filterTeacher);
      }
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }
    return filtered;
  }, [items, isAdmin, user.uid, filterTeacher, filterType]);

  const groupedMasterItems = useMemo(() => {
    const groups = {};
    
    displayMasterItems.forEach(item => {
      if (isBulkItem(item.type)) {
        groups[item.id] = { ...item, isGroup: false };
      } else {
        const groupKey = `${item.name.toLowerCase()}_${(item.brand || '').toLowerCase()}_${item.type}`;
        if (!groups[groupKey]) {
          groups[groupKey] = {
            id: groupKey,
            name: item.name,
            type: item.type,
            brand: item.brand,
            isGroup: true,
            totalCount: 0,
            availableCount: 0,
            items: []
          };
        }
        groups[groupKey].items.push(item);
        groups[groupKey].totalCount++;
        if (item.status !== 'Assigned') {
          groups[groupKey].availableCount++;
        }
      }
    });
    
    return Object.values(groups);
  }, [displayMasterItems]);

  const toggleGroup = (key) => setExpandedGroups(prev => ({...prev, [key]: !prev[key]}));

  const getTeacherName = useCallback((uid) => {
    const teacher = teachers.find(t => t.id === uid);
    return teacher ? (teacher.fullName || teacher.username) : 'Unknown';
  }, [teachers]);

  const groupedAssignments = useMemo(() => {
    if (!isAdmin || filterTeacher !== 'all') return null;
    
    const groups = {};
    displayAssignments.forEach(item => {
      const tId = item.assignedTo;
      if (!groups[tId]) {
        groups[tId] = {
          id: `teacher_${tId}`,
          teacherId: tId,
          teacherName: getTeacherName(tId),
          items: [],
          totalGiven: 0
        };
      }
      groups[tId].items.push(item);
      groups[tId].totalGiven += item.quantity;
    });
    
    return Object.values(groups).sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }, [displayAssignments, isAdmin, filterTeacher, getTeacherName]);

  // --- Handlers for Master Modal ---
  const handleOpenMasterModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setMasterForm(item);
    } else {
      setEditingId(null);
      setMasterForm({
        name: '', type: 'Consumable', quantity: 1,
        brand: '', serialNumber: '', condition: 'New', notes: '', status: 'Available'
      });
    }
    setShowMasterModal(true);
  };

  const handleSaveMaster = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMasterItem(editingId, masterForm);
      } else {
        await addMasterItem(masterForm);
      }
      setShowMasterModal(false);
    } catch (error) {
      alert("Error saving: " + error.message);
    }
  };

  const handleDeleteMaster = async (id) => {
    if (window.confirm("Are you sure? This deletes from the Master Catalog.")) {
      await deleteMasterItem(id);
    }
  };

  // --- Handlers for CSV Upload ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller CSV file.");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      let added = 0;
      const promises = [];
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Simple CSV parse: Name,Type,Quantity,Brand,SerialNumber,Condition,Notes
        const [name, type, quantity, brand, serial, condition, notes] = line.split(',');
        if (name && type) {
          promises.push(addMasterItem({
            name: name.trim(),
            type: type.trim(),
            quantity: Number(quantity) || 1,
            brand: brand ? brand.trim() : '',
            serialNumber: serial ? serial.trim() : '',
            condition: condition ? condition.trim() : 'New',
            notes: notes ? notes.trim() : '',
            status: 'Available'
          }));
          added++;
        }
      }
      try {
        await Promise.all(promises);
        alert(`Successfully imported ${added} items to Master Catalog!`);
      } catch (err) {
        alert("Import error: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const headers = "Name,Type,Quantity,Brand,SerialNumber,Condition,Notes\n";
    const sample1 = "Whiteboard Marker,Consumable,50,,,,For classrooms\n";
    const sample2 = "Teacher Laptop,ICT,1,Dell,DL-1234,New,Math Dept\n";
    const csvContent = headers + sample1 + sample2;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Handlers for Assign Modal ---
  const handleOpenAssignModal = (masterItem) => {
    if (!isBulkItem(masterItem.type) && masterItem.status === 'Assigned') {
      alert("This item is already assigned!");
      return;
    }
    setEditingId(masterItem.id);
    setMasterForm(masterItem);
    setAssignForm({
      masterId: masterItem.id,
      quantity: 1,
      assignedTo: '',
      dateAssigned: new Date().toISOString().split('T')[0]
    });
    setBatchAssign(false);
    setSelectedTeachers([]);
    setShowAssignModal(true);
  };

  const handleSaveAssign = async (e) => {
    e.preventDefault();
    try {
      const isConsumable = isBulkItem(masterForm.type);
      
      // Validation
      if (isConsumable) {
        const totalQtyNeeded = batchAssign ? (assignForm.quantity * selectedTeachers.length) : assignForm.quantity;
        if (totalQtyNeeded > masterForm.quantity) {
          alert(`Not enough stock! You need ${totalQtyNeeded} but only have ${masterForm.quantity} available.`);
          return;
        }
      }

      if (batchAssign && isConsumable) {
        if (selectedTeachers.length === 0) {
          alert("Select at least one teacher."); return;
        }
        const promises = selectedTeachers.map(tId => addItem({
          name: masterForm.name,
          type: masterForm.type,
          quantity: assignForm.quantity,
          assignedTo: tId,
          dateAssigned: assignForm.dateAssigned,
          notes: masterForm.notes,
          masterId: masterForm.id
        }));
        await Promise.all(promises);
        
        // Deduct master quantity
        await updateMasterItem(masterForm.id, { 
          quantity: masterForm.quantity - (assignForm.quantity * selectedTeachers.length) 
        });
      } else {
        // Single Assign
        await addItem({
          name: masterForm.name,
          type: masterForm.type,
          quantity: isConsumable ? assignForm.quantity : 1,
          assignedTo: assignForm.assignedTo,
          dateAssigned: assignForm.dateAssigned,
          notes: masterForm.notes,
          brand: masterForm.brand || '',
          serialNumber: masterForm.serialNumber || '',
          condition: masterForm.condition || '',
          masterId: masterForm.id
        });

        if (isConsumable) {
          await updateMasterItem(masterForm.id, { quantity: masterForm.quantity - assignForm.quantity });
        } else {
          await updateMasterItem(masterForm.id, { status: 'Assigned' });
        }
      }
      alert("Successfully assigned!");
      setShowAssignModal(false);
    } catch (err) {
      alert("Assign error: " + err.message);
    }
  };

  const handleDeleteAssignment = async (item) => {
    if (window.confirm("Delete this assignment? (This will NOT return the item to master automatically yet)")) {
      await deleteItem(item.id);
    }
  };

  const toggleTeacherSelection = (teacherId) => {
    setSelectedTeachers(prev => prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]);
  };
  const selectAllTeachers = (e) => {
    e.preventDefault();
    if (selectedTeachers.length === teachers.length) setSelectedTeachers([]);
    else setSelectedTeachers(teachers.map(t => t.id));
  };

  if (loading) return <div className="loading">Loading Inventory...</div>;

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <div>
          <h2>{isAdmin ? 'Inventory Management' : 'My Assigned Inventory'}</h2>
          <p>{isAdmin ? 'Track inventorable materials via Master Catalog and Assignments.' : 'View materials, equipment, and books assigned to you.'}</p>
        </div>
        {isAdmin && activeTab === 'master' && (
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={downloadTemplate}>
              Download Template
            </button>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
            <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>
              Import CSV
            </button>
            <button className="btn btn-primary" onClick={() => handleOpenMasterModal()}>
              + Add Master Item
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="inventory-tabs">
          <button className={`tab-btn ${activeTab === 'master' ? 'active' : ''}`} onClick={() => setActiveTab('master')}>
            Master Catalog
          </button>
          <button className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
            Personnel Assignments
          </button>
        </div>
      )}

      <div className="inventory-filters">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="Consumable">Consumable</option>
          <option value="ICT">ICT</option>
          <option value="TLE">TLE</option>
          <option value="Science Materials">Science Materials</option>
          <option value="Books">Books</option>
        </select>
        {activeTab === 'assignments' && isAdmin && (
          <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)}>
            <option value="all">All Teachers</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName || t.username}</option>)}
          </select>
        )}
      </div>

      {/* --- MASTER CATALOG TAB --- */}
      {activeTab === 'master' && (
        <div className="inventory-list">
          {displayMasterItems.length === 0 ? (
            <div className="no-items">Master Catalog is empty. Add items or upload a CSV.</div>
          ) : (
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Quantity / Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedMasterItems.map(group => {
                  if (!group.isGroup) {
                    return (
                      <tr key={group.id}>
                        <td><strong>{group.name}</strong></td>
                        <td><span className={`type-badge ${group.type}`}>{group.type}</span></td>
                        <td><span className="text-muted">-</span></td>
                        <td><strong>{group.quantity} available</strong></td>
                        <td>{group.notes}</td>
                        <td className="actions">
                          <button className="btn btn-primary btn-sm" onClick={() => handleOpenAssignModal(group)}>Assign</button>
                          <button className="btn-icon edit" onClick={() => handleOpenMasterModal(group)}>✏️</button>
                          <button className="btn-icon delete" onClick={() => handleDeleteMaster(group.id)}>🗑️</button>
                        </td>
                      </tr>
                    );
                  } else {
                    const isExpanded = expandedGroups[group.id];
                    return (
                      <React.Fragment key={group.id}>
                        <tr className="group-header" style={{backgroundColor: '#f8f9fc'}}>
                          <td>
                            <button className="btn-icon" onClick={() => toggleGroup(group.id)} style={{marginRight: '8px', fontSize: '12px'}}>
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            <strong>{group.name}</strong>
                          </td>
                          <td><span className={`type-badge ${group.type}`}>{group.type}</span></td>
                          <td><strong>Brand:</strong> {group.brand || 'N/A'}</td>
                          <td>
                            <strong>{group.totalCount} total</strong> <br/>
                            <small className="text-muted">({group.availableCount} available)</small>
                          </td>
                          <td>-</td>
                          <td>-</td>
                        </tr>
                        {isExpanded && group.items.map(item => (
                          <tr key={item.id} className="group-item" style={{backgroundColor: '#fff'}}>
                            <td style={{paddingLeft: '40px'}}>└ {item.name}</td>
                            <td>-</td>
                            <td>
                              <div className="item-details">
                                {item.serialNumber && <div><strong>S/N:</strong> {item.serialNumber}</div>}
                                {item.condition && <div><strong>Condition:</strong> {item.condition}</div>}
                              </div>
                            </td>
                            <td>
                              <span style={{ color: item.status === 'Assigned' ? 'red' : 'green' }}>{item.status}</span>
                            </td>
                            <td>{item.notes}</td>
                            <td className="actions">
                              {item.status !== 'Assigned' && (
                                <button className="btn btn-primary btn-sm" onClick={() => handleOpenAssignModal(item)}>Assign</button>
                              )}
                              <button className="btn-icon edit" onClick={() => handleOpenMasterModal(item)}>✏️</button>
                              <button className="btn-icon delete" onClick={() => handleDeleteMaster(item.id)}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  }
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* --- ASSIGNMENTS TAB --- */}
      {activeTab === 'assignments' && (
        <div className="inventory-list">
          {displayAssignments.length === 0 ? (
            <div className="no-items">No items assigned yet.</div>
          ) : (
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Qty Given</th>
                  {isAdmin && !groupedAssignments && <th>Assigned To</th>}
                  <th>Date Assigned</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {groupedAssignments ? (
                  groupedAssignments.map(group => {
                    const isExpanded = expandedGroups[group.id];
                    return (
                      <React.Fragment key={group.id}>
                        <tr className="group-header" style={{backgroundColor: '#f8f9fc'}}>
                          <td colSpan={6}>
                            <button className="btn-icon" onClick={() => toggleGroup(group.id)} style={{marginRight: '8px', fontSize: '12px'}}>
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            <strong>{group.teacherName}</strong> 
                            <span className="text-muted" style={{marginLeft: '15px'}}>- {group.items.length} distinct item types assigned</span>
                          </td>
                        </tr>
                        {isExpanded && (() => {
                          const eqItems = group.items.filter(i => !isBulkItem(i.type));
                          const supItems = group.items.filter(i => isBulkItem(i.type));
                          
                          return (
                            <>
                              {eqItems.length > 0 && (
                                <tr className="group-item category-row" style={{backgroundColor: '#e9ecef'}}>
                                  <td colSpan={6} style={{paddingLeft: '30px', fontSize: '13px', color: '#495057'}}>
                                    <strong>Equipment & Assets</strong>
                                  </td>
                                </tr>
                              )}
                              {eqItems.map(item => (
                                <tr key={item.id} className="group-item" style={{backgroundColor: '#fff'}}>
                                  <td style={{paddingLeft: '50px'}}>└ {item.name}</td>
                                  <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                  <td>
                                    <div className="item-details">
                                      {item.brand && <div><strong>Brand:</strong> {item.brand}</div>}
                                      {item.serialNumber && <div><strong>S/N:</strong> {item.serialNumber}</div>}
                                    </div>
                                  </td>
                                  <td>{item.quantity}</td>
                                  <td>{item.dateAssigned}</td>
                                  <td className="actions">
                                    <button className="btn-icon delete" onClick={() => handleDeleteAssignment(item)}>🗑️</button>
                                  </td>
                                </tr>
                              ))}
                              
                              {supItems.length > 0 && (
                                <tr className="group-item category-row" style={{backgroundColor: '#e9ecef'}}>
                                  <td colSpan={6} style={{paddingLeft: '30px', fontSize: '13px', color: '#495057'}}>
                                    <strong>Consumables & Supplies Received</strong>
                                  </td>
                                </tr>
                              )}
                              {supItems.map(item => (
                                <tr key={item.id} className="group-item" style={{backgroundColor: '#fff'}}>
                                  <td style={{paddingLeft: '50px'}}>└ {item.name}</td>
                                  <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                  <td><span className="text-muted">-</span></td>
                                  <td>{item.quantity}</td>
                                  <td>{item.dateAssigned}</td>
                                  <td className="actions">
                                    <button className="btn-icon delete" onClick={() => handleDeleteAssignment(item)}>🗑️</button>
                                  </td>
                                </tr>
                              ))}
                            </>
                          );
                        })()}
                      </React.Fragment>
                    )
                  })
                ) : (() => {
                  const eqItems = displayAssignments.filter(i => !isBulkItem(i.type));
                  const supItems = displayAssignments.filter(i => isBulkItem(i.type));
                  const colSpan = isAdmin ? 7 : 6;
                  
                  return (
                    <>
                      {eqItems.length > 0 && (
                        <tr className="category-row" style={{backgroundColor: '#e9ecef'}}>
                          <td colSpan={colSpan} style={{paddingLeft: '15px', fontSize: '14px', color: '#495057'}}>
                            <strong>Equipment & Assets</strong>
                          </td>
                        </tr>
                      )}
                      {eqItems.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.name}</strong></td>
                          <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                          <td>
                            <div className="item-details">
                              {item.brand && <div><strong>Brand:</strong> {item.brand}</div>}
                              {item.serialNumber && <div><strong>S/N:</strong> {item.serialNumber}</div>}
                            </div>
                          </td>
                          <td>{item.quantity}</td>
                          {isAdmin && <td>{getTeacherName(item.assignedTo)}</td>}
                          <td>{item.dateAssigned}</td>
                          {isAdmin && (
                            <td className="actions">
                              <button className="btn-icon delete" onClick={() => handleDeleteAssignment(item)}>🗑️</button>
                            </td>
                          )}
                        </tr>
                      ))}
                      
                      {supItems.length > 0 && (
                        <tr className="category-row" style={{backgroundColor: '#e9ecef'}}>
                          <td colSpan={colSpan} style={{paddingLeft: '15px', fontSize: '14px', color: '#495057'}}>
                            <strong>Consumables & Supplies Received</strong>
                          </td>
                        </tr>
                      )}
                      {supItems.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.name}</strong></td>
                          <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                          <td><span className="text-muted">-</span></td>
                          <td>{item.quantity}</td>
                          {isAdmin && <td>{getTeacherName(item.assignedTo)}</td>}
                          <td>{item.dateAssigned}</td>
                          {isAdmin && (
                            <td className="actions">
                              <button className="btn-icon delete" onClick={() => handleDeleteAssignment(item)}>🗑️</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </>
                  );
                })()}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* --- MODAL: MASTER ITEM --- */}
      {showMasterModal && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingId ? 'Edit Master Item' : 'Add to Master Catalog'}</h3>
            <form onSubmit={handleSaveMaster}>
              <div className="form-group">
                <label>Item Name</label>
                <input type="text" value={masterForm.name} onChange={e => setMasterForm({...masterForm, name: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={masterForm.type} onChange={e => setMasterForm({...masterForm, type: e.target.value})}>
                    <option value="Consumable">Consumable</option>
                    <option value="ICT">ICT</option>
                    <option value="TLE">TLE</option>
                    <option value="Science Materials">Science Materials</option>
                    <option value="Books">Books</option>
                  </select>
                </div>
                {isBulkItem(masterForm.type) && (
                  <div className="form-group">
                    <label>Total Initial Quantity</label>
                    <input type="number" min="1" value={masterForm.quantity} onChange={e => setMasterForm({...masterForm, quantity: Number(e.target.value)})} required />
                  </div>
                )}
              </div>
              
              {!isBulkItem(masterForm.type) && (
                <div className="non-consumable-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Brand / Model</label>
                      <input type="text" value={masterForm.brand} onChange={e => setMasterForm({...masterForm, brand: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Serial Number</label>
                      <input type="text" value={masterForm.serialNumber} onChange={e => setMasterForm({...masterForm, serialNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Condition</label>
                      <select value={masterForm.condition} onChange={e => setMasterForm({...masterForm, condition: e.target.value})}>
                        <option value="New">New</option>
                        <option value="Good">Good / Working</option>
                        <option value="Fair">Fair / Shows Wear</option>
                        <option value="Needs Repair">Needs Repair</option>
                        <option value="For Condemn">For Condemn</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Notes</label>
                <textarea value={masterForm.notes} onChange={e => setMasterForm({...masterForm, notes: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMasterModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save to Catalog</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ASSIGN ITEM --- */}
      {showAssignModal && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Deploy to Teacher</h3>
            <p style={{marginBottom: '15px'}}>Assigning: <strong>{masterForm.name}</strong></p>
            <form onSubmit={handleSaveAssign}>
              <div className="form-row">
                {isBulkItem(masterForm.type) && (
                  <div className="form-group">
                    <label>Quantity {batchAssign ? 'Per Teacher' : ''}</label>
                    <input type="number" min="1" value={assignForm.quantity} onChange={e => setAssignForm({...assignForm, quantity: Number(e.target.value)})} required />
                    <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>Available: {masterForm.quantity}</small>
                  </div>
                )}
                <div className="form-group">
                  <label>Date Assigned</label>
                  <input type="date" value={assignForm.dateAssigned} onChange={e => setAssignForm({...assignForm, dateAssigned: e.target.value})} required />
                </div>
              </div>

              <div className="form-group">
                <div className="assign-header">
                  <label>Assign To</label>
                  {isBulkItem(masterForm.type) && (
                    <div className="batch-toggle">
                      <input type="checkbox" id="batchAssign" checked={batchAssign} onChange={(e) => setBatchAssign(e.target.checked)} />
                      <label htmlFor="batchAssign">Batch Release</label>
                    </div>
                  )}
                </div>
                
                {batchAssign && isBulkItem(masterForm.type) ? (
                  <div className="batch-selection-container">
                    <div className="batch-controls">
                      <button className="btn btn-secondary btn-sm" onClick={selectAllTeachers}>
                        {selectedTeachers.length === teachers.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="selected-count">{selectedTeachers.length} selected</span>
                    </div>
                    <div className="teacher-checklist">
                      {teachers.map(t => (
                        <label key={t.id} className="checklist-item">
                          <input type="checkbox" checked={selectedTeachers.includes(t.id)} onChange={() => toggleTeacherSelection(t.id)} />
                          {t.fullName || t.username}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <select value={assignForm.assignedTo} onChange={e => setAssignForm({...assignForm, assignedTo: e.target.value})} required>
                    <option value="" disabled>Select Teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName || t.username}</option>)}
                  </select>
                )}
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
