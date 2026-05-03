module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/lib/mongodb.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "connectDB",
    ()=>connectDB,
    "default",
    ()=>__TURBOPACK__default__export__
]);
(()=>{
    const e = new Error("Cannot find module 'mongoose'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
const MONGODB_URI = ("TURBOPACK compile-time value", "mongodb+srv://hilgod:b4XBsQZXLD76N4Wx@cluster0.azuwpk2.mongodb.net/hilgod-shop?retryWrites=true&w=majority");
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
let cached = /*TURBOPACK member replacement*/ __turbopack_context__.g.mongoose || {
    conn: null,
    promise: null
};
/*TURBOPACK member replacement*/ __turbopack_context__.g.mongoose = cached;
async function connectDB() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, {
            bufferCommands: false
        });
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}
const __TURBOPACK__default__export__ = connectDB;
}),
"[project]/models/User.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
(()=>{
    const e = new Error("Cannot find module 'mongoose'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [
            true,
            'Please provide a first name'
        ],
        trim: true,
        maxlength: [
            50,
            'First name cannot be more than 50 characters'
        ]
    },
    lastName: {
        type: String,
        required: [
            true,
            'Please provide a last name'
        ],
        trim: true,
        maxlength: [
            50,
            'Last name cannot be more than 50 characters'
        ]
    },
    email: {
        type: String,
        required: [
            true,
            'Please provide an email'
        ],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\S+@\S+\.\S+$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        select: false,
        minlength: [
            6,
            'Password must be at least 6 characters'
        ]
    },
    image: {
        type: String,
        default: null
    },
    provider: {
        type: String,
        default: 'email'
    },
    role: {
        type: String,
        enum: [
            'user',
            'admin'
        ],
        default: 'user'
    },
    emailVerified: {
        type: Date,
        default: null
    },
    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }
    ]
}, {
    timestamps: true
});
// Index for faster queries
userSchema.index({
    email: 1
});
userSchema.index({
    createdAt: -1
});
// Prevent model compilation error in development
const User = mongoose.models.User || mongoose.model('User', userSchema);
const __TURBOPACK__default__export__ = User;
}),
"[project]/pages/api/auth/[...nextauth].js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authOptions",
    ()=>authOptions,
    "default",
    ()=>__TURBOPACK__default__export__
]);
(()=>{
    const e = new Error("Cannot find module 'next-auth'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next-auth/providers/google'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next-auth/providers/facebook'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next-auth/providers/credentials'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'bcryptjs'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongodb$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongodb.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/models/User.js [api] (ecmascript)");
;
;
;
;
;
;
;
/**
 * Check if an email matches any configured admin email.
 */ function isAdminEmail(email) {
    if (!email) return false;
    const lower = email.toLowerCase();
    const admin1 = (("TURBOPACK compile-time value", "hilgoddev@gmail.com") || '').toLowerCase();
    const admin2 = (("TURBOPACK compile-time value", "linuxrate@gmail.com") || '').toLowerCase();
    return admin1 && lower === admin1 || admin2 && lower === admin2;
}
const authOptions = {
    providers: [
        GoogleProvider({
            clientId: ("TURBOPACK compile-time value", "605313142709-c46qeqgrovamln88uo2g5de25m8du2nj.apps.googleusercontent.com"),
            clientSecret: ("TURBOPACK compile-time value", "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")
        }),
        // Only add Facebook provider if credentials are configured
        ...process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET ? [
            FacebookProvider({
                clientId: process.env.FACEBOOK_CLIENT_ID,
                clientSecret: process.env.FACEBOOK_CLIENT_SECRET
            })
        ] : [],
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: {
                    label: 'Email',
                    type: 'email'
                },
                password: {
                    label: 'Password',
                    type: 'password'
                }
            },
            async authorize (credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please provide email and password');
                }
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongodb$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"])();
                const user = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"].findOne({
                    email: credentials.email
                }).select('+password');
                if (!user || !user.password) {
                    throw new Error('Invalid email or password');
                }
                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordValid) {
                    throw new Error('Invalid email or password');
                }
                return {
                    id: user._id.toString(),
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    image: user.image,
                    role: user.role,
                    provider: user.provider
                };
            }
        })
    ],
    callbacks: {
        async signIn ({ user, account, profile }) {
            if (account.provider === 'google' || account.provider === 'facebook') {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongodb$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"])();
                // Check if user exists
                let existingUser = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"].findOne({
                    email: user.email
                });
                if (!existingUser) {
                    // Create new user from OAuth profile
                    const nameParts = (user.name || '').split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    // Determine role: check against admin emails
                    const role = isAdminEmail(user.email) ? 'admin' : 'user';
                    existingUser = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"].create({
                        firstName,
                        lastName,
                        email: user.email,
                        image: user.image,
                        provider: account.provider,
                        emailVerified: new Date(),
                        role
                    });
                } else {
                    // If user exists but their email matches admin env vars
                    // and they are not yet admin, promote them
                    if (isAdminEmail(user.email) && existingUser.role !== 'admin') {
                        existingUser.role = 'admin';
                        await existingUser.save();
                    }
                    // Update image if it changed
                    if (user.image && existingUser.image !== user.image) {
                        existingUser.image = user.image;
                        await existingUser.save();
                    }
                }
                user.id = existingUser._id.toString();
                user.role = existingUser.role;
                user.provider = existingUser.provider;
                user.firstName = existingUser.firstName;
                user.lastName = existingUser.lastName;
            }
            return true;
        },
        async jwt ({ token, user, account }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.firstName = user.firstName;
                token.lastName = user.lastName;
                token.provider = user.provider;
            }
            return token;
        },
        async session ({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.firstName = token.firstName;
                session.user.lastName = token.lastName;
                session.user.provider = token.provider;
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/login'
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60
    },
    secret: ("TURBOPACK compile-time value", "e2a2a2624b4002be6da5e7bb1eb09c691e08dab03f59970106d8339c4ff49de4")
};
const __TURBOPACK__default__export__ = NextAuth(authOptions);
}),
"[project]/models/Product.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
(()=>{
    const e = new Error("Cannot find module 'mongoose'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [
            true,
            'Please provide a product name'
        ],
        trim: true,
        maxlength: [
            200,
            'Product name cannot exceed 200 characters'
        ]
    },
    description: {
        type: String,
        required: [
            true,
            'Please provide a product description'
        ],
        maxlength: [
            2000,
            'Description cannot exceed 2000 characters'
        ]
    },
    price: {
        type: Number,
        required: [
            true,
            'Please provide a product price'
        ],
        min: [
            0,
            'Price cannot be negative'
        ]
    },
    images: [
        {
            type: String,
            required: true
        }
    ],
    category: {
        type: String,
        required: [
            true,
            'Please provide a category'
        ],
        index: true,
        trim: true
    },
    stock: {
        type: Number,
        required: true,
        min: [
            0,
            'Stock cannot be negative'
        ],
        default: 0
    },
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: [
                0,
                'Rating cannot be less than 0'
            ],
            max: [
                5,
                'Rating cannot be more than 5'
            ]
        },
        count: {
            type: Number,
            default: 0,
            min: [
                0,
                'Rating count cannot be negative'
            ]
        }
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
// Indexes for better query performance
productSchema.index({
    name: 'text',
    description: 'text'
});
productSchema.index({
    category: 1,
    isActive: 1
});
productSchema.index({
    createdAt: -1
});
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const __TURBOPACK__default__export__ = Product;
}),
"[project]/lib/products-data.js [api] (ecmascript)", ((__turbopack_context__, module, exports) => {

/* =============================================
   HILGOD — PRODUCTS DATA
   All sample products used across the site
   ============================================= */ const HILGOD_PRODUCTS = [
    // ---- ELECTRONICS ----
    {
        id: 1,
        name: "Samsung Galaxy S24 Ultra 5G",
        brand: "Samsung",
        category: "electronics",
        subcategory: "Phones",
        price: 540000,
        originalPrice: 620000,
        image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80&auto=format",
        rating: 4.8,
        reviews: 1240,
        badge: "hot",
        inStock: true,
        description: "Latest Samsung flagship with 200MP camera and AI features.",
        specs: {
            Display: '6.8" QHD+ AMOLED',
            Processor: 'Snapdragon 8 Gen 3',
            RAM: '12GB',
            Storage: '256GB'
        }
    },
    {
        id: 2,
        name: "iPhone 15 Pro Max 256GB",
        brand: "Apple",
        category: "electronics",
        subcategory: "Phones",
        price: 780000,
        originalPrice: 850000,
        image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80&auto=format",
        rating: 4.9,
        reviews: 2100,
        badge: "toprated",
        inStock: true,
        description: "Apple's most powerful iPhone with titanium design.",
        specs: {
            Display: '6.7" Super Retina XDR',
            Processor: 'A17 Pro chip',
            RAM: '8GB',
            Storage: '256GB'
        }
    },
    {
        id: 7,
        name: "HP Pavilion 15 Core i7",
        brand: "HP",
        category: "electronics",
        subcategory: "Laptops",
        price: 350000,
        originalPrice: 410000,
        image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80&auto=format",
        rating: 4.5,
        reviews: 780,
        badge: "hot",
        inStock: true,
        description: "Powerful everyday laptop for work and play.",
        specs: {
            Processor: 'Intel Core i7',
            RAM: '16GB DDR4',
            Storage: '512GB SSD'
        }
    },
    {
        id: 11,
        name: "Samsung 55\" 4K Smart TV",
        brand: "Samsung",
        category: "electronics",
        subcategory: "TVs",
        price: 280000,
        originalPrice: 340000,
        image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80&auto=format",
        rating: 4.7,
        reviews: 920,
        badge: "hot",
        inStock: true,
        description: "Quantum dot technology for brilliant colors.",
        specs: {
            Screen: '55" QLED 4K',
            Resolution: '3840 x 2160'
        }
    },
    {
        id: 25,
        name: "PlayStation 5 Console",
        brand: "Sony",
        category: "electronics",
        subcategory: "Gaming",
        price: 380000,
        originalPrice: 420000,
        image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&q=80&auto=format",
        rating: 4.9,
        reviews: 3200,
        badge: "hot",
        inStock: true,
        description: "Next-gen gaming experience.",
        specs: {
            CPU: 'AMD Zen 2',
            GPU: 'AMD RDNA 2'
        }
    },
    // ---- BEAUTY ----
    {
        id: 5,
        name: "MAC Studio Fix Foundation",
        brand: "MAC",
        category: "beauty",
        subcategory: "Makeup",
        price: 35000,
        originalPrice: 40000,
        image: "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=400&q=80&auto=format",
        rating: 4.6,
        reviews: 890,
        badge: "new",
        inStock: true,
        description: "24-hour flawless coverage foundation.",
        specs: {
            Type: 'Liquid Foundation',
            Coverage: 'Full'
        }
    },
    {
        id: 6,
        name: "CeraVe Hydrating Cleanser",
        brand: "CeraVe",
        category: "beauty",
        subcategory: "Skincare",
        price: 18000,
        originalPrice: 22000,
        image: "https://images.unsplash.com/photo-1608248593842-8021b611e9cb?w=400&q=80&auto=format",
        rating: 4.7,
        reviews: 1560,
        badge: "hot",
        inStock: true,
        description: "Gentle face wash with hyaluronic acid.",
        specs: {
            Type: 'Face Cleanser',
            SkinType: 'Normal to Dry'
        }
    },
    {
        id: 33,
        name: "Fenty Beauty Lip Gloss",
        brand: "Fenty Beauty",
        category: "beauty",
        subcategory: "Makeup",
        price: 21000,
        originalPrice: 25000,
        image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&q=80&auto=format",
        rating: 4.8,
        reviews: 1020,
        badge: "toprated",
        inStock: true,
        description: "Explosive shine that feels as good as it looks.",
        specs: {
            Type: 'Lip Gloss',
            Finish: 'Glossy'
        }
    },
    {
        id: 34,
        name: "Nivea Nourishing Body Lotion",
        brand: "Nivea",
        category: "beauty",
        subcategory: "Skincare",
        price: 5000,
        originalPrice: 7000,
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80&auto=format",
        rating: 4.5,
        reviews: 300,
        badge: null,
        inStock: true,
        description: "48h deep moisture for dry skin.",
        specs: {
            Type: 'Body Lotion',
            Volume: '400ml'
        }
    },
    {
        id: 35,
        name: "L'Oreal Paris Mascara",
        brand: "L'Oreal",
        category: "beauty",
        subcategory: "Makeup",
        price: 12000,
        originalPrice: 15000,
        image: "https://images.unsplash.com/photo-1631214500515-e4ace8147d7c?w=400&q=80&auto=format",
        rating: 4.4,
        reviews: 450,
        badge: "sale",
        inStock: true,
        description: "Voluminous lash paradise mascara.",
        specs: {
            Type: 'Mascara',
            Color: 'Black'
        }
    },
    // ---- WOMENSWEAR ----
    {
        id: 23,
        name: "Women's Off-Shoulder Dress",
        brand: "HilgodFashion",
        category: "womenswear",
        subcategory: "Dresses",
        price: 15000,
        originalPrice: 22000,
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80&auto=format",
        rating: 4.5,
        reviews: 290,
        badge: "new",
        inStock: true,
        description: "Elegant evening and casual dress.",
        specs: {
            Material: 'Polyester',
            Fit: 'Bodycon'
        }
    },
    {
        id: 36,
        name: "Zara Flowy Summer Skirt",
        brand: "Zara",
        category: "womenswear",
        subcategory: "Skirts",
        price: 18000,
        originalPrice: 25000,
        image: "https://images.unsplash.com/photo-1583391733958-675246741b0b?w=400&q=80&auto=format",
        rating: 4.6,
        reviews: 340,
        badge: "hot",
        inStock: true,
        description: "Lightweight and breathable summer skirt.",
        specs: {
            Material: 'Cotton Blend',
            Length: 'Midi'
        }
    },
    {
        id: 37,
        name: "Gucci Silk Blouse",
        brand: "Gucci",
        category: "womenswear",
        subcategory: "Tops",
        price: 85000,
        originalPrice: 100000,
        image: "https://images.unsplash.com/photo-1564257631407-4deec85b46e3?w=400&q=80&auto=format",
        rating: 4.9,
        reviews: 150,
        badge: "toprated",
        inStock: true,
        description: "Premium silk blouse for formal wear.",
        specs: {
            Material: '100% Silk',
            Fit: 'Regular'
        }
    },
    {
        id: 38,
        name: "H&M Casual Denim Jacket",
        brand: "H&M",
        category: "womenswear",
        subcategory: "Outerwear",
        price: 25000,
        originalPrice: 32000,
        image: "https://images.unsplash.com/photo-1523359346063-d879354c0ea5?w=400&q=80&auto=format",
        rating: 4.4,
        reviews: 520,
        badge: "sale",
        inStock: true,
        description: "Classic denim jacket for any outfit.",
        specs: {
            Material: 'Denim',
            Style: 'Casual'
        }
    },
    {
        id: 39,
        name: "Victoria's Secret Silk Robe",
        brand: "Victoria's Secret",
        category: "womenswear",
        subcategory: "Underwear",
        price: 30000,
        originalPrice: 40000,
        image: "https://images.unsplash.com/photo-1610425330364-e40ebbd5ba38?w=400&q=80&auto=format",
        rating: 4.7,
        reviews: 210,
        badge: null,
        inStock: true,
        description: "Luxurious silk robe for lounging.",
        specs: {
            Material: 'Silk',
            Size: 'One Size'
        }
    },
    // ---- MENSWEAR ----
    {
        id: 22,
        name: "Men's Classic Polo T-Shirt",
        brand: "HilgodFashion",
        category: "menswear",
        subcategory: "Tops",
        price: 7500,
        originalPrice: 12000,
        image: "https://images.unsplash.com/photo-1625910513413-5fc42e712484?w=400&q=80&auto=format",
        rating: 4.3,
        reviews: 120,
        badge: "sale",
        inStock: true,
        description: "Premium cotton polo for everyday style.",
        specs: {
            Material: 'Cotton Pique',
            Fit: 'Regular'
        }
    },
    {
        id: 40,
        name: "Tommy Hilfiger Button-Down",
        brand: "Tommy Hilfiger",
        category: "menswear",
        subcategory: "Tops",
        price: 28000,
        originalPrice: 35000,
        image: "https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=400&q=80&auto=format",
        rating: 4.7,
        reviews: 310,
        badge: "new",
        inStock: true,
        description: "Classic fit oxford shirt.",
        specs: {
            Material: 'Cotton',
            Fit: 'Classic'
        }
    },
    {
        id: 41,
        name: "Nike Sportswear Tech Fleece",
        brand: "Nike",
        category: "menswear",
        subcategory: "Outerwear",
        price: 45000,
        originalPrice: 55000,
        image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80&auto=format",
        rating: 4.8,
        reviews: 890,
        badge: "hot",
        inStock: true,
        description: "Lightweight warmth and comfort.",
        specs: {
            Material: 'Tech Fleece',
            Style: 'Hoodie'
        }
    },
    {
        id: 42,
        name: "Polo Ralph Lauren Chinos",
        brand: "Polo Ralph Lauren",
        category: "menswear",
        subcategory: "Bottoms",
        price: 32000,
        originalPrice: 40000,
        image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80&auto=format",
        rating: 4.5,
        reviews: 450,
        badge: null,
        inStock: true,
        description: "Stretch classic fit chino pants.",
        specs: {
            Material: 'Cotton Blend',
            Fit: 'Straight'
        }
    },
    {
        id: 43,
        name: "Calvin Klein Boxer Briefs (3-Pack)",
        brand: "Calvin Klein",
        category: "menswear",
        subcategory: "Underwear",
        price: 18000,
        originalPrice: 22000,
        image: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80&auto=format",
        rating: 4.6,
        reviews: 1200,
        badge: "toprated",
        inStock: true,
        description: "Soft, breathable cotton blend.",
        specs: {
            Material: 'Cotton/Elastane',
            Pack: '3 Items'
        }
    },
    // ---- SHOES ----
    {
        id: 24,
        name: "Adidas Ultraboost 22 Sneakers",
        brand: "Adidas",
        category: "shoes",
        subcategory: "Sneakers",
        price: 55000,
        originalPrice: 72000,
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80&auto=format",
        rating: 4.8,
        reviews: 850,
        badge: "hot",
        inStock: true,
        description: "Responsive running shoe with Boost midsole.",
        specs: {
            Upper: 'Primeknit+',
            Midsole: 'Boost'
        }
    },
    {
        id: 44,
        name: "Nike Air Force 1 '07",
        brand: "Nike",
        category: "shoes",
        subcategory: "Sneakers",
        price: 65000,
        originalPrice: 80000,
        image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80&auto=format",
        rating: 4.9,
        reviews: 4500,
        badge: "toprated",
        inStock: true,
        description: "The classic everyday sneaker.",
        specs: {
            Material: 'Leather',
            Style: 'Low Top'
        }
    },
    {
        id: 45,
        name: "Vans Old Skool Classic",
        brand: "Vans",
        category: "shoes",
        subcategory: "Sneakers",
        price: 35000,
        originalPrice: 42000,
        image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&q=80&auto=format",
        rating: 4.7,
        reviews: 1200,
        badge: "sale",
        inStock: true,
        description: "Iconic skate shoe with sidestripe.",
        specs: {
            Material: 'Canvas/Suede',
            Sole: 'Waffle Rubber'
        }
    },
    {
        id: 46,
        name: "Puma Suede Classic",
        brand: "Puma",
        category: "shoes",
        subcategory: "Sneakers",
        price: 40000,
        originalPrice: 48000,
        image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80&auto=format",
        rating: 4.5,
        reviews: 670,
        badge: null,
        inStock: true,
        description: "The legendary suede sneaker.",
        specs: {
            Material: 'Suede',
            Fit: 'Regular'
        }
    },
    {
        id: 47,
        name: "New Balance 574 Core",
        brand: "New Balance",
        category: "shoes",
        subcategory: "Sneakers",
        price: 50000,
        originalPrice: 60000,
        image: "https://images.unsplash.com/photo-1530821875964-91927b611bad?w=400&q=80&auto=format",
        rating: 4.6,
        reviews: 890,
        badge: "new",
        inStock: true,
        description: "Uncompromised classic silhouette.",
        specs: {
            Material: 'Suede/Mesh',
            Midsole: 'ENCAP'
        }
    },
    // ---- ACCESSORIES ----
    {
        id: 18,
        name: "Apple AirPods Pro 2nd Gen",
        brand: "Apple",
        category: "accessories",
        subcategory: "Earphones",
        price: 145000,
        originalPrice: 170000,
        image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&q=80&auto=format",
        rating: 4.8,
        reviews: 1860,
        badge: "hot",
        inStock: true,
        description: "Industry-leading noise cancellation.",
        specs: {
            Type: 'In-ear TWS',
            ANC: 'Active Noise Cancellation'
        }
    },
    {
        id: 19,
        name: "Samsung Galaxy Watch 6",
        brand: "Samsung",
        category: "accessories",
        subcategory: "Smartwatches",
        price: 135000,
        originalPrice: 160000,
        image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&q=80&auto=format",
        rating: 4.6,
        reviews: 720,
        badge: "new",
        inStock: true,
        description: "Classic rotating bezel smartwatch.",
        specs: {
            Display: '47mm Super AMOLED',
            OS: 'Wear OS'
        }
    },
    {
        id: 48,
        name: "Ray-Ban Aviator Classic",
        brand: "Ray-Ban",
        category: "accessories",
        subcategory: "Sunglasses",
        price: 85000,
        originalPrice: 100000,
        image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80&auto=format",
        rating: 4.9,
        reviews: 1300,
        badge: "toprated",
        inStock: true,
        description: "Timeless aviator sunglasses.",
        specs: {
            Frame: 'Metal',
            Lens: 'G-15 Green'
        }
    },
    {
        id: 49,
        name: "Casio G-Shock Matte Black",
        brand: "Casio",
        category: "accessories",
        subcategory: "Watches",
        price: 55000,
        originalPrice: 65000,
        image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80&auto=format",
        rating: 4.7,
        reviews: 2100,
        badge: "sale",
        inStock: true,
        description: "Tough and shock-resistant watch.",
        specs: {
            Material: 'Resin',
            WaterResistance: '200m'
        }
    },
    {
        id: 50,
        name: "Michael Kors Leather Tote",
        brand: "Michael Kors",
        category: "accessories",
        subcategory: "Bags",
        price: 120000,
        originalPrice: 150000,
        image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=400&q=80&auto=format",
        rating: 4.8,
        reviews: 450,
        badge: "hot",
        inStock: true,
        description: "Premium leather tote bag.",
        specs: {
            Material: 'Leather',
            Compartments: '3 Main'
        }
    },
    // ---- HOME & KITCHEN ----
    {
        id: 14,
        name: "LG 10kg Front Load Washer",
        brand: "LG",
        category: "home",
        subcategory: "Appliances",
        price: 220000,
        originalPrice: 265000,
        image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&q=80&auto=format",
        rating: 4.6,
        reviews: 510,
        badge: "hot",
        inStock: true,
        description: "AI powered direct drive washing machine.",
        specs: {
            Capacity: '10kg',
            Type: 'Front Load'
        }
    },
    {
        id: 30,
        name: "Nasco Microwave Oven 25L",
        brand: "Nasco",
        category: "kitchen",
        subcategory: "Appliances",
        price: 28000,
        originalPrice: 38000,
        image: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=400&q=80&auto=format",
        rating: 4.3,
        reviews: 245,
        badge: "sale",
        inStock: true,
        description: "25L digital microwave with grill function.",
        specs: {
            Capacity: '25 Litres',
            Power: '900W'
        }
    },
    {
        id: 51,
        name: "Binatone 4-Slice Toaster",
        brand: "Binatone",
        category: "kitchen",
        subcategory: "Appliances",
        price: 12000,
        originalPrice: 18000,
        image: "https://images.unsplash.com/photo-1585237017125-24baf7bbd4b2?w=400&q=80&auto=format",
        rating: 4.1,
        reviews: 150,
        badge: null,
        inStock: true,
        description: "Stainless steel toaster with wider slots.",
        specs: {
            Capacity: '4 Slices',
            Power: '1400W'
        }
    },
    {
        id: 52,
        name: "ErgoDesk Office Chair",
        brand: "ErgoDesk",
        category: "home",
        subcategory: "Furniture",
        price: 45000,
        originalPrice: 65000,
        image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&q=80&auto=format",
        rating: 4.4,
        reviews: 340,
        badge: null,
        inStock: true,
        description: "Ergonomic mesh office chair.",
        specs: {
            Material: 'Mesh + PU Leather',
            MaxLoad: '150kg'
        }
    },
    {
        id: 53,
        name: "Philips LED Desk Lamp",
        brand: "Philips",
        category: "home",
        subcategory: "Lighting",
        price: 12500,
        originalPrice: 18000,
        image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400&q=80&auto=format",
        rating: 4.5,
        reviews: 620,
        badge: "new",
        inStock: true,
        description: "Smart eye-care desk lamp with USB port.",
        specs: {
            Lumens: '700lm',
            ColorTemp: '2700K-6500K'
        }
    }
];
// ---- CATEGORIES ----
const HILGOD_CATEGORIES = [
    {
        id: "phones",
        name: "Phones & Tablets",
        icon: "fa-mobile-screen-button",
        count: 1240
    },
    {
        id: "laptops",
        name: "Laptops & Computers",
        icon: "fa-laptop",
        count: 870
    },
    {
        id: "tvs",
        name: "TVs & Displays",
        icon: "fa-tv",
        count: 540
    },
    {
        id: "appliances",
        name: "Home Appliances",
        icon: "fa-blender",
        count: 2100
    },
    {
        id: "gadgets",
        name: "Tech Gadgets",
        icon: "fa-headphones",
        count: 1850
    },
    {
        id: "fashion",
        name: "Fashion",
        icon: "fa-shirt",
        count: 5400
    },
    {
        id: "gaming",
        name: "Gaming",
        icon: "fa-gamepad",
        count: 730
    },
    {
        id: "home",
        name: "Home & Office",
        icon: "fa-couch",
        count: 1340
    },
    {
        id: "cameras",
        name: "Cameras & Drones",
        icon: "fa-camera",
        count: 620
    },
    {
        id: "beauty",
        name: "Beauty & Health",
        icon: "fa-spa",
        count: 3200
    },
    {
        id: "sports",
        name: "Sports & Outdoors",
        icon: "fa-dumbbell",
        count: 980
    },
    {
        id: "baby",
        name: "Baby & Kids",
        icon: "fa-baby",
        count: 1450
    },
    {
        id: "food",
        name: "Food & Grocery",
        icon: "fa-bowl-food",
        count: 2870
    },
    {
        id: "books",
        name: "Books & Stationery",
        icon: "fa-book",
        count: 440
    },
    {
        id: "auto",
        name: "Automobile",
        icon: "fa-car",
        count: 520
    },
    {
        id: "garden",
        name: "Garden & Tools",
        icon: "fa-screwdriver-wrench",
        count: 390
    }
];
// ---- HELPER: Get products by category ----
function getProductsByCategory(cat, limit = null) {
    let results = cat ? HILGOD_PRODUCTS.filter((p)=>p.category === cat) : [
        ...HILGOD_PRODUCTS
    ];
    return limit ? results.slice(0, limit) : results;
}
// ---- HELPER: Get product by ID ----
function getProductById(id) {
    return HILGOD_PRODUCTS.find((p)=>p.id === parseInt(id));
}
// ---- HELPER: Search products ----
function searchProducts(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return HILGOD_PRODUCTS.filter((p)=>p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.subcategory.toLowerCase().includes(q));
}
// ---- FORMAT PRICE ----
function formatPrice(num) {
    return '₦' + num.toLocaleString('en-NG');
}
// ---- DISCOUNT % ----
function getDiscount(price, originalPrice) {
    return Math.round((originalPrice - price) / originalPrice * 100);
}
// ---- RENDER STARS ----
function renderStars(rating) {
    let html = '<div class="stars">';
    for(let i = 1; i <= 5; i++){
        if (i <= Math.floor(rating)) html += '<i class="fas fa-star"></i>';
        else if (i - 0.5 <= rating) html += '<i class="fas fa-star-half-stroke"></i>';
        else html += '<i class="far fa-star empty"></i>';
    }
    return html + '</div>';
}
// ---- RENDER PRODUCT CARD ----
function renderProductCard(product) {
    const discount = getDiscount(product.price, product.originalPrice);
    const badge = product.badge ? `<span class="product-card__badge badge-${product.badge}">${product.badge.toUpperCase()}</span>` : '';
    return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-card__badges">${badge}</div>
      <button class="product-card__wishlist ${isInWishlist(product.id) ? 'active' : ''}" onclick="toggleWishlistItem(${product.id})" aria-label="Wishlist">
        <i class="${isInWishlist(product.id) ? 'fas' : 'far'} fa-heart"></i>
      </button>
      <div class="product-card__img-wrapper">
        <a href="product-detail.html?id=${product.id}">
          <img src="${product.image}" alt="${product.name}" loading="lazy" style="object-fit:cover" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'">
        </a>
        <div class="product-card__quick-view" onclick="quickView(${product.id})"><i class="fas fa-eye"></i> Quick View</div>
      </div>
      <div class="product-card__body">
        <div class="product-card__brand">${product.brand}</div>
        <a href="product-detail.html?id=${product.id}" class="product-card__name">${product.name}</a>
        <div class="product-card__rating">
          ${renderStars(product.rating)}
          <span class="rating-count">(${product.reviews.toLocaleString()})</span>
        </div>
        <div class="product-card__pricing">
          <span class="product-card__price">${formatPrice(product.price)}</span>
          ${product.originalPrice > product.price ? `
            <span class="product-card__original">${formatPrice(product.originalPrice)}</span>
            <span class="product-card__discount">-${discount}%</span>` : ''}
        </div>
        <div class="product-card__actions">
          <button class="btn-add-cart" id="cart-btn-${product.id}" onclick="addToCartAndUpdate(${product.id}, this)">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>`;
}
module.exports = {
    HILGOD_PRODUCTS,
    HILGOD_CATEGORIES
};
}),
"[project]/pages/api/products/index.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>handler
]);
(()=>{
    const e = new Error("Cannot find module 'next-auth/next'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$pages$2f$api$2f$auth$2f5b2e2e2e$nextauth$5d2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/pages/api/auth/[...nextauth].js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongodb$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongodb.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Product$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/models/Product.js [api] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module 'zod'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$products$2d$data$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/products-data.js [api] (ecmascript)");
;
;
;
;
;
;
// Validation schema for product creation
const productSchema = z.object({
    name: z.string().min(2).max(200),
    description: z.string().min(10).max(2000),
    price: z.number().min(0),
    images: z.array(z.string().url()).min(1),
    category: z.string().min(1),
    stock: z.number().min(0).default(0)
});
async function handler(req, res) {
    const { method } = req;
    if (method === 'GET') {
        const { category, search, page = 1, limit = 20 } = req.query;
        let useFallback = false;
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongodb$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"])();
        } catch (dbError) {
            console.warn("Database connection failed, using fallback data.");
            useFallback = true;
        }
        if (useFallback) {
            let filteredProducts = [
                ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$products$2d$data$2e$js__$5b$api$5d$__$28$ecmascript$29$__["HILGOD_PRODUCTS"]
            ];
            if (category) {
                const catArray = category.split(',');
                filteredProducts = filteredProducts.filter((p)=>catArray.includes(p.category));
            }
            if (req.query.subcategory) {
                const subCatArray = req.query.subcategory.split(',');
                filteredProducts = filteredProducts.filter((p)=>subCatArray.includes(p.subcategory));
            }
            if (search) {
                const lowerSearch = search.toLowerCase();
                filteredProducts = filteredProducts.filter((p)=>p.name.toLowerCase().includes(lowerSearch) || p.description.toLowerCase().includes(lowerSearch) || p.brand.toLowerCase().includes(lowerSearch) || p.subcategory && p.subcategory.toLowerCase().includes(lowerSearch));
            }
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const paginatedProducts = filteredProducts.slice(skip, skip + parseInt(limit));
            const formattedProducts = paginatedProducts.map((p)=>({
                    _id: p.id.toString(),
                    name: p.name,
                    brand: p.brand,
                    description: p.description,
                    price: p.price,
                    originalPrice: p.originalPrice,
                    images: [
                        p.image
                    ],
                    category: p.category,
                    subcategory: p.subcategory,
                    stock: p.inStock ? 100 : 0,
                    ratings: {
                        average: p.rating,
                        count: p.reviews
                    },
                    badge: p.badge,
                    createdAt: new Date().toISOString()
                }));
            return res.status(200).json({
                success: true,
                data: formattedProducts,
                pagination: {
                    total: filteredProducts.length,
                    page: parseInt(page),
                    pages: Math.ceil(filteredProducts.length / parseInt(limit))
                }
            });
        }
        try {
            let query = {
                isActive: true
            };
            // Filter by category
            if (category) {
                query.category = category;
            }
            if (req.query.subcategory) {
                query.subcategory = req.query.subcategory;
            }
            // Search functionality
            if (search) {
                query.$text = {
                    $search: search
                };
            }
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const products = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Product$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"].find(query).sort({
                createdAt: -1
            }).skip(skip).limit(parseInt(limit));
            const total = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Product$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"].countDocuments(query);
            res.status(200).json({
                success: true,
                data: products,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    } else if (method === 'POST') {
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongodb$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"])();
        } catch (dbError) {
            return res.status(500).json({
                success: false,
                error: "Database connection failed"
            });
        }
        try {
            // Check authentication
            const session = await getServerSession(req, res, __TURBOPACK__imported__module__$5b$project$5d2f$pages$2f$api$2f$auth$2f5b2e2e2e$nextauth$5d2e$js__$5b$api$5d$__$28$ecmascript$29$__["authOptions"]);
            if (!session) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }
            // Check admin role
            if (session.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }
            // Validate input
            const validatedData = productSchema.parse(req.body);
            const product = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Product$2e$js__$5b$api$5d$__$28$ecmascript$29$__["default"].create(validatedData);
            res.status(201).json({
                success: true,
                data: product
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.errors
                });
            }
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    } else {
        res.status(405).json({
            success: false,
            error: `Method ${method} not allowed`
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0f2j5q0._.js.map