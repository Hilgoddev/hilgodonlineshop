module.exports = [
"[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react/jsx-dev-runtime", () => require("react/jsx-dev-runtime"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/react-dom [external] (react-dom, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react-dom", () => require("react-dom"));

module.exports = mod;
}),
"[project]/components/ShopProvider.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ShopProvider,
    "useShop",
    ()=>useShop
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [ssr] (ecmascript)");
;
;
;
;
const ShopContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["createContext"])();
function useShop() {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useContext"])(ShopContext);
}
function ShopProvider({ children }) {
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [wishlist, setWishlist] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [toasts, setToasts] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [quickViewProduct, setQuickViewProduct] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    // Initialize from localStorage
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        try {
            // Get user-specific cart key if logged in
            let cartKey = 'hilgod_cart';
            const sessionData = document.querySelector('meta[name="user-id"]');
            if (sessionData) {
                cartKey = `hilgod_cart_${sessionData.getAttribute('content')}`;
            }
            const savedCart = localStorage.getItem(cartKey);
            const savedWishlist = localStorage.getItem('hilgod_wishlist');
            if (savedCart) setCart(JSON.parse(savedCart));
            if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
        } catch (err) {
            console.error('Failed to load local storage data', err);
        }
    }, []);
    // Save to localStorage when changed
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        // Get user-specific cart key if logged in
        let cartKey = 'hilgod_cart';
        const sessionData = document.querySelector('meta[name="user-id"]');
        if (sessionData) {
            cartKey = `hilgod_cart_${sessionData.getAttribute('content')}`;
        }
        localStorage.setItem(cartKey, JSON.stringify(cart));
    }, [
        cart
    ]);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        localStorage.setItem('hilgod_wishlist', JSON.stringify(wishlist));
    }, [
        wishlist
    ]);
    const showToast = (message, type = 'info', duration = 3500)=>{
        const id = Date.now().toString();
        setToasts((prev)=>[
                ...prev,
                {
                    id,
                    message,
                    type,
                    duration
                }
            ]);
        setTimeout(()=>{
            setToasts((prev)=>prev.filter((t)=>t.id !== id));
        }, duration);
    };
    const addToCart = (product, quantity = 1)=>{
        setCart((prev)=>{
            const existing = prev.find((item)=>item.product._id === product._id);
            if (existing) {
                return prev.map((item)=>item.product._id === product._id ? {
                        ...item,
                        quantity: item.quantity + quantity
                    } : item);
            }
            return [
                ...prev,
                {
                    product,
                    quantity
                }
            ];
        });
        showToast('Added to cart! 🛒', 'success');
    };
    const removeFromCart = (productId)=>{
        setCart((prev)=>prev.filter((item)=>item.product._id !== productId));
    };
    const updateCartQty = (productId, quantity)=>{
        setCart((prev)=>prev.map((item)=>item.product._id === productId ? {
                    ...item,
                    quantity: Math.max(1, quantity)
                } : item));
    };
    const clearCart = ()=>{
        setCart([]);
    };
    const toggleWishlist = (product)=>{
        setWishlist((prev)=>{
            const exists = prev.find((p)=>p._id === (product._id || product));
            if (exists) {
                showToast('Removed from wishlist', 'info');
                return prev.filter((p)=>p._id !== (product._id || product));
            }
            showToast('Added to wishlist ❤️', 'success');
            // If product is just an ID, we can't save it fully, but handleAddToWishlist passes full product now.
            return [
                ...prev,
                product
            ];
        });
    };
    const isInWishlist = (productId)=>{
        return wishlist.some((p)=>p._id === productId);
    };
    const openQuickView = (product)=>{
        setQuickViewProduct(product);
        document.body.style.overflow = 'hidden';
    };
    const closeQuickView = ()=>{
        setQuickViewProduct(null);
        document.body.style.overflow = '';
    };
    const discount = quickViewProduct?.originalPrice && quickViewProduct?.price < quickViewProduct?.originalPrice ? Math.round((quickViewProduct.originalPrice - quickViewProduct.price) / quickViewProduct.originalPrice * 100) : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(ShopContext.Provider, {
        value: {
            cart,
            addToCart,
            removeFromCart,
            updateCartQty,
            clearCart,
            wishlist,
            toggleWishlist,
            isInWishlist,
            showToast,
            openQuickView
        },
        children: [
            children,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                id: "toast-container",
                style: {
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                },
                children: toasts.map((toast)=>{
                    const icons = {
                        success: 'fa-circle-check',
                        error: 'fa-circle-xmark',
                        warning: 'fa-triangle-exclamation',
                        info: 'fa-circle-info'
                    };
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: `toast ${toast.type}`,
                        style: {
                            animation: `fadein 0.3s, fadeout 0.3s ${toast.duration / 1000 - 0.3}s forwards`
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("i", {
                                className: `fas ${icons[toast.type] || icons.info} toast__icon`
                            }, void 0, false, {
                                fileName: "[project]/components/ShopProvider.js",
                                lineNumber: 136,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                children: toast.message
                            }, void 0, false, {
                                fileName: "[project]/components/ShopProvider.js",
                                lineNumber: 137,
                                columnNumber: 15
                            }, this)
                        ]
                    }, toast.id, true, {
                        fileName: "[project]/components/ShopProvider.js",
                        lineNumber: 135,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/ShopProvider.js",
                lineNumber: 131,
                columnNumber: 7
            }, this),
            quickViewProduct && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "modal-overlay open",
                onClick: (e)=>{
                    if (e.target.className.includes('modal-overlay')) closeQuickView();
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "modal",
                    style: {
                        maxWidth: '750px'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "modal__header",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                    className: "modal__title",
                                    children: "Quick View"
                                }, void 0, false, {
                                    fileName: "[project]/components/ShopProvider.js",
                                    lineNumber: 148,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    className: "modal__close",
                                    onClick: closeQuickView,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("i", {
                                        className: "fas fa-xmark"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ShopProvider.js",
                                        lineNumber: 149,
                                        columnNumber: 73
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/ShopProvider.js",
                                    lineNumber: 149,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ShopProvider.js",
                            lineNumber: 147,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "modal__body",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '20px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: 'var(--gray-6)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '280px',
                                            padding: '20px'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("img", {
                                            src: quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format',
                                            alt: quickViewProduct.name,
                                            style: {
                                                maxHeight: '100%',
                                                maxWidth: '100%',
                                                objectFit: 'contain'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/components/ShopProvider.js",
                                            lineNumber: 154,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/ShopProvider.js",
                                        lineNumber: 153,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '.75rem',
                                                    color: 'var(--primary)',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    marginBottom: '4px'
                                                },
                                                children: quickViewProduct.brand || quickViewProduct.category
                                            }, void 0, false, {
                                                fileName: "[project]/components/ShopProvider.js",
                                                lineNumber: 161,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                                style: {
                                                    fontSize: '1.1rem',
                                                    fontWeight: '700',
                                                    marginBottom: '8px',
                                                    lineHeight: '1.3'
                                                },
                                                children: quickViewProduct.name
                                            }, void 0, false, {
                                                fileName: "[project]/components/ShopProvider.js",
                                                lineNumber: 164,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginBottom: '10px'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            color: '#fbbf24',
                                                            fontSize: '0.9rem'
                                                        },
                                                        children: [
                                                            ...Array(5)
                                                        ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("i", {
                                                                className: `fas ${i < Math.floor(quickViewProduct.ratings?.average || 0) ? 'fa-star' : i < (quickViewProduct.ratings?.average || 0) ? 'fa-star-half-alt' : 'far fa-star'}`
                                                            }, i, false, {
                                                                fileName: "[project]/components/ShopProvider.js",
                                                                lineNumber: 170,
                                                                columnNumber: 25
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/ShopProvider.js",
                                                        lineNumber: 168,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '.8rem',
                                                            color: 'var(--gray-1)'
                                                        },
                                                        children: [
                                                            "(",
                                                            (quickViewProduct.ratings?.count || 0).toLocaleString(),
                                                            " reviews)"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/ShopProvider.js",
                                                        lineNumber: 176,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/ShopProvider.js",
                                                lineNumber: 167,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                style: {
                                                    marginBottom: '14px'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '1.5rem',
                                                            fontWeight: '800',
                                                            color: 'var(--primary)'
                                                        },
                                                        children: [
                                                            "₦",
                                                            quickViewProduct.price?.toLocaleString()
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/ShopProvider.js",
                                                        lineNumber: 181,
                                                        columnNumber: 21
                                                    }, this),
                                                    discount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    fontSize: '.9rem',
                                                                    color: 'var(--gray-2)',
                                                                    textDecoration: 'line-through',
                                                                    marginLeft: '8px'
                                                                },
                                                                children: [
                                                                    "₦",
                                                                    quickViewProduct.originalPrice?.toLocaleString()
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/components/ShopProvider.js",
                                                                lineNumber: 186,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    fontSize: '.85rem',
                                                                    color: 'var(--success)',
                                                                    fontWeight: '700',
                                                                    marginLeft: '4px'
                                                                },
                                                                children: [
                                                                    "-",
                                                                    discount,
                                                                    "%"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/components/ShopProvider.js",
                                                                lineNumber: 189,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/ShopProvider.js",
                                                lineNumber: 180,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                style: {
                                                    fontSize: '.88rem',
                                                    color: 'var(--gray-1)',
                                                    lineHeight: '1.6',
                                                    marginBottom: '16px'
                                                },
                                                children: [
                                                    quickViewProduct.description?.substring(0, 150),
                                                    quickViewProduct.description?.length > 150 ? '...' : ''
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/ShopProvider.js",
                                                lineNumber: 195,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    gap: '10px'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                        className: "btn btn-primary btn-full",
                                                        onClick: ()=>{
                                                            addToCart(quickViewProduct, 1);
                                                            closeQuickView();
                                                        },
                                                        disabled: quickViewProduct.stock === 0,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("i", {
                                                                className: "fas fa-cart-plus"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ShopProvider.js",
                                                                lineNumber: 204,
                                                                columnNumber: 23
                                                            }, this),
                                                            " ",
                                                            quickViewProduct.stock > 0 ? 'Add to Cart' : 'Out of Stock'
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/ShopProvider.js",
                                                        lineNumber: 199,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                        href: `/products/${quickViewProduct._id}`,
                                                        className: "btn btn-outline",
                                                        style: {
                                                            whiteSpace: 'nowrap'
                                                        },
                                                        onClick: closeQuickView,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("i", {
                                                                className: "fas fa-eye"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ShopProvider.js",
                                                                lineNumber: 207,
                                                                columnNumber: 23
                                                            }, this),
                                                            " View"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/ShopProvider.js",
                                                        lineNumber: 206,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/ShopProvider.js",
                                                lineNumber: 198,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ShopProvider.js",
                                        lineNumber: 160,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ShopProvider.js",
                                lineNumber: 152,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/ShopProvider.js",
                            lineNumber: 151,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ShopProvider.js",
                    lineNumber: 146,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/ShopProvider.js",
                lineNumber: 145,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ShopProvider.js",
        lineNumber: 123,
        columnNumber: 5
    }, this);
}
}),
"[project]/pages/_app.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>App
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
(()=>{
    const e = new Error("Cannot find module 'next-auth/react'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ShopProvider$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ShopProvider.js [ssr] (ecmascript)");
;
;
;
;
;
;
;
;
;
function App({ Component, pageProps: { session, ...pageProps } }) {
    // Support per-page custom layouts (used by login, signup, cart, etc.)
    const getLayout = Component.getLayout ?? ((page)=>page);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(SessionProvider, {
        session: session,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ShopProvider$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
            children: getLayout(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Component, {
                ...pageProps
            }, void 0, false, {
                fileName: "[project]/pages/_app.js",
                lineNumber: 17,
                columnNumber: 20
            }, this))
        }, void 0, false, {
            fileName: "[project]/pages/_app.js",
            lineNumber: 16,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/pages/_app.js",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0fha3vc._.js.map