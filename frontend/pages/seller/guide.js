import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

// Step-by-step guide for sellers: how to upload a product. Screenshots live in
// public/guide/ (real seller pages, demo data; numbered red boxes show where to
// click). Public page, so it can be shared with new sellers before they apply.
const STEPS = [
  {
    title: 'Open your Seller Dashboard',
    img: 'step-1.jpg',
    body: <>Sign in, then go to <strong>Seller Dashboard</strong> (Account menu → Seller Dashboard). Click <strong>Upload Product</strong>.</>,
  },
  {
    title: 'Name it and choose where it belongs',
    img: 'step-2.jpg',
    body: <>Type a clear <strong>product name</strong> (what a shopper would search for) and the <strong>brand</strong> if it has one. Then pick the <strong>category</strong> and <strong>subcategory</strong> — this decides which shop aisle it appears in.</>,
    tip: 'Pick the closest subcategory. Products without the right one are harder for shoppers to find.',
  },
  {
    title: 'Set the price and how many you have',
    img: 'step-3.jpg',
    body: <>Enter your <strong>price</strong>. If the item is on sale, put the old price in <strong>Original price</strong> — it shows crossed out next to your price. Leave it empty if there’s no discount. Choose the <strong>currency</strong> and enter the <strong>stock</strong> (how many you can sell).</>,
    tip: 'The original price must be higher than your price, or it won’t be accepted.',
  },
  {
    title: 'Add sizes (only if it has sizes)',
    img: 'step-4.jpg',
    body: <>For clothing or shoes, type the sizes you have, or tap <strong>Clothing</strong>, <strong>Shoes (EU)</strong> or <strong>One size</strong> to fill them in. Shoppers must choose a size before buying. For items without sizes, leave it empty. Tick <strong>Unisex</strong> if it suits everyone.</>,
  },
  {
    title: 'Pick the colours you sell',
    img: 'step-5.jpg',
    body: <>Tap each colour the product comes in (or pick a custom one and press <strong>Add colour</strong>). Next to each colour you can choose the photo that shows it — when a shopper taps that colour, the gallery jumps to that photo.</>,
    tip: 'Shoppers must pick one of your colours before adding to cart, so only add colours you actually have.',
  },
  {
    title: 'Add your photos — as many as you like',
    img: 'step-6.jpg',
    body: <>Click a photo box to upload from your phone or computer, or use <strong>Upload several</strong> to add many at once. Need more boxes? Click <strong>Add more images</strong>. The first photo is the <strong>main</strong> one — use the ★ button to make another photo the main one.</>,
    tip: 'Use bright, clear photos on a plain background. Large phone photos are resized for you automatically.',
  },
  {
    title: 'Describe it and upload',
    img: 'step-7.jpg',
    body: <>Write a short description: material, size details, what’s in the box. Then click <strong>Upload Product</strong>.</>,
  },
  {
    title: 'Wait for approval',
    img: 'step-8.jpg',
    body: <>Your product appears in <strong>My Product List</strong> as <strong>Pending</strong> while our team checks it. Once approved it goes live in the shop. You can edit (✏️) or remove (🗑) it any time — big changes are checked again before going live.</>,
  },
];

export default function SellerGuide() {
  const [zoom, setZoom] = useState(null);
  return (
    <Layout title="How to Upload Products — Hilgod Seller Guide" description="Step-by-step guide for Hilgod sellers: upload products with photos, colours, sizes and prices.">
      <div className="guide-page">
        <nav className="breadcrumb">
          <Link href="/seller/dashboard">Seller Dashboard</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">How to upload products</span>
        </nav>

        <header className="guide-hero">
          <span className="guide-hero__badge"><i className="fas fa-book-open"></i> Seller guide</span>
          <h1>How to upload a product</h1>
          <p>8 quick steps, about 5 minutes. Follow the red boxes in each picture.</p>
          <ol className="guide-toc">
            {STEPS.map((s, i) => <li key={s.title}><a href={`#step-${i + 1}`}><span>{i + 1}</span>{s.title}</a></li>)}
            <li><a href="#on-the-web"><span><i className="fas fa-eye"></i></span>How shoppers see it</a></li>
          </ol>
        </header>

        <div className="guide-checklist">
          <strong><i className="fas fa-list-check"></i> Have these ready:</strong>
          <span>Clear photos</span><span>Price</span><span>How many you have</span><span>Sizes &amp; colours (if any)</span><span>A short description</span>
        </div>

        {STEPS.map((s, i) => (
          <section key={s.title} id={`step-${i + 1}`} className="guide-step">
            <div className="guide-step__text">
              <div className="guide-step__num">{i + 1}</div>
              <div>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
                {s.tip && <p className="guide-step__tip"><i className="fas fa-lightbulb"></i> {s.tip}</p>}
              </div>
            </div>
            <button type="button" className="guide-step__shot" onClick={() => setZoom(`/guide/${s.img}`)} aria-label={`Enlarge picture for step ${i + 1}`}>
              <img src={`/guide/${s.img}`} alt={`Step ${i + 1}: ${s.title}`} loading="lazy" />
              <span className="guide-step__zoom"><i className="fas fa-magnifying-glass-plus"></i> Tap to enlarge</span>
            </button>
          </section>
        ))}

        <section id="on-the-web" className="guide-step guide-step--live">
          <div className="guide-step__text">
            <div className="guide-step__num"><i className="fas fa-eye"></i></div>
            <div>
              <h2>How shoppers see your product</h2>
              <p>Once approved, your product gets its own page on hilgod.com with all your photos, colours and sizes. Shoppers pick a colour and size, then add it to their cart — on a computer or on their phone.</p>
            </div>
          </div>
          <div className="guide-live">
            <button type="button" className="guide-step__shot" onClick={() => setZoom('/guide/live-desktop.jpg')}>
              <img src="/guide/live-desktop.jpg" alt="A product page on hilgod.com on a computer" loading="lazy" />
              <span className="guide-step__zoom">On a computer</span>
            </button>
            <button type="button" className="guide-step__shot guide-step__shot--phone" onClick={() => setZoom('/guide/live-phone.jpg')}>
              <img src="/guide/live-phone.jpg" alt="The same product page on a phone" loading="lazy" />
              <span className="guide-step__zoom">On a phone</span>
            </button>
          </div>
        </section>

        <section className="guide-faq">
          <h2>Good to know</h2>
          <details><summary>How long does approval take?</summary><p>Our team reviews new products as quickly as possible, usually within a day. You’ll see the status change from Pending to Approved in My Product List.</p></details>
          <details><summary>Can I upload many products at once?</summary><p>Yes — at the top of the Upload Product page, <strong>Bring your catalogue to Hilgod</strong> lets you add products from a spreadsheet, a pasted list or your online store.</p></details>
          <details><summary>How do I change a price or stock later?</summary><p>Click ✏️ next to the product in My Product List, change it and click Save Changes. Price and stock changes go live straight away.</p></details>
          <details><summary>How do I get paid?</summary><p>See <Link href="/seller/payouts">My Earnings</Link>. A full guide to how payouts work is coming soon.</p></details>
        </section>

        <div className="guide-cta">
          <h2>Ready?</h2>
          <Link href="/seller/products" className="btn btn-primary btn-lg"><i className="fas fa-cloud-arrow-up"></i> Upload your first product</Link>
          <Link href="/seller-zone" className="btn btn-outline btn-lg">Not a seller yet? Apply here</Link>
        </div>
      </div>

      {zoom && (
        <div className="guide-lightbox" onClick={() => setZoom(null)} role="dialog" aria-modal="true">
          <img src={zoom} alt="" />
          <button type="button" aria-label="Close"><i className="fas fa-xmark"></i></button>
        </div>
      )}
    </Layout>
  );
}
