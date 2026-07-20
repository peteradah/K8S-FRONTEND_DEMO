import { useEffect, useState } from 'react'
import './App.css'

// Seed data used only when no backend is reachable, so the app is still
// demoable the moment you deploy it — before you've wired up any API.
const DEMO_TODOS = [
  { id: 1, text: 'Build the container image', done: true },
  { id: 2, text: 'Deploy to Kubernetes', done: false },
  { id: 3, text: 'Scale the deployment', done: false },
]

function App() {
  const [todos, setTodos] = useState(DEMO_TODOS)
  const [input, setInput] = useState('')
  const [backendConnected, setBackendConnected] = useState(false)
  const [podName, setPodName] = useState(null)

  // On mount, try the real backend. All requests go to same-origin /api/*,
  // which nginx reverse-proxies to whatever BACKEND_URL was set on the
  // container at startup (see docker/nginx.conf.template). If that fails,
  // we just keep showing the local demo list instead of an error screen.
  useEffect(() => {
    fetch('/api/todos')
      .then((res) => {
        if (!res.ok) throw new Error('backend not ok')
        return res.json()
      })
      .then((data) => {
        setTodos(data)
        setBackendConnected(true)
      })
      .catch(() => setBackendConnected(false))

    // /healthz is served directly by nginx (not proxied) and reports which
    // pod answered the request. Handy for watching a Service load-balance
    // requests across replicas while you scale the deployment up/down.
    fetch('/healthz')
      .then((res) => res.json())
      .then((data) => setPodName(data.pod))
      .catch(() => setPodName(null))
  }, [])

  const addTodo = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const newTodo = { id: Date.now(), text: input.trim(), done: false }
    setTodos((prev) => [...prev, newTodo])
    setInput('')

    if (backendConnected) {
      fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      }).catch(() => {
        // Backend write failed, but keep the optimistic local update —
        // this is a demo app, not a source of truth.
      })
    }
  }

  const toggleTodo = (id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    )
  }

  return (
    <div className="app">
      <h1>Kubernetes Todo Demo</h1>

      <div className={`status ${backendConnected ? 'status-ok' : 'status-warn'}`}>
        {backendConnected
          ? 'Connected to backend API'
          : 'No backend API reachable — showing local demo data'}
      </div>

      <form onSubmit={addTodo} className="add-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task..."
        />
        <button type="submit">Add</button>
      </form>

      <ul className="todo-list">
        {todos.map((t) => (
          <li key={t.id} className={t.done ? 'done' : ''} onClick={() => toggleTodo(t.id)}>
            {t.text}
          </li>
        ))}
      </ul>

      <footer>
        {podName ? `Served by pod: ${podName}` : 'Pod identity unavailable'}
      </footer>
    </div>
  )
}

export default App
