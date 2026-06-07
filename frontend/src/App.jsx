import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import TodosPage from './pages/TodosPage'

function getStoredUser() {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token')
      return null
    }
    return { id: payload.user_id, username: payload.username }
  } catch {
    return null
  }
}

export default function App() {
  const [user, setUser] = useState(getStoredUser)

  return user
    ? <TodosPage user={user} onLogout={() => setUser(null)} />
    : <LoginPage onLogin={setUser} />
}
