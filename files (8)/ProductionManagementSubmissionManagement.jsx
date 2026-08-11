import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  RiTruckLine, RiImageAddLine, RiCheckboxCircleLine, RiErrorWarningLine,
  RiInboxArchiveLine, RiHistoryLine, RiArrowDownSLine, RiArrowRightSLine,
  RiUserAddLine,
} from 'react-icons/ri';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const RECORD_URL = `${API_BASE_URL}/production-management-record`;
const DATA_URL = `${API_BASE_URL}/production-management-data`;
const FABRICATOR_RATE_URL = `${API_BASE_URL}/production-management/fabricator-rate`;

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const emptySizes = () => ({ S: '', M: '', L: '', XL: '', XXL: '', XXXL: '' });

const sumClean = (sizes) => SIZES.reduce((t, k) => t + (Number(sizes[k]) || 0), 0);

// ── shared design tokens — matches Printing pages' pill/orange system ──────
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-orange-600 mb-2';
const pillInput =
  'w-full rounded-full border border-gray-300 bg-white px-5 py-3 text-base text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition disabled:bg-gray-50 disabled:text-gray-400';
const fileInput =
  'block w-full text-sm text-gray-600 rounded-xl border border-gray-300 bg-white px-3 py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-orange-50 file:text-orange-600 file:font-semibold file:px-4 file:py-1.5 file:text-xs hover:file:bg-orange-100';
const computedBox = 'w-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-3 text-base font-semibold text-gray-900';
const primaryBtn =
  'flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white px-7 py-3 font-semibold text-sm shadow-sm transition disabled:bg-gray-300 disabled:cursor-not-allowed';
const smallActionBtn =
  'flex items-center gap-1 rounded-full border border-orange-200 whitespace-nowrap bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1.5 transition';

const STATUS_STYLES = {
  pending: 'bg-red-50 text-red-700 border-red-200',
  'partially-received': 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
};

function StatusPill({ status }) {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

function Banner({ type, children }) {
  if (!children) return null;
  const isError = type === 'error';
  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium mb-5 ${
      isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
    }`}>
      {isError ? <RiErrorWarningLine className="text-base" /> : <RiCheckboxCircleLine className="text-base" />}
      {children}
    </div>
  );
}

// Size-wise input grid. `limits` (optional) shows a cap per size beneath each field.
function SizeGrid({ values, onChange, limits, disabled }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
      {SIZES.map((sz) => (
        <div key={sz}>
          <div className="text-[11px] font-semibold text-gray-400 uppercase mb-1 text-center">{sz}</div>
          <input
            type="number"
            min={0}
            disabled={disabled}
            className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-center text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition disabled:bg-gray-100 disabled:text-gray-400"
            value={values[sz]}
            onChange={(e) => onChange({ ...values, [sz]: e.target.value })}
          />
          {limits && (
            <div className="text-[10px] text-gray-400 text-center mt-1">of {limits[sz] ?? 0}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function SizeSummaryRow({ sizes }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
      {SIZES.map((sz) => (
        <div key={sz} className="text-center">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">{sz}</div>
          <div className="text-base font-bold text-gray-900">{sizes?.[sz] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

// cutting.sizes minus everything already assigned across fabricators, size-wise.
function computeUnassignedPool(record) {
  const cut = record?.cutting?.sizes || {};
  const assigned = (record?.fabricators || []).reduce((acc, f) => {
    const a = f.assignedSizes || {};
    SIZES.forEach((sz) => { acc[sz] = (acc[sz] || 0) + (Number(a[sz]) || 0); });
    return acc;
  }, {});
  const pool = {};
  SIZES.forEach((sz) => { pool[sz] = Math.max(0, (Number(cut[sz]) || 0) - (assigned[sz] || 0)); });
  return pool;
}

export default function ProductionManagementSubmissionManagement() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // taskId of the expanded row
  const [dropdowns, setDropdowns] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Assign-to-fabricator form state ──────────────────────────────────────
  const [showFabricatorOther, setShowFabricatorOther] = useState(false);
  const [assignFabricatorName, setAssignFabricatorName] = useState('');
  const [assignSizes, setAssignSizes] = useState(emptySizes());
  const [assignRate, setAssignRate] = useState('');
  const [rateAutoFetched, setRateAutoFetched] = useState(false);
  const [assignPhoto, setAssignPhoto] = useState(null);

  // ── Record-receiving form state (keyed by fabricator subdocument _id) ───
  const [activeReceivingFor, setActiveReceivingFor] = useState(null); // fabricator._id
  const [showReceiverOther, setShowReceiverOther] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ passcode: '', receiverName: '' });
  const [receiveSizes, setReceiveSizes] = useState(emptySizes());
  const [receivingEntryPhoto, setReceivingEntryPhoto] = useState(null);

  const flash = (fn, msg) => { fn(msg); setTimeout(() => fn(''), 3000); };

  // Cutting-completed records.
  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${RECORD_URL}`, { params: { taskType: 'ReadyFabric', readyFabricStatus: 'done', pageSize: 100 } });
      const withCutting = (res.data.data || []).filter((r) => r.cutting && r.cutting.totalPieces);
      setRecords(withCutting);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load records.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    axios.get(`${DATA_URL}/dropdowns`).then((res) => {
      const norm = (arr) => Array.isArray(arr) ? arr.map((v) => (typeof v === 'object' && v?.name != null ? v.name : v)) : [];
      setDropdowns({ fabricatorName: norm(res.data.fabricatorName), receiverName: norm(res.data.receiverName) });
    }).catch(() => {});
  }, []);

  const selectedRecord = records.find((r) => r.taskId === selected) || null;

  const resetAssignForm = () => {
    setAssignFabricatorName('');
    setShowFabricatorOther(false);
    setAssignSizes(emptySizes());
    setAssignRate('');
    setRateAutoFetched(false);
    setAssignPhoto(null);
  };

  const resetReceiveForm = () => {
    setActiveReceivingFor(null);
    setShowReceiverOther(false);
    setReceiveForm({ passcode: '', receiverName: '' });
    setReceiveSizes(emptySizes());
    setReceivingEntryPhoto(null);
  };

  const toggleRow = (r) => {
    if (selected === r.taskId) {
      setSelected(null);
      return;
    }
    setSelected(r.taskId);
    resetAssignForm();
    resetReceiveForm();
    setError(''); setSuccess('');
  };

  // When a record gets updated in place (after assign/receiving), keep the
  // records array in sync so the expanded row reflects the latest data.
  const patchSelectedRecord = (updated) => {
    setRecords((prev) => prev.map((r) => (r.taskId === updated.taskId ? updated : r)));
  };

  // Auto-fetch the rate whenever the chosen fabricator (and the record's
  // cutting styleCutting) are known, unless the user has manually typed one.
  useEffect(() => {
    if (!selectedRecord || !assignFabricatorName || rateAutoFetched) return;
    const styleCutting = selectedRecord.cutting?.styleCutting;
    if (!styleCutting) return;
    axios.get(`${FABRICATOR_RATE_URL}/lookup`, {
      params: { styleName: selectedRecord.styleName, styleCutting, fabricatorName: assignFabricatorName },
    }).then((res) => {
      setAssignRate(String(res.data?.data?.rate ?? ''));
      setRateAutoFetched(true);
    }).catch(() => {
      setRateAutoFetched(true); // stop retrying; user can type it in manually
    });
  }, [selectedRecord, assignFabricatorName, rateAutoFetched]);

  const pool = selectedRecord ? computeUnassignedPool(selectedRecord) : {};
  const remainingAfterAssign = SIZES.reduce((acc, sz) => {
    acc[sz] = Math.max(0, (pool[sz] || 0) - (Number(assignSizes[sz]) || 0));
    return acc;
  }, {});
  const assignTotal = sumClean(assignSizes);

  const submitAssign = async () => {
    if (!selectedRecord || !assignFabricatorName) return;
    const overSize = SIZES.find((sz) => (Number(assignSizes[sz]) || 0) > (pool[sz] || 0));
    if (overSize) {
      setError(`Cannot assign more than ${pool[overSize]} pcs for size ${overSize}.`);
      return;
    }
    if (assignTotal <= 0) {
      setError('Enter at least one size with pieces to assign.');
      return;
    }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('fabricatorName', assignFabricatorName);
      fd.append('styleCutting', selectedRecord.cutting?.styleCutting || '');
      fd.append('assignedSizes', JSON.stringify({
        S: Number(assignSizes.S) || 0, M: Number(assignSizes.M) || 0, L: Number(assignSizes.L) || 0,
        XL: Number(assignSizes.XL) || 0, XXL: Number(assignSizes.XXL) || 0, XXXL: Number(assignSizes.XXXL) || 0,
      }));
      if (assignRate !== '') fd.append('ratePerPiece', assignRate);
      if (assignPhoto) fd.append('challanPhotoUpload', assignPhoto);

      const res = await axios.post(`${RECORD_URL}/${selectedRecord.taskId}/fabricator/assign`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      patchSelectedRecord(res.data.data);
      flash(setSuccess, 'Pieces assigned to fabricator.');
      resetAssignForm();
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to assign fabricator.');
    } finally { setSaving(false); }
  };

  const startReceiving = (fab) => {
    setActiveReceivingFor(fab._id);
    setShowReceiverOther(false);
    setReceiveForm({ passcode: '', receiverName: '' });
    setReceiveSizes(emptySizes());
    setReceivingEntryPhoto(null);
    setError(''); setSuccess('');
  };

  const receiveTotal = sumClean(receiveSizes);
  const activeFabricator = selectedRecord?.fabricators?.find((f) => f._id === activeReceivingFor) || null;
  const receiveAmount = activeFabricator ? (receiveTotal * (Number(activeFabricator.ratePerPiece) || 0)).toFixed(2) : '0.00';

  const submitReceiving = async () => {
    if (!selectedRecord || !activeFabricator) return;
    const due = activeFabricator.duePieces || {};
    const overSize = SIZES.find((sz) => (Number(receiveSizes[sz]) || 0) > (due[sz] || 0));
    if (overSize) {
      setError(`Cannot receive more than ${due[overSize] || 0} pcs for size ${overSize} from ${activeFabricator.fabricatorName}.`);
      return;
    }
    if (receiveTotal <= 0) {
      setError('Enter at least one size with pieces received.');
      return;
    }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('passcode', receiveForm.passcode);
      fd.append('receiverName', receiveForm.receiverName);
      fd.append('receivedSizes', JSON.stringify({
        S: Number(receiveSizes.S) || 0, M: Number(receiveSizes.M) || 0, L: Number(receiveSizes.L) || 0,
        XL: Number(receiveSizes.XL) || 0, XXL: Number(receiveSizes.XXL) || 0, XXXL: Number(receiveSizes.XXXL) || 0,
      }));
      if (receivingEntryPhoto) fd.append('challanPhotoUpload', receivingEntryPhoto);

      const res = await axios.post(`${RECORD_URL}/${selectedRecord.taskId}/fabricator/${activeFabricator._id}/receiving`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      patchSelectedRecord(res.data.data);
      flash(setSuccess, 'Receiving entry recorded.');
      resetReceiveForm();
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to record receiving.');
    } finally { setSaving(false); }
  };

  const COL_COUNT = 8; // Task ID, Style Name, Fabric Type, Dyer/Printer, MTR(L100), Cut Total, Fabricators, Action

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
          <RiTruckLine className="text-lg" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Fabricator / Dispatch</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-12">
        Split cut pieces across one or more fabricators, then record each fabricator's receivings separately (can be partial, multiple times). Select a row to begin.
      </p>

      <Banner type="error">{error}</Banner>
      <Banner type="success">{success}</Banner>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6">
        {loading ? (
          <div className="text-sm text-gray-500 py-6 text-center">Loading…</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2.5 font-semibold">Task ID</th>
                  <th className="px-4 py-2.5 font-semibold">Style Name</th>
                  <th className="px-4 py-2.5 font-semibold">Fabric Type</th>
                  <th className="px-4 py-2.5 font-semibold">Dyer / Printer Name</th>
                  <th className="px-4 py-2.5 font-semibold">MTR (L100)</th>
                  <th className="px-4 py-2.5 font-semibold">Cut Total (pcs)</th>
                  <th className="px-4 py-2.5 font-semibold">Fabricators</th>
                  <th className="px-4 py-2.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const isOpen = selected === r.taskId;
                  const rec = isOpen && selectedRecord ? selectedRecord : r;
                  const fabricators = rec.fabricators || [];
                  const recPool = computeUnassignedPool(rec);
                  const fullyAssigned = SIZES.every((sz) => (recPool[sz] || 0) === 0);
                  return (
                    <React.Fragment key={r.taskId}>
                      <tr
                        className={`border-t border-gray-100 hover:bg-orange-50/40 transition cursor-pointer ${isOpen ? 'bg-orange-50/60' : ''}`}
                        onClick={() => toggleRow(r)}
                      >
                        <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{rec.taskId}</td>
                        <td className="px-4 py-2.5 text-gray-700">{rec.styleName}</td>
                        <td className="px-4 py-2.5 text-gray-700">{rec.fabricType}</td>
                        <td className="px-4 py-2.5 text-gray-700">{rec.dyerName}</td>
                        <td className="px-4 py-2.5 text-gray-700">{rec.mtrL100}</td>
                        <td className="px-4 py-2.5 text-gray-700">{rec.cutting?.totalPieces ?? 0}</td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {fabricators.length === 0 ? (
                            <span className="text-gray-400">Not dispatched</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {fabricators.map((f) => (
                                <span key={f._id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                                  {f.fabricatorName}
                                  <StatusPill status={f.status} />
                                </span>
                              ))}
                              {!fullyAssigned && (
                                <span className="inline-flex items-center rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-[11px] text-gray-400">
                                  + unassigned pieces
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            className={smallActionBtn}
                            onClick={(e) => { e.stopPropagation(); toggleRow(r); }}
                          >
                            {isOpen ? <RiArrowDownSLine className="text-[13px]" /> : <RiArrowRightSLine className="text-[13px]" />}
                            {isOpen ? 'Close' : 'Manage'}
                          </button>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan={COL_COUNT} className="px-6 pb-6 pt-0 bg-gray-50 border-t-0">
                            <div className="mt-3 rounded-2xl border border-orange-200 bg-white shadow-sm p-6">
                              <h3 className="text-lg font-bold text-gray-900">{rec.taskId}</h3>
                              <p className="text-sm text-gray-500 mb-5">{rec.styleName} · Cut total: {rec.cutting?.totalPieces} pcs</p>

                              <div className="mb-2">
                                <span className={labelClass}>Cut Total (per size)</span>
                              </div>
                              <div className="mb-6"><SizeSummaryRow sizes={rec.cutting?.sizes} /></div>

                              <div className="mb-2 flex items-center justify-between">
                                <span className={labelClass}>Unassigned / Remaining Pool (per size)</span>
                              </div>
                              <div className="mb-8"><SizeSummaryRow sizes={recPool} /></div>

                              {/* ── Assign to a new fabricator ─────────────────────── */}
                              {!fullyAssigned && (
                                <div className="mb-8 rounded-2xl border border-gray-200 p-5">
                                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-gray-800 mb-4">
                                    <RiUserAddLine /> Assign Pieces to a Fabricator
                                  </h4>

                                  <div className="mb-5">
                                    <span className={labelClass}>Fabricator Name</span>
                                    <select
                                      className={pillInput}
                                      value={
                                        dropdowns.fabricatorName?.includes(assignFabricatorName) && !showFabricatorOther
                                          ? assignFabricatorName
                                          : showFabricatorOther
                                          ? '__other__'
                                          : (assignFabricatorName ? '__other__' : '')
                                      }
                                      onChange={(e) => {
                                        if (e.target.value === '__other__') {
                                          setShowFabricatorOther(true);
                                          setAssignFabricatorName('');
                                        } else {
                                          setShowFabricatorOther(false);
                                          setAssignFabricatorName(e.target.value);
                                        }
                                        setAssignRate('');
                                        setRateAutoFetched(false);
                                      }}
                                    >
                                      <option value="">Select…</option>
                                      {(dropdowns.fabricatorName || [])
                                        .filter((o) => !(rec.fabricators || []).some((f) => f.fabricatorName === o))
                                        .map((o) => <option key={o} value={o}>{o}</option>)}
                                      <option value="__other__">Other…</option>
                                    </select>
                                    {showFabricatorOther && (
                                      <input
                                        className={`${pillInput} mt-2`}
                                        placeholder="Enter name"
                                        value={assignFabricatorName}
                                        onChange={(e) => { setAssignFabricatorName(e.target.value); setAssignRate(''); setRateAutoFetched(false); }}
                                      />
                                    )}
                                  </div>

                                  <div className="mb-2">
                                    <span className={labelClass}>Pieces to Assign (per size)</span>
                                  </div>
                                  <div className="mb-3">
                                    <SizeGrid values={assignSizes} onChange={setAssignSizes} limits={pool} />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                    <div>
                                      <span className={labelClass}>Total Pieces Assigned (auto)</span>
                                      <div className={computedBox}>{assignTotal}</div>
                                    </div>
                                    <div>
                                      <span className={labelClass}>Remaining Pool After This (auto)</span>
                                      <div className={computedBox}>{sumClean(remainingAfterAssign)} pcs</div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                    <div>
                                      <span className={labelClass}>Rate per Piece {rateAutoFetched ? '(auto-fetched, editable)' : ''}</span>
                                      <input type="number" step="any" className={pillInput} value={assignRate} onChange={(e) => setAssignRate(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div>
                                      <span className={labelClass}><RiImageAddLine className="inline -mt-0.5 mr-1" />Fabricator Receiver Ch. Photo</span>
                                      <input type="file" accept="image/*" className={fileInput} onChange={(e) => setAssignPhoto(e.target.files[0])} />
                                    </div>
                                  </div>

                                  <button className={primaryBtn} disabled={saving || !assignFabricatorName || assignTotal <= 0} onClick={submitAssign}>
                                    <RiTruckLine />
                                    {saving ? 'Assigning…' : 'Assign to Fabricator'}
                                  </button>
                                </div>
                              )}

                              {/* ── Existing fabricator assignments ────────────────── */}
                              {(rec.fabricators || []).map((fab) => (
                                <div key={fab._id} className="mb-6 rounded-2xl border border-gray-200 p-5">
                                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                                    <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                                      {fab.fabricatorName}
                                      <StatusPill status={fab.status} />
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Rate: <span className="font-semibold text-gray-700">{fab.ratePerPiece}</span> / pc
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div>
                                      <span className={labelClass}>Assigned</span>
                                      <div className={computedBox}>{fab.totalAssignedPieces} pcs</div>
                                    </div>
                                    <div>
                                      <span className={labelClass}>Due (remaining)</span>
                                      <div className={computedBox}>{fab.totalDuePieces} pcs</div>
                                    </div>
                                    <div>
                                      <span className={labelClass}>Received so far</span>
                                      <div className={computedBox}>{fab.totalAssignedPieces - fab.totalDuePieces} pcs</div>
                                    </div>
                                  </div>

                                  {fab.status !== 'completed' && activeReceivingFor !== fab._id && (
                                    <button className={smallActionBtn} onClick={() => startReceiving(fab)}>
                                      <RiCheckboxCircleLine className="text-[13px]" /> Record Receiving
                                    </button>
                                  )}

                                  {activeReceivingFor === fab._id && (
                                    <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-200 p-5">
                                      <h5 className="text-sm font-bold text-gray-800 mb-3">Record Receiving — {fab.fabricatorName}</h5>

                                      <div className="mb-2">
                                        <span className={labelClass}>Pieces Received Now (per size)</span>
                                      </div>
                                      <div className="mb-4">
                                        <SizeGrid values={receiveSizes} onChange={setReceiveSizes} limits={fab.duePieces} />
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <div>
                                          <span className={labelClass}>Total Received Now (auto)</span>
                                          <div className={computedBox}>{receiveTotal} pcs</div>
                                        </div>
                                        <div>
                                          <span className={labelClass}>Amount (auto)</span>
                                          <div className={computedBox}>{receiveAmount}</div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <div>
                                          <span className={labelClass}>Passcode</span>
                                          <input type="password" className={pillInput} value={receiveForm.passcode} onChange={(e) => setReceiveForm({ ...receiveForm, passcode: e.target.value })} />
                                        </div>
                                        <div>
                                          <span className={labelClass}>Receiver Name</span>
                                          <select
                                            className={pillInput}
                                            value={
                                              dropdowns.receiverName?.includes(receiveForm.receiverName) && !showReceiverOther
                                                ? receiveForm.receiverName
                                                : showReceiverOther
                                                ? '__other__'
                                                : (receiveForm.receiverName ? '__other__' : '')
                                            }
                                            onChange={(e) => {
                                              if (e.target.value === '__other__') {
                                                setShowReceiverOther(true);
                                                setReceiveForm({ ...receiveForm, receiverName: '' });
                                              } else {
                                                setShowReceiverOther(false);
                                                setReceiveForm({ ...receiveForm, receiverName: e.target.value });
                                              }
                                            }}
                                          >
                                            <option value="">Select…</option>
                                            {(dropdowns.receiverName || []).map((o) => <option key={o} value={o}>{o}</option>)}
                                            <option value="__other__">Other…</option>
                                          </select>
                                          {showReceiverOther && (
                                            <input
                                              className={`${pillInput} mt-2`}
                                              placeholder="Enter name"
                                              value={receiveForm.receiverName}
                                              onChange={(e) => setReceiveForm({ ...receiveForm, receiverName: e.target.value })}
                                            />
                                          )}
                                        </div>
                                      </div>

                                      <div className="mb-5">
                                        <span className={labelClass}><RiImageAddLine className="inline -mt-0.5 mr-1" />Receiving Entry Photo</span>
                                        <input type="file" accept="image/*" className={fileInput} onChange={(e) => setReceivingEntryPhoto(e.target.files[0])} />
                                      </div>

                                      <div className="flex gap-3">
                                        <button className={primaryBtn} disabled={saving || receiveTotal <= 0} onClick={submitReceiving}>
                                          <RiCheckboxCircleLine />
                                          {saving ? 'Submitting…' : 'Submit Receiving'}
                                        </button>
                                        <button className={smallActionBtn} onClick={resetReceiveForm}>Cancel</button>
                                      </div>
                                    </div>
                                  )}

                                  {fab.receivings?.length > 0 && (
                                    <div className="mt-5">
                                      <h5 className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                                        <RiHistoryLine /> Receiving History
                                      </h5>
                                      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-400">
                                              <th className="px-4 py-2.5 font-semibold">Date</th>
                                              <th className="px-4 py-2.5 font-semibold">Received</th>
                                              <th className="px-4 py-2.5 font-semibold">Rate</th>
                                              <th className="px-4 py-2.5 font-semibold">Amount</th>
                                              <th className="px-4 py-2.5 font-semibold">Receiver</th>
                                              <th className="px-4 py-2.5 font-semibold">Due After</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {fab.receivings.map((r2, i) => (
                                              <tr key={i} className="border-t border-gray-100">
                                                <td className="px-4 py-2.5 text-gray-700">{new Date(r2.receivedAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-2.5 text-gray-700">{r2.totalReceivedPieces}</td>
                                                <td className="px-4 py-2.5 text-gray-700">{r2.ratePerPiece}</td>
                                                <td className="px-4 py-2.5 text-gray-700">{r2.totalAmount}</td>
                                                <td className="px-4 py-2.5 text-gray-700">{r2.receiverName}</td>
                                                <td className="px-4 py-2.5 text-gray-700">{SIZES.reduce((sum, sz) => sum + (r2.dueAfterEntry?.[sz] || 0), 0)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {(rec.fabricators || []).length === 0 && (
                                <div className="text-sm text-gray-400 text-center py-4">No fabricators assigned yet.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {!loading && records.length === 0 && (
                  <tr>
                    <td colSpan={COL_COUNT} className="px-4 py-10 text-center text-gray-400">
                      <div className="flex flex-col items-center">
                        <RiInboxArchiveLine className="text-3xl mb-2" />
                        <span className="text-sm">No cutting-completed records yet.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
