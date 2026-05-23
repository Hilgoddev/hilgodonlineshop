# Hilgod Online Shop - API Documentation

## Base URL
```
http://localhost:3000/api
```

---

## Authentication Endpoints

### 1. NextAuth (Google, Facebook, Credentials)
**Endpoint:** `/api/auth/[...nextauth]`  
**Methods:** GET, POST  
**Description:** Handles all authentication providers

#### Sign In with Google
```javascript
// Frontend redirect
window.location.href = '/api/auth/signin';
// User selects Google from options
```

#### Sign In with Facebook
```javascript
// Frontend redirect
window.location.href = '/api/auth/signin';
// User selects Facebook from options
```

#### Sign In with Email/Password
```javascript
import { signIn } from 'next-auth/react';

const result = await signIn('credentials', {
  email: 'user@example.com',
  password: 'password123',
  redirect: false,
});
```

#### Get Session
```javascript
import { useSession } from 'next-auth/react';

const { data: session } = useSession();
// session.user = { id, name, email, image, role, provider }
```

---

### 2. User Registration
**Endpoint:** `/api/signup`  
**Method:** POST  
**Rate Limit:** 5 attempts per 15 minutes per IP

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

#### Validation Rules
- `name`: 2-100 characters
- `email`: Valid email format
- `password`: Minimum 6 characters

#### Success Response (201)
```json
{
  "success": true,
  "data": {
    "id": "64f8a9b2c3d4e5f6a7b8c9d0",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### Error Responses
```json
// Rate limited (429)
{
  "success": false,
  "error": "Too many signup attempts. Please try again later."
}

// Validation error (400)
{
  "success": false,
  "error": "Validation failed",
  "details": [...]
}

// User exists (400)
{
  "success": false,
  "error": "User with this email already exists"
}
```

---

## Product Endpoints

### 3. Get All Products
**Endpoint:** `/api/products`  
**Method:** GET  
**Access:** Public

#### Query Parameters
- `category` (optional): Filter by category
- `search` (optional): Text search
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

#### Example Requests
```bash
# Get all products
GET /api/products

# Filter by category
GET /api/products?category=Electronics

# Search products
GET /api/products?search=laptop

# Pagination
GET /api/products?page=2&limit=10
```

#### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a9b2c3d4e5f6a7b8c9d0",
      "name": "Wireless Headphones",
      "description": "High-quality wireless headphones",
      "price": 99.99,
      "images": ["https://example.com/image1.jpg"],
      "category": "Electronics",
      "stock": 50,
      "ratings": {
        "average": 4.5,
        "count": 128
      },
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 5
  }
}
```

---

### 4. Get Single Product
**Endpoint:** `/api/products/:id`  
**Method:** GET  
**Access:** Public

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "_id": "64f8a9b2c3d4e5f6a7b8c9d0",
    "name": "Wireless Headphones",
    "description": "High-quality wireless headphones",
    "price": 99.99,
    "images": ["https://example.com/image1.jpg"],
    "category": "Electronics",
    "stock": 50,
    "ratings": {
      "average": 4.5,
      "count": 128
    },
    "isActive": true
  }
}
```

#### Error Response (404)
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

### 5. Create Product
**Endpoint:** `/api/products`  
**Method:** POST  
**Access:** Admin only

#### Headers
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "New Product",
  "description": "Product description here",
  "price": 49.99,
  "images": ["https://example.com/product.jpg"],
  "category": "Electronics",
  "stock": 100
}
```

#### Validation Rules
- `name`: 2-200 characters
- `description`: 10-2000 characters
- `price`: Number >= 0
- `images`: Array of valid URLs, minimum 1
- `category`: Required string
- `stock`: Number >= 0 (default: 0)

#### Success Response (201)
```json
{
  "success": true,
  "data": { ...product_data }
}
```

#### Error Responses
```json
// Not authenticated (401)
{
  "success": false,
  "error": "Not authenticated"
}

// Not admin (403)
{
  "success": false,
  "error": "Admin access required"
}

// Validation error (400)
{
  "success": false,
  "error": "Validation failed",
  "details": [...]
}
```

---

### 6. Update Product
**Endpoint:** `/api/products/:id`  
**Method:** PUT  
**Access:** Admin only

#### Request Body (all fields optional)
```json
{
  "name": "Updated Product Name",
  "price": 59.99,
  "stock": 75,
  "isActive": true
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": { ...updated_product }
}
```

---

### 7. Delete Product
**Endpoint:** `/api/products/:id`  
**Method:** DELETE  
**Access:** Admin only

#### Success Response (200)
```json
{
  "success": true,
  "data": {}
}
```

---

## Cart Endpoints

### 8. Get Cart
**Endpoint:** `/api/cart`  
**Method:** GET  
**Access:** Authenticated users

#### Success Response (200)
```json
{
  "success": true,
  "data": []
}
```
*Note: Cart is managed client-side with localStorage*

---

### 9. Add to Cart (Validate Product)
**Endpoint:** `/api/cart`  
**Method:** POST  
**Access:** Authenticated users

#### Request Body
```json
{
  "productId": "64f8a9b2c3d4e5f6a7b8c9d0",
  "quantity": 2
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Product validated for cart",
  "data": {
    "productId": "64f8a9b2c3d4e5f6a7b8c9d0",
    "name": "Wireless Headphones",
    "price": 99.99,
    "image": "https://example.com/image.jpg",
    "availableStock": 50
  }
}
```

