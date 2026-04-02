const fs = require('fs');
const path = require('path');

const oldTopbar = `<!-- ==================== TOPBAR ==================== -->
<div class="topbar">
  <div class="container">
    <div class="topbar-left">
      <a href="seller-zone.html"><i class="fas fa-store"></i> Sell on Hilgod</a>
      <div class="topbar-divider"></div>
      <a href="delivery.html"><i class="fas fa-motorcycle"></i> Become a Rider</a>
      <div class="topbar-divider"></div>
      <div class="topbar-marquee">
        <div class="marquee-inner">
          <span><i class="fas fa-tag"></i> Flash Sale: Up to 50% off Electronics</span>
          <span><i class="fas fa-truck"></i> Free Delivery on orders over ₦50,000</span>
          <span><i class="fas fa-shield-halved"></i> 100% Secure Payments</span>
          <span><i class="fas fa-rotate-left"></i> 7-Day Easy Returns</span>
          <span><i class="fas fa-tag"></i> Flash Sale: Up to 50% off Electronics</span>
          <span><i class="fas fa-truck"></i> Free Delivery on orders over ₦50,000</span>
          <span><i class="fas fa-shield-halved"></i> 100% Secure Payments</span>
          <span><i class="fas fa-rotate-left"></i> 7-Day Easy Returns</span>
        </div>
      </div>
    </div>
    <div class="topbar-right">
      <a href="track-order.html"><i class="fas fa-location-dot"></i> Track Order</a>
      <div class="topbar-divider"></div>
      <a href="#"><i class="fas fa-phone"></i> +234 800 HILGOD</a>
    </div>
  </div>
</div>`;

const newTopbar = `<!-- ==================== TOPBAR ==================== -->
<div class="topbar">
  <div class="container">
    <div class="topbar-left">
      <span><i class="fas fa-circle" style="font-size: 6px; margin-right: 4px;"></i> Free Delivery on orders over $50</span>
    </div>
    <div class="topbar-right">
      <a href="track-order.html"><i class="fas fa-box-open"></i> Track Order</a>
      <a href="#">Help Center</a>
      <a href="seller-zone.html"><i class="fas fa-store"></i> Sell on Hilgod</a>
      <a href="delivery.html"><i class="fas fa-motorcycle"></i> Become Delivery Partner</a>
    </div>
  </div>
</div>`;

const directory = __dirname;
fs.readdirSync(directory).forEach(file => {
  if (file.endsWith('.html') && file !== 'index.html') {
    const filePath = path.join(directory, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(oldTopbar)) {
      content = content.replace(oldTopbar, newTopbar);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', file);
    }
  }
});
