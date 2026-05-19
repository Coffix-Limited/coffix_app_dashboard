"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionKey, parseCSV, RowError } from "./utils/csvParser";
import { generateTemplate, COLLECTION_LABELS } from "./utils/templateGenerator";
import { importRecords, ImportError } from "./service/ImportService";

const COLLECTIONS: CollectionKey[] = [
  "products",
  "productCategories",
  "modifiers",
  "modifierGroups",
  "coupons",
];

interface ImportSummary {
  created: number;
  updated: number;
  errors: ImportError[];
}

export default function ImportPage() {
  const [collection, setCollection] = useState<CollectionKey>("products");
  const [fileError, setFileError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [creates, setCreates] = useState<Record<string, any>[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updates, setUpdates] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetFile() {
    setFileError(null);
    setRowErrors([]);
    setPreview([]);
    setCreates([]);
    setUpdates([]);
    setFileName(null);
    setSummary(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleCollectionChange(col: CollectionKey) {
    setCollection(col);
    resetFile();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSummary(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSV(text, collection);

      if (result.fileError) {
        setFileError(result.fileError);
        setRowErrors([]);
        setPreview([]);
        setCreates([]);
        setUpdates([]);
        return;
      }

      setFileError(null);
      setRowErrors(result.errors);
      setCreates(result.creates);
      setUpdates(result.updates);

      const allRows = [...result.creates, ...result.updates];
      setPreview(allRows.slice(0, 10));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!creates.length && !updates.length) return;
    setImporting(true);
    try {
      const result = await importRecords(collection, creates, updates);
      setSummary(result);
      if (result.errors.length === 0) {
        toast.success(`Import complete: ${result.created} created, ${result.updated} updated.`);
      } else {
        toast.warning(`Import done with ${result.errors.length} error(s). See summary below.`);
      }
      resetFile();
    } catch (err) {
      console.error(err);
      toast.error("Import failed. Check the console for details.");
    } finally {
      setImporting(false);
    }
  }

  const hasData = creates.length > 0 || updates.length > 0;
  const canImport = hasData && rowErrors.length === 0 && !fileError;
  const previewHeaders = preview.length ? Object.keys(preview[0]) : [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV to create or update records. Leave <code className="bg-gray-100 px-1 rounded">docId</code> blank to create; fill it in to update.
        </p>
      </div>

      {/* Collection selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Collection</label>
        <div className="flex flex-wrap gap-2">
          {COLLECTIONS.map((col) => (
            <button
              key={col}
              onClick={() => handleCollectionChange(col)}
              data-active={collection === col}
              className="px-3 py-1.5 text-sm rounded-lg border border-border transition-colors data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary hover:bg-soft-grey hover:text-white"
            >
              {COLLECTION_LABELS[col]}
            </button>
          ))}
        </div>
      </div>

      {/* Template download */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateTemplate(collection)}
        >
          <Download size={14} className="mr-1.5" />
          Download {COLLECTION_LABELS[collection]} Template
        </Button>
        <span className="text-xs text-gray-400">Get the blank CSV with the correct column headers.</span>
      </div>

      {/* File upload */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && fileRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileRef.current.files = dt.files;
            fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />
        <Upload size={28} className="mx-auto mb-2 text-gray-400" />
        {fileName ? (
          <p className="text-sm font-medium flex items-center justify-center gap-1.5">
            <FileText size={14} />
            {fileName}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Click or drag &amp; drop a <strong>.csv</strong> file here
          </p>
        )}
      </div>

      {/* File-level error */}
      {fileError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {/* Row-level errors */}
      {rowErrors.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-1">
          <p className="text-sm font-medium text-yellow-800 flex items-center gap-1.5">
            <AlertCircle size={14} />
            {rowErrors.length} row(s) have validation errors and will be skipped:
          </p>
          <ul className="text-xs text-yellow-700 list-disc list-inside space-y-0.5 max-h-40 overflow-y-auto">
            {rowErrors.map((e) => (
              <li key={e.row}>
                Row {e.row}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Preview ({creates.length} to create, {updates.length} to update
            {rowErrors.length > 0 ? `, ${rowErrors.length} skipped` : ""})
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  {previewHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {previewHeaders.map((h) => (
                      <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                        {Array.isArray(row[h]) ? row[h].join(" | ") : String(row[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {creates.length + updates.length > 10 && (
              <p className="px-3 py-2 text-xs text-gray-400 border-t border-border">
                Showing first 10 of {creates.length + updates.length} rows.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Import button */}
      {hasData && (
        <div className="flex gap-3 items-center">
          <Button
            onClick={handleImport}
            disabled={!canImport || importing}
          >
            {importing ? "Importing…" : `Import ${creates.length + updates.length} row(s)`}
          </Button>
          <Button variant="outline" onClick={resetFile} disabled={importing}>
            Clear
          </Button>
          {rowErrors.length > 0 && (
            <span className="text-xs text-yellow-600">
              {rowErrors.length} row(s) will be skipped due to errors.
            </span>
          )}
        </div>
      )}

      {/* Post-import summary */}
      {summary && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
          <p className="text-sm font-medium text-green-800 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            Import complete
          </p>
          <ul className="text-sm text-green-700 space-y-0.5">
            <li>{summary.created} document(s) created</li>
            <li>{summary.updated} document(s) updated</li>
            {summary.errors.length > 0 && (
              <li className="text-red-600">{summary.errors.length} row(s) failed</li>
            )}
          </ul>
          {summary.errors.length > 0 && (
            <ul className="text-xs text-red-600 list-disc list-inside max-h-32 overflow-y-auto">
              {summary.errors.map((e, i) => (
                <li key={i}>
                  {e.docId}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