#### Error Responses
```json
// Insufficient stock (400)
{
  "success": false,
  "error": "Insufficient stock"
}

// Product not found (404)
{
  "success": false,
  "error": "Product not found"
}
```

---

## Order Endpoints

### 10. Get User Orders
**Endpoint:** `/api/orders`  
**Method:** GET  
**Access:** Authenticated users

#### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a9b2c3d4e5f6a7b8c9d1",
      "user": "64f8a9b2c3d4e5f6a7b8c9d0",
      "items": [
        {
          "product": { ...product_details },
          "name": "Wireless Headphones",
          "price": 99.99,
          "quantity": 2,
          "image": "https://example.com/image.jpg"
        }
      ],
      "totalAmount": 199.98,
      "status": "pending",
      "paymentStatus": "pending",
      "deliveryAddress": {
        "street": "123 Main St",
        "city": "Lagos",
        "state": "Lagos State",
        "zipCode": "100001",
        "country": "Nigeria",
        "phone": "+2341234567890"
      },
      "paymentMethod": "paystack",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 11. Create Order
**Endpoint:** `/api/orders`  
**Method:** POST  
**Access:** Authenticated users

#### Request Body
```json
{
  "items": [
    {
      "product": "64f8a9b2c3d4e5f6a7b8c9d0",
      "quantity": 2
    }
  ],
  "deliveryAddress": {
    "street": "123 Main Street",
    "city": "Lagos",
    "state": "Lagos State",
    "zipCode": "100001",
    "country": "Nigeria",
    "phone": "+2341234567890"
  }
}
```

#### What Happens:
1. Validates all products exist and are active
2. Checks stock availability
3. Calculates total amount
4. Decreases product stock
5. Creates order with pending status

#### Success Response (201)
```json
{
  "success": true,
  "data": { ...order_with_populated_products }
}
```

#### Error Responses
```json
// Product not found (400)
{
  "success": false,
  "error": "Product 64f8a9b2c3d4e5f6a7b8c9d0 not found"
}

// Insufficient stock (400)
{
  "success": false,
  "error": "Insufficient stock for Wireless Headphones"
}

// Product unavailable (400)
{
  "success": false,
  "error": "Product Wireless Headphones is no longer available"
}
```

---

### 12. Get Single Order
**Endpoint:** `/api/orders/:id`  
**Method:** GET  
**Access:** Authenticated users (own orders only)

#### Success Response (200)
```json
{
  "success": true,
  "data": { ...order_details }
}
```

---

## Payment Endpoints

### 13. Initialize Paystack Payment
**Endpoint:** `/api/payment/initiate`  
**Method:** POST  
**Access:** Authenticated users

#### Request Body
```json
{
  "orderId": "64f8a9b2c3d4e5f6a7b8c9d1"
}
```

#### What Happens:
1. Verifies order exists and belongs to user
2. Checks order hasn't been paid
3. Generates unique reference
4. Calls Paystack API to initialize transaction
5. Saves reference to order
6. Returns authorization URL

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/xxxxx",
    "access_code": "xxx_xxx_xxx",
    "reference": "HILGOD_64f8a9b2c3d4e5f6a7b8c9d1_1705312200000"
  }
}
```

#### Usage in Frontend:
```javascript
// Redirect user to Paystack checkout
window.location.href = response.data.authorization_url;

// Or open in popup
const popup = window.open(response.data.authorization_url, 'Paystack Checkout');
```

#### Error Responses
```json
// Order already paid (400)
{
  "success": false,
  "error": "Order already paid"
}

// Order not found (404)
{
  "success": false,
  "error": "Order not found"
}
```

---

### 14. Paystack Webhook
**Endpoint:** `/api/payment/webhook`  
**Method:** POST  
**Access:** Public (signature verified)

#### Important:
- This endpoint receives callbacks from Paystack
- Signature verification ensures authenticity
- No authentication header needed
- `bodyParser` is disabled to get raw body

#### Webhook Events Handled:
- `charge.success` - Payment successful
- `charge.failed` - Payment failed

#### What Happens on Success:
1. Verifies webhook signature
2. Finds order by reference
3. Validates payment amount
4. Updates order paymentStatus to 'paid'
5. Updates order status to 'processing'

#### Response (200)
```json
{
  "success": true,
  "message": "Payment verified"
}
```

---

## Example Frontend Integration

### Login with Google
```javascript
import { signIn } from 'next-auth/react';

function LoginPage() {
  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <button onClick={handleGoogleLogin}>
      Sign in with Google
    </button>
  );
}
```

### Fetch Products
```javascript
async function getProducts(category, page = 1) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
  });
  
  if (category) params.append('category', category);
  
  const res = await fetch(`/api/products?${params}`);
  const data = await res.json();
  
  return data;
}
```

### Create Order
```javascript
async function createOrder(items, deliveryAddress) {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items, deliveryAddress }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error);
  }
  
  return data;
}
```

### Initialize Payment
```javascript
async function payWithPaystack(orderId) {
  const res = await fetch('/api/payment/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error);
  }
  
  // Redirect to Paystack
  window.location.href = data.data.authorization_url;
}
```

---

## Error Codes Reference

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 405 | Method Not Allowed |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/signup` | 5 attempts | 15 minutes |

---

## Authentication Flow

1. User signs up or logs in
2. NextAuth creates JWT session
3. Session cookie stored in browser
4. Protected routes check session
5. Admin routes check user.role === 'admin'

---

**For more details, see PRODUCTION_SUMMARY.md**
