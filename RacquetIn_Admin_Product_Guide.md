# RacquetIn Admin Dashboard — Adding & Managing Products

**A simple guide for the store team**

---

## 1. Introduction

The RacquetIn admin dashboard is your control panel for the store. From here, you can add new products, update prices, upload photos, and manage stock — all without needing a developer.

This guide walks you through everything step by step, using plain language. No technical background is needed.

---

## 2. Logging In

1. Open your web browser and go to your RacquetIn website.
2. Sign in using your usual account email and password, exactly as a customer would — there's no separate admin login page.
3. Once signed in, go to the web address for the admin dashboard (your website address followed by `/admin`). If you don't have this saved, ask whoever set up your account for the exact link.
4. If your account has admin access, you'll see the **admin dashboard**, with a menu down the left-hand side:

   - **Dashboard** — a quick overview of your store
   - **Products** — where you add and manage products
   - **Categories** — the sections your products are organized into (Rackets, Shoes, Bags, etc.)
   - **Orders** — customer orders
   - **Customers** — your customer list
   - **Content** — website text and images
   - **Coupons** — discount codes
   - **Newsletter** — your email subscriber list
   - **Settings** — general store settings

   If instead you see a message saying your account isn't registered as an admin, contact whoever manages your store's technical setup — your account needs to be added to the admin list first.

---

## 3. Adding a New Product

Click **Products** in the left-hand menu, then click the **+ New Product** button in the top right.

A form will open. Here is exactly what each field means.

### Fields that are required

You cannot save a product without filling these in:

| Field | What it means |
|---|---|
| **Name** | The product's name, exactly as customers will see it. |
| **Slug** | A short, web-friendly version of the name, used in the product's page address. Use lowercase letters, numbers, and dashes only — no spaces or special characters (for example, `yonex-astrox-100zz`). Each product needs its own unique Slug. |
| **Category** | Choose which section of the store this product belongs to, from the dropdown list (Rackets, Shoes, Bags, and so on). |
| **Price (₹)** | The price the customer pays right now, in rupees. |

**Tip:** Keep the Slug closely matching the Name — it makes products easier to find later and keeps your web addresses tidy.

### Pricing fields

- **Price (₹)** — the current selling price (required, see above).
- **Original Price (₹)** — *optional.* Only fill this in if the product is on sale. If you set an Original Price higher than the Price, customers will see the Original Price crossed out next to the current Price, showing them it's discounted. Leave this blank if the product isn't on sale.

**Common mistake to avoid:** Don't set an Original Price that's the same as (or lower than) the Price — it won't show as a discount and may look like a mistake to customers.

### Basic details

- **Brand** — the manufacturer (for example, Yonex, Li-Ning, Hundred). Optional, but recommended — it helps customers filter and search.
- **Series** — the product line or collection name, if applicable (for example, "Astrox"). Optional.
- **Series Code** — an internal model code, if you use one. Optional.
- **Stock** — how many units you currently have available. Leave at 0 if you're not ready to sell it yet.
- **SKU** — your own internal reference code for the product, if you use one. Optional.
- **Description** — a paragraph describing the product. This appears on the product's page.

### Specification fields

These fields are mostly useful for rackets (Player Level, Playing Style, Balance, and Flex are chosen from a dropdown list; the rest are typed in):

- **Player Level** — Beginner, Intermediate, Advanced, or Professional
- **Playing Style** — Attacking, Defensive, or All-Round
- **Balance** — Head-Heavy, Even Balance, or Head-Light
- **Flex** — Flexible, Medium, Medium-Stiff, Stiff, or Extra Stiff
- **Weight**, **Frame Material**, **Shaft Material**, **Max Tension**, **Recommended String** — typed in freely
- **Warranty** — for example, "1 Year"

**If a field doesn't apply to the product you're adding** (for example, "Playing Style" doesn't make sense for a pair of shoes), simply leave it blank. Nothing bad happens — it just won't show on that product's page.

### Lists (Colors, Tags, In Box, Technologies)

These four fields work the same way — type each item separated by a comma:

- **Colors** — for example: `Black, White, Yellow`
- **Tags** — search keywords to help customers find the product, for example: `tournament, lightweight`
- **In Box** — what's included in the package, for example: `Racket, Cover, Manual`
- **Technologies** — any named technologies built into the product, for example: `Aero Frame, Isometric Head`

### Additional Specifications (optional, advanced)

Further down the form is a larger box labelled **Specs**, for listing extra specification details beyond the fields above. This one needs to follow an exact pattern. If you want to use it, copy this format and just change the words in quotes:

```
{
  "Weight": "85g",
  "Grip Size": "G4",
  "String Pattern": "76 Holes"
}
```

A few rules to keep it working correctly:
- Keep the curly brackets `{` and `}` at the very start and end.
- Keep the quotation marks around every label and value.
- Put a comma at the end of every line except the last one.

**If you're not confident with this, it's completely fine to leave it as-is** — it's an optional, advanced field, and the product will save and display correctly without it.

### Badge

A small label that appears on the product card in your store, chosen from a dropdown: **Best Seller**, **New**, **Pro Choice**, **Limited Edition**, **Sale**, or none at all.

### Visibility and Featured toggles

Near the bottom of the form are four switches:

- **Active** — this is the master on/off switch for the product. **Turn this on to make the product visible on your live website.** If it's off, the product is saved but hidden from customers — useful if you're not ready to sell it yet.
- **Best Seller** — marks the product as a best seller on the storefront.
- **New Arrival** — marks the product as newly arrived.
- **Featured** — marks the product to be highlighted more prominently on the storefront.

### Search listing fields (optional)

- **Meta Title** and **Meta Description** — the title and short description that can appear when this product is found through a search engine. Optional, but good practice for popular products.
- **Sort Order** — a number controlling where this product appears relative to others in its category. Lower numbers appear first. Leave as 0 if you don't need to control this.

---

## 4. Uploading Images

**Important: photos can only be added after the product has been saved for the first time.** This is simply how the system is built — the product needs to exist before photos can be attached to it. Don't worry, it only takes a moment:

1. Fill in the details above and click **Save Product**.
2. Find your new product in the list and click to open it again.
3. You'll now see an **Images** section that wasn't there before.

### Adding photos

1. Click **+ Upload Image**.
2. Choose a photo from your computer or phone.
3. Repeat for each additional photo.

### Managing your photos

Once uploaded, hover over any photo to see a small toolbar:

- **★ (star)** — sets this photo as the **Primary** image — the main photo shown on the product listing and at the top of the product page. The current primary photo is marked with a "Primary" label.
- **← and →** — move a photo earlier or later in the order.
- **× (delete)** — removes the photo.

### Recommendations for great-looking photos

- **Use a clean, white or plain background.** This is what gives a premium, professional storefront look and keeps every product looking consistent.
- **Recommended size:** at least 1000 × 1000 pixels, and square (the width and height the same) works best.
- **File format:** JPG or PNG.
- **Upload your best, clearest photo first** and set it as the Primary image — this is what customers see before clicking into the product.
- Include a few angles if you have them (front, side, close-up of detail) — customers browsing on their phone especially benefit from seeing more than one photo.
- Avoid blurry, dark, or heavily shadowed photos — they stand out immediately next to your other products.

---

## 5. Saving the Product

1. Once you're happy with the details, click **Save Product** at the bottom of the form.
2. If any required field is missing, you'll see a short message at the bottom of the form telling you what to fix. Correct it and click Save again.
3. Once saved, the form closes and you'll see your product in the Products list.

### Confirming it worked

- Your new product should appear immediately in the Products list, grouped under its category.
- To check it on your live website, visit the relevant category page (for example, the Rackets page) and confirm the product appears there — as long as its **Active** toggle is switched on.
- Changes are visible on the live site right away. If you don't see it immediately, try refreshing the page.

---

## 6. Editing Existing Products

1. Go to **Products** in the left-hand menu.
2. Find the product — you can use the search box, or open the category it belongs to (products are grouped by category; click a category name to expand it).
3. Click the product to open it for editing.
4. Make your changes — any of the fields described above can be updated.
5. Click **Save Product** to save your changes.

### Updating photos on an existing product

Open the product as above — the Images section will already be there. Add new photos with **+ Upload Image**, remove old ones with the × button, or reorder them using the arrows.

### Updating stock

For a product's overall stock, open it and update the **Stock** field in the form, then click Save Product.

If the product has **Variants** (different sizes, for example), each variant has its own stock number that you can edit directly in the Variants section, without needing to click Save separately — just click into the number and change it.

### A faster way to change simple things

For the **Active**, **Best Seller**, and **New** switches specifically, you can flip these directly from the Products list without opening the full editing form — look for the toggle switches next to each product.

---

## 7. Best Practices

- **Use high-quality, white-background photos** for every product — this is the single biggest factor in making your store look premium and trustworthy.
- **Keep naming consistent** — decide on a naming pattern (for example, "Brand + Series + Model") and stick to it across all products.
- **Double-check your pricing before saving** — especially the Price and Original Price fields, since a mistake here is visible to every customer immediately.
- **Verify stock is correct before switching a product Active** — turning on a product with 0 stock will show it as available when it isn't.
- **After saving, visit the live product page** and look it over as a customer would — check the photos, price, and description all look right.
- **Keep descriptions concise and informative** — a few clear sentences covering what the product is and why it's good, rather than long paragraphs.
- **Fill in Brand and Tags where possible** — this helps customers find products through search and filters.

---

## 8. Troubleshooting

**The product doesn't appear on the website**
Check that the **Active** toggle is switched on. Also confirm you selected the correct **Category** — the product will only appear under the category you chose.

**Images are missing**
Photos can only be added after the product is first saved — if you don't see an Images section, save the product once, then reopen it. If you uploaded a photo and it's still not showing, try refreshing the page.

**The wrong price is displayed**
Reopen the product and check both the **Price** and **Original Price** fields. Remember: Original Price only shows as a discount if it's set *higher* than Price.

**Stock isn't updating**
Make sure you clicked **Save Product** after changing the Stock field. If it's a variant's stock (like a specific size), confirm you edited the number in the Variants section for that exact size. Try refreshing the page to confirm the new number stuck.

**The Save button doesn't seem to do anything**
Check for a message near the bottom of the form — this usually means a required field (Name, Slug, Category, or Price) is missing or needs fixing.

**An image upload failed**
Try a smaller file size, or double check the file is a standard photo format (JPG or PNG). If it keeps failing, try a different photo to rule out an issue with that specific file.

---

## 9. Frequently Asked Questions

**1. Do I need any technical skills to use this dashboard?**
No. Everything is done through simple forms, buttons, and toggles.

**2. How quickly do changes appear on the live website?**
Almost immediately. If you don't see a change right away, refresh the page.

**3. Can I add a product without a photo?**
Yes, but we strongly recommend adding at least one photo before switching a product Active, since customers are unlikely to buy something they can't see.

**4. What happens if I turn off the Active toggle?**
The product stays saved in your dashboard but disappears from the live website until you turn it back on.

**5. Can I schedule a product to go live later?**
Not directly — save it with Active turned off, and switch it on whenever you're ready.

**6. How do I put a product on sale?**
Set the Original Price higher than the current Price. Customers will then see the Original Price crossed out next to the sale Price.

**7. Can I sell the same product in different sizes?**
Yes — use the **Variants** section (visible after saving the product) to add sizes or other options, each with its own stock count.

**8. What's the difference between Featured, Best Seller, and New Arrival?**
They're independent labels you can use to highlight products in different ways around the storefront — a product can have any combination of them switched on.

**9. Can I delete a product completely?**
Yes, from the product list — but we recommend simply turning off the Active toggle instead, so you keep the product's history and information saved.

**10. What image size should I use?**
A square photo of at least 1000 × 1000 pixels, in JPG or PNG format, on a clean white or plain background, gives the best results.

---

*If you run into anything not covered in this guide, contact whoever manages your store's technical setup.*
