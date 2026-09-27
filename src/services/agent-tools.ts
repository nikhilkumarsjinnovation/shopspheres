/**
 * Gemini Function Calling Tool Declarations for ShopSphere Super Agent
 * Supported by gemini-flash-lite-latest and gemini-3.1-flash-lite
 */

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, {
      type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
}

export const SUPER_AGENT_TOOLS: { function_declarations: GeminiFunctionDeclaration[] }[] = [
  {
    function_declarations: [
      {
        name: 'search_catalog',
        description: 'Search products in the marketplace catalog with filters for category, price, keywords, and stock.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Search keywords, product title, brand, or attributes' },
            category: { type: 'STRING', description: 'Filter by department (e.g. Electronics, Fashion, Home & Kitchen, Gourmet Food, Beauty & Wellness, Festive & Handicrafts)' },
            max_price: { type: 'NUMBER', description: 'Maximum budget or price in INR' },
            min_price: { type: 'NUMBER', description: 'Minimum price in INR' },
            in_stock_only: { type: 'BOOLEAN', description: 'Only return items with available inventory' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_product_specs',
        description: 'Retrieve detailed technical specifications, dimensions, attributes, and stock for a specific product ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            product_id: { type: 'STRING', description: 'The unique UUID of the product' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'manage_cart',
        description: 'Add items to bag, remove items, update quantities, or view the customer cart.',
        parameters: {
          type: 'OBJECT',
          properties: {
            action: { type: 'STRING', enum: ['add', 'remove', 'update', 'clear', 'view'], description: 'Action to perform on the cart' },
            product_id: { type: 'STRING', description: 'Product UUID to add, update, or remove' },
            quantity: { type: 'NUMBER', description: 'Quantity (defaults to 1 for add)' },
          },
          required: ['action'],
        },
      },
      {
        name: 'manage_favorites',
        description: 'Manage customer wishlist and favorite products.',
        parameters: {
          type: 'OBJECT',
          properties: {
            action: { type: 'STRING', enum: ['add', 'remove', 'list'], description: 'Favorite action' },
            product_id: { type: 'STRING', description: 'Product UUID to add or remove' },
          },
          required: ['action'],
        },
      },
      {
        name: 'get_friends_list',
        description: 'Fetch the customer list of verified friends available for gifting.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'send_as_gift',
        description: 'Send a product as a gift parcel to a friend with optional gift wrapping and scheduled reveal.',
        parameters: {
          type: 'OBJECT',
          properties: {
            friend_email_or_name: { type: 'STRING', description: 'Friend email or display name' },
            product_id: { type: 'STRING', description: 'Product UUID to gift' },
            gift_message: { type: 'STRING', description: 'Personalized greeting card message' },
            reveal_date: { type: 'STRING', description: 'Scheduled surprise reveal date (YYYY-MM-DD)' },
          },
          required: ['friend_email_or_name', 'product_id'],
        },
      },
      {
        name: 'get_reviewable_products',
        description: 'List completed or delivered orders eligible for customer ratings and reviews.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'submit_product_review',
        description: 'Submit a verified review and 1-5 star rating for a purchased product.',
        parameters: {
          type: 'OBJECT',
          properties: {
            product_id: { type: 'STRING', description: 'The product UUID' },
            rating: { type: 'NUMBER', description: 'Star rating from 1 to 5' },
            title: { type: 'STRING', description: 'Review summary title' },
            comment: { type: 'STRING', description: 'Detailed feedback' },
          },
          required: ['product_id', 'rating', 'comment'],
        },
      },
      {
        name: 'get_wallet_status',
        description: 'Check current in-app wallet balance in INR and recent ledger credits/debits.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'topup_wallet',
        description: 'Add money or promo credit to the customer in-app wallet.',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', description: 'Amount in INR to top up (e.g. 500, 1000, 2500)' },
          },
          required: ['amount'],
        },
      },
      {
        name: 'prepare_wallet_checkout',
        description: 'Validate wallet balance for purchasing products, reserve inventory, create order tagged with placed_by: "agent", and generate a payment confirmation card for customer authorization.',
        parameters: {
          type: 'OBJECT',
          properties: {
            product_id: { type: 'STRING', description: 'Product UUID to buy now (or leaves empty to buy entire current cart)' },
            quantity: { type: 'NUMBER', description: 'Quantity (defaults to 1)' },
          },
        },
      },
      {
        name: 'confirm_wallet_payment',
        description: 'Execute atomic wallet debit and finalize order payment after customer approval.',
        parameters: {
          type: 'OBJECT',
          properties: {
            order_id: { type: 'STRING', description: 'The order UUID generated during prepare_wallet_checkout' },
            auth_token: { type: 'STRING', description: 'Confirmation token' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'cancel_or_replace_order',
        description: 'Cancel an order under the relaxed AI Agent policy with instant 100% wallet refund, and optionally replace it with another product.',
        parameters: {
          type: 'OBJECT',
          properties: {
            order_id: { type: 'STRING', description: 'The order UUID to cancel or replace' },
            action: { type: 'STRING', enum: ['cancel', 'replace'], description: 'Cancel order or replace with another product' },
            replacement_product_id: { type: 'STRING', description: 'New product UUID if replacing' },
          },
          required: ['order_id', 'action'],
        },
      },
    ],
  },
];
