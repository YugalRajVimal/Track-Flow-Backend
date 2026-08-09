import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const RMI_URL = `${API_BASE_URL}/raw-material-in`;
const DATA_URL = `${API_BASE_URL}/production-management-data`;

const s = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 32px', maxWidth: 1100, margin: '0 auto' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 20 },
  h2: { margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' },
  h3: { margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#374151' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#374151' },
  input: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13 },
  select: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff' },
  btn: { padding: '9px 20px', background: '#f58021', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6' },
  error: { padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13, marginBottom: 14 },
  success: { padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: 13, marginBottom: 14 },
};

const emptyForm = { supplierName: '', items: '', amount: '', paymentMode: 'Cash', receiverName: '', remark: '' };

const DropdownWithOther = ({ options, value, onChange, placeholder }) => (
  <div>
    <select style={s.select} value={options.includes(value) ? value : (value ? '__other__' : '')} onChange={(e) => onChange(e.target.value === '__other__' ? '' : e.target.value)}>
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__other__">Other…</option>
    </select>
    {!options.includes(value) && (
      <input style={{ ...s.input, marginTop: 6 }} placeholder={placeholder || 'Enter new value'} value={value} onChange={(e) => onChange(e.target.value)} />
    )}
  </div>
);

export default function RawMaterialsInPage() {
  const [dropdowns, setDropdowns] = useState({ supplierName: [], items: [], receiverName: [] });
  const [form, setForm] = useState(emptyForm);
  const [chPhoto, setChPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const flash = (fn, msg) => { fn(msg); setTimeout(() => fn(''), 3000); };

  useEffect(() => {
    axios.get(`${DATA_URL}/dropdowns`).then((res) => {
      const norm = (arr) => Array.isArray(arr) ? arr.map((v) => (typeof v === 'object' && v?.name != null ? v.name : v)) : [];
      setDropdowns({ supplierName: norm(res.data.supplierName), items: norm(res.data.items), receiverName: norm(res.data.receiverName) });
    }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(RMI_URL, { params: { pageSize: 50 } });
      setRecords(res.data.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load records.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (chPhoto) fd.append('challanPhotoUpload', chPhoto);
      await axios.post(RMI_URL, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(emptyForm); setChPhoto(null);
      flash(setSuccess, 'Raw material entry created.');
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create entry.');
    } finally { setSaving(false); }
  };

  return (
    <div style={s.page}>
      <h2 style={s.h2}>Raw Materials In</h2>
      <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 20px' }}>Log incoming raw material purchases and payments.</p>

      {!!error && <div style={s.error}>{error}</div>}
      {!!success && <div style={s.success}>{success}</div>}

      <div style={s.card}>
        <h3 style={s.h3}>New Entry</h3>
        <div style={s.grid}>
          <div style={s.field}><span style={s.label}>Supplier Name</span>
            <DropdownWithOther options={dropdowns.supplierName} value={form.supplierName} onChange={(v) => setForm({ ...form, supplierName: v })} placeholder="Enter supplier name" />
          </div>
          <div style={s.field}><span style={s.label}>Items</span>
            <DropdownWithOther options={dropdowns.items} value={form.items} onChange={(v) => setForm({ ...form, items: v })} placeholder="Enter item type" />
          </div>
          <div style={s.field}><span style={s.label}>Amount</span><input type="number" style={s.input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div style={s.field}><span style={s.label}>Payment Mode</span>
            <select style={s.select} value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Due">Due</option>
            </select>
          </div>
          <div style={s.field}><span style={s.label}>Receiver Name</span>
            <DropdownWithOther options={dropdowns.receiverName} value={form.receiverName} onChange={(v) => setForm({ ...form, receiverName: v })} placeholder="Enter receiver name" />
          </div>
          <div style={s.field}><span style={s.label}>Ch. Photo</span><input type="file" accept="image/*" onChange={(e) => setChPhoto(e.target.files[0])} /></div>
          <div style={{ ...s.field, gridColumn: '1 / -1' }}><span style={s.label}>Remark</span><textarea style={{ ...s.input, minHeight: 60 }} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button style={s.btn} disabled={saving} onClick={submit}>{saving ? 'Saving…' : 'Submit Entry'}</button>
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.h3}>Records</h3>
        {loading ? <div style={{ color: '#6b7280', fontSize: 13 }}>Loading…</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Record ID</th>
                  <th style={s.th}>Supplier</th>
                  <th style={s.th}>Items</th>
                  <th style={s.th}>Amount</th>
                  <th style={s.th}>Payment Mode</th>
                  <th style={s.th}>Receiver</th>
                  <th style={s.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.recordId}>
                    <td style={s.td}>{r.recordId}</td>
                    <td style={s.td}>{r.supplierName}</td>
                    <td style={s.td}>{r.items}</td>
                    <td style={s.td}>{r.amount}</td>
                    <td style={s.td}>{r.paymentMode}</td>
                    <td style={s.td}>{r.receiverName}</td>
                    <td style={s.td}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td style={s.td} colSpan={7}>No records.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
