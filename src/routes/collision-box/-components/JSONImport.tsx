import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ChevronDown, ChevronUp, FileJson2, Upload, XCircle } from 'lucide-react';
import type { CollisionShape } from '../types';
import { createShape, parseBackupPayload } from './persistence';

type ImportTarget = 'current-project' | 'new-projects';
type BoxShapeMode = 'detailed' | 'simplified';
type ItemOverrideTarget = 'inherit' | ImportTarget;
type ItemOverrideMode = 'inherit' | BoxShapeMode;

export type ImportConflictAction = 'import' | 'overwrite' | 'skip';

export interface ImportProjectPayload {
  name: string;
  shapes: CollisionShape[];
  importTarget: ImportTarget;
  boxShapeMode: BoxShapeMode;
  conflictAction?: ImportConflictAction;
  existingProjectId?: string | null;
  metadata?: {
    sourceProjectName?: string;
    createdAt?: number;
    lastModified?: number;
    exportedAt?: string;
  };
}

export interface ImportPayload {
  projects: ImportProjectPayload[];
}

const VALID_ROTATION_ANGLES = [-45, -22.5, 0, 22.5, 45];

const isSupportedImportFile = (file: File) => {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.bbmodel') || lowerName.endsWith('.geo.json') || lowerName.endsWith('.animation.json')) {
    return false;
  }

  return lowerName.endsWith('.json');
};

const parseBackupFile = async (file: File) => {
  const content = await file.text();
  const parsed = JSON.parse(content) as unknown;
  const backupState = parseBackupPayload(parsed);

  if (!backupState) {
    throw new Error('The selected file is not a supported collision-builder backup export.');
  }

  return backupState.projects.map((project) => ({
    name: project.name,
    shapes: project.shapes.map((shape) => createShape({
      id: crypto.randomUUID(),
      name: shape.name,
      visible: shape.visible,
      markerColor: shape.markerColor,
      markerColorSource: shape.markerColorSource,
      minX: shape.minX,
      minY: shape.minY,
      minZ: shape.minZ,
      maxX: shape.maxX,
      maxY: shape.maxY,
      maxZ: shape.maxZ,
      pivotX: shape.pivotX,
      pivotY: shape.pivotY,
      pivotZ: shape.pivotZ,
      rotationX: shape.rotationX,
      rotationY: shape.rotationY,
      rotationZ: shape.rotationZ,
    })),
  }));
};

const readDirectoryEntries = async (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
  const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });

  if (batch.length === 0) {
    return [];
  }

  const remainingEntries = await readDirectoryEntries(reader);
  return [...batch, ...remainingEntries];
};

const collectFilesFromEntry = async (entry: FileSystemEntry | null | undefined): Promise<File[]> => {
  if (!entry) {
    return [];
  }

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise<File[]>((resolve, reject) => {
      fileEntry.file((file) => resolve([file]), reject);
    });
  }

  if (entry.isDirectory) {
    const directoryEntry = entry as FileSystemDirectoryEntry;
    const entries = await readDirectoryEntries(directoryEntry.createReader());
    const nestedFiles = await Promise.all(entries.map((childEntry) => collectFilesFromEntry(childEntry)));
    return nestedFiles.flat();
  }

  return [];
};

const collectFilesFromItems = async (items: DataTransferItemList | null | undefined): Promise<File[]> => {
  if (!items) {
    return [];
  }

  const fileEntries = await Promise.all(Array.from(items, async (item) => {
    if (item.kind !== 'file') {
      return null;
    }

    if (typeof item.webkitGetAsEntry === 'function') {
      return collectFilesFromEntry(item.webkitGetAsEntry());
    }

    return item.getAsFile() ? [item.getAsFile() as File] : [];
  }));

  return fileEntries.flat().filter((file): file is File => Boolean(file));
};

const collectFilesFromSelection = async (files: FileList | null | undefined): Promise<File[]> => {
  if (!files) {
    return [];
  }

  return Array.from(files).filter((file): file is File => Boolean(file));
};

interface JSONImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (payload: ImportPayload) => void;
  existingProjects?: Array<{ id: string; name: string; createdAt?: number; lastModified?: number }>;
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

