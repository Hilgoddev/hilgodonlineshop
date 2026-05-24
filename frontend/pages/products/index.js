import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { categoriesData } from '@/pages/categories';

const PAGE_SIZE = 20;

export default function ProductsPage({ allProducts = [] }) {
  const router = useRouter();

  // Derive initial state from URL query on first render
  const initCategory = router.query.category ? [router.query.category] : [];
  const initSubs = router.query.subcategory ? router.query.subcategory.split(',') : [];

  const [selectedCategories, setSelectedCategories] = useState(initCategory);
  const [selectedSubcategories, setSelectedSubcategories] = useState(initSubs);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // Sync category / subcategory from URL (navbar links change the URL)
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
    setCurrentPage(1);
  }, [router.isReady, router.query.category, router.query.subcategory]);

  // All filtering + sorting happens client-side — no network request
  const filteredAndSorted = useMemo(() => {
    let list = allProducts;

    if (selectedCategories.length > 0) {
      list = list.filter(p => selectedCategories.includes(p.category));
    }
    if (selectedSubcategories.length > 0) {
      list = list.filter(p => selectedSubcategories.includes(p.subcategory));
    }

    switch (sortBy) {
      case 'price-asc':  return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'rating':     return [...list].sort((a, b) => (b.ratings?.average || 0) - (a.ratings?.average || 0));
      case 'new':        return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      default:           return list;
    }
  }, [allProducts, selectedCategories, selectedSubcategories, sortBy]);

  // Pagination derived from filteredAndSorted
  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const pageProducts = filteredAndSorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 whenever filters or sort change
  useEffect(() => { setCurrentPage(1); }, [selectedCategories, selectedSubcategories, sortBy]);

  const goToPage = (p) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCategory = (cat) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(next);
    setSelectedSubcategories([]);
    router.push(
      { pathname: '/products', query: next.length > 0 ? { category: next[0] } : {} },
      undefined, { shallow: true }
    );
  };

  const toggleSubcategory = (sub) => {
    const next = selectedSubcategories.includes(sub)
      ? selectedSubcategories.filter(s => s !== sub)
      : [...selectedSubcategories, sub];
    setSelectedSubcategories(next);
    const q = {};
    if (selectedCategories.length > 0) q.category = selectedCategories[0];
    if (next.length > 0) q.subcategory = next.join(',');
    router.push({ pathname: '/products', query: q }, undefined, { shallow: true });
  };

  const getBreadcrumbTitle = () => {
    if (selectedCategories.length > 0) {
      const c = categoriesData.find(c => c.id === selectedCategories[0]);
      return c ? c.name : selectedCategories[0];
    }
    return 'All Products';
  };

  const getSidebarFilters = () => {
    if (selectedCategories.length > 0) {
      const cat = categoriesData.find(c => c.id === selectedCategories[0]);
      if (cat) return { title: 'Subcategories', type: 'subcategory', items: cat.subs.map(s => ({ value: s, label: s })) };
    }
    return { title: 'Category', type: 'category', items: categoriesData.map(c => ({ value: c.id, label: c.name })) };
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
      sports: ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'Decathlon'],
      toys: ['Lego', 'Barbie', 'Fisher-Price', 'Hasbro', 'Mattel', 'PlayZone'],
    };
    const cat = selectedCategories[0];
    return cat && brandMap[cat] ? brandMap[cat] : ['Hilgod Select', 'TopBrand', 'Premium Choice'];
  };

  const currentFilters = getSidebarFilters();

  // Pagination buttons (max 5 visible)
  const paginationButtons = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      pages.push(<div key="1" className="page-btn" onClick={() => goToPage(1)}>1</div>);
      if (start > 2) pages.push(<div key="s-ellipsis" className="page-btn"><i className="fas fa-ellipsis" /></div>);
    }
    for (let i = start; i <= end; i++) {
      pages.push(
        <div key={i} className={`page-btn ${currentPage === i ? 'active' : ''}`} onClick={() => goToPage(i)}>{i}</div>
      );
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(<div key="e-ellipsis" className="page-btn"><i className="fas fa-ellipsis" /></div>);
      pages.push(<div key={totalPages} className="page-btn" onClick={() => goToPage(totalPages)}>{totalPages}</div>);
    }
    if (currentPage < totalPages) {
      pages.push(
        <div key="next" className="page-btn" onClick={() => goToPage(currentPage + 1)}>
          <i className="fas fa-chevron-right" />
        </div>
      );
    }
    return pages;
  };

  return (
    <Layout
      title={`${getBreadcrumbTitle()} — Hilgod Online Store`}
      description="Browse thousands of products across all categories. Filter by price, brand, rating and more."
    >
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">{getBreadcrumbTitle()}</span>
      </nav>

      <h1 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
        {getBreadcrumbTitle()}
      </h1>

      <div className="show-mobile" style={{ marginBottom: 'var(--space-3)' }}>
        <button
          className="btn btn-outline btn-sm btn-mobile-full"
          onClick={() => {
            document.querySelector('.filters-sidebar')?.classList.toggle('mobile-open');
            document.querySelector('.filters-overlay')?.classList.toggle('mobile-open');
          }}
        >
          <i className="fas fa-filter"></i> Filter
        </button>
      </div>

      <div className="products-page">
        {/* Mobile Sidebar Overlay */}
        <div 
          className="filters-overlay" 
          onClick={() => {
            document.querySelector('.filters-sidebar')?.classList.remove('mobile-open');
            document.querySelector('.filters-overlay')?.classList.remove('mobile-open');
          }}
        ></div>

        {/* Sidebar */}
        <aside className="filters-sidebar">
          <div className="filter-header">
            <h3><i className="fas fa-sliders"></i> Filters</h3>
            <span className="filter-clear" onClick={() => { setSelectedCategories([]); setSelectedSubcategories([]); router.push('/products'); }}>
              Clear All
            </span>
          </div>

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

          <div className="filter-group">
            <div className="filter-group-title">Brand <i className="fas fa-chevron-down"></i></div>
            <div className="filter-group-body">
              {getCategoryBrands().map(brand => (
                <label key={brand} className="filter-check">
                  <input type="checkbox" className="filter-brand" value={brand.toLowerCase()} />
                  <span className="checkmark"></span>
                  <span className="filter-label">{brand}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-title">Min. Rating <i className="fas fa-chevron-down"></i></div>
            <div className="filter-group-body rating-filter">
              <div className="rating-option">
                <div className="stars">{[...Array(5)].map((_, i) => <i key={i} className="fas fa-star"></i>)}</div>
                <span className="filter-label">4★ & above</span>
              </div>
              <div className="rating-option">
                <div className="stars">
                  {[...Array(4)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
                  <i className="far fa-star empty"></i>
                </div>
                <span className="filter-label">3★ & above</span>
              </div>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-title">Availability <i className="fas fa-chevron-down"></i></div>
            <div className="filter-group-body">
              <label className="filter-check">
                <input type="checkbox" /><span className="checkmark"></span>
                <span className="filter-label">In Stock</span>
              </label>
              <label className="filter-check">
                <input type="checkbox" /><span className="checkmark"></span>
                <span className="filter-label">On Sale</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="products-main">
          <div className="products-topbar">
            <div className="products-count">
              <strong>{filteredAndSorted.length}</strong> products found
            </div>
            <div className="sort-controls">
              <span className="sort-label hide-mobile">Sort by:</span>
              <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="default">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="new">Newest</option>
              </select>
              <div className="view-toggle hide-mobile">
                <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} aria-label="Grid view" onClick={() => setViewMode('grid')}>
                  <i className="fas fa-th-large"></i>
                </button>
                <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} aria-label="List view" onClick={() => setViewMode('list')}>
                  <i className="fas fa-list"></i>
                </button>
              </div>
            </div>
          </div>

          {pageProducts.length > 0 ? (
            <div className={`product-catalog-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
              {pageProducts.map(product => (
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

          {totalPages > 1 && (
            <div className="pagination">{paginationButtons()}</div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ query, res }) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${baseUrl}/products?limit=1000`);
    const data = await response.json();
    return {
      props: {
        allProducts: data.success ? (data.data || []) : [],
      },
    };
  } catch {
    return { props: { allProducts: [] } };
  }
}
