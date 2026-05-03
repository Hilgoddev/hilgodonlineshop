import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useShop } from '@/components/ShopProvider';
import ProductCard from '@/components/ProductCard';

export default function Wishlist() {
  const { wishlist, toggleWishlist, addToCart, showToast } = useShop();

  // Remove item from wishlist
  const removeItem = (product) => {
    if (confirm('Are you sure you want to remove this item from your wishlist?')) {
      toggleWishlist(product);
    }
  };

  // Move all items to cart
  const moveAllToCart = () => {
    if (wishlist.length === 0) return;
    
    if (confirm(`Are you sure you want to move all ${wishlist.length} items to your cart?`)) {
      wishlist.forEach(product => {
        addToCart(product, 1);
      });
      showToast('All items moved to cart successfully!', 'success');
    }
  };

  // Clear entire wishlist
  const clearWishlist = () => {
    if (wishlist.length === 0) return;
    
    if (confirm('Are you sure you want to clear your entire wishlist?')) {
      wishlist.forEach(product => toggleWishlist(product));
      showToast('Wishlist cleared successfully!', 'info');
    }
  };

  const isEmpty = wishlist.length === 0;

  return (
    <Layout 
      title="My Wishlist — Hilgod Online Store"
      description="Your saved items wishlist. Add to cart or share your wishlist."
    >
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Wishlist</span>
      </nav>
      
      <div className="wishlist-header">
        <h1>
          <i className="fas fa-heart" style={{ color: 'var(--primary)' }}></i> My Wishlist{' '}
          <span className="wishlist-count" id="wishlist-count">
            {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
          </span>
        </h1>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <button 
            className="btn btn-outline btn-sm" 
            onClick={clearWishlist}
            disabled={isEmpty}
          >
            <i className="fas fa-trash-can"></i> Clear Wishlist
          </button>
          <button 
            className="btn btn-primary btn-sm btn-move-all" 
            onClick={moveAllToCart}
            disabled={isEmpty}
          >
            <i className="fas fa-cart-plus"></i> Move All to Cart
          </button>
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="empty-state" id="wishlist-empty">
          <i className="fas fa-heart-crack"></i>
          <h3>Your wishlist is empty</h3>
          <p>Save items you love and find them easily later!</p>
          <Link href="/products" className="btn btn-primary btn-lg">
            <i className="fas fa-shopping-bag"></i> Start Shopping
          </Link>
        </div>
      )}

      {/* Wishlist Grid */}
      {!isEmpty && (
        <div className="wishlist-grid" id="wishlist-grid">
          {wishlist.map((product) => {
            const safeProduct = typeof product === 'string' ? { _id: product, name: 'Unknown Product', price: 0 } : product;
            return <ProductCard key={safeProduct._id} product={safeProduct} />;
          })}
        </div>
      )}
    </Layout>
  );
}