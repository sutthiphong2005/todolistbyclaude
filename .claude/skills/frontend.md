# Frontend Skills (React + Vite + TailwindCSS)

Common recipes for the `frontend/` directory. Each section is self-contained — copy, adapt, run.

---

## Running

### Start dev server

```bash
cd frontend
npm run dev
# http://localhost:5173
# /api/* is proxied to http://localhost:8080 via vite.config.js
```

### Build for production

```bash
cd frontend
npm run build
# output in frontend/dist/
```

### Preview production build

```bash
cd frontend
npm run preview
```

---

## Dependencies

### Install a new package

```bash
cd frontend
npm install some-package
```

---

## API calls

### Always use the shared axios client

`src/api/client.js` automatically attaches `Authorization: Bearer <token>` and handles 401 logout. Never import axios directly in components.

```js
import client from '../api/client'

// GET
const { data } = await client.get('/todos')

// POST
const { data } = await client.post('/todos', { title: 'Buy milk' })

// PATCH (partial update)
const { data } = await client.patch(`/todos/${id}`, { completed: true })

// DELETE
await client.delete(`/todos/${id}`)
```

---

## Adding a new page

1. Create `src/pages/NewPage.jsx`.
2. Extend routing in `src/App.jsx` — current pattern uses a state variable:

```jsx
// App.jsx — add a view state to navigate between pages
const [view, setView] = useState('todos') // 'todos' | 'new-page'

return user
  ? (view === 'todos'
      ? <TodosPage user={user} onLogout={() => setUser(null)} onNavigate={setView} />
      : <NewPage onBack={() => setView('todos')} />)
  : <LoginPage onLogin={setUser} />
```

---

## Adding a new component

Create `src/components/MyComponent.jsx`. Use Tailwind utility classes only — no inline styles, no separate CSS files.

```jsx
export default function MyComponent({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
    >
      {label}
    </button>
  )
}
```

---

## Common patterns

### Loading / error state

```jsx
const [data, setData]       = useState([])
const [loading, setLoading] = useState(true)
const [error, setError]     = useState('')

useEffect(() => {
  client.get('/endpoint')
    .then(res => setData(res.data))
    .catch(() => setError('Failed to load'))
    .finally(() => setLoading(false))
}, [])

if (loading) return <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
if (error)   return <p className="text-center text-red-500 text-sm py-4">{error}</p>
```

### Optimistic list update after create

```jsx
async function handleAdd(title) {
  const { data } = await client.post('/todos', { title })
  setTodos(prev => [data, ...prev])  // prepend — newest first
}
```

### Optimistic list update after patch

```jsx
async function handleUpdate(id, patch) {
  const { data } = await client.patch(`/todos/${id}`, patch)
  setTodos(prev => prev.map(t => t.id === id ? data : t))
}
```

### Remove item from list after delete

```jsx
async function handleDelete(id) {
  await client.delete(`/todos/${id}`)
  setTodos(prev => prev.filter(t => t.id !== id))
}
```

---

## Auth / JWT

### Inspect the JWT payload in the browser console

```js
const token = localStorage.getItem('token')
JSON.parse(atob(token.split('.')[1]))
// { user_id, username, exp, iat }
```

### Check token expiry manually

```js
const { exp } = JSON.parse(atob(localStorage.getItem('token').split('.')[1]))
new Date(exp * 1000)  // expiry date/time
```

### Force logout / clear session

```js
localStorage.removeItem('token')
location.reload()
```
