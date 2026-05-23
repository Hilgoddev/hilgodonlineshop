import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { categoriesData } from '@/pages/categories';

export default function ProductsPage({ initialProducts, initialPagination }) {
  const router = useRouter();
  const { category, page = 1 } = router.query;
  
  const [products, setProducts] = useState(initialProducts);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(category ? [category] : []);
  const [selectedSubcategories, setSelectedSubcategories] = useState(router.query.subcategory ? router.query.subcategory.split(',') : []);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('grid');

  // Sync filter state whenever the URL query changes (e.g. navbar category links)
  useEffect(() => {
    if (!router.isReady) return;
    const newCat = router.query.category ? [router.query.category] : [];
    setSelectedCategories(newCat);
    if (router.query.subcategory) {
      const validSubs = newCat.length > 0
        ? (categoriesData.find(c => c.id === newCat[0])?.subs || [])
        : [];
      const querySubs = router.query.subcategory.split(',');
      setSelectedSubcategories(querySubs.filter(s => validSubs.includes(s)));
    } else {
      setSelectedSubcategories([]);
    }
  }, [router.isReady, router.query.category, router.query.subcategory]);

  // Fetch products based on filters
  const fetchProducts = async (pageNum = 1) => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (selectedCategories.length > 0) {
        params.append('category', selectedCategories.join(','));
      }
      if (selectedSubcategories.length > 0) {
        params.append('subcategory', selectedSubcategories.join(','));
      }
      params.append('page', pageNum);
      params.append('limit', '20');
      
      if (sortBy !== 'default') {
        // Note: The current API doesn't support sorting by these fields directly
        // We'll handle sorting client-side for now
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        let sortedProducts = data.data;
        
        // Client-side sorting
        if (sortBy === 'price-asc') {
          sortedProducts.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-desc') {
          sortedProducts.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'rating') {
          sortedProducts.sort((a, b) => (b.ratings?.average || 0) - (a.ratings?.average || 0));
        } else if (sortBy === 'new') {
          sortedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        setProducts(sortedProducts);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle category selection
  const toggleCategory = (cat) => {
    const newCategories = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    
    setSelectedCategories(newCategories);
    setSelectedSubcategories([]); // Clear subcategories on main category change
    router.push({
      pathname: '/products',
      query: newCategories.length > 0 ? { category: newCategories[0] } : {}
    }, undefined, { shallow: true });
  };

  // Handle subcategory selection
  const toggleSubcategory = (subcat) => {
    const newSubcats = selectedSubcategories.includes(subcat)
      ? selectedSubcategories.filter(c => c !== subcat)
      : [...selectedSubcategories, subcat];
    
    setSelectedSubcategories(newSubcats);
    const query = {};
    if (category) query.category = category;
    if (newSubcats.length > 0) query.subcategory = newSubcats.join(',');
    
    router.push({
      pathname: '/products',
      query
    }, undefined, { shallow: true });
  };

  // Handle sort change
  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSortBy(newSort);
  };

  // Re-fetch when filters or page changes
  useEffect(() => {
    fetchProducts(Number(page) || 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, selectedSubcategories, sortBy, page]);

  // Refetch when the user returns to this tab so counts/prices stay current
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts(Number(page));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedCategories, selectedSubcategories, sortBy]);

  // Update breadcrumb title
  const getBreadcrumbTitle = () => {
    if (category) {
      const catData = categoriesData.find(c => c.id === category);
      return catData ? catData.name : category;
    }
    return 'All Products';
  };

  const getSidebarFilters = () => {
    if (category) {
      const catData = categoriesData.find(c => c.id === category);
      if (catData) {
        return {
          title: 'Subcategories',
          type: 'subcategory',
          items: catData.subs.map(sub => ({ value: sub, label: sub }))
        };
      }
    }
    return {
      title: 'Category',
      type: 'category',
      items: categoriesData.map(c => ({ value: c.id, label: c.name }))
    };
  };

  const getCategoryBrands = () => {
    const brandMap = {
      beauty: ['MAC', 'CeraVe', "L'Oreal", 'Nivea', 'Dove', 'Fenty Beauty'],
      womenswear: ['Zara', 'H&M', 'Gucci', 'Prada', 'HilgodFashion'],
      menswear: ['Nike', 'Adidas', 'Polo Ralph Lauren', 'Tommy Hilfiger', 'HilgodFashion'],
      electronics: ['Samsung', 'Apple', 'Tecno', 'Infinix', 'Xiaomi', 'Sony'],
      accessories: ['Rolex', 'Casio', 'Ray-Ban', 'Michael Kors', 'Pandora', 'Coach'],
      home: ['IKEA', 'Philips', 'HomeGoods', 'Homecraft', 'Royal Home'],
      kitchen: ['Binatone', 'Nasco', 'Panasonic', 'LG', 'Bosch', 'Scanfrost'],
      shoes: ['Nike', 'Adidas', 'Puma', 'Vans', 'New Balance', 'Clarks'],
      herbs: ['Organic Herb Co', 'NatureSpice', 'HerbWise', 'AfriHerb', 'PureLeaf', 'GreenRoot'],
      gaming: ['Sony', 'Microsoft', 'Nintendo', 'Razer', 'Logitech', 'SteelSeries'],
      collectibles: ['Heritage Collectibles', 'Vintage Vault', 'ArtSpace', 'Collectamania'],
      sports: ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'Decathlon'],
      toys: ['Lego', 'Barbie', 'Fisher-Price', 'Hasbro', 'Mattel', 'PlayZone'],
    };
    return category && brandMap[category] ? brandMap[category] : ['Hilgod Select', 'TopBrand', 'Premium Choice'];
  };

  const currentFilters = getSidebarFilters();
  const currentBrands = getCategoryBrands();

  return (
    <Layout 
      title={`${getBreadcrumbTitle()} — Hilgod Online Store`}
      description="Browse thousands of products across all categories. Filter by price, brand, rating and more."
    >
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current" id="cat-breadcrumb">{getBreadcrumbTitle()}</span>
      </nav>

      {/* Page Title */}
      <h1 id="products-page-title" style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
        {getBreadcrumbTitle()}
      </h1>

      {/* Mobile Filter Toggle */}
      <div className="show-mobile" style={{ marginBottom: 'var(--space-3)' }}>
        <button 
          className="btn btn-outline btn-sm" 
          onClick={() => {
            const sidebar = document.querySelector('.filters-sidebar');
            sidebar?.classList.toggle('mobile-open');
          }}
        >
          <i className="fas fa-filter"></i> Filter
        </button>
      </div>

      <div className="products-page">
        {/* SIDEBAR FILTERS */}
        <aside className="filters-sidebar">
          <div className="filter-header">
            <h3><i className="fas fa-sliders"></i> Filters</h3>
            <span 
              className="filter-clear" 
              onClick={() => {
                setSelectedCategories([]);
                router.push('/products');
              }}
            >
              Clear All
            </span>
          </div>

          {/* Dynamic Categories / Subcategories */}
          <div className="filter-group">
            <div className="filter-group-title">{currentFilters.title} <i className="fas fa-chevron-down"></i></div>
            <div className="filter-group-body">
              {currentFilters.items.map(item => (
                <label key={item.value} className="filter-check">
                  <input
                    type="checkbox"
                    className="filter-cat"
                    value={item.value}
                    checked={currentFilters.type === 'category' 
                      ? selectedCategories.includes(item.value)
                      : selectedSubcategories.includes(item.value)
                    }
                    onChange={() => currentFilters.type === 'category'
                      ? toggleCategory(item.value)
                      : toggleSubcategory(item.value)
                    }
                  />
                  <span className="checkmark"></span>
                  <span className="filter-label">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dynamic Brands */}
          <div className="filter-group">
            <div className="filter-group-title">Brand <i className="fas fa-chevron-down"></i></div>
            <div className="filter-group-body">
              {currentBrands.map(brand => (
                <label key={brand} className="filter-check">
                  <input type="checkbox" className="filter-brand" value={brand.toLowerCase()} />
                  <span className="checkmark"></span>
                  <span className="filter-label">{brand}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="filter-group">
            <div className="filter-group-title">Min. Rating <i className="fas fa-chevron-down"></i></div>
            <div className="filter-group-body rating-filter">
              <div className="rating-option">
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fas fa-star"></i>
                  ))}
                </div>
                <span className="filter-label">4★ & above</span>
              </div>
              <div className="rating-option">
                <div className="stars">
                  {[...Array(4)].map((_, i) => (
                    <i key={i} className="fas fa-star"></i>
                  ))}
                  <i className="far fa-star empty"></i>
                </div>
                <span className="filter-label">3★ & above</span>
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="filter-group">
            <div className="filter-group-title">Availability <i className="fas fa-chevron-down"></i></div>
            <div className="filter-group-body">
              <label className="filter-check">
                <input type="checkbox" />
                <span className="checkmark"></span>
                <span className="filter-label">In Stock</span>
              </label>
              <label className="filter-check">
                <input type="checkbox" />
                <span className="checkmark"></span>
                <span className="filter-label">On Sale</span>
              </label>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="products-main">
          {/* Topbar */}
          <div className="products-topbar">
            <div className="products-count">
              <strong id="product-count">{pagination.total || products.length}</strong> products found
            </div>
            <div className="sort-controls">
              <span className="sort-label hide-mobile">Sort by:</span>
              <select 
                className="sort-select" 
                id="sort-select"
                value={sortBy}
                onChange={handleSortChange}
              >
                <option value="default">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="new">Newest</option>
              </select>
              <div className="view-toggle hide-mobile">
                <button 
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} 
                  id="view-grid" 
                  aria-label="Grid view"
                  onClick={() => setViewMode('grid')}
                >
                  <i className="fas fa-th-large"></i>
                </button>
                <button 
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} 
                  id="view-list" 
                  aria-label="List view"
                  onClick={() => setViewMode('list')}
                >
                  <i className="fas fa-list"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="loading-spinner" style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
            </div>
          ) : products.length > 0 ? (
            <div className={`product-catalog-grid ${viewMode === 'list' ? 'list-view' : ''}`} id="products-grid">
              {products.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="no-products" style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fas fa-box-open" style={{ fontSize: '3rem', color: 'var(--gray-2)' }}></i>
              <p style={{ marginTop: '16px', fontSize: '1.1rem', color: 'var(--gray-1)' }}>
                No products found in this category.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => (
                <div
                  key={i + 1}
                  className={`page-btn ${pagination.page === i + 1 ? 'active' : ''}`}
                  onClick={() => {
                    router.push({
                      pathname: '/products',
                      query: { ...router.query, page: i + 1 }
                    });
                  }}
                >
                  {i + 1}
                </div>
              ))}
              {pagination.pages > 5 && (
                <>
                  <div className="page-btn"><i className="fas fa-ellipsis"></i></div>
                  <div
                    className="page-btn"
                    onClick={() => {
                      router.push({
                        pathname: '/products',
                        query: { ...router.query, page: pagination.pages }
                      });
                    }}
                  >
                    {pagination.pages}
                  </div>
                </>
              )}
              {pagination.page < pagination.pages && (
                <div
                  className="page-btn"
                  onClick={() => {
                    router.push({
                      pathname: '/products',
                      query: { ...router.query, page: pagination.page + 1 }
                    });
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Server-side props to fetch initial data
export async function getServerSideProps({ query, res }) {
  res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
  try {
    const { category, page = 1 } = query;
    
    // Try to fetch from API first
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const params = new URLSearchParams();
    
    if (category) {
      params.append('category', category);
    }
    params.append('page', page);
    params.append('limit', '20');

    const res = await fetch(`${baseUrl}/api/products?${params.toString()}`);
    const data = await res.json();
    
    return {
      props: {
        initialProducts: data.success ? (data.data || []) : [],
        initialPagination: data.pagination || { total: 0, page: 1, pages: 0 },
        categories: []
      },
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      props: {
        initialProducts: [],
        initialPagination: { total: 0, page: 1, pages: 0 },
        categories: []
      },
    };
  }
}