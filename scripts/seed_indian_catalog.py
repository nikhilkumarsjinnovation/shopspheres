import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://lzvvfbaswwxgfdvmqzod.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dnZmYmFzd3d4Z2Zkdm1xem9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDAwNzI3MSwiZXhwIjoyMTA1NTgzMjcxfQ.vnkz73OG4AO5uiBwRvFd8WC02jBmZp91B1UlLHBUL2k"

SELLER_ID = "c68c04f0-6e9b-4be9-8778-753ac720ac59"
CUSTOMER_ID = "f1ac9e3c-b5f0-4ea9-9b5e-7a76d60c3ff5"

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def api_request(path, method="GET", data=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code} on {method} {url}: {e.read().decode('utf-8')}")
        raise e

# 1. Update existing products with realistic INR prices
print("Updating existing products to INR prices...")
api_request("products?title=eq.apple+pro+max", method="PATCH", data={
    "title": "Apple iPhone 15 Pro Max (256 GB) - Natural Titanium",
    "price": 144900.0,
    "compare_at_price": 159900.0,
    "category": "Electronics",
    "sub_category": "Smartphones",
    "average_rating": 4.8,
    "review_count": 84,
    "stock": 14,
    "description": "Forged in titanium with innovative A17 Pro chip, customizable Action button, and 48MP main camera with 5x optical zoom telephoto lens. Includes 1-year Apple India warranty.",
    "image_urls": ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80"]
})

api_request("products?title=eq.poco+x4+pro+5g", method="PATCH", data={
    "title": "POCO X4 Pro 5G (Laser Blue, 128 GB) (6 GB RAM)",
    "price": 16999.0,
    "compare_at_price": 22999.0,
    "category": "Electronics",
    "sub_category": "Smartphones",
    "average_rating": 4.3,
    "review_count": 312,
    "stock": 25,
    "description": "120Hz Super AMOLED display, 64MP triple camera array, Snapdragon 695 5G processor with 67W Turbo Charge technology. Designed for fast everyday multitasking.",
    "image_urls": ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80"]
})

api_request("products?title=eq.Sony+TV", method="PATCH", data={
    "title": "Sony Bravia 139 cm (55 inches) 4K Ultra HD Smart LED Google TV",
    "price": 54990.0,
    "compare_at_price": 99900.0,
    "category": "Electronics",
    "sub_category": "Television & Audio",
    "average_rating": 4.7,
    "review_count": 194,
    "stock": 8,
    "description": "4K Processor X1 with Live Color technology, Dolby Audio 20 Watts Open Baffle Speaker, Google TV with voice search, and Apple AirPlay integration.",
    "image_urls": ["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80"]
})

