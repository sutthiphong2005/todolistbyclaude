import { useEffect, useRef, useState } from 'react'
import client from '../api/client'
import AttachmentList from './AttachmentList'

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isImage(mimeType) {
  return mimeType?.startsWith('image/')
}

async function fetchBlobUrl(todoId, aid) {
  const token = localStorage.getItem('token')
  const res = await fetch(`/api/todos/${todoId}/attachments/${aid}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export default function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [showAttachments, setShowAttachments] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [blobUrls, setBlobUrls] = useState({})
  const [lightbox, setLightbox] = useState(null)
  const blobUrlsRef = useRef({})

  // Fetch attachment list on mount
  useEffect(() => {
    client.get(`/todos/${todo.id}/attachments`)
      .then(res => setAttachments(res.data))
      .catch(() => {})
  }, [todo.id])

  // Fetch blob URL for each new image attachment
  useEffect(() => {
    attachments.forEach(a => {
      if (isImage(a.mime_type) && !blobUrlsRef.current[a.id]) {
        fetchBlobUrl(todo.id, a.id).then(url => {
          blobUrlsRef.current[a.id] = url
          setBlobUrls(prev => ({ ...prev, [a.id]: url }))
        })
      }
    })
  }, [attachments, todo.id])

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url))
  }, [])

  function handleAttachmentAdded(attachment, previewUrl) {
    if (previewUrl) {
      blobUrlsRef.current[attachment.id] = previewUrl
      setBlobUrls(prev => ({ ...prev, [attachment.id]: previewUrl }))
    }
    setAttachments(prev => [...prev, attachment])
  }

  function handleAttachmentDeleted(aid) {
    if (blobUrlsRef.current[aid]) {
      URL.revokeObjectURL(blobUrlsRef.current[aid])
      delete blobUrlsRef.current[aid]
      setBlobUrls(prev => { const n = { ...prev }; delete n[aid]; return n })
    }
    setAttachments(prev => prev.filter(a => a.id !== aid))
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editTitle.trim()) return
    await onEdit(todo.id, editTitle.trim())
    setEditing(false)
  }

  const imageAttachments = attachments.filter(a => isImage(a.mime_type))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id, todo.completed)}
          className="w-4 h-4 accent-indigo-600 cursor-pointer mt-1 shrink-0"
        />

        <div className="flex-1 min-w-0">
          {editing ? (
            <form onSubmit={handleEditSubmit} className="flex gap-2">
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button type="submit" className="text-xs text-indigo-600 font-medium hover:underline">Save</button>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditTitle(todo.title) }}
                className="text-xs text-gray-400 hover:underline"
              >Cancel</button>
            </form>
          ) : (
            <span className={`block text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {todo.title}
            </span>
          )}
          <span className="text-xs text-gray-400 mt-0.5 block">{formatDate(todo.created_at)}</span>
        </div>

        {!editing && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowAttachments(v => !v)}
              className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
              title="Attachments"
            >📎</button>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            >Edit</button>
            <button
              onClick={() => onDelete(todo.id)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >Delete</button>
          </div>
        )}
      </div>

      {/* Inline image thumbnails — always visible once loaded */}
      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 pl-7">
          {imageAttachments.map(a => (
            <div key={a.id} className="relative group">
              {blobUrls[a.id] ? (
                <img
                  src={blobUrls[a.id]}
                  alt={a.original_name}
                  onClick={() => setLightbox(blobUrls[a.id])}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-100 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Attachment management panel */}
      {showAttachments && (
        <AttachmentList
          todoId={todo.id}
          attachments={attachments}
          blobUrls={blobUrls}
          onAttachmentAdded={handleAttachmentAdded}
          onAttachmentDeleted={handleAttachmentDeleted}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="preview"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full w-8 h-8 flex items-center justify-center text-lg"
          >✕</button>
        </div>
      )}
    </div>
  )
}
