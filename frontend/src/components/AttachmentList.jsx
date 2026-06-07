import { useRef, useState } from 'react'
import client from '../api/client'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mimeType) {
  return mimeType?.startsWith('image/')
}

export default function AttachmentList({ todoId, attachments, blobUrls, onAttachmentAdded, onAttachmentDeleted }) {
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingPreview, setPendingPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPendingFile(file)
    setError('')
    e.target.value = ''
    setPendingPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }

  function handleCancel() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setError('')
  }

  async function handleUpload() {
    if (!pendingFile) return
    setUploading(true)
    setError('')
    const form = new FormData()
    form.append('file', pendingFile)
    try {
      const { data } = await client.post(`/todos/${todoId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onAttachmentAdded(data, pendingPreview)
      setPendingPreview(null) // don't revoke — parent is reusing the URL
      setPendingFile(null)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(aid) {
    try {
      await client.delete(`/todos/${todoId}/attachments/${aid}`)
      onAttachmentDeleted(aid)
    } catch {
      setError('Failed to delete attachment')
    }
  }

  function handleDownload(aid, originalName) {
    const token = localStorage.getItem('token')
    fetch(`/api/todos/${todoId}/attachments/${aid}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = originalName
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  const images = attachments.filter(a => isImage(a.mime_type))
  const nonImages = attachments.filter(a => !isImage(a.mime_type))

  return (
    <div className="mt-2 pl-7 border-t border-gray-50 pt-2">

      {/* Image thumbnails with actions */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map(a => (
            <div key={a.id} className="relative group">
              {blobUrls[a.id] ? (
                <img
                  src={blobUrls[a.id]}
                  alt={a.original_name}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-100 animate-pulse" />
              )}
              <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleDownload(a.id, a.original_name)}
                  className="bg-white/90 hover:bg-white text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  title="Download"
                >↓</button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="bg-white/90 hover:bg-white text-red-500 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  title="Remove"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Non-image file rows */}
      {nonImages.length > 0 && (
        <ul className="space-y-1 mb-2">
          {nonImages.map(a => (
            <li key={a.id} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
              <svg className="w-3.5 h-3.5 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="flex-1 truncate">{a.original_name}</span>
              <span className="text-gray-400 shrink-0">{formatSize(a.size)}</span>
              <button onClick={() => handleDownload(a.id, a.original_name)} className="text-indigo-500 hover:text-indigo-700 shrink-0" title="Download">↓</button>
              <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500 shrink-0" title="Remove">✕</button>
            </li>
          ))}
        </ul>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="mb-2">
          {pendingPreview && (
            <img src={pendingPreview} alt="preview" className="w-24 h-24 object-cover rounded-lg border border-indigo-200 mb-1" />
          )}
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            <span className="flex-1 truncate text-xs text-gray-700">{pendingFile.name}</span>
            <span className="text-xs text-gray-400 shrink-0">{formatSize(pendingFile.size)}</span>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded px-2 py-0.5 shrink-0"
            >{uploading ? 'Uploading…' : 'Upload'}</button>
            <button
              onClick={handleCancel}
              disabled={uploading}
              className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-60 shrink-0"
            >Cancel</button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mb-1">{error}</p>}

      {!pendingFile && (
        <button
          onClick={() => inputRef.current.click()}
          className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Attach file
        </button>
      )}

      <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
