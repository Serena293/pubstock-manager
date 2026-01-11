import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabasaClient'
import jsPDF from 'jspdf'

type Product = {
  id: number
  name: string | null
  quantity: number | null
  min_threshold: number | null
  category?: string | null
  price?: number | null
  created_at?: string | null
}

type ProductForm = {
  name: string
  quantity: number
  min_threshold: number
  category: string
  price: number
}

export default function ProductList() {
  //Main States
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  //States for modal and form
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Form new product
  const [newProduct, setNewProduct] = useState<ProductForm>({
    name: '',
    quantity: 0,
    min_threshold: 5,
    category: 'beer',
    price: 0
  })
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // upload products
  useEffect(() => {
    fetchProducts()
  }, [])

  // Function to load products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setProducts((data as Product[]) || [])
      setError(null)
    } catch (err) {
     console.error('Error fetching products:', JSON.stringify(err, null, 2))


      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  // Add product
  const handleAddProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: newProduct.name,
          quantity: newProduct.quantity,
          min_threshold: newProduct.min_threshold,
          category: newProduct.category,
          price: newProduct.price
        }])
        .select()
      
      if (error) throw error
      
      // Add to the list and reset form
      setProducts([data[0], ...products])
      setShowAddModal(false)
      setNewProduct({
        name: '',
        quantity: 0,
        min_threshold: 5,
        category: 'beer',
        price: 0
      })
      
      alert('Product added successfully!')
    } catch (err) {
      console.error('Error adding product:', err)
      alert('Error adding product')
    }
  }

  // Modify product
  const startEditProduct = (product: Product) => {
    setEditingProduct(product)
    setNewProduct({
      name: product.name || '',
      quantity: product.quantity || 0,
      min_threshold: product.min_threshold || 5,
      category: product.category || 'beer',
      price: product.price || 0
    })
    setShowEditModal(true)
  }

  // Save and edit
  const handleEditProduct = async () => {
    if (!editingProduct) return
    
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: newProduct.name,
          quantity: newProduct.quantity,
          min_threshold: newProduct.min_threshold,
          category: newProduct.category,
          price: newProduct.price
        })
        .eq('id', editingProduct.id)
      
      if (error) throw error
      
      // upddate list
      setProducts(products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...newProduct }
          : p
      ))
      
      setShowEditModal(false)
      setEditingProduct(null)
      alert('Product updated successfully!')
    } catch (err) {
      console.error('Error updating product:', err)
      alert('Error updating product')
    }
  }

  // Delete
  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // delete from local list
      setProducts(products.filter(p => p.id !== id))
      alert('Product deleted successfully!')
    } catch (err) {
      console.error('Error deleting product:', err)
      alert('Error deleting product')
    }
  }

  // Create pdf
