import 'bootstrap/dist/css/bootstrap.min.css'
import ProductList from './components/ProductList'

function App() {
  return (
    <div className="container py-4">
      <header className="mb-4 text-center">
        <h1 className="display-5 fw-bold">🍺 PubStock Manager</h1>
        <p className="lead text-muted">
          Professional inventory management for pubs and bars
        </p>
        <div className="d-flex justify-content-center gap-2">
          <span className="badge bg-primary">React 18</span>
          <span className="badge bg-info">TypeScript</span>
          <span className="badge bg-success">Supabase</span>
          <span className="badge bg-warning">Bootstrap 5</span>
        </div>
      </header>
      
      <main>
        <ProductList />
      </main>
      
      <footer className="mt-5 pt-4 border-top text-center text-muted small">
        <p>
          Made with ❤️ for pub managers everywhere • 
          <a href="https://github.com/Serena293" className="ms-1">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App