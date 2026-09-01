import React, { useState, useEffect } from "react";
import { Activity, Search, Shield, User, Clock, Filter, RefreshCw } from "lucide-react";
import { fetchAuditLogs } from "../../lib/storage";

export function AdminAuditView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");

  const loadLogs = () => {
    setLoading(true);
    fetchAuditLogs({ limit: 100 })
      .then((res) => {
        setLogs(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const actionColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("APPROVE")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (action.includes("REJECT") || action.includes("DELETE")) return "bg-red-50 text-red-700 border-red-200";
    if (action.includes("REVISION") || action.includes("UPDATE")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType.toLowerCase().includes(search.toLowerCase()) ||
      (log.user && `${log.user.firstName} ${log.user.lastName} ${log.user.email}`.toLowerCase().includes(search.toLowerCase()));
    const matchesEntity = entityFilter === "ALL" || log.entityType === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Audit Trail</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Immutable log of all user registrations, project reviews, document uploads, and administrative changes.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold shadow-sm transition-all self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-[#E5E7EB] rounded-lg flex-1 min-w-[200px]">
          <Search size={15} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, user name, email, or entity ID…"
            className="bg-transparent text-xs outline-none w-full text-gray-700 placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#065F46]"
          >
            <option value="ALL">All Entities</option>
            <option value="PROJECT">Projects</option>
            <option value="USER">Users</option>
            <option value="DEPARTMENT">Departments</option>
            <option value="PROGRAMME">Programmes</option>
            <option value="AUTH">Authentication</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
        <div className="hidden md:grid grid-cols-12 px-5 py-3.5 bg-gray-50 border-b border-[#E5E7EB] text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Action</div>
          <div className="col-span-3">Actor / User</div>
          <div className="col-span-2">Entity Target</div>
          <div className="col-span-2">IP / Client</div>
          <div className="col-span-2 text-right">Timestamp</div>
        </div>

        <div className="divide-y divide-gray-100 max-h-[650px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading audit trail…</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Activity size={32} className="mx-auto mb-2 opacity-40 text-[#065F46]" />
              <p className="text-xs font-medium">No audit logs matching current filter criteria.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="grid md:grid-cols-12 gap-2 md:gap-0 px-5 py-3.5 hover:bg-gray-50/60 transition-colors items-center text-xs"
              >
                <div className="md:col-span-3 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${actionColor(log.action)}`}>
                    {log.action}
                  </span>
                </div>

                <div className="md:col-span-3 min-w-0 pr-2">
                  {log.user ? (
                    <div>
                      <div className="font-semibold text-gray-900 truncate">
                        {log.user.firstName} {log.user.lastName}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">{log.user.email}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 font-mono text-[11px]">System / Anonymous</span>
                  )}
                </div>

                <div className="md:col-span-2 flex flex-col">
                  <span className="font-semibold text-gray-700 uppercase text-[10px] tracking-wider">
                    {log.entityType}
                  </span>
                  <span className="text-gray-400 font-mono text-[10px] truncate max-w-[120px]">
                    {log.entityId}
                  </span>
                </div>

                <div className="md:col-span-2 text-gray-500 font-mono text-[11px] truncate">
                  {log.ipAddress || "127.0.0.1"}
                </div>

                <div className="md:col-span-2 text-right text-gray-400 text-[11px]">
                  {new Date(log.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