interface ParsedImportFile {
  id: string;
  fileName: string;
  path?: string;
  projectName: string;
  parsedBoxes: ParsedElement[];
  warnings: string[];
  targetMode: ItemOverrideTarget;
  shapeMode: ItemOverrideMode;
  sourceType: 'model' | 'backup';
  conflictAction?: ImportConflictAction;
  existingProject?: { id: string; name: string; createdAt?: number; lastModified?: number } | null;
  metadata?: ImportProjectPayload['metadata'];
  backupProjects?: Array<{ name: string; shapes: CollisionShape[]; createdAt?: number; lastModified?: number; exportedAt?: string }>;
}

const clampCoord = (value: number) => Math.max(0, Math.min(16, Number(value.toFixed(2))));

const normalizeBounds = (fromValue: number, toValue: number) => {
  const min = clampCoord(Math.min(fromValue, toValue));
  const max = clampCoord(Math.max(fromValue, toValue));

  return { min, max };
};

const getBaseProjectName = (fileName: string) => fileName.replace(/\.json$/i, '');

const getUniqueProjectName = (baseName: string, existingNames: Set<string>) => {
  const normalizedBaseName = baseName.trim() || 'imported_shape';
  if (!existingNames.has(normalizedBaseName)) {
    existingNames.add(normalizedBaseName);
    return normalizedBaseName;
  }

  let suffix = 2;
  while (existingNames.has(`${normalizedBaseName} ${suffix}`)) {
    suffix += 1;
  }

  const nextName = `${normalizedBaseName} ${suffix}`;
  existingNames.add(nextName);
  return nextName;
};

const formatBackupTimestamp = (value?: number | string) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toLocaleString();
  }

  if (typeof value === 'string' && value.trim()) {
    return new Date(value).toLocaleString();
  }

  return 'Unknown';
};

const getParsedFileBoxCount = (parsedFile: ParsedImportFile) => {
  if (parsedFile.sourceType === 'backup') {
    return parsedFile.backupProjects?.reduce((total, project) => total + project.shapes.length, 0) ?? 0;
  }

  return parsedFile.parsedBoxes.length;
};

