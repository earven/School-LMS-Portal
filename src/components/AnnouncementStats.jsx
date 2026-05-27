import React, { useEffect, useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { usePersonnel } from '../context/PersonnelContext';
import { createPortal } from 'react-dom';
import './AnnouncementStats.css';

const AnnouncementStats = ({ groupId, senderId }) => {
  const { getAnnouncementStats } = useNotifications();
  const { personnel } = usePersonnel();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const result = await getAnnouncementStats(groupId, senderId);
      if (isMounted) {
        setStats(result);
        setLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [groupId, senderId, getAnnouncementStats]);

  if (loading) {
    return <span className="ack-status loading">Loading stats...</span>;
  }

  if (!stats) return null;

  const acknowledgedUsers = stats.acknowledgedBy.map(uid => {
    const person = personnel.find(p => p.id === uid || p.uid === uid);
    return person ? person.fullName || person.username || 'Unknown Teacher' : 'Unknown User';
  });

  return (
    <>
      <button 
        className="ack-stats-btn" 
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
      >
        👁️ {stats.acknowledged} / {stats.total} Acknowledged
      </button>

      {isModalOpen && createPortal(
        <div className="ack-modal-overlay" onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(false);
        }}>
          <div className="ack-modal-content" onClick={e => e.stopPropagation()}>
            <div className="ack-modal-header">
              <h3>Acknowledgment Status</h3>
              <button className="ack-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <div className="ack-modal-body">
              <div className="ack-summary">
                <div className="ack-stat-box">
                  <span className="ack-stat-num">{stats.acknowledged}</span>
                  <span className="ack-stat-label">Acknowledged</span>
                </div>
                <div className="ack-stat-box">
                  <span className="ack-stat-num">{stats.total - stats.acknowledged}</span>
                  <span className="ack-stat-label">Pending</span>
                </div>
              </div>

              <h4>Users who acknowledged:</h4>
              <div className="ack-users-list">
                {acknowledgedUsers.length === 0 ? (
                  <p className="no-acks">No one has acknowledged this yet.</p>
                ) : (
                  <ul>
                    {acknowledgedUsers.map((name, idx) => (
                      <li key={idx}>
                        <span className="user-icon">👤</span> {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AnnouncementStats;
