import React from "react";
import { X, Download, ExternalLink, FileText, AlertCircle } from "lucide-react";
import { downloadFileBlob } from "../../lib/storage";

interface DocumentPreviewModalProps {
  documentUrl: string;
  title: string;
  fileName?: string;
  fileType?: string;
  onClose: () => void;
}

export function DocumentPreviewModal({
  documentUrl,
  title,
  fileName = "document.pdf",
  fileType = "pdf",
  onClose,
}: DocumentPreviewModalProps) {
  const isPdf = fileType.toLowerCase().includes("pdf") || fileName.toLowerCase().endsWith(".pdf");

  const handleDownload = () => {
    downloadFileBlob(documentUrl, fileName);
  };

  const handleOpenNewTab = () => {
    window.open(documentUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full h-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#065F46] px-5 py-3.5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate leading-tight">{title}</h3>
              <p className="text-xs text-emerald-200 truncate mt-0.5">{fileName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleOpenNewTab}
              className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-100 hover:text-white transition-colors text-xs font-medium flex items-center gap-1 px-2.5"
              title="Open in new window"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Open in Tab</span>
            </button>
            <button
              onClick={handleDownload}
              className="bg-white text-[#065F46] hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              title="Download Document"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-100 hover:text-white transition-colors ml-1"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Viewer Body */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center min-h-0">
          {isPdf ? (
            <iframe
              src={documentUrl}
              title={title}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className="p-8 text-center max-w-md bg-white rounded-xl shadow-sm border border-gray-200 m-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-[#065F46] rounded-2xl flex items-center justify-center mx-auto">
                <FileText size={32} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">{fileName}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  This document format ({fileType.toUpperCase()}) cannot be rendered directly in-browser. Download it or open in Microsoft Word to view.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="bg-[#065F46] text-white hover:bg-[#054a38] px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                >
                  <Download size={16} /> Download File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
