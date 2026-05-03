// Script to seed database with sample products
// Run with: node scripts/seed-products.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const Product = require('../models/Product').default;

const sampleProducts = [
  {
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
    price: 199.99,
    compareAtPrice: 249.99,
    category: 'Electronics',
    subcategory: 'Audio',
    images: [
      { url: '/assets/images/headphones-1.jpg', alt: 'Wireless Headphones' }
    ],
    stock: 50,
    sku: 'ELEC-AUD-001',
    brand: 'SoundMax',
    tags: ['wireless', 'headphones', 'audio', 'bluetooth'],
    rating: { average: 4.5, count: 128 },
    featured: true,
    isActive: true,
  },
  {
    name: 'Smart Watch Pro',
    description: 'Advanced smartwatch with fitness tracking, heart rate monitor, and GPS.',
    price: 299.99,
    category: 'Electronics',
    subcategory: 'Wearables',
    images: [
      { url: '/assets/images/smartwatch-1.jpg', alt: 'Smart Watch' }
    ],
    stock: 30,
    sku: 'ELEC-WEA-001',
    brand: 'TechFit',
    tags: ['smartwatch', 'fitness', 'wearable'],
    rating: { average: 4.7, count: 95 },
    featured: true,
    isActive: true,
  },
  {
    name: 'Organic Cotton T-Shirt',
    description: 'Comfortable organic cotton t-shirt available in multiple colors.',
    price: 29.99,
    category: 'Clothing',
    subcategory: 'T-Shirts',
    images: [
      { url: '/assets/images/tshirt-1.jpg', alt: 'Cotton T-Shirt' }
    ],
    stock: 200,
    sku: 'CLTH-TSH-001',
    brand: 'EcoWear',
    tags: ['organic', 'cotton', 't-shirt', 'clothing'],
    rating: { average: 4.3, count: 67 },
    isActive: true,
  },
  {
    name: 'Running Shoes Elite',
    description: 'Professional running shoes with advanced cushioning and support.',
    price: 149.99,
    compareAtPrice: 179.99,
    category: 'Footwear',
    subcategory: 'Sports',
    images: [
      { url: '/assets/images/shoes-1.jpg', alt: 'Running Shoes' }
    ],
    stock: 75,
    sku: 'FOOT-SPT-001',
    brand: 'RunPro',
    tags: ['running', 'shoes', 'sports', 'athletic'],
    rating: { average: 4.8, count: 203 },
    featured: true,
    isActive: true,
  },
  {
    name: 'Laptop Backpack',
    description: 'Durable laptop backpack with multiple compartments and USB charging port.',
    price: 79.99,
    category: 'Accessories',
    subcategory: 'Bags',
    images: [
      { url: '/assets/images/backpack-1.jpg', alt: 'Laptop Backpack' }
    ],
    stock: 100,
    sku: 'ACC-BAG-001',
    brand: 'TravelGear',
    tags: ['backpack', 'laptop', 'travel', 'bag'],
    rating: { average: 4.6, count: 156 },
    isActive: true,
  },
];

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing products...');
    await Product.deleteMany({});
    console.log('✅ Existing products cleared');

    console.log('📦 Inserting sample products...');
    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ Inserted ${products.length} products`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nSample products added:');
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - $${product.price}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
