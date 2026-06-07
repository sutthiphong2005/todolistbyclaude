import { useEffect, useState } from 'react'
import client from '../api/client'
import TodoItem from '../components/TodoItem'
import AddTodo from '../components/AddTodo'

const PAGE_SIZE = 10

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  // Build page number list with ellipsis: 1 … 4 5 6 … 12
  function pages() {
    const list = []
    const delta = 2
    const left = page - delta
    const right = page + delta

    let prev = null
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        if (prev !== null && i - prev > 1) list.push('...')
        list.push(i)
        prev = i
      }
    }
    return list
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ← Prev
      </button>

      {pages().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
              ${p === page
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
              }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        Next →
      </button>
    </div>
  )
}

export default function TodosPage({ user, onLogout }) {
  const [todos, setTodos] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    fetchPage(page)
  }, [page])

  async function fetchPage(p) {
    setLoading(true)
    setError('')
    try {
      const offset = (p - 1) * PAGE_SIZE
      const { data } = await client.get(`/todos?limit=${PAGE_SIZE}&offset=${offset}`)
      setTodos(data.items)
      setTotal(data.total)
    } catch {
      setError('Failed to load todos')
    } finally {
      setLoading(false)
    }
  }

  function handlePageChange(p) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleAdd(title, files = []) {
    const { data: todo } = await client.post('/todos', { title })
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      await client.post(`/todos/${todo.id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    // New item lands on page 1 (newest first) — go there and refresh
    setPage(1)
    if (page === 1) fetchPage(1)
  }

  async function handleToggle(id, completed) {
    const { data } = await client.patch(`/todos/${id}`, { completed: !completed })
    setTodos(prev => prev.map(t => t.id === id ? data : t))
  }

  async function handleDelete(id) {
    await client.delete(`/todos/${id}`)
    const newTotal = total - 1
    const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE))
    const targetPage = page > newTotalPages ? newTotalPages : page
    setPage(targetPage)
    if (targetPage === page) fetchPage(page)
  }

  async function handleEdit(id, title) {
    const { data } = await client.patch(`/todos/${id}`, { title })
    setTodos(prev => prev.map(t => t.id === id ? data : t))
  }

  function handleLogout() {
    localStorage.removeItem('token')
    onLogout()
  }

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Todos</h1>
            <p className="text-sm text-gray-500">
              Welcome, {user.username}
              {total > 0 && (
                <span className="ml-2 text-gray-400">· {start}–{end} of {total}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Sign out
          </button>
        </div>

        <AddTodo onAdd={handleAdd} />

        <div className="mt-4 space-y-2">
          {loading && (
            <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
          )}
          {error && (
            <p className="text-center text-red-500 text-sm py-4">{error}</p>
          )}
          {!loading && todos.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No todos yet. Add one above!</p>
          )}
          {!loading && todos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
      </div>
    </div>
  )
}
