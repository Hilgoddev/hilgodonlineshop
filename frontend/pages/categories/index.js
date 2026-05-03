import Link from 'next/link';
import Layout from '@/components/Layout';

export const categoriesData = [
  {
    id: 'beauty',
    name: 'Beauty & Personal Care',
    icon: 'fa-sparkles',
    subs: ['Skincare', 'Makeup', 'Haircare', 'Bath & Body Care', 'Fragrance', 'Personal Care Appliances']
  },
  {
    id: 'womenswear',
    name: 'Womenswear & Underwear',
    icon: 'fa-person-dress',
    subs: ["Women's Dresses", "Women's Tops", "Women's Bottoms", "Women's Sleepwear", "Women's Suits & Sets", "Women's Underwear"]
  },
  {
    id: 'menswear',
    name: 'Menswear & Underwear',
    icon: "fa-person",
    subs: ["Men's Tops", "Men's Bottoms", "Men's Suits & Sets", "Men's Underwear", "Men's Sleepwear"]
  },
  {
    id: 'electronics',
    name: 'Phones & Electronics',
    icon: "fa-mobile-screen",
    subs: ["Mobile Phones", "Laptops & Computers", "Smart & Wearable Devices", "Audio & Video", "Cameras & Photography", "Accessories"]
  },
  {
    id: 'accessories',
    name: 'Fashion Accessories',
    icon: "fa-glasses",
    subs: ["Watches", "Jewelry", "Sunglasses", "Hats & Caps", "Belts", "Scarves"]
  },
  {
    id: 'home',
    name: 'Home Supplies',
    icon: "fa-house",
    subs: ["Bedding", "Bath", "Home Decor", "Storage & Organization", "Cleaning Supplies", "Furniture"]
  },
  {
    id: 'kitchen',
    name: 'Kitchenware',
    icon: "fa-kitchen-set",
    subs: ["Cookware", "Bakeware", "Kitchen Utensils", "Drinkware", "Cutlery & Tableware", "Kitchen Appliances"]
  },
  {
    id: 'shoes',
    name: 'Shoes',
    icon: "fa-shoe-prints",
    subs: ["Men's Shoes", "Women's Shoes", "Sneakers", "Boots", "Sandals", "Shoe Accessories"]
  }
];

export default function Categories() {
  return (
    <Layout 
      title="All Categories — Hilgod Online Store"
      description="Browse all product categories at Hilgod Online Store. Free Shipping and Amazing Deals."
    >
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">All Categories</span>
      </nav>
      
      <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: 'var(--space-2)' }}>
          Shop All Categories
        </h1>
        <p style={{ color: 'var(--gray-1)' }}>
          Explore everything we have to offer across all departments
        </p>
      </div>
      
      <div className="sitemap-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: 'var(--space-8) var(--space-6)',
        paddingBottom: 'var(--space-16)'
      }}>
        {categoriesData.map(category => (
          <div key={category.id} className="sitemap-category">
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: '700', 
              marginBottom: 'var(--space-3)',
              color: 'var(--dark)'
            }}>
              {category.name}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {category.subs.map((sub, index) => (
                <li key={index} style={{ marginBottom: '10px' }}>
                  <Link 
                    href={`/products?category=${category.id}&subcategory=${encodeURIComponent(sub)}`}
                    style={{ 
                      color: 'var(--gray-1)', 
                      fontSize: '.9rem',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--gray-1)'}
                  >
                    {sub}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Layout>
  );
}