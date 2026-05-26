# Orders API Documentation

## Base URL
`/api/orders`

## Endpoints

### 1. GET / - Fetch User's Orders

**Description:** Get all orders for the authenticated user with seller information and fulfillment status.

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "550e8400-e29b-41d4-a716-446655440000",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "shipped",
      "paymentStatus": "paid",
      "totalAmount": 45000,
      "currency": "NGN",
      "createdAt": "2026-05-20T10:30:00Z",
      "updatedAt": "2026-05-25T14:15:00Z",
      "deliveryAddress": {
        "address": "123 Street Name",
        "city": "Lagos",
        "state": "Lagos",
        "postalCode": "100001"
      },
      "items": [
        {
          "id": "item-001",
          "productId": "prod-001",
          "name": "Samsung Galaxy S24",
          "image": "https://cdn.example.com/phone.jpg",
          "price": 45000,
          "quantity": 1,
          "fulfillmentStatus": "shipped",
          "seller": {
            "id": "seller-001",
            "name": "Tech Store Nigeria",
            "phone": "+234801234567",
            "storeName": "Tech Store",
            "storeLogo": "https://cdn.example.com/store.jpg"
          }
        }
      ],
      "user": null
    }
  ],
  "pagination": {
    "total": 1
  }
}
```

### 2. POST / - Create New Order

**Description:** Create a new order with cart items and shipping address.

**Authentication:** Required

**Request Body:**
```json
{
  "items": [
    {
      "productId": "prod-001",
      "quantity": 1,
      "price": 45000
    }
  ],
  "shippingAddress": {
    "address": "123 Street Name",
    "city": "Lagos",
    "state": "Lagos",
    "postalCode": "100001"
  },
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order-uuid",
    "id": "order-uuid",
    "status": "pending",
    "paymentStatus": "pending",
    "totalAmount": 46500,
    "currency": "NGN",
    "items": [
      {
        "productId": "prod-001",
        "name": "Samsung Galaxy S24",
        "image": "https://cdn.example.com/phone.jpg",
        "price": 45000,
        "quantity": 1,
        "sellerId": "seller-001"
      }
    ]
  }
}
```

**Notes:**
- Server validates prices against database
- Calculates delivery fee (₦1,500, free if total > ₦50,000)
- Returns only server-computed total
- Price tampering attempts are logged and rejected

### 3. GET /all - Fetch All Orders (Admin Only)

**Description:** Get all orders in the system with buyer and seller information.

**Authentication:** Required (Admin role)

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order-001",
      "status": "delivered",
      "totalAmount": 45000,
      "items": [
        {
          "id": "item-001",
          "name": "Product Name",
          "price": 45000,
          "quantity": 1,
          "fulfillmentStatus": "delivered",
          "seller": {
            "id": "seller-001",
            "name": "Store Name",
            "phone": "+234801234567",
            "storeName": "Store Name",
            "storeLogo": "url"
          }
        }
      ]
    }
  ],
  "totalRevenue": 450000,
  "pagination": { "total": 10 }
}
```

### 4. GET /:id - Fetch Single Order

**Description:** Get detailed view of a specific order (buyer or admin only).

**Authentication:** Required

**Parameters:**
- `id`: Order UUID or first 8 characters

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "order-uuid",
    "status": "shipped",
    "totalAmount": 46500,
    "items": [
      {
        "id": "item-001",
        "productId": "prod-001",
        "name": "Samsung Galaxy S24",
        "image": "https://cdn.example.com/phone.jpg",
        "price": 45000,
        "quantity": 1,
        "fulfillmentStatus": "shipped",
        "seller": {
          "id": "seller-001",
          "name": "Tech Store Nigeria",
          "phone": "+234801234567",
          "storeName": "Tech Store",
          "storeLogo": "https://cdn.example.com/store.jpg"
        }
      }
    ]
  }
}
```

### 5. PUT /:id - Update Order Status (Admin Only)

**Description:** Update order status and notify buyer.

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "status": "shipped"
}
```

**Valid Statuses:**
- `pending` - Order created, awaiting payment
- `paid` - Payment received
- `processing` - Being prepared for shipment
- `shipped` - In transit
- `delivered` - Received by customer
- `cancelled` - Order cancelled

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order-uuid",
    "status": "shipped",
    "updatedAt": "2026-05-25T14:20:00Z"
  }
}
```

## Seller Information Fields

Each order item includes seller information:

```javascript
seller: {
  id: UUID,                  // Seller's profile ID
  name: String,              // Seller's full name
  phone: String,             // Seller's contact phone
  storeName: String,         // Store name (if applicable)
  storeLogo: String          // Store logo URL
}
```

## Fulfillment Status Tracking

**For Order Items:**
- `pending` - Order placed, not yet processed by seller
- `processing` - Seller preparing item for shipment
- `shipped` - Item in transit
- `delivered` - Item received
- `cancelled` - Item order cancelled
- `returned` - Item returned by customer

**Update Flow:**
1. Order created → items in `pending` status
2. Seller processes → changes to `processing`
3. Shipment arranged → changes to `shipped`
4. Delivery confirmed → changes to `delivered`

## Live Updates

The frontend polls `/api/orders` every **30 seconds** for the authenticated user to get:
- Updated order statuses
- Fulfillment status changes per item
- Real-time UI updates without page refresh

## Error Responses

```json
{
  "success": false,
  "error": "Error message"
}
```

**Common Errors:**
- `401` - Not authenticated
- `403` - Admin access required / Order not owned by user
- `400` - Invalid input (price mismatch, insufficient stock, etc.)
- `409` - Stock unavailable

## Security Features

✅ **Price Tampering Prevention**
- Server validates client-provided prices against database
- Rejects if price differs by more than ₦0.01
- Logs tampering attempts with user ID and product ID

✅ **Ownership Verification**
- Users can only view their own orders
- Admins can view all orders
- Attempted unauthorized access is rejected

✅ **Server-Side Calculation**
- Delivery fees computed server-side
- Total amount calculated server-side
- No client-side math impacts final price

✅ **Stock Validation**
- Stock checked before order creation
- Quantities validated against inventory
- Concurrent order safety via database constraints
