import React, { useState, useEffect } from "react";
import {
  Building2, Plus, Edit2, Trash2, ChevronRight, ChevronDown,
  GraduationCap, Search, AlertCircle, CheckCircle, X, BookOpen, Layers
} from "lucide-react";
import {
  fetchDepartments, createDepartment, updateDepartment, deleteDepartment,
  fetchProgrammes, createProgramme, updateProgramme, deleteProgramme
} from "../../lib/storage";

export function AdminDepartmentsView() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [loadingProgs, setLoadingProgs] = useState(false);

  // Department Modal State
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "" });
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState("");

  // Programme Modal State
  const [progModalOpen, setProgModalOpen] = useState(false);
  const [editingProg, setEditingProg] = useState<any>(null);
  const [progForm, setProgForm] = useState({ name: "", code: "", departmentId: "" });
  const [progSaving, setProgSaving] = useState(false);
  const [progError, setProgError] = useState("");

  const [message, setMessage] = useState("");

  const loadDepartments = () => {
    setLoading(true);
    fetchDepartments()
      .then((data) => {
        setDepartments(data || []);
        if (data && data.length > 0) {
          // Keep current selection or select first
          if (!selectedDept || !data.some((d: any) => d.id === selectedDept.id)) {
            setSelectedDept(data[0]);
          } else {
            setSelectedDept(data.find((d: any) => d.id === selectedDept.id));
          }
        } else {
          setSelectedDept(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (selectedDept?.id) {
      setLoadingProgs(true);
      fetchProgrammes(selectedDept.id)
        .then((progs) => setProgrammes(progs || []))
        .catch(console.error)
        .finally(() => setLoadingProgs(false));
    } else {
      setProgrammes([]);
    }
  }, [selectedDept]);

  // Handle Department CRUD
  const openCreateDept = () => {
    setEditingDept(null);
    setDeptForm({ name: "", code: "", description: "" });
    setDeptError("");
    setDeptModalOpen(true);
  };

  const openEditDept = (dept: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDept(dept);
    setDeptForm({ name: dept.name, code: dept.code, description: dept.description || "" });
    setDeptError("");
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim() || !deptForm.code.trim()) {
      setDeptError("Department name and code are required.");
      return;
    }
    setDeptSaving(true);
    setDeptError("");
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, deptForm);
        setMessage(`Department "${deptForm.name}" updated successfully.`);
      } else {
        await createDepartment(deptForm);
        setMessage(`Department "${deptForm.name}" created successfully.`);
      }
      setDeptModalOpen(false);
      loadDepartments();
    } catch (err: any) {
      setDeptError(err.response?.data?.message || "Failed to save department.");
    } finally {
      setDeptSaving(false);
    }
  };

  const handleDeleteDept = async (dept: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the department "${dept.name}"?`)) return;
    try {
      await deleteDepartment(dept.id);
      setMessage(`Department "${dept.name}" deleted.`);
      loadDepartments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete department.");
    }
  };

  // Handle Programme CRUD
  const openCreateProg = () => {
    if (!selectedDept) return;
    setEditingProg(null);
    setProgForm({ name: "", code: "", departmentId: selectedDept.id });
    setProgError("");
    setProgModalOpen(true);
  };

  const openEditProg = (prog: any) => {
    setEditingProg(prog);
    setProgForm({ name: prog.name, code: prog.code, departmentId: prog.departmentId });
    setProgError("");
    setProgModalOpen(true);
  };

  const handleSaveProg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progForm.name.trim() || !progForm.code.trim() || !progForm.departmentId) {
      setProgError("Programme name and code are required.");
      return;
    }
    setProgSaving(true);
    setProgError("");
    try {
      if (editingProg) {
        await updateProgramme(editingProg.id, progForm);
        setMessage(`Programme "${progForm.name}" updated successfully.`);
      } else {
        await createProgramme(progForm);
        setMessage(`Programme "${progForm.name}" added to ${selectedDept?.name}.`);
      }
      setProgModalOpen(false);
      if (selectedDept?.id) {
        const progs = await fetchProgrammes(selectedDept.id);
        setProgrammes(progs || []);
      }
    } catch (err: any) {
      setProgError(err.response?.data?.message || "Failed to save programme.");
    } finally {
      setProgSaving(false);
    }
  };

  const handleDeleteProg = async (prog: any) => {
    if (!confirm(`Are you sure you want to delete programme "${prog.name}"?`)) return;
    try {
      await deleteProgramme(prog.id);
      setMessage(`Programme "${prog.name}" deleted.`);
      if (selectedDept?.id) {
        const progs = await fetchProgrammes(selectedDept.id);
        setProgrammes(progs || []);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete programme.");
    }
  };

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Departments & Programmes</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Organize academic faculties, departments, and specific undergraduate/postgraduate programmes.
          </p>
        </div>
        <button
          onClick={openCreateDept}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#065F46] text-white rounded-lg text-sm font-semibold hover:bg-[#054a38] shadow-sm transition-all"
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-[#065F46] text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} /> {message}
          </div>
          <button onClick={() => setMessage("")} className="text-[#065F46] hover:opacity-75"><X size={14} /></button>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left List: Departments */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E5E7EB] bg-gray-50/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg flex-1">
              <Search size={14} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search departments…"
                className="bg-transparent text-xs outline-none w-full text-gray-700 placeholder-gray-400"
              />
            </div>
            <span className="text-xs font-bold text-gray-400 whitespace-nowrap">
              {filteredDepts.length} total
            </span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading departments…</div>
            ) : filteredDepts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">No departments found.</div>
            ) : (
              filteredDepts.map((d) => {
                const isSelected = selectedDept?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDept(d)}
                    className={`p-4 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-[#065F46]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-[#065F46] text-white" : "bg-emerald-50 text-[#065F46]"
                        }`}
                      >
                        <Building2 size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                          <span>{d.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {d.code}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {d.programmes?.length || 0} programmes · {d._count?.projects || 0} projects
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => openEditDept(d, e)}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-[#065F46]"
                        title="Edit Department"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteDept(d, e)}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500"
                        title="Delete Department"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={16} className={`text-gray-300 ${isSelected ? "text-[#065F46]" : ""}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Panel: Department Details & Linked Programmes */}
        <div className="lg:col-span-7 space-y-5">
          {selectedDept ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-gray-900">{selectedDept.name}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#065F46] border border-emerald-200">
                      {selectedDept.code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedDept.description || "No description provided for this department."}
                  </p>
                </div>
                <button
                  onClick={openCreateProg}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-[#065F46] hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold self-start transition-all"
                >
                  <Plus size={14} /> Add Programme
                </button>
              </div>

              {/* Programmes List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Degree Programmes ({programmes.length})
                  </h4>
                </div>

                {loadingProgs ? (
                  <div className="py-6 text-center text-xs text-gray-400">Loading programmes…</div>
                ) : programmes.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <GraduationCap size={28} className="mx-auto mb-2 opacity-40 text-[#065F46]" />
                    <p className="text-xs font-medium">No degree programmes linked to this department yet.</p>
                    <button
                      onClick={openCreateProg}
                      className="text-xs text-[#065F46] font-semibold hover:underline mt-1 inline-block"
                    >
                      + Add first programme
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {programmes.map((p) => (
                      <div
                        key={p.id}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-900 truncate">{p.name}</div>
                          <div className="text-[10px] font-semibold text-[#065F46] mt-0.5">{p.code}</div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            {p._count?.projects || 0} total projects submitted
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditProg(p)}
                            className="p-1 hover:bg-white rounded text-gray-400 hover:text-[#065F46]"
                            title="Edit Programme"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteProg(p)}
                            className="p-1 hover:bg-white rounded text-gray-400 hover:text-red-500"
                            title="Delete Programme"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-gray-400">
              <Building2 size={40} className="mx-auto mb-3 opacity-30 text-[#065F46]" />
              <p className="text-sm font-medium">Select a department from the left panel to inspect and manage its programmes.</p>
            </div>
          )}
        </div>
      </div>

      {/* DEPARTMENT CREATE/EDIT MODAL */}
      {deptModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">
                {editingDept ? "Edit Department" : "Create New Department"}
              </h3>
              <button onClick={() => setDeptModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {deptError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2 border border-red-200">
                <AlertCircle size={14} /> {deptError}
              </div>
            )}

            <form onSubmit={handleSaveDept} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department Name</label>
                <input
                  value={deptForm.name}
                  onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#065F46]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department Code</label>
                <input
                  value={deptForm.code}
                  onChange={(e) => setDeptForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. CSC"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase outline-none focus:border-[#065F46]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief summary of department scope or faculty affiliation…"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#065F46] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptSaving}
                  className="px-4 py-2 text-sm font-semibold bg-[#065F46] text-white hover:bg-[#054a38] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {deptSaving ? "Saving…" : editingDept ? "Update Department" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROGRAMME CREATE/EDIT MODAL */}
      {progModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">
                {editingProg ? "Edit Degree Programme" : "Add Degree Programme"}
              </h3>
              <button onClick={() => setProgModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {progError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2 border border-red-200">
                <AlertCircle size={14} /> {progError}
              </div>
            )}

            <form onSubmit={handleSaveProg} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Department</label>
                <select
                  value={progForm.departmentId}
                  onChange={(e) => setProgForm((f) => ({ ...f, departmentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#065F46] bg-white"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Programme Title</label>
                <input
                  value={progForm.name}
                  onChange={(e) => setProgForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. BSc Computer Science"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#065F46]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Programme Code</label>
                <input
                  value={progForm.code}
                  onChange={(e) => setProgForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. BSC-CS"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase outline-none focus:border-[#065F46]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setProgModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={progSaving}
                  className="px-4 py-2 text-sm font-semibold bg-[#065F46] text-white hover:bg-[#054a38] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {progSaving ? "Saving…" : editingProg ? "Update Programme" : "Add Programme"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
