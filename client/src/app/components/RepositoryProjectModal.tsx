import React from "react";
import { X, Download, Eye, BookMarked, Building2, Calendar, User, GraduationCap } from "lucide-react";
import { getRepositoryDownloadUrl, downloadFileBlob } from "../../lib/storage";

interface RepositoryProjectModalProps {
  project: any;
  onClose: () => void;
  onPreviewDocument: (url: string, title: string, fileName?: string) => void;
}

export function RepositoryProjectModal({
  project,
  onClose,
  onPreviewDocument,
}: RepositoryProjectModalProps) {
  if (!project) return null;

  const previewUrl = getRepositoryDownloadUrl(project.id, true);
  const downloadUrl = getRepositoryDownloadUrl(project.id, false);

  const handleDownload = () => {
    downloadFileBlob(downloadUrl, `${project.title || "project"}.pdf`);
  };

  const handlePreview = () => {
    onPreviewDocument(previewUrl, project.title, `${project.title}.pdf`);
  };

  const studentName = project.student
    ? `${project.student.firstName} ${project.student.lastName}`
    : "Anonymous Student";

  const supervisorName = project.supervisor
    ? `${project.supervisor.supervisorProfile?.title ? project.supervisor.supervisorProfile.title + " " : ""}${project.supervisor.firstName} ${project.supervisor.lastName}`
    : "Not specified";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-[#065F46]">
              <BookMarked size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Archived Research Project</h3>
              <p className="text-xs text-gray-400">Institutional Repository Record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{project.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#065F46] border border-emerald-200">
                {project.department?.name || "General Department"}
              </span>
              {project.programme?.name && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {project.programme.name}
                </span>
              )}
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {project.academicYear || "—"}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid sm:grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs">
            <div className="flex items-start gap-2.5">
              <User size={15} className="text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-400 block mb-0.5">Author (Student)</span>
                <span className="font-semibold text-gray-800">{studentName}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <GraduationCap size={15} className="text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-400 block mb-0.5">Supervisor</span>
                <span className="font-semibold text-gray-800">{supervisorName}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Building2 size={15} className="text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-400 block mb-0.5">Faculty / Department</span>
                <span className="font-semibold text-gray-800">{project.department?.name || "—"}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Calendar size={15} className="text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-400 block mb-0.5">Academic Session</span>
                <span className="font-semibold text-gray-800">{project.academicYear || "—"}</span>
              </div>
            </div>
          </div>

          {/* Abstract */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Abstract</h4>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {project.abstract || "No abstract provided for this project."}
            </div>
          </div>

          {/* Keywords */}
          {project.keywords && (
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Keywords</h4>
              <div className="flex flex-wrap gap-1.5">
                {project.keywords.split(",").map((kw: string, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
                    #{kw.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-[#E5E7EB] flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePreview}
            className="px-4 py-2 text-sm font-semibold bg-emerald-50 text-[#065F46] hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Eye size={15} /> Preview Document
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm font-semibold bg-[#065F46] text-white hover:bg-[#054a38] rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download size={15} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
