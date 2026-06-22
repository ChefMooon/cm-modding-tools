const readDirectoryEntries = async (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
  const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
    reader.readEntries(resolve, reject)
  })

  if (batch.length === 0) {
    return []
  }

  const remainingEntries = await readDirectoryEntries(reader)
  return [...batch, ...remainingEntries]
}

const collectFilesFromEntry = async (entry: FileSystemEntry | null | undefined): Promise<File[]> => {
  if (!entry) {
    return []
  }

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry
    return new Promise<File[]>((resolve, reject) => {
      fileEntry.file((file) => resolve([file]), reject)
    })
  }

  if (entry.isDirectory) {
    const directoryEntry = entry as FileSystemDirectoryEntry
    const entries = await readDirectoryEntries(directoryEntry.createReader())
    const nestedFiles = await Promise.all(entries.map((childEntry) => collectFilesFromEntry(childEntry)))
    return nestedFiles.flat()
  }

  return []
}

export const collectFilesFromItems = async (items: DataTransferItemList | null | undefined): Promise<File[]> => {
  if (!items) {
    return []
  }

  const fileEntries = await Promise.all(Array.from(items, async (item) => {
    if (item.kind !== 'file') {
      return null
    }

    if (typeof item.webkitGetAsEntry === 'function') {
      return collectFilesFromEntry(item.webkitGetAsEntry())
    }

    return item.getAsFile() ? [item.getAsFile() as File] : []
  }))

  return fileEntries.flat().filter((file): file is File => Boolean(file))
}

export const collectFilesFromSelection = async (files: FileList | null | undefined): Promise<File[]> => {
  if (!files) {
    return []
  }

  return Array.from(files).filter((file): file is File => Boolean(file))
}
