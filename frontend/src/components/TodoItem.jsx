import { useState } from 'react'

export default function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editTitle.trim()) return
    await onEdit(todo.id, editTitle.trim())
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id, todo.completed)}
        className="w-4 h-4 accent-indigo-600 cursor-pointer"
      />

      {editing ? (
        <form onSubmit={handleEditSubmit} className="flex-1 flex gap-2">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button type="submit" className="text-xs text-indigo-600 font-medium hover:underline">
            Save
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setEditTitle(todo.title) }}
            className="text-xs text-gray-400 hover:underline"
          >
            Cancel
          </button>
        </form>
      ) : (
        <span
          className={`flex-1 text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
        >
          {todo.title}
        </span>
      )}

      {!editing && (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
