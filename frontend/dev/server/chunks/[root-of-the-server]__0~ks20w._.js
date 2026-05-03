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
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0~ks20w._.js.map