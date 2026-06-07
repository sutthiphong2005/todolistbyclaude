import { useEffect, useRef, useState } from 'react'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AddTodo({ onAdd }) {
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState([])      // [{ file, previewUrl|null }]
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef()

  // Revoke preview object URLs when they are removed or component unmounts
  useEffect(() => {
    return () => files.forEach(f => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
  }, [files])

  function handleFileChange(e) {
    const selected = Array.from(e.target.files).map(file => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }))
    setFiles(prev => [...prev, ...selected])
    e.target.value = ''
  }

  function removeFile(index) {
    setFiles(prev => {
      const item = prev[index]
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await onAdd(title.trim(), files.map(f => f.file))
      files.forEach(f => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
      setTitle('')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
      <form onSubmit={handleSubmit}>
        {/* Title row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new todo…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            title="Attach files"
            className="border border-gray-300 hover:border-indigo-400 hover:text-indigo-600 text-gray-400 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            📎
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            {loading ? 'Adding…' : 'Add'}
          </button>
        </div>

        {/* Pending files */}
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {/* Image thumbnails */}
            {files.some(f => f.previewUrl) && (
              <div className="flex flex-wrap gap-2 mb-1">
                {files.map((f, i) => f.previewUrl && (
                  <div key={i} className="relative group">
                    <img
                      src={f.previewUrl}
                      alt={f.file.name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Non-image file rows */}
            {files.filter(f => !f.previewUrl).map((f, i) => {
              const realIndex = files.indexOf(f)
              return (
                <div key={realIndex} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="flex-1 truncate">{f.file.name}</span>
                  <span className="text-gray-400 shrink-0">{formatSize(f.file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(realIndex)}
                    className="text-gray-400 hover:text-red-500 shrink-0"
                    title="Remove"
                  >✕</button>
                </div>
              )
            })}
          </div>
        )}

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
      </form>
    </div>
  )
}
