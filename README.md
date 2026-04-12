# FanHub Deployment

FanHub is a comprehensive platform for fan communities, featuring website generation, community interaction, e-commerce, and content management.

## Major APIs

This project includes several major API modules:

### 1. Generate API (`/api/v1/generate`)
Handles website generation for fan communities.

#### Endpoints:
- `POST /api/v1/generate/generate-website` - Create new website (Admin only)
- `GET /api/v1/generate/generated-websites` - Get all generated websites (Admin only)
- `GET /api/v1/generate/generated-websites-public` - Get public generated websites
- `GET /api/v1/generate/generated-websites/type/:communityType` - Get website by community type
- `GET /api/v1/generate/generated-websites/:id` - Get website by ID
- `PUT /api/v1/generate/generated-websites/:id` - Update website (Admin only)

### 2. Community API (`/api/v1/bini`)
Manages community interactions including users, posts, comments, and messaging.

#### Endpoints:
- `/api/v1/bini/users` - User management
- `/api/v1/bini/posts` - Post management
- `/api/v1/bini/comments` - Comments on posts
- `/api/v1/bini/notifications` - User notifications
- `/api/v1/bini/message` - Private messaging
- `/api/v1/bini/likes` - Like functionality
- `/api/v1/bini/search` - Search within community
- `/api/v1/bini/follow` - Follow/unfollow users
- `/api/v1/bini/cloudinary` - Image/file uploads

### 3. E-commerce API (`/api/v1/ecommerce`)
Handles product sales, shopping cart, orders, and related features.

#### Endpoints:
- `/api/v1/ecommerce/users` - User accounts for shopping
- `/api/v1/ecommerce/shop` - Product catalog and shop management
- `/api/v1/ecommerce/community` - Community-specific products
- `/api/v1/ecommerce/cart` - Shopping cart operations
- `/api/v1/ecommerce/shipping` - Shipping information
- `/api/v1/ecommerce/orders` - Order management
- `/api/v1/ecommerce/checkout-draft` - Checkout draft handling
- `/api/v1/ecommerce/discography` - Music discography products
- `/api/v1/ecommerce/events` - Event tickets and merchandise

### 4. Admin API (`/api/v1/admin`)
Administrative functions for managing the platform.

#### Endpoints:
- `/api/v1/admin/dashboard` - Revenue and analytics
- `/api/v1/admin/generate` - Website generation admin
- `/api/v1/admin/marketplace` - Marketplace management
- `/api/v1/admin/orders` - Order administration
- `/api/v1/admin/reports` - Platform reports
- `/api/v1/admin/settings` - Platform settings
- `/api/v1/admin/discography` - Discography management
- `/api/v1/admin/suggestions` - User suggestions
- `/api/v1/admin/` - Thread management



## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MySQL database
- Cloudinary account (for image uploads)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Omarjamin/fanhub-deployment.git
cd fanhub-deployment
```

2. Install backend dependencies:
```bash
cd Backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../Frontend
npm install
```

4. Set up environment variables:
Create `.env` files in both Backend and Frontend directories with necessary configurations (database URLs, API keys, etc.).

5. Set up the database:
Run the SQL files in the Backend directory to initialize the database schema.

### Running the Application

#### Backend
```bash
cd Backend
npm start
```
Server runs on port 4000 by default.

#### Frontend
```bash
cd Frontend
npm run dev
```
Frontend runs on port 5173 by default (Vite).

## Authentication

Most protected endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

Admin endpoints require additional authorization checks.

## Deployment

This project is configured for deployment on Railway and Netlify.

- Backend: Deploy to Railway using `railway.json`
- Frontend: Deploy to Railway using `railway.json`

## Contributing

Please follow the existing code structure and add appropriate tests for new features.

## License

See LICENSE file in Frontend directory.
