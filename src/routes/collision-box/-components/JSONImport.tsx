import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { FileJson2, Upload, XCircle } from 'lucide-react';
import type { CollisionBox } from '../types';

type ImportMode = 'per-element' | 'aggregate';

const VALID_ROTATION_ANGLES = [-45, -22.5, 0, 22.5, 45];

interface JSONImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (boxes: CollisionBox[], replaceExisting: boolean) => void;
}

interface ParsedElement {
  name: string;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

const clampCoord = (value: number) => Math.max(0, Math.min(16, Number(value.toFixed(2))));

const normalizeBounds = (fromValue: number, toValue: number) => {
  const min = clampCoord(Math.min(fromValue, toValue));
  const max = clampCoord(Math.max(fromValue, toValue));

  return { min, max };
};

export function JSONImport({ isOpen, onClose, onImport }: JSONImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsedBoxes, setParsedBoxes] = useState<ParsedElement[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('per-element');
  const [replaceExisting, setReplaceExisting] = useState(false);

  const parseModel = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Please select a .json file exported from Blockbench or a similar model editor.');
      setWarnings([]);
      setParsedBoxes([]);
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as { elements?: Array<Record<string, unknown>> };
      const rawElements = parsed.elements;

      if (!Array.isArray(rawElements) || rawElements.length === 0) {
        setError('The selected file does not contain any model elements to import.');
        setParsedBoxes([]);
        return;
      }

      const normalizedElements = rawElements
        .map((element, index) => {
          const fromValue = element.from;
          const toValue = element.to;

          if (!Array.isArray(fromValue) || !Array.isArray(toValue) || fromValue.length < 3 || toValue.length < 3) {
            return null;
          }

          const [fromX, fromY, fromZ] = fromValue.map((value) => Number(value));
          const [toX, toY, toZ] = toValue.map((value) => Number(value));

          if ([fromX, fromY, fromZ, toX, toY, toZ].some((value) => Number.isNaN(value))) {
            return null;
          }

          const { min: minX, max: maxX } = normalizeBounds(fromX, toX);
          const { min: minY, max: maxY } = normalizeBounds(fromY, toY);
          const { min: minZ, max: maxZ } = normalizeBounds(fromZ, toZ);

          const rawName = typeof element.name === 'string' && element.name.trim() ? element.name.trim() : '';

          return {
            name: rawName || `element_${index + 1}`,
            minX,
            minY,
            minZ,
            maxX,
            maxY,
            maxZ,
          } satisfies ParsedElement;
        })
        .filter((entry): entry is ParsedElement => Boolean(entry));

      if (normalizedElements.length === 0) {
        setError('The selected file contains elements, but none had valid coordinate data.');
        setParsedBoxes([]);
        return;
      }

      const importWarnings: string[] = [];

      rawElements.forEach((element, index) => {
        const rotation = element.rotation;
        if (!rotation || typeof rotation !== 'object') {
          return;
        }

        const rawAngle = Number((rotation as { angle?: unknown }).angle);
        if (!Number.isFinite(rawAngle)) {
          return;
        }

        const normalizedAngle = Number(rawAngle.toFixed(2));
        if (!VALID_ROTATION_ANGLES.includes(normalizedAngle)) {
          const elementName = typeof element.name === 'string' && element.name.trim()
            ? element.name.trim()
            : `element_${index + 1}`;
          importWarnings.push(`Unsupported rotation angle ${normalizedAngle} for "${elementName}". Only -45, -22.5, 0, 22.5, and 45 are valid in Blockbench JSON, so the angle was reset to 0.`);
        }
      });

      setFileName(file.name);
      setError('');
      setWarnings(importWarnings);
      setParsedBoxes(normalizedElements);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'The selected file could not be parsed.');
      setWarnings([]);
      setParsedBoxes([]);
    }
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await parseModel(file);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    await parseModel(file);
  };

  const createBoxesFromPreview = (): CollisionBox[] => {
    const baseBoxes = importMode === 'per-element'
      ? parsedBoxes.map((box, index) => ({
          id: crypto.randomUUID(),
          name: box.name || `element_${index + 1}`,
          visible: true,
          minX: box.minX,
          minY: box.minY,
          minZ: box.minZ,
          maxX: box.maxX,
          maxY: box.maxY,
          maxZ: box.maxZ,
        }))
      : [
          {
            id: crypto.randomUUID(),
            name: fileName.replace(/\.json$/i, '') || 'imported_shape',
            visible: true,
            minX: Math.min(...parsedBoxes.map((box) => box.minX)),
            minY: Math.min(...parsedBoxes.map((box) => box.minY)),
            minZ: Math.min(...parsedBoxes.map((box) => box.minZ)),
            maxX: Math.max(...parsedBoxes.map((box) => box.maxX)),
            maxY: Math.max(...parsedBoxes.map((box) => box.maxY)),
            maxZ: Math.max(...parsedBoxes.map((box) => box.maxZ)),
          },
        ];

    return baseBoxes;
  };

  const handleImport = () => {
    if (parsedBoxes.length === 0) {
      setError('Import a JSON file before applying it.');
      return;
    }

    onImport(createBoxesFromPreview(), replaceExisting);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-6">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card text-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Import Model JSON</h2>
            <p className="text-xs text-muted-foreground">Parse Blockbench-style element data into collision boxes.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close import modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-lg border border-dashed p-5 text-center transition ${dragActive ? 'border-foreground bg-muted' : 'border-border'}`}
          >
            <input
              id="collision-json-import"
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileSelection}
            />
            <label htmlFor="collision-json-import" className="flex cursor-pointer flex-col items-center gap-2">
              <div className="rounded-full bg-background p-3 shadow-sm">
                <Upload size={18} />
              </div>
              <div>
                <p className="text-sm font-medium">Drop a JSON model here or click to browse</p>
                <p className="text-xs text-muted-foreground">The importer reads the model’s elements array and extracts from/to coordinates.</p>
              </div>
            </label>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-500">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-700">
              <p className="font-medium">Rotation warnings</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {parsedBoxes.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Imported file</p>
                  <p className="font-mono text-sm text-foreground">{fileName}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Import mode</label>
                  <select
                    value={importMode}
                    onChange={(event) => setImportMode(event.target.value as ImportMode)}
                    className="rounded border border-border bg-muted px-2 py-1 text-sm text-foreground"
                  >
                    <option value="per-element">Create one box per element</option>
                    <option value="aggregate">Create one combined box from all elements</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(event) => setReplaceExisting(event.target.checked)}
                  className="rounded border-border accent-foreground"
                />
                Replace the current builder list instead of appending imported shapes
              </label>

              <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted p-3">
                <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Preview</span>
                  <span>{importMode === 'per-element' ? `${parsedBoxes.length} boxes` : '1 box'}</span>
                </div>
                {importMode === 'per-element' ? (
                  parsedBoxes.map((box, index) => (
                    <div key={`${box.name}-${index}`} className="rounded border border-border bg-background p-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-foreground">{box.name}</span>
                        <span className="text-[11px] text-muted-foreground">{box.minX}, {box.minY}, {box.minZ} → {box.maxX}, {box.maxY}, {box.maxZ}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded border border-border bg-background p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-foreground">{fileName.replace(/\.json$/i, '') || 'imported_shape'}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {Math.min(...parsedBoxes.map((box) => box.minX))}, {Math.min(...parsedBoxes.map((box) => box.minY))}, {Math.min(...parsedBoxes.map((box) => box.minZ))} → {Math.max(...parsedBoxes.map((box) => box.maxX))}, {Math.max(...parsedBoxes.map((box) => box.maxY))}, {Math.max(...parsedBoxes.map((box) => box.maxZ))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded border border-dashed border-border bg-background/70 p-3 text-sm text-muted-foreground">
              <FileJson2 size={16} />
              <span>Upload a model file to preview the imported collision boxes.</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsedBoxes.length === 0}
            className="rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