# 2. Rich Indian Products to Insert
indian_products = [
    {
        "seller_id": SELLER_ID,
        "title": "OnePlus Nord CE4 5G (Dark Chrome, 8GB RAM, 128GB Storage)",
        "slug": "oneplus-nord-ce4-5g-dark-chrome",
        "description": "Qualcomm Snapdragon 7 Gen 3 processor, 100W SUPERVOOC fast charging, 5500 mAh battery, and 50MP Sony LYT-600 OIS camera. 120Hz AMOLED display with Aqua Touch.",
        "price": 19999.0,
        "compare_at_price": 24999.0,
        "category": "Electronics",
        "sub_category": "Smartphones",
        "stock": 35,
        "approval_status": "approved",
        "average_rating": 4.6,
        "review_count": 528,
        "tags": ["oneplus", "smartphone", "5g", "fast charging", "android", "mobile"],
        "attributes": {
            "brand": "OnePlus",
            "model": "CPH2613",
            "dimensions": "16.2 x 7.5 x 0.8 cm",
            "weight": "186 g",
            "battery": "5500 mAh",
            "camera": "50MP Sony LYT-600 OIS + 8MP Ultra-wide",
            "warranty": "1 Year Manufacturer Warranty for Device and 6 Months for in-box Accessories",
            "country_of_origin": "India"
        },
        "image_urls": [
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        "seller_id": SELLER_ID,
        "title": "boAt Rockerz 450 Bluetooth On Ear Headphones with Mic",
        "slug": "boat-rockerz-450-bluetooth-headphones",
        "description": "Up to 15 hours of continuous playback, 40mm dynamic audio drivers, adaptive plush ear cushions, and integrated controls with dual mode connectivity (Bluetooth & AUX).",
        "price": 1499.0,
        "compare_at_price": 3990.0,
        "category": "Audio & Accessories",
        "sub_category": "Headphones",
        "stock": 50,
        "approval_status": "approved",
        "average_rating": 4.4,
        "review_count": 1420,
        "tags": ["boat", "headphones", "bluetooth", "wireless", "audio", "bass"],
        "attributes": {
            "brand": "boAt",
            "model": "Rockerz 450",
            "color": "Luscious Black",
            "connectivity": "Bluetooth v5.0 / 3.5mm AUX",
            "battery_life": "15 Hours Playback",
            "driver_size": "40 mm",
            "warranty": "1 Year Warranty from Brand",
            "country_of_origin": "India"
        },
        "image_urls": [
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        "seller_id": SELLER_ID,
        "title": "Noise ColorFit Pulse 2 Max 1.85\" Display Smart Watch",
        "slug": "noise-colorfit-pulse-2-max",
        "description": "Massive 1.85-inch TFT LCD with 550 nits brightness, Bluetooth calling with Tru Sync technology, 100 sports modes, heart rate and SpO2 health tracking.",
        "price": 1299.0,
        "compare_at_price": 5999.0,
        "category": "Electronics",
        "sub_category": "Wearables",
        "stock": 40,
        "approval_status": "approved",
        "average_rating": 4.3,
        "review_count": 890,
        "tags": ["smartwatch", "noise", "fitness", "bluetooth calling", "wearable"],
        "attributes": {
            "brand": "Noise",
            "model": "ColorFit Pulse 2 Max",
            "display": "1.85 Inch TFT LCD 550 Nits",
            "battery": "10 Days Typical Usage",
            "water_resistance": "IP68 Water Resistant",
            "warranty": "1 Year Noise India Warranty",
            "country_of_origin": "India"
        },
        "image_urls": [
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        "seller_id": SELLER_ID,
        "title": "Prestige Iris Plus 750 Watt Mixer Grinder with 3 Stainless Steel Jars",
        "slug": "prestige-iris-plus-750w-mixer-grinder",
        "description": "Heavy-duty 750W motor with overload protector, 3 stainless steel multi-utility jars (1.5L wet jar, 1.0L dry jar, 300ml chutney jar), plus transparent juicer jar with blade.",
        "price": 3199.0,
        "compare_at_price": 6295.0,
        "category": "Home & Kitchen",
        "sub_category": "Kitchen Appliances",
        "stock": 20,
        "approval_status": "approved",
        "average_rating": 4.5,
        "review_count": 640,
        "tags": ["prestige", "mixer grinder", "kitchen", "juicer", "blender", "home"],
        "attributes": {
            "brand": "Prestige",
            "model": "Iris Plus",
            "wattage": "750 Watts",
            "jars": "4 Jars (3 Stainless Steel + 1 Juicer Jar)",
            "blade_material": "Stainless Steel Grade 304",
            "warranty": "2 Years Total Warranty",
            "country_of_origin": "India"
        },
        "image_urls": [
            "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        "seller_id": SELLER_ID,
        "title": "Hawkins Contura 3 Litre Hard Anodised Inner Lid Pressure Cooker",
        "slug": "hawkins-contura-3l-pressure-cooker",
        "description": "Hard anodised body absorbs heat faster and energy efficient, curved body for easy stirring of dal and curries, stays looking new for years. Non-reactive with food acid.",
        "price": 1780.0,
        "compare_at_price": 2150.0,
        "category": "Home & Kitchen",
        "sub_category": "Cookware",
        "stock": 30,
        "approval_status": "approved",
        "average_rating": 4.7,
        "review_count": 1120,
        "tags": ["hawkins", "cooker", "pressure cooker", "kitchen", "cookware"],
        "attributes": {
            "brand": "Hawkins",
            "capacity": "3 Litres",
            "material": "Hard Anodised Aluminium (Black)",
            "base_thickness": "3.25 mm",
            "lid_type": "Inner Lid Safety Seal",
            "warranty": "5 Years Hawkins Guarantee",
            "country_of_origin": "India"
        },
        "image_urls": [
            "https://images.unsplash.com/photo-1584990347449-399b646c24fa?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        "seller_id": SELLER_ID,
        "title": "FabIndia Men's Pure Cotton Lucknowi Chikankari Long Kurta",
        "slug": "fabindia-mens-chikankari-cotton-kurta",
        "description": "Handcrafted pure breathable cotton kurta featuring delicate Lucknowi Chikankari embroidery around the mandarin collar and placket. Ideal for festive pujas, weddings, and casual comfort.",
        "price": 2490.0,
        "compare_at_price": 3299.0,
        "category": "Fashion & Apparel",
        "sub_category": "Ethnic Wear",
        "stock": 18,
        "approval_status": "approved",
        "average_rating": 4.6,
        "review_count": 210,
        "tags": ["fabindia", "kurta", "ethnic", "chikankari", "cotton", "diwali", "festive"],
        "attributes": {
            "brand": "FabIndia",
            "fabric": "100% Breathable Fine Cotton",
            "pattern": "Hand Embroidered Chikankari",
            "collar": "Mandarin Collar",
            "sleeve": "Full Sleeve",
            "care_instructions": "Hand wash gently in cold water",
            "country_of_origin": "India"
        },
        "image_urls": [
            "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        "seller_id": SELLER_ID,
        "title": "Titan Karishma Analog Dial Classic Men's Watch",
        "slug": "titan-karishma-analog-mens-watch",
        "description": "Water resistant quartz movement timepiece from Titan India with clean black dial, durable silver stainless steel bracelet, and scratch-resistant mineral glass.",
        "price": 1995.0,
        "compare_at_price": 2595.0,
        "category": "Fashion & Apparel",
        "sub_category": "Watches",
        "stock": 22,
        "approval_status": "approved",
        "average_rating": 4.7,
        "review_count": 780,
        "tags": ["titan", "watch", "analog", "men", "accessories", "formal"],
        "attributes": {
            "brand": "Titan",
            "collection": "Karishma",
            "movement": "High Precision Quartz",
            "dial_color": "Classic Black",
            "case_material": "Brass with Stainless Steel Back",
            "warranty": "24 Months Manufacturer Warranty",
            "country_of_origin": "India"
        },
        "image_urls": [
            "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        "seller_id": SELLER_ID,
        "title": "Cadbury Celebrations Rich Dry Fruit Premium Chocolate Gift Box (450g)",
        "slug": "cadbury-celebrations-rich-dry-fruit-box",
        "description": "A delightful festive assortment of whole roasted almonds, cashews, and raisins coated in rich, velvety Cadbury Dairy Milk chocolate. The perfect festive gift for Diwali, birthdays, and celebrations.",
        "price": 449.0,
        "compare_at_price": 550.0,
        "category": "Gourmet & Groceries",
        "sub_category": "Festive Gifting",
        "stock": 60,
        "approval_status": "approved",
        "average_rating": 4.8,
        "review_count": 1820,
        "tags": ["cadbury", "chocolate", "celebrations", "gift box", "dry fruits", "sweets"],
        "attributes": {
            "brand": "Cadbury",
            "weight": "450 Grams",
            "ingredients": "Almonds, Cashews, Raisins, Cocoa Butter, Milk Solids",
            "diet_type": "Vegetarian",
            "shelf_life": "9 Months",
            "country_of_origin": "India"
        },
        "image_urls": [
            "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80"
        ]
    }
]

print("Inserting new Indian products...")
created_prods = api_request("products", method="POST", data=indian_products)
print(f"Successfully inserted {len(created_prods)} Indian marketplace products!")

# 3. Insert real verified reviews for the top products
print("Seeding verified customer reviews...")
if created_prods and len(created_prods) > 0:
    first_p = created_prods[0]
    sample_reviews = [
        {
            "product_id": first_p["id"],
            "customer_id": CUSTOMER_ID,
            "rating": 5,
            "title": "Superb phone, charges 0 to 100 in 30 mins!",
            "body": "Got this during local delivery within 24 hours. The battery backup easily lasts 1.5 days on heavy 5G usage. Camera quality is crisp even at night. Totally worth the ₹19,999 price tag!",
            "is_verified_purchase": True,
            "helpful_votes": 34
        },
        {
            "product_id": first_p["id"],
            "customer_id": SELLER_ID,
            "rating": 4,
            "title": "Value for money device in this budget",
            "body": "Display is very smooth with 120Hz. Haptics are good and no heating observed during BGMI gaming sessions. Recommended for students and professionals.",
            "is_verified_purchase": True,
            "helpful_votes": 12
        }
    ]
    api_request("product_reviews", method="POST", data=sample_reviews)
    print("Inserted verified customer reviews successfully!")

print("All done!")
