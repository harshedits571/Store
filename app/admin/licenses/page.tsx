'use client';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '../../context/AdminContext';

export default function LicensesPage() {
  const { licenses } = useAdmin();

  const handleResetHardware = async (id: string) => {
    if (confirm("Reset the hardware ID so the user can activate on a new machine?")) {
      await updateDoc(doc(db, "licenses", id), { machineId: null });
    }
  };

  const handleBlock = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    await updateDoc(doc(db, "licenses", id), { status: newStatus });
  };

  return (
    <div>
      <h1 className="h2 mb-4">Manage Licenses (DRM)</h1>
      <p className="text-secondary" style={{ marginBottom: '32px' }}>View generated keys, tied emails, and manage hardware binding.</p>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>License Key</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Machine ID</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center' }}>No licenses generated yet.</td></tr>
            ) : (
              licenses.map((lic) => (
                <tr key={lic.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px', fontWeight: 500, fontFamily: 'monospace' }}>{lic.licenseKey}</td>
                  <td style={{ padding: '16px' }}>{lic.email}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ color: lic.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>
                      {lic.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {lic.machineId || 'Not activated yet'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button onClick={() => handleResetHardware(lic.id)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', marginRight: '8px' }} disabled={!lic.machineId}>
                      Reset PC
                    </button>
                    <button onClick={() => handleBlock(lic.id, lic.status)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', color: lic.status === 'active' ? 'var(--danger)' : 'var(--success)' }}>
                      {lic.status === 'active' ? 'Block' : 'Unblock'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