export function JSONImport({ isOpen, onClose, onImport, existingProjects = [] }: JSONImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsedFiles, setParsedFiles] = useState<ParsedImportFile[]>([]);
  const [globalTarget, setGlobalTarget] = useState<ImportTarget>('new-projects');
  const [globalShapeMode, setGlobalShapeMode] = useState<BoxShapeMode>('detailed');
  const [skippedCount, setSkippedCount] = useState(0);
  const [showWarnings, setShowWarnings] = useState(true);

  const parseModel = async (file: File) => {
    const content = await file.text();
    const parsed = JSON.parse(content) as unknown;

    const backupProjects = await parseBackupFile(file).catch(() => null);
    if (backupProjects) {
      return {
        parsedBoxes: [] as ParsedElement[],
        warnings: [] as string[],
        sourceType: 'backup' as const,
        backupProjects,
      };
    }

    const modelPayload = parsed as { elements?: Array<Record<string, unknown>> };
    const rawElements = modelPayload.elements;

    if (!Array.isArray(rawElements) || rawElements.length === 0) {
      throw new Error('The selected file does not contain any model elements to import.');
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
      throw new Error('The selected file contains elements, but none had valid coordinate data.');
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

    return {
      parsedBoxes: normalizedElements,
      warnings: importWarnings,
      sourceType: 'model' as const,
    };
  };

  const getItemEffectiveTarget = (file: ParsedImportFile): ImportTarget => {
    return file.targetMode === 'inherit' ? globalTarget : file.targetMode;
  };

  const getItemEffectiveShapeMode = (file: ParsedImportFile): BoxShapeMode => {
    return file.shapeMode === 'inherit' ? globalShapeMode : file.shapeMode;
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const supportedFiles = files.filter(isSupportedImportFile);
    const skippedFiles = files.filter((file) => !isSupportedImportFile(file));

    if (supportedFiles.length === 0) {
      setError('No supported model JSON files were found. Only .json model files that aren’t .geo.json, .animation.json, or .bbmodel files can be imported.');
      setWarnings([]);
      setParsedFiles([]);
      setFileNames([]);
      setSkippedCount(skippedFiles.length);
      return;
    }

    const parsedImportFiles: ParsedImportFile[] = [];
    const importWarnings: string[] = [];
    const usedProjectNames = new Set<string>();

    for (const file of supportedFiles) {
      try {
        const parsedResult = await parseModel(file);
        const parsedBoxes = parsedResult.parsedBoxes ?? [];
        const warnings = parsedResult.warnings ?? [];
        const sourceType = parsedResult.sourceType;

        if (sourceType === 'backup' && parsedResult.backupProjects) {
          const backupProjects = parsedResult.backupProjects.map((project: { name: string; shapes: CollisionShape[]; createdAt?: number; lastModified?: number; exportedAt?: string }) => {
            const normalizedName = (project.name || getBaseProjectName(file.name)).trim().toLowerCase();
            const existingProject = existingProjects.find((candidate) => candidate.name.trim().toLowerCase() === normalizedName);

            return {
              ...project,
              name: getUniqueProjectName(project.name || getBaseProjectName(file.name), usedProjectNames),
              existingProject: existingProject ?? null,
              conflictAction: existingProject ? 'skip' as ImportConflictAction : 'import' as ImportConflictAction,
            };
          });

          parsedImportFiles.push(...backupProjects.map((project): ParsedImportFile => ({
            id: crypto.randomUUID(),
            fileName: file.name,
            path: file.webkitRelativePath || file.name,
            projectName: project.name,
            parsedBoxes: [],
            warnings,
            targetMode: 'inherit' as ItemOverrideTarget,
            shapeMode: 'inherit' as ItemOverrideMode,
            sourceType: 'backup',
            conflictAction: project.conflictAction,
            existingProject: project.existingProject,
            metadata: {
              sourceProjectName: project.name,
              createdAt: project.createdAt,
              lastModified: project.lastModified,
              exportedAt: project.exportedAt,
            },
            backupProjects: [{
              name: project.name,
              shapes: project.shapes,
              createdAt: project.createdAt,
              lastModified: project.lastModified,
              exportedAt: project.exportedAt,
            }],
          })));
          importWarnings.push(...warnings);
          continue;
        }

        if (parsedBoxes.length === 0) {
          importWarnings.push(`Skipped ${file.name} because it did not contain usable element data.`);
          continue;
        }

        parsedImportFiles.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          path: file.webkitRelativePath || file.name,
          projectName: getUniqueProjectName(getBaseProjectName(file.name), usedProjectNames),
          parsedBoxes,
          warnings,
          targetMode: 'inherit',
          shapeMode: 'inherit',
          sourceType: 'model',
        });
        importWarnings.push(...warnings);
      } catch (parseError) {
        importWarnings.push(`Skipped ${file.name}: ${parseError instanceof Error ? parseError.message : 'The file could not be parsed.'}`);
      }
    }

    if (parsedImportFiles.length === 0) {
      setError('The selected files did not contain any usable model element data.');
      setWarnings([...skippedFiles.map((file) => `Skipped unsupported file ${file.name}.`), ...importWarnings]);
      setParsedFiles([]);
      setFileNames([]);
      setSkippedCount(skippedFiles.length);
      return;
    }

    setFileNames(Array.from(new Set(parsedImportFiles.map((parsedFile) => parsedFile.fileName))));
    setError('');
    setWarnings([...skippedFiles.map((file) => `Skipped unsupported file ${file.name}.`), ...importWarnings]);
    setParsedFiles(parsedImportFiles);
    setSkippedCount(skippedFiles.length);
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = await collectFilesFromSelection(event.target.files);
    if (files.length === 0) return;

    await handleFiles(files);
    event.target.value = '';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const files = await collectFilesFromItems(event.dataTransfer.items);
    if (files.length === 0) {
      const fallbackFiles = Array.from(event.dataTransfer.files ?? []);
      if (fallbackFiles.length === 0) return;
      await handleFiles(fallbackFiles);
      return;
    }

    await handleFiles(files);
  };

  const updateParsedFile = (index: number, updates: Partial<ParsedImportFile>) => {
    setParsedFiles((prev) => prev.map((parsedFile, parsedFileIndex) => (
      parsedFileIndex === index ? { ...parsedFile, ...updates } : parsedFile
    )));
  };

  const createBoxesForFile = (parsedFile: ParsedImportFile): CollisionShape[] => {
    if (parsedFile.sourceType === 'backup') {
      return parsedFile.backupProjects?.[0]?.shapes ?? [];
    }

    const effectiveShapeMode = getItemEffectiveShapeMode(parsedFile);

    if (effectiveShapeMode === 'detailed') {
      return parsedFile.parsedBoxes.map((box, index) => createShape({
        id: crypto.randomUUID(),
        name: box.name || `element_${index + 1}`,
        minX: box.minX,
        minY: box.minY,
        minZ: box.minZ,
        maxX: box.maxX,
        maxY: box.maxY,
        maxZ: box.maxZ,
      }));
    }

    return [createShape({
      id: crypto.randomUUID(),
      name: parsedFile.projectName || 'imported_shape',
      minX: Math.min(...parsedFile.parsedBoxes.map((box) => box.minX)),
      minY: Math.min(...parsedFile.parsedBoxes.map((box) => box.minY)),
      minZ: Math.min(...parsedFile.parsedBoxes.map((box) => box.minZ)),
      maxX: Math.max(...parsedFile.parsedBoxes.map((box) => box.maxX)),
      maxY: Math.max(...parsedFile.parsedBoxes.map((box) => box.maxY)),
      maxZ: Math.max(...parsedFile.parsedBoxes.map((box) => box.maxZ)),
    })];
  };

  const handleImport = () => {
    if (parsedFiles.length === 0) {
      setError('Import at least one supported model JSON file before applying it.');
      return;
    }

    onImport({
      projects: parsedFiles.flatMap((parsedFile) => {
        if (parsedFile.sourceType === 'backup') {
          const project = parsedFile.backupProjects?.[0];
          if (!project) {
            return [];
          }

          return [{
            name: parsedFile.projectName,
            shapes: project.shapes,
            importTarget: getItemEffectiveTarget(parsedFile),
            boxShapeMode: getItemEffectiveShapeMode(parsedFile),
            conflictAction: parsedFile.conflictAction ?? (parsedFile.existingProject ? 'skip' : 'import'),
            existingProjectId: parsedFile.existingProject?.id ?? null,
            metadata: parsedFile.metadata,
          }];
        }

        return [{
          name: parsedFile.projectName,
          shapes: createBoxesForFile(parsedFile),
          importTarget: getItemEffectiveTarget(parsedFile),
          boxShapeMode: getItemEffectiveShapeMode(parsedFile),
          conflictAction: 'import',
          existingProjectId: null,
          metadata: undefined,
        }];
      }),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-6">
      <div className="flex h-full max-h-[760px] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-2xl">
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

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
              multiple
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
              className="hidden"
              onChange={handleFileSelection}
            />
            <label htmlFor="collision-json-import" className="flex cursor-pointer flex-col items-center gap-2">
              <div className="rounded-full bg-background p-3 shadow-sm">
                <Upload size={18} />
              </div>
              <div>
                <p className="text-sm font-medium">Drop a folder or model JSON files here or click to browse</p>
                <p className="text-xs text-muted-foreground">The importer reads supported model JSON files from a dropped folder, a file selection, or a folder picked from your file browser.</p>
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
              <button
                type="button"
                onClick={() => setShowWarnings((value) => !value)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <div>
                  <p className="font-medium">Warnings</p>
                  <p className="text-xs text-amber-700/80">{warnings.length} item{warnings.length === 1 ? '' : 's'} to review</p>
                </div>
                {showWarnings ? <ChevronUp size={16} className="shrink-0" /> : <ChevronDown size={16} className="shrink-0" />}
              </button>
              {showWarnings ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {skippedCount > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700">
              <XCircle size={14} className="shrink-0" />
              <span>Skipped {skippedCount} unsupported entity model layouts (.bbmodel, .geo.json, .animation.json).</span>
            </div>
          ) : null}

          {parsedFiles.length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Global Setup (Applies to Inherited Items)</p>
                    <p className="text-[11px] text-muted-foreground">Set the defaults once and each staged file will inherit them unless you override it.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="min-w-[10rem] flex-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="mb-1 block">Destination</span>
                    <select
                      value={globalTarget}
                      onChange={(event) => setGlobalTarget(event.target.value as ImportTarget)}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                    >
                      <option value="new-projects">Create New Projects</option>
                      <option value="current-project">Merge Into Current Project</option>
                    </select>
                  </label>
                  <label className="min-w-[10rem] flex-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="mb-1 block">Box Style</span>
                    <select
                      value={globalShapeMode}
                      onChange={(event) => setGlobalShapeMode(event.target.value as BoxShapeMode)}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                    >
                      <option value="detailed">Detailed</option>
                      <option value="simplified">Simplified</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Imported files</p>
                  <p className="break-all font-mono text-sm text-foreground">{fileNames.length > 0 ? fileNames.join(', ') : 'model.json'}</p>
                </div>
              </div>

              <div className="max-h-[350px] space-y-3 overflow-y-auto rounded-lg border border-border bg-muted p-3 pr-1">
                <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Preview</span>
                  <span>{parsedFiles.reduce((total, parsedFile) => total + getParsedFileBoxCount(parsedFile), 0)} boxes across {parsedFiles.length} item{parsedFiles.length === 1 ? '' : 's'}</span>
                </div>
                {parsedFiles.map((parsedFile, index) => {
                  const boxCount = getParsedFileBoxCount(parsedFile);
                  const effectiveConflictAction = parsedFile.conflictAction ?? (parsedFile.existingProject ? 'skip' : 'import');

                  return (
                    <div key={parsedFile.id} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileJson2 className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate text-sm font-medium text-foreground">{parsedFile.projectName}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {boxCount} {boxCount === 1 ? 'box' : 'boxes'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {parsedFile.sourceType === 'backup' ? (
                            <label className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="whitespace-nowrap">Existing:</span>
                              <select
                                value={effectiveConflictAction}
                                onChange={(event) => updateParsedFile(index, { conflictAction: event.target.value as ImportConflictAction })}
                                className="min-w-[10rem] rounded border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                {parsedFile.existingProject ? (
                                  <>
                                    <option value="skip">Skip import</option>
                                    <option value="overwrite">Overwrite existing</option>
                                    <option value="import">Import as new project</option>
                                  </>
                                ) : (
                                  <option value="import">Import</option>
                                )}
                              </select>
                            </label>
                          ) : null}
                          <label className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="whitespace-nowrap">Target:</span>
                            <select
                              value={parsedFile.targetMode}
                              onChange={(event) => updateParsedFile(index, { targetMode: event.target.value as ItemOverrideTarget })}
                              className="min-w-[10rem] rounded border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="inherit">Inherit ({globalTarget === 'new-projects' ? 'New' : 'Merge'})</option>
                              <option value="new-projects">New project</option>
                              <option value="current-project">Current project</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="whitespace-nowrap">Mode:</span>
                            <select
                              value={parsedFile.shapeMode}
                              onChange={(event) => updateParsedFile(index, { shapeMode: event.target.value as ItemOverrideMode })}
                              className="min-w-[10rem] rounded border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="inherit">Inherit ({globalShapeMode === 'detailed' ? 'Detailed' : 'Simple'})</option>
                              <option value="detailed">Detailed</option>
                              <option value="simplified">Simplified</option>
                            </select>
                          </label>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                        {parsedFile.sourceType === 'backup' ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate">Backup snapshot from {parsedFile.fileName}</span>
                              <span className="text-muted-foreground/70">•</span>
                              <span>{boxCount} {boxCount === 1 ? 'box' : 'boxes'}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {parsedFile.existingProject ? (
                                <>
                                  Existing project found: {parsedFile.existingProject.name}
                                  {parsedFile.metadata?.lastModified ? ` • Last updated ${formatBackupTimestamp(parsedFile.metadata.lastModified)}` : ''}
                                </>
                              ) : (
                                'No matching project found in the current builder state.'
                              )}
                            </div>
                          </>
                        ) : (
                          <span>{boxCount} {boxCount === 1 ? 'box' : 'boxes'}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[120px] items-center justify-center rounded border border-dashed border-border bg-background/70 p-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileJson2 size={16} />
                <span>Upload a model file to preview the imported collision boxes.</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-background px-4 py-3">
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
            disabled={parsedFiles.length === 0}
            className="rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