const generateSupplierOrder = () => {
  const lowStockProducts = getFilteredProducts().filter(
    p => (p.quantity || 0) < (p.min_threshold || 0)
  )

  if (lowStockProducts.length === 0) {
    alert('No products need restocking!')
    return
  }

  const doc = new jsPDF()
  let y = 20

  // Title
  doc.setFontSize(16)
  doc.text('SUPPLIER ORDER - PubStock Manager', 14, y)
  y += 10

  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, y)
  y += 10

  doc.setFontSize(12)

  lowStockProducts.forEach((product, index) => {
    const currentQty = product.quantity || 0
    const minQty = product.min_threshold || 0
    const toOrder = minQty * 2 - currentQty

    // Page break
    if (y > 270) {
      doc.addPage()
      y = 20
    }

    doc.text(`${index + 1}. ${product.name || 'Unknown product'}`, 14, y)
    y += 6

    doc.setFontSize(10)
    doc.text(`Category: ${product.category || 'N/A'}`, 18, y)
    y += 5

    doc.text(
      `Current: ${currentQty} | Minimum: ${minQty} | Order: ${toOrder} units`,
      18,
      y
    )
    y += 5

    if (product.price) {
      doc.text(
        `Estimated cost: £${(toOrder * product.price).toFixed(2)}`,
        18,
        y
      )
      y += 5
    }

    y += 4
    doc.setFontSize(12)
  })

  const fileName = `supplier-order-${new Date()
    .toISOString()
    .split('T')[0]}.pdf`

  doc.save(fileName)

  alert(`Supplier order generated for ${lowStockProducts.length} products!`)
}


  // filter product
  const getFilteredProducts = () => {
    return products.filter(product => {
      //search filter
      const matchesSearch = !searchTerm || 
        (product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      
      // category filter
      const matchesCategory = filterCategory === 'all' || 
        product.category === filterCategory
      
      // Filtr low stock
      const matchesLowStock = !showLowStockOnly || 
        (product.quantity || 0) < (product.min_threshold || 0)
      
      return matchesSearch && matchesCategory && matchesLowStock
    })
  }

  // Stats
  const totalProducts = products.length
  const lowStockCount = products.filter(p => 
    (p.quantity || 0) < (p.min_threshold || 0)
  ).length
  const filteredProducts = getFilteredProducts()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">📦 Pub Inventory</h1>
          <p className="text-muted mb-0">Manage your pub stock efficiently</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={generateSupplierOrder}
            disabled={lowStockCount === 0}
          >
            📋 Generate Supplier Order
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Stats*/}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-primary">{totalProducts}</h2>
              <p className="text-muted mb-0">Total Products</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className={lowStockCount > 0 ? 'text-danger' : 'text-success'}>
                {lowStockCount}
              </h2>
              <p className="text-muted mb-0">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-info">{filteredProducts.length}</h2>
              <p className="text-muted mb-0">Filtered</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-warning">
                £{products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0).toFixed(2)}
              </h2>
              <p className="text-muted mb-0">Stock Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtrs*/}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select 
                className="form-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="beer">Beer</option>
                <option value="wine">Wine</option>
                <option value="spirits">Spirits</option>
                <option value="soft">Soft Drinks</option>
                <option value="food">Food</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-md-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="lowStockOnly"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="lowStockOnly">
                  Show low stock only
                </label>
              </div>
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearchTerm('')
                  setFilterCategory('all')
                  setShowLowStockOnly(false)
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabele*/}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          {error ? (
            <div className="alert alert-danger m-3">{error}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-5">
              <div className="display-1 text-muted mb-3">📭</div>
              <h3>No products found</h3>
              <p className="text-muted">
                {products.length === 0 
                  ? "Add your first product to get started!" 
                  : "Try changing your filters"}
              </p>
              {products.length === 0 && (
                <button 
                  className="btn btn-primary mt-2"
                  onClick={() => setShowAddModal(true)}
                >
                  Add First Product
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Min Threshold</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const quantity = product.quantity || 0
                    const minThreshold = product.min_threshold || 0
                    const isLowStock = quantity < minThreshold
                    
                    return (
                      <tr key={product.id} className={isLowStock ? 'table-warning' : ''}>
                        <td>
                          <div className="fw-semibold">{product.name || 'Unnamed'}</div>
                        </td>
                        <td>
                          <span className="badge bg-info">
                            {product.category || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className={`fw-bold ${isLowStock ? 'text-danger' : ''}`}>
                            {quantity}
                          </span>
                        </td>
                        <td>{minThreshold}</td>
                        <td>
                          {product.price ? `£${product.price.toFixed(2)}` : 'N/A'}
                        </td>
                        <td>
                          {isLowStock ? (
                            <span className="badge bg-danger">Low Stock</span>
                          ) : (
                            <span className="badge bg-success">In Stock</span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button 
                              className="btn btn-outline-primary"
                              onClick={() => startEditProduct(product)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add product*/}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Product</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Product Name *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="e.g., IPA Beer"
                    required
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Quantity *</label>
                    <input 
                      type="number"
                      className="form-control"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({...newProduct, quantity: parseInt(e.target.value) || 0})}
                      min="0"
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Min Threshold *</label>
                    <input 
                      type="number"
                      className="form-control"
                      value={newProduct.min_threshold}
                      onChange={(e) => setNewProduct({...newProduct, min_threshold: parseInt(e.target.value) || 0})}
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    >
                      <option value="beer">Beer</option>
                      <option value="wine">Wine</option>
                      <option value="spirits">Spirits</option>
                      <option value="soft">Soft Drinks</option>
                      <option value="food">Food</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Price (£)</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                      min="0"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleAddProduct}
                  disabled={!newProduct.name.trim()}
                >
                  Add Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Product */}
      {showEditModal && editingProduct && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Product</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProduct(null)
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Product Name *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    required
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Quantity *</label>
                    <input 
                      type="number"
                      className="form-control"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({...newProduct, quantity: parseInt(e.target.value) || 0})}
                      min="0"
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Min Threshold *</label>
                    <input 
                      type="number"
                      className="form-control"
                      value={newProduct.min_threshold}
                      onChange={(e) => setNewProduct({...newProduct, min_threshold: parseInt(e.target.value) || 0})}
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    >
                      <option value="beer">Beer</option>
                      <option value="wine">Wine</option>
                      <option value="spirits">Spirits</option>
                      <option value="soft">Soft Drinks</option>
                      <option value="food">Food</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Price (£)</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                      min="0"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProduct(null)
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleEditProduct}
                  disabled={!newProduct.name.trim()}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer  */}
      <div className="mt-4 text-center text-muted small">
        <p className="mb-0">
          PubStock Manager • {filteredProducts.length} of {totalProducts} products shown
          {lowStockCount > 0 && (
            <span className="text-danger ms-2">
              • {lowStockCount} need restocking
            </span>
          )}
        </p>
      </div>
    </div>
  )
}