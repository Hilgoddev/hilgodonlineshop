import os
import glob

old_topbar = """<!-- ==================== TOPBAR ==================== -->
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
</div>"""

new_topbar = """<!-- ==================== TOPBAR ==================== -->
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
</div>"""

directory = r"c:\Users\etiuz\Music\hilgod-2"
html_files = glob.glob(os.path.join(directory, "*.html"))

for filepath in html_files:
    if os.path.basename(filepath) == "index.html":
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if old_topbar in content:
        content = content.replace(old_topbar, new_topbar)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {os.path.basename(filepath)}")
    else:
        print(f"Did not find old topbar in {os.path.basename(filepath)}")
