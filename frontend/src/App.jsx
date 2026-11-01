
import { useState } from "react";
import { useCallback } from "react";
import "./App.css";
import { products } from "./products";

const categories = [
  { name: "All", emoji: "✨" },
  ...Array.from(new Set(products.map((product) => product.category))).map(
    (name) => ({ name, emoji: "🛍️" })
  ),
];

export default function App() {
  const [search, setSearch] = useState("");
  
const [voiceLanguage, setVoiceLanguage] = useState("en-IN");
const [isListening, setIsListening] = useState(false);
const [voiceError, setVoiceError] = useState("");

const startVoiceSearch = useCallback(() => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setVoiceError(
      "Voice search is not supported in this browser. Please try Google Chrome."
    );
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = voiceLanguage;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  setVoiceError("");
  setIsListening(true);

  recognition.onresult = (event) => {
    const spokenText = event.results[0][0].transcript;

    setSearch(spokenText);
    setShowCart(false);
    setShowWishlist(false);
  };

  recognition.onerror = (event) => {
    setVoiceError(
      event.error === "not-allowed"
        ? "Please allow microphone access in your browser."
        : `Voice recognition error: ${event.error}`
    );
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  try {
    recognition.start();
  } catch {
    setIsListening(false);
    setVoiceError("Unable to start the microphone. Please try again.");
  }
}, [voiceLanguage]);

  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Mix products in a stable order instead of reshuffling on every render.
  const mixedProducts = [...products].sort(
    (a, b) => ((a.id * 37) % 71) - ((b.id * 37) % 71)
  );

  const toggleCompare = (product) => {
    setCompareList((current) => {
      const exists = current.some((item) => item.id === product.id);

      if (exists) {
        return current.filter((item) => item.id !== product.id);
      }

      if (current.length >= 4) {
        alert("You can compare a maximum of 4 products.");
        return current;
      }

      return [...current, product];
    });
  };

  // Search and category filtering use the mixed product list.
  const visibleProducts = mixedProducts.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || product.category === category;

    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);

      return found
        ? current.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...current, { ...product, quantity: 1 }];
    });
  };

  const changeQuantity = (id, amount) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const toggleWishlist = (product) => {
    setWishlist((current) =>
      current.some((item) => item.id === product.id)
        ? current.filter((item) => item.id !== product.id)
        : [...current, product]
    );
  };

  const displayedProducts = showCart
    ? products.filter((product) =>
        cart.some((item) => item.id === product.id)
      )
    : showWishlist
      ? products.filter((product) =>
          wishlist.some((item) => item.id === product.id)
        )
      : visibleProducts;

  const title = showCart
    ? "Your Shopping Cart"
    : showWishlist
      ? "Your Wishlist"
      : category === "All"
        ? "Explore All Products"
        : category;

  // Open a product image and reset its gallery controls.
  const openProductGallery = (product) => {
    setSelectedProduct(product);
    setActiveImageIndex(0);
    setZoomLevel(1);
  };

  const closeProductGallery = () => {
    setSelectedProduct(null);
    setActiveImageIndex(0);
    setZoomLevel(1);
  };

  return (
    <div className="app">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setShowCart(false);
            setShowWishlist(false);
            setCategory("All");
            setSearch("");
          }}
        >
          <span className="brand-icon">S</span>
          <span>
            ShopSmart<span className="brand-ai"> AI</span>
            <small>SHOP SMARTER. LIVE BETTER.</small>
          </span>
        </a>

        
<div className="search-box">
  <span>⌕</span>

  <input
    value={search}
    onChange={(event) => {
      setSearch(event.target.value);
      setShowCart(false);
      setShowWishlist(false);
    }}
    placeholder="Search products or speak..."
  />

<select
  className="voice-language-select"
  value={voiceLanguage}
  onChange={(event) => setVoiceLanguage(event.target.value)}
  aria-label="Choose voice search language"
>
  <option value="en-IN">EN</option>
  <option value="te-IN">తెలుగు</option>
  <option value="hi-IN">हिन्दी</option>
</select>

  
<button
  type="button"
  className="voice-search-button"
  title={isListening ? "Listening..." : "Search with your voice"}
  aria-label="Search with your voice"
  onClick={startVoiceSearch}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <path d="M12 17v5" />
    <path d="M8 22h8" />
  </svg>
</button>


  <button
    onClick={() => {
      setShowCart(false);
      setShowWishlist(false);
    }}
  >
    Search
  </button>
</div>


        <div className="header-actions">
          <button
            className="header-button"
            onClick={() => {
              setShowWishlist(!showWishlist);
              setShowCart(false);
            }}
          >
            ♡ Wishlist <b>{wishlist.length}</b>
          </button>

          <button
            className="cart-button"
            onClick={() => {
              setShowCart(!showCart);
              setShowWishlist(false);
            }}
          >
            🛒 Cart{" "}
            <b>
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </b>
          </button>
        </div>
      </header>


      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              ✦ YOUR SMARTER SHOPPING DESTINATION
            </span>

            <h1>
              Good choices.
              <br />
              <span>Great prices.</span>
            </h1>

            <p>
              Discover products you'll love, compare your options, and
              shop with confidence.
            </p>

            <button
              className="hero-button"
              onClick={() =>
                document
                  .getElementById("products")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore products <span>→</span>
            </button>

            <div className="hero-stats">
              <div>
                <b>{products.length}</b>
                <span>Demo products</span>
              </div>
              <div>
                <b>4.3 ★</b>
                <span>Sample ratings</span>
              </div>
              <div>
                <b>Smart</b>
                <span>Simple shopping</span>
              </div>
            </div>
          </div>

          <div className="hero-art">
            <div className="art-orbit orbit-one"></div>
            <div className="art-orbit orbit-two"></div>
            <div className="floating-card card-one">
              🎧 <span>Audio essentials</span>
            </div>
            <div className="floating-card card-two">
              ⌚ <span>Everyday tech</span>
            </div>
            <div className="shopping-bag">🛍️</div>
            <div className="art-caption">YOUR NEXT FAVORITE FIND</div>
          </div>
        </section>

        <section className="benefits">
          <div>
            <span>🚚</span>
            <p>
              <b>Easy shopping</b>
              <small>Browse with confidence</small>
            </p>
          </div>
          <div>
            <span>🔒</span>
            <p>
              <b>Secure by design</b>
              <small>Security features coming next</small>
            </p>
          </div>
          <div>
            <span>✨</span>
            <p>
              <b>Smart discovery</b>
              <small>Find what fits your needs</small>
            </p>
          </div>
          <div>
            <span>💬</span>
            <p>
              <b>AI shopping assistant</b>
              <small>Planned for a future stage</small>
            </p>
          </div>
        </section>

        <section className="products-section" id="products">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MADE FOR YOUR EVERYDAY</span>
              <h2>{title}</h2>
              <p>
                {showCart
                  ? "Review your selected items and quantities."
                  : showWishlist
                    ? "Your saved favorites in one place."
                    : "Handpicked demo products to get your store started."}
              </p>
            </div>

            <span className="product-count">
              {displayedProducts.length} products
            </span>
          </div>

          {!showCart && !showWishlist && (
            <div className="filters">
              {categories.map((item) => (
                <button
                  key={item.name}
                  className={
                    category === item.name
                      ? "filter active-filter"
                      : "filter"
                  }
                  onClick={() => setCategory(item.name)}
                >
                  {item.name}
                </button>
              ))}
              <label className="sort-label">
                Search results update as you type
              </label>
            </div>
          )}

          {showCart && cart.length > 0 && (
            <div className="cart-summary">
              <span>Subtotal</span>
              <strong>
                ₹
                {cart
                  .reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                  )
                  .toLocaleString("en-IN")}
              </strong>
              <button
                onClick={() =>
                  alert("Checkout will be implemented in a later stage.")
                }
              >
                Proceed to checkout →
              </button>
            </div>
          )}

          {displayedProducts.length === 0 ? (
            <div className="empty-state">
              <span>{showCart ? "🛒" : "🔎"}</span>
              <h3>
                {showCart
                  ? "Your cart is empty"
                  : showWishlist
                    ? "No saved products yet"
                    : "No products found"}
              </h3>
              <p>
                {showCart
                  ? "Explore products and add something you like."
                  : "Try another search or category."}
              </p>
              <button
                onClick={() => {
                  setShowCart(false);
                  setShowWishlist(false);
                  setSearch("");
                  setCategory("All");
                }}
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {displayedProducts.map((product) => {
                const inWishlist = wishlist.some(
                  (item) => item.id === product.id
                );

                const cartItem = cart.find(
                  (item) => item.id === product.id
                );

                const discount = Math.round(
                  (1 - product.price / product.originalPrice) * 100
                );

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-art">
                      <span className="discount">
                        {discount}% OFF
                      </span>

                      <button
                        className={
                          inWishlist ? "heart liked" : "heart"
                        }
                        aria-label="Toggle wishlist"
                        onClick={() => toggleWishlist(product)}
                      >
                        {inWishlist ? "♥" : "♡"}
                      </button>

                      <img
                        className="product-emoji"
                        src={product.image}
                        alt={product.name}
                        onClick={() => openProductGallery(product)}
                        style={{ cursor: "pointer" }}
                      />
                    </div>

                    <div className="product-info">
                      <span className="product-category">
                        {product.category}
                      </span>

                      <h3>{product.name}</h3>

                      <span className="rating">
                        ★ {product.rating}{" "}
                        <small>Sample rating</small>
                      </span>

                      <div className="price-row">
                        <strong>
                          ₹{product.price.toLocaleString("en-IN")}
                        </strong>
                        <del>
                          ₹{product.originalPrice.toLocaleString("en-IN")}
                        </del>
                      </div>

                      <p className="deal-text">
                        Special introductory price
                      </p>

                      {showCart ? (
                        <div className="quantity-control">
                          <button
                            onClick={() =>
                              changeQuantity(product.id, -1)
                            }
                          >
                            −
                          </button>

                          <span>{cartItem?.quantity ?? 0}</span>

                          <button
                            onClick={() =>
                              changeQuantity(product.id, 1)
                            }
                          >
                            +
                          </button>

                          <button
                            className="remove-button"
                            onClick={() =>
                              changeQuantity(
                                product.id,
                                -(cartItem?.quantity ?? 0)
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="compare-button"
                            onClick={() => toggleCompare(product)}
                          >
                            {compareList.some(
                              (item) => item.id === product.id
                            )
                              ? "✓ Added to Compare"
                              : "⇄ Compare Product"}
                          </button>

                          <button
                            className="add-button"
                            onClick={() => addToCart(product)}
                          >
                            {cartItem
                              ? `Add another · ${cartItem.quantity} in cart`
                              : "Add to cart"}{" "}
                            <span>＋</span>
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {compareList.length > 0 && (
            <section className="comparison-section">
              <h2>⚖️ Smart Product Comparison</h2>
              <p>Compare your selected products side by side.</p>

              <button
                className="clear-compare-button"
                onClick={() => setCompareList([])}
              >
                Clear Comparison
              </button>

              <div className="comparison-grid">
                {compareList.map((product) => (
                  <div className="comparison-card" key={product.id}>
                    <h3>{product.name}</h3>

                    <p>
                      <strong>Price:</strong>{" "}
                      ₹{product.price.toLocaleString("en-IN")}
                    </p>

                    <p>
                      <strong>Rating:</strong> {product.rating} ⭐
                    </p>

                    <button onClick={() => toggleCompare(product)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      </main>

      {/* Basic product image viewer */}
      {selectedProduct && (
        <div
          className="gallery-overlay"
          onClick={closeProductGallery}
        >
          <div
            className="gallery-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="gallery-close"
              onClick={closeProductGallery}
              aria-label="Close image viewer"
            >
              ✕
            </button>

            <h2 className="gallery-title">
              {selectedProduct.name}
            </h2>

            {(() => {
              const images =
                selectedProduct.images?.length > 0
                  ? selectedProduct.images
                  : [selectedProduct.image];

              const safeIndex = Math.min(
                activeImageIndex,
                images.length - 1
              );

              return (
                <>
                  <div className="gallery-main">
                    {images.length > 1 && (
                      <button
                        className="gallery-arrow"
                        onClick={() => {
                          setActiveImageIndex(
                            (safeIndex - 1 + images.length) %
                              images.length
                          );
                          setZoomLevel(1);
                        }}
                        aria-label="Previous image"
                      >
                        ‹
                      </button>
                    )}

                    <img
                      src={images[safeIndex]}
                      alt={selectedProduct.name}
                      style={{
                        transform: `scale(${zoomLevel})`,
                        maxWidth: "100%",
                        maxHeight: "60vh",
                        objectFit: "contain",
                      }}
                    />

                    {images.length > 1 && (
                      <button
                        className="gallery-arrow"
                        onClick={() => {
                          setActiveImageIndex(
                            (safeIndex + 1) % images.length
                          );
                          setZoomLevel(1);
                        }}
                        aria-label="Next image"
                      >
                        ›
                      </button>
                    )}
                  </div>

                  <div className="gallery-controls">
                    <button
                      onClick={() =>
                        setZoomLevel((level) =>
                          Math.max(1, level - 0.25)
                        )
                      }
                    >
                      − Zoom
                    </button>

                    <button onClick={() => setZoomLevel(1)}>
                      Reset zoom
                    </button>

                    <button
                      onClick={() =>
                        setZoomLevel((level) =>
                          Math.min(2.5, level + 0.25)
                        )
                      }
                    >
                      + Zoom
                    </button>
                  </div>

                  <p className="gallery-counter">
                    Image {safeIndex + 1} of {images.length}
                  </p>

                  {images.length > 1 && (
                    <div className="gallery-thumbnails">
                      {images.map((image, index) => (
                        <button
                          className={
                            index === safeIndex
                              ? "gallery-thumbnail active"
                              : "gallery-thumbnail"
                          }
                          key={image}
                          onClick={() => {
                            setActiveImageIndex(index);
                            setZoomLevel(1);
                          }}
                        >
                          <img src={image} alt={`View ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      <footer>
        <span className="footer-brand">ShopSmart AI</span>
        <span>Independent demo project · Sample product data · 2026</span>
        <span>Built with React</span>
      </footer>
    </div>
  );
}
