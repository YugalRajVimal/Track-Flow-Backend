import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const CM_URL = `${API_BASE_URL}/cost-management`;
const DATA_URL = `${API_BASE_URL}/production-management-data`;

const s = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 32px', maxWidth: 1100, margin: '0 auto' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 20 },
  h2: { margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' },
  h3: { margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#374151' },
  h4: { margin: '18px 0 8px', fontSize: 13, fontWeight: 600, color: '#374151' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#374151' },
  input: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13 },
  select: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff' },
  computed: { padding: '8px 10px', borderRadius: 7, fontSize: 13, background: '#f9fafb', color: '#111827', border: '1px dashed #d1d5db' },
  btn: { padding: '9px 20px', background: '#f58021', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnGhost: { padding: '6px 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 12, cursor: 'pointer' },
  btnDanger: { padding: '4px 10px', background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 11, cursor: 'pointer' },
  lineRow: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6' },
  error: { padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13, marginBottom: 14 },
  success: { padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: 13, marginBottom: 14 },
  statRow: { display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' },
  stat: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 16px', minWidth: 140 },
  statLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: 700, color: '#111827' },
};

const emptyForm = { styleName: '', fabricType: '', printType: '', readyFabricRate: '', cutting: '', stitching: '', remark: '' };

const DropdownWithOther = ({ options, value, onChange, placeholder, allowOther = true }) => (
  <div>
    <select style={s.select} value={options.includes(value) ? value : (value ? '__other__' : '')} onChange={(e) => onChange(e.target.value === '__other__' ? '' : e.target.value)}>
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      {allowOther && <option value="__other__">Other…</option>}
    </select>
    {allowOther && !options.includes(value) && (
      <input style={{ ...s.input, marginTop: 6 }} placeholder={placeholder || 'Enter new value'} value={value} onChange={(e) => onChange(e.target.value)} />
    )}
  </div>
);

// A repeatable {label, amount} line-item editor (used for finishing / packingMaterial / other)
function LineItemsEditor({ title, lines, setLines, dropdownOptions }) {
  const addLine = () => setLines([...lines, { label: '', amount: '' }]);
  const updateLine = (i, key, val) => {
    const next = [...lines];
    next[i] = { ...next[i], [key]: val };
    setLines(next);
  };
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));
  const total = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={s.h4}>{title}</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Total: {total.toFixed(2)}</span>
      </div>
      {lines.map((line, i) => (
        <div key={i} style={s.lineRow}>
          {dropdownOptions ? (
            <DropdownWithOther options={dropdownOptions} value={line.label} onChange={(v) => updateLine(i, 'label', v)} placeholder="Label" />
          ) : (
            <input style={s.input} placeholder="Label (e.g. Embroidery, Lace)" value={line.label} onChange={(e) => updateLine(i, 'label', e.target.value)} />
          )}
          <input type="number" style={s.input} placeholder="Amount" value={line.amount} onChange={(e) => updateLine(i, 'amount', e.target.value)} />
          <button style={s.btnDanger} onClick={() => removeLine(i)}>Remove</button>
        </div>
      ))}
      <button style={s.btnGhost} onClick={addLine}>+ Add {title} line</button>
    </div>
  );
}

export default function CostManagementPage() {
  const [dropdowns, setDropdowns] = useState({ styleName: [], fabricType: [], printType: [], packingMaterial: [], finishing: [] });
  const [form, setForm] = useState(emptyForm);
  const [finishingLines, setFinishingLines] = useState([]);
  const [packingLines, setPackingLines] = useState([]);
  const [otherLines, setOtherLines] = useState([]);
  const [styleAveragePreview, setStyleAveragePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const flash = (fn, msg) => { fn(msg); setTimeout(() => fn(''), 3000); };

  useEffect(() => {
    axios.get(`${DATA_URL}/dropdowns`).then((res) => {
      const norm = (arr) => Array.isArray(arr) ? arr.map((v) => (typeof v === 'object' && v?.name != null ? v.name : v)) : [];
      setDropdowns({
        styleName: norm(res.data.styleName),
        fabricType: norm(res.data.fabricType),
        printType: norm(res.data.printType),
        packingMaterial: norm(res.data.packingMaterial),
        finishing: norm(res.data.finishing),
      });
    }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(CM_URL, { params: { pageSize: 50 } });
      setRecords(res.data.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load records.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Live style-average preview whenever styleName + fabricType are both set.
  useEffect(() => {
    if (!form.styleName || !form.fabricType) { setStyleAveragePreview(null); return; }
    axios.get(`${CM_URL}/style-average-preview`, { params: { styleName: form.styleName, fabricType: form.fabricType } })
      .then((res) => setStyleAveragePreview(res.data.data.styleAverage))
      .catch(() => setStyleAveragePreview(null));
  }, [form.styleName, form.fabricType]);

  const finishingTotal = finishingLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const packingTotal = packingLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const otherTotal = otherLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const finalCostingPreview = (
    (Number(form.readyFabricRate) || 0) +
    (Number(form.cutting) || 0) +
    (Number(form.stitching) || 0) +
    finishingTotal + packingTotal + otherTotal
  ).toFixed(2);

  const submit = async () => {
    setSaving(true); setError('');
    try {
      const payload = { ...form, finishing: finishingLines, packingMaterial: packingLines, other: otherLines };
      await axios.post(CM_URL, payload);
      setForm(emptyForm); setFinishingLines([]); setPackingLines([]); setOtherLines([]); setStyleAveragePreview(null);
      flash(setSuccess, 'Cost Management entry created.');
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create entry.');
    } finally { setSaving(false); }
  };

  return (
    <div style={s.page}>
      <h2 style={s.h2}>Cost Management</h2>
      <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 20px' }}>Build up per-style final costing from fabric rate, cutting, stitching, finishing, packing, and other costs.</p>

      {!!error && <div style={s.error}>{error}</div>}
      {!!success && <div style={s.success}>{success}</div>}

      <div style={s.card}>
        <h3 style={s.h3}>New Cost Entry</h3>
        <div style={s.grid}>
          <div style={s.field}><span style={s.label}>Style Name</span>
            <DropdownWithOther options={dropdowns.styleName} value={form.styleName} onChange={(v) => setForm({ ...form, styleName: v })} />
          </div>
          <div style={s.field}><span style={s.label}>Fabric Type</span>
            <DropdownWithOther options={dropdowns.fabricType} value={form.fabricType} onChange={(v) => setForm({ ...form, fabricType: v })} allowOther={false} />
          </div>
          <div style={s.field}><span style={s.label}>Print Type</span>
            <DropdownWithOther options={dropdowns.printType} value={form.printType} onChange={(v) => setForm({ ...form, printType: v })} allowOther={false} />
          </div>
          <div style={s.field}><span style={s.label}>Ready Fabric Rate</span><input type="number" style={s.input} value={form.readyFabricRate} onChange={(e) => setForm({ ...form, readyFabricRate: e.target.value })} /></div>
          <div style={s.field}><span style={s.label}>Style Average (auto)</span><div style={s.computed}>{styleAveragePreview !== null ? styleAveragePreview : '—'}</div></div>
          <div style={s.field}><span style={s.label}>Cutting</span><input type="number" style={s.input} value={form.cutting} onChange={(e) => setForm({ ...form, cutting: e.target.value })} /></div>
          <div style={s.field}><span style={s.label}>Stitching</span><input type="number" style={s.input} value={form.stitching} onChange={(e) => setForm({ ...form, stitching: e.target.value })} /></div>
        </div>

        <div style={{ marginTop: 18 }}>
          <LineItemsEditor title="Finishing" lines={finishingLines} setLines={setFinishingLines} dropdownOptions={dropdowns.finishing} />
        </div>
        <div style={{ marginTop: 18 }}>
          <LineItemsEditor title="Packing Material" lines={packingLines} setLines={setPackingLines} dropdownOptions={dropdowns.packingMaterial} />
        </div>
        <div style={{ marginTop: 18 }}>
          <LineItemsEditor title="Other" lines={otherLines} setLines={setOtherLines} />
        </div>

        <div style={{ ...s.field, marginTop: 18 }}><span style={s.label}>Remark</span><textarea style={{ ...s.input, minHeight: 60 }} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>

        <div style={s.statRow}>
          <div style={s.stat}><div style={s.statLabel}>Final Costing (preview)</div><div style={s.statValue}>{finalCostingPreview}</div></div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button style={s.btn} disabled={saving} onClick={submit}>{saving ? 'Saving…' : 'Submit Cost Entry'}</button>
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
                  <th style={s.th}>Style</th>
                  <th style={s.th}>Fabric Type</th>
                  <th style={s.th}>Print Type</th>
                  <th style={s.th}>Style Average</th>
                  <th style={s.th}>Final Costing</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.recordId}>
                    <td style={s.td}>{r.recordId}</td>
                    <td style={s.td}>{r.styleName}</td>
                    <td style={s.td}>{r.fabricType}</td>
                    <td style={s.td}>{r.printType}</td>
                    <td style={s.td}>{r.styleAverage ?? '—'}</td>
                    <td style={s.td}>{r.finalCosting}</td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td style={s.td} colSpan={6}>No records.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
