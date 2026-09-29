To fetch 500 fake products dynamically using randomapi.dev https://randomapi.dev/docs without any API key, here are the exact
  URLs configured for the ShopSphere catalog, along with how to fetch and seed them into your project.                         
  ──────                                                                                                                       
  ### 1. The 500-Product API URLs (Mapped by ShopSphere Category)                                                              
                                                                                                                               
  randomapi.dev https://randomapi.dev/docs accepts up to 100 records per request, supports direct INR currency conversion,     
  price ranges, deterministic seeds, and unwrap=true (which strips the envelope and returns the raw array).                    
                                                                                                                               
  To cover the 6 ShopSphere categories evenly across 500 products (with 80–90 products per category), here are the exact       
  endpoints:                                                                                                                   
                                                                                                                               
   Category            │ Count │ Category Pa… │ Price Range (₹)  │ Direct Seed URL
  ─────────────────────┼───────┼──────────────┼──────────────────┼─────────────────────────────────────────────────────────────
   Electronics         │  90   │ electronics  │ ₹1,000 – ₹95,000 │ https://randomapi.dev/api/products?count=90&category=electr
                       │       │              │                  │ onics&currency=INR&minPrice=1000&maxPrice=95000&seed=101&un
                       │       │              │                  │ wrap=true[1]
   Fashion & Apparel   │  85   │ clothing     │ ₹499 – ₹12,999   │ https://randomapi.dev/api/products?count=85&category=clothi
                       │       │              │                  │ ng&currency=INR&minPrice=499&maxPrice=12999&seed=202&unwrap
                       │       │              │                  │ =true[2]
   Home & Kitchen      │  85   │ home         │ ₹699 – ₹35,000   │ https://randomapi.dev/api/products?count=85&category=home&c
                       │       │              │                  │ urrency=INR&minPrice=699&maxPrice=35000&seed=303&unwrap=tru
                       │       │              │                  │ e[3]
   Groceries & Gourmet │  80   │ food         │ ₹99 – ₹4,500     │ https://randomapi.dev/api/products?count=80&category=food&c
                       │       │              │                  │ urrency=INR&minPrice=99&maxPrice=4500&seed=404&unwrap=true[
                       │       │              │                  │ 4]
   Health & Beauty     │  80   │ beauty       │ ₹299 – ₹8,999    │ https://randomapi.dev/api/products?count=80&category=beauty
                       │       │              │                  │ &currency=INR&minPrice=299&maxPrice=8999&seed=505&unwrap=tr
                       │       │              │                  │ ue[5]
   Sports & Outdoors   │  80   │ sports       │ ₹399 – ₹24,999   │ https://randomapi.dev/api/products?count=80&category=sports
                       │       │              │                  │ &currency=INR&minPrice=399&maxPrice=24999&seed=606&unwrap=t
                       │       │              │                  │ rue[6]
   Total               │  500  │              │                  │                                                             
                                                                                                                               
  [1]: https://randomapi.                                                                                                      
  dev/api/products?count=90&category=electronics&currency=INR&minPrice=1000&maxPrice=95000&seed=101&unwrap=true                
  [2]: https://randomapi.                                                                                                      
  dev/api/products?count=85&category=clothing&currency=INR&minPrice=499&maxPrice=12999&seed=202&unwrap=true                    
  [3]: https://randomapi.dev/api/products?count=85&category=home&currency=INR&minPrice=699&maxPrice=35000&seed=303&unwrap=true 
  [4]: https://randomapi.dev/api/products?count=80&category=food&currency=INR&minPrice=99&maxPrice=4500&seed=404&unwrap=true h…
  [5]: https://randomapi.dev/api/products?count=80&category=beauty&currency=INR&minPrice=299&maxPrice=8999&seed=505&unwrap=true
  [6]: https://randomapi.                                                                                                      
  dev/api/products?count=80&category=sports&currency=INR&minPrice=399&maxPrice=24999&seed=606&unwrap=true                      
  ──────                                                                                                                       
  ### 2. Single 5-in-1 Combined Fetch (5 x 100 = 500)                                                                          
                                                                                                                               
  If you prefer fetching all 500 products as a general mix across all categories:                                              
                                                                                                                               
  1. https://randomapi.dev/api/products?count=100¤cy=INR&minPrice=299&maxPrice=49999&seed=1001&unwrap=true https://randomapi.  
  dev/api/products?count=100&currency=INR&minPrice=299&maxPrice=49999&seed=1001&unwrap=true                                    
  2. https://randomapi.dev/api/products?count=100¤cy=INR&minPrice=299&maxPrice=49999&seed=1002&unwrap=true https://randomapi.  
  dev/api/products?count=100&currency=INR&minPrice=299&maxPrice=49999&seed=1002&unwrap=true                                    
  3. https://randomapi.dev/api/products?count=100¤cy=INR&minPrice=299&maxPrice=49999&seed=1003&unwrap=true https://randomapi.  
  dev/api/products?count=100&currency=INR&minPrice=299&maxPrice=49999&seed=1003&unwrap=true                                    
  4. https://randomapi.dev/api/products?count=100¤cy=INR&minPrice=299&maxPrice=49999&seed=1004&unwrap=true https://randomapi.  
  dev/api/products?count=100&currency=INR&minPrice=299&maxPrice=49999&seed=1004&unwrap=true                                    
  5. https://randomapi.dev/api/products?count=100¤cy=INR&minPrice=299&maxPrice=49999&seed=1005&unwrap=true https://randomapi.  
  dev/api/products?count=100&currency=INR&minPrice=299&maxPrice=49999&seed=1005&unwrap=true                                    
  ──────                                                                                                                       
  ### 3. Quick Node.js Script to Generate seed-500.sql Automatically                                                           
                                                                                                                               
  If you want a one-command script that hits these endpoints, transforms each product into ShopSphere's exact database schema  
  (with appropriate category IDs, shop IDs, seller IDs, tags, and JSON attributes), and outputs seed-500.sql:                  
                                                                                                                               
    // generate_seed_500.mjs                                                                                                   
    import fs from 'fs';                                                                                                       
                                                                                                                               
    const CATEGORY_MAPPINGS = [                                                                                                
      {                                                                                                                        
        categoryParam: 'electronics',                                                                                          
        count: 90,                                                                                                             
        minPrice: 1000,                                                                                                        
        maxPrice: 95000,                                                                                                       
        seed: 101,                                                                                                             
        categoryName: 'Electronics',                                                                                           
        categoryId: '9ffc65df-5afe-4341-bed9-406ad725aad3',                                                                    
        shopId: '8f48e4ad-6a7b-401d-848f-e09642bf8809', // NovaTech Electronics                                                
        sellerId: '04d16d3e-7e12-4cd4-a08a-3fe90cd4cc54'                                                                       
      },                                                                                                                       
      {                                                                                                                        
        categoryParam: 'clothing',                                                                                             
        count: 85,                                                                                                             
        minPrice: 499,                                                                                                         
        maxPrice: 12999,                                                                                                       
        seed: 202,                                                                                                             
        categoryName: 'Fashion & Apparel',                                                                                     
        categoryId: 'bf9d4b5c-299f-43d6-85f5-1b0f1f90d051',                                                                    
        shopId: '2de9a408-7bf9-4feb-acf7-0741d0d6cae0', // Vastram Ethnic Couture                                              
        sellerId: 'c8c9e0f0-a94b-456a-a6a3-52eb52985e5a'                                                                       
      },                                                                                                                       
      {                                                                                                                        
        categoryParam: 'home',                                                                                                 
        count: 85,                                                                                                             
        minPrice: 699,                                                                                                         
        maxPrice: 35000,                                                                                                       
        seed: 303,                                                                                                             
        categoryName: 'Home & Kitchen',                                                                                        
        categoryId: '5b318d22-09ad-492b-8a23-96860fab8b0a',                                                                    
        shopId: 'bb77f45e-bca8-4999-b393-b5079e7c2703', // RasoiCraft                                                          
        sellerId: 'b6bf5b4b-e3a9-4e4b-b419-301a60632e91'                                                                       
      },                                                                                                                       
      {                                                                                                                        
        categoryParam: 'food',                                                                                                 
        count: 80,                                                                                                             
        minPrice: 99,                                                                                                          
        maxPrice: 4500,                                                                                                        
        seed: 404,                                                                                                             
        categoryName: 'Groceries & Gourmet',                                                                                   
        categoryId: 'eafeef0e-64c7-41d8-9383-12d827dac696',                                                                    
        shopId: '0b3f7f27-6c74-4f21-89a3-acde650b9d56', // Malabar Spice                                                       
        sellerId: '971ec7f0-bab3-4115-84fe-5bf0d5582067'                                                                       
      },                                                                                                                       
      {                                                                                                                        
        categoryParam: 'beauty',                                                                                               
        count: 80,                                                                                                             
        minPrice: 299,                                                                                                         
        maxPrice: 8999,                                                                                                        
        seed: 505,                                                                                                             
        categoryName: 'Health & Beauty',                                                                                       
        categoryId: '884de381-1dd9-4959-8b50-64a9eb60ec5d',                                                                    
        shopId: '77988c0c-44cf-431d-8cb4-9d2958412b25', // AyurVeda Botanicals                                                 
        sellerId: 'b156c626-d65e-47be-b35e-0963eddf947f'                                                                       
      },                                                                                                                       
      {                                                                                                                        
        categoryParam: 'sports',                                                                                               
        count: 80,                                                                                                             
        minPrice: 399,                                                                                                         
        maxPrice: 24999,                                                                                                       
        seed: 606,                                                                                                             
        categoryName: 'Sports & Outdoors',                                                                                     
        categoryId: '8e8fdedb-3988-45b7-88d9-296b7ba3fc68',                                                                    
        shopId: 'a69b638a-b348-430f-8d12-d71233424acc', // Shikhar Sports                                                      
        sellerId: '594806e7-598f-4a1c-a279-5396a23f0878'                                                                       
      }                                                                                                                        
    ];                                                                                                                         
                                                                                                                               
    async function generate() {                                                                                                
      const sqlStatements = ['-- ShopSphere 500 Product Seed Generated via randomapi.dev\n'];                                  
      let index = 1;                                                                                                           
                                                                                                                               
      for (const group of CATEGORY_MAPPINGS) {                                                                                 
        const url = `https://randomapi.dev/api/products?count=${group.count}&category=${group.                                 
  categoryParam}&currency=INR&minPrice=${group.minPrice}&maxPrice=${group.maxPrice}&seed=${group.seed}&unwrap=true`;           
        console.log(`Fetching ${group.count} products for ${group.categoryName}...`);                                          
        const res = await fetch(url);                                                                                          
        const items = await res.json();                                                                                        
                                                                                                                               
        for (const item of items) {                                                                                            
          const slug = `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index++}`;                                    
          const comparePrice = (item.price * 1.15).toFixed(2);                                                                 
          const stock = Math.floor(Math.random() * 50) + 10;                                                                   
          const reviewCount = Math.floor(Math.random() * 200) + 15;                                                            
          const cleanDesc = item.description.replace(/'/g, "''");                                                              
          const cleanTitle = item.name.replace(/'/g, "''");                                                                    
                                                                                                                               
          sqlStatements.push(`                                                                                                 
    INSERT INTO public.products (                                                                                              
      seller_id, shop_id, category_id, title, slug, description,                                                               
      price, compare_at_price, stock, condition, category,                                                                     
      tags, image_urls, attributes, approval_status, average_rating, review_count, ai_categorized                              
    ) VALUES (                                                                                                                 
      '${group.sellerId}',                                                                                                     
      '${group.shopId}',                                                                                                       
      '${group.categoryId}',                                                                                                   
      '${cleanTitle}',                                                                                                         
      '${slug}',                                                                                                               
      '${cleanDesc}',                                                                                                          
      ${item.price.toFixed(2)},                                                                                                
      ${comparePrice},                                                                                                         
      ${stock},                                                                                                                
      'New',
      '${group.categoryName}',
      ARRAY['${group.categoryParam}', 'bestseller', 'verified'],
      ARRAY['${item.imageUrl}'],
      '{"brand": "ShopSphere Select", "sku": "${item.sku}", "ean13": "${item.ean13}"}'::jsonb,
      'approved',
      ${item.rating.toFixed(2)},
      ${reviewCount},
      FALSE
    );`);
        }
      }
  
      fs.writeFileSync('seed-500.sql', sqlStatements.join('\n'));
      console.log(`✅ Successfully generated seed-500.sql with ${index - 1} products!`);
    }
  
    generate();