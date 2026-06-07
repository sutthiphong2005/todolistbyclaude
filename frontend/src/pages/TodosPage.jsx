import { useEffect, useState } from 'react'
import client from '../api/client'
import TodoItem from '../components/TodoItem'
import AddTodo from '../components/AddTodo'

export default function TodosPage({ user, onLogout }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTodos()
  }, [])

  async function fetchTodos() {
    try {
      const { data } = await client.get('/todos')
      setTodos(data)
    } catch {
      setError('Failed to load todos')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(title) {
    const { data } = await client.post('/todos', { title })
    setTodos((prev) => [data, ...prev])
  }

  async function handleToggle(id, completed) {
    const { data } = await client.patch(`/todos/${id}`, { completed: !completed })
    setTodos((prev) => prev.map((t) => (t.id === id ? data : t)))
  }

  async function handleDelete(id) {
    await client.delete(`/todos/${id}`)
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleEdit(id, title) {
    const { data } = await client.patch(`/todos/${id}`, { title })
    setTodos((prev) => prev.map((t) => (t.id === id ? data : t)))
  }

  function handleLogout() {
    localStorage.removeItem('token')
    onLogout()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Todos</h1>
            <p className="text-sm text-gray-500">Welcome, {user.username}</p>
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
          {loading && <p className="text-center text-gray-400 text-sm py-8">Loading…</p>}
          {error && <p className="text-center text-red-500 text-sm py-4">{error}</p>}
          {!loading && todos.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No todos yet. Add one above!</p>
          )}
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
