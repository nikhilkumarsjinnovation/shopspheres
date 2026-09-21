
# ShopSphere: Complete Project Vision & Feature Scope

## 1. Customer Features

* **Browsing Options:** Users can navigate the platform by searching for specific products or by browsing entire individual shops.
* **AI Shopping Assistants:**
* *Category-Specific Agents (PRO Feature):* Specialized AI experts for different product categories to guide users.
* *General App-Level AI:* A background AI continuously monitors user behavior and searches to build a personalized JSON profile. When the user enables the AI assistant, this profile provides deep context for highly personalized recommendations.
* *Accessibility Agent:* A specialized AI designed specifically to assist users with disabilities (visual, auditory, or speech impairments).


* **Visual Search (Camera/Image Scanning):** Users can scan a physical product or a shop to see if it is available on the platform. Free users get 5 scans per day; PRO users have unlimited scans.
* **AI Reviews:** Product reviews and summaries are automatically generated using a lightweight AI model for quick reading.
* **Product Comparison:** Users can compare two products side-by-side with AI assistance. PRO users can compare more than two products simultaneously.
* **Hyper-Local Logistics (0-30km Radius):** If a cart item is located within 30km of the user, they can bypass delivery and physically pick it up from the seller's shop or the platform's local sorting hub.
* **Virtual Map Exploration (PRO Feature):** A dedicated map interface where users set a radius (up to 30km) to view registered shops. Clicking a shop allows the user to virtually enter and browse its specific inventory.
* **Standard E-commerce Features:** Direct purchasing, add to cart, delivery tracking, and custom bookmarking/category creation for saved items.
* **PRO Perks:** Zero delivery charges on orders.
* **Social Purchasing Mechanics:**
* *Buy for Friend:* Both users (A and B) must be registered. User A purchases an item using User B's email/phone. Both users can track the delivery and cancel the order (refunds route back to User A).
* *Gift for Friend:* Similar to the above, but the tracking is hidden from the recipient (User B) to maintain a surprise. User A configures the exact date User B is notified. If left unset, the system defaults to notifying User B one day before delivery.



## 2. Seller Features

* **Core Store Management:** A dashboard to view existing products and manually add new items (name, images, price).
* **Multi-Inventory Segregation:** Sellers can separate their store into distinct inventories (e.g., Digital Goods vs. Beauty Products). Each segregated inventory gets its own dedicated dashboard and analytics.
* **AI Product Detailing (PRO Feature):** AI automatically drafts product details for new listings, which the seller then verifies and publishes.
* **AI Auto-Categorization (PRO Feature):** An AI agent automatically sorts incoming products into the correct segregated inventories.
* **Tiered Analytics System:** * *Normal Mode (Free):* Basic analysis of category performance, inventory health, demand, and costs.
* *Deep Mode (PRO):* In-depth, advanced analytics for both individual categories and the holistic overview dashboard.



## 3. Admin Features

* **System Governance:** The Admin dashboard must be holistically designed to monitor, manage, and govern all the complex customer and seller features listed above, ensuring platform health and tracking AI usage.

## 4. Authentication & System Architecture

* **Role Isolation:** Customers, Sellers, and Admins must have completely separate and distinct sign-in and sign-up portals.
* **Passwordless Admin Login:** The Admin route has no password field. It requires an email address, which triggers an OTP (One-Time Password) sent to that email, followed by a text CAPTCHA verification.
* **Accessibility-First Onboarding:** During Customer sign-up, the system explicitly asks if the user has a disability. If yes, it asks for the type, and dynamically alters the sign-up UI to accommodate them. For returning users, a "Special Sign-in" option adapts the login form based on their specific accessibility needs.