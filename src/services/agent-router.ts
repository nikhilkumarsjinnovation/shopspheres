/**
 * ShopSphere Customer AI Agent — Question Router & Intent Classification
 * 
 * Inspired by the Governed Architecture Pattern:
 * 1. Two-Path Routing: Numeric/Governed Query vs Qualitative Narrative vs Blended vs Action Task.
 * 2. Default-Safe: Ambiguous queries route to clarification or governed lookup rather than guessing.
 * 3. Proactive Cross-Questioning: Detects underspecified prompts, slot deficits, and ambiguity,
 *    prompting the customer with smart follow-up questions and 1-tap quick replies.
 * 4. Mode-Aware: Differentiates between 'chat' (conversational guide) and 'agent' (autonomous task execution).
 */

export type AgentInteractionMode = 'chat' | 'agent';

export type RouterIntentType = 
  | 'governed_query'    // Numeric, price bounds, wallet balance, order tracking, exact specs
  | 'qualitative'       // Shopping advice, fashion matching, reviews overview, policy Q&A
  | 'blended'           // Mixed: product comparisons with verified specs + editorial rationale
  | 'action_task'       // Mutations: Cart add/remove, 1-tap checkout, topup, gift, order cancel
  | 'clarification';    // Underspecified, ambiguous, or missing required parameters

export interface StructuredIntent {
  intent_type: RouterIntentType;
  mode: AgentInteractionMode;
  target_entity: 'product' | 'category' | 'cart' | 'wallet' | 'order' | 'favorites' | 'gift' | 'review' | 'general';
  category: string | null;
  price_range: {
    min?: number;
    max?: number;
  };
  keywords: string[];
  raw_query: string;
  confidence: number;
  needs_clarification: boolean;
  clarification_reasons: string[];
  clarification_question?: string;
  suggested_quick_replies: string[];
  action_requires_agent_mode: boolean;
  selected_product_title?: string | null;
  recipient_email?: string | null;
  gift_message?: string | null;
}

const CATEGORY_MAP: Record<string, string[]> = {
  'Electronics': ['phone', 'phones', 'mobile', 'smartphone', 'smartphones', 'laptop', 'laptops', 'tablet', 'gadget', 'charger', 'powerbank', 'electronics'],
  'Audio & Accessories': ['audio', 'earbud', 'earbuds', 'headphone', 'headphones', 'earphone', 'earphones', 'speaker', 'soundbar', 'anc'],
  'Fashion & Apparel': ['fashion', 'cloth', 'clothes', 'clothing', 'shirt', 'shirts', 'tshirt', 'kurta', 'kurtas', 'saree', 'sarees', 'dress', 'jeans', 'apparel', 'blazer', 'jacket', 'trousers'],
  'Footwear': ['shoe', 'shoes', 'sneaker', 'sneakers', 'boot', 'boots', 'sandals', 'footwear', 'loafers', 'slippers'],
  'Home & Kitchen': ['home', 'kitchen', 'cooker', 'pan', 'mixer', 'blender', 'appliance', 'bedsheet', 'towel', 'decor', 'bottle', 'flask'],
  'Health & Beauty': ['beauty', 'skincare', 'makeup', 'cream', 'serum', 'lotion', 'wellness', 'shampoo', 'sunscreen', 'perfume', 'perfumes', 'fragrance', 'cosmetics'],
  'Gourmet & Groceries': ['grocery', 'food', 'tea', 'coffee', 'snack', 'snacks', 'spice', 'spices', 'chocolate', 'sweets', 'organic', 'hamper', 'hampers'],
  'Sports & Outdoors': ['sport', 'sports', 'fitness', 'gym', 'exercise', 'yoga', 'badminton', 'racket', 'dumbbell', 'outdoors'],
};

// Realistic minimum entry price per category in India (₹) to catch absurd bounds
const CATEGORY_MIN_PRICES: Record<string, number> = {
  'Electronics': 5000,
  'Audio & Accessories': 499,
  'Fashion & Apparel': 399,
  'Footwear': 599,
  'Home & Kitchen': 299,
  'Health & Beauty': 199,
  'Gourmet & Groceries': 99,
  'Sports & Outdoors': 349,
};

// Item-specific minimum entry thresholds (₹) to catch unrealistic expectations
const ITEM_MIN_PRICES: Record<string, { price: number; name: string }> = {
  laptop: { price: 18000, name: 'Laptops' },
  laptops: { price: 18000, name: 'Laptops' },
  macbook: { price: 50000, name: 'MacBooks' },
  tv: { price: 10000, name: 'Televisions' },
  television: { price: 10000, name: 'Televisions' },
  smartphone: { price: 5000, name: 'Smartphones' },
  smartphones: { price: 5000, name: 'Smartphones' },
  iphone: { price: 35000, name: 'iPhones' },
  smartwatch: { price: 999, name: 'Smartwatches' },
  refrigerator: { price: 12000, name: 'Refrigerators' },
  ac: { price: 20000, name: 'Air Conditioners' },
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s₹]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractPriceConstraint(text: string): { min?: number; max?: number } {
  const norm = text.toLowerCase();
  let max: number | undefined;
  let min: number | undefined;

  // Under / below / max / less than ₹X or X
  const underMatch = norm.match(/(?:under|below|less\s+than|max|budget|within|upto|up\s+to)\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:,[0-9]+)?)/i);
  if (underMatch) {
    const val = parseInt(underMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(val) && val > 0) max = val;
  }

  // Above / more than / min ₹X
  const aboveMatch = norm.match(/(?:above|more\s+than|min|at\s+least|starting\s+from)\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:,[0-9]+)?)/i);
  if (aboveMatch) {
    const val = parseInt(aboveMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(val) && val > 0) min = val;
  }

  // Range: between X and Y
  const rangeMatch = norm.match(/(?:between)\s*(?:rs\.?|inr|₹)?\s*([0-9]+)\s*(?:and|to|-)\s*(?:rs\.?|inr|₹)?\s*([0-9]+)/i);
  if (rangeMatch) {
    const val1 = parseInt(rangeMatch[1], 10);
    const val2 = parseInt(rangeMatch[2], 10);
    if (!isNaN(val1) && !isNaN(val2)) {
      min = Math.min(val1, val2);
      max = Math.max(val1, val2);
    }
  }

  return { min, max };
}

function detectCategory(tokens: string[]): string | null {
  for (const token of tokens) {
    for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
      if (keywords.includes(token)) {
        return cat;
      }
    }
  }
  return null;
}

/**
 * Question Router: Evaluates intent, mode boundaries, and clarifies ambiguities.
 */
export function routeUserQuestion(
  message: string,
  mode: AgentInteractionMode = 'agent',
  context: {
    userId?: string | null;
    previousCategory?: string | null;
    previousProductId?: string | null;
    previousIntent?: StructuredIntent | null;
    recentTurns?: Array<{ role: string; content: string }>;
  } = {}
): StructuredIntent {
  const norm = normalizeText(message);
  const words = norm.split(' ').filter((w) => w.length > 1);
  const price = extractPriceConstraint(message);
  let detectedCat = detectCategory(words) || context.previousCategory || context.previousIntent?.category || null;

  // Smart female/women gift category preference if not explicitly specified
  if (!detectedCat && /\b(female|women|woman|girl|sister|mother|mom|wife|girlfriend)\b/i.test(norm)) {
    detectedCat = 'Health & Beauty';
  }

  // -------------------------------------------------------------
  // Context History Analysis
  // -------------------------------------------------------------
  const recentTurns = context.recentTurns || [];
  let historyEmail: string | null = null;
  let lastAssistantAskedConfirmation = false;
  let historyHasProduct = false;

  if (recentTurns.length > 0) {
    const historyText = recentTurns.map((t) => t.content).join(' ');
    const emailMatch = historyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      historyEmail = emailMatch[0];
    }

    const lastAssistantTurn = [...recentTurns].reverse().find((t) => t.role === 'assistant' || t.role === 'model');
    if (lastAssistantTurn?.content) {
      lastAssistantAskedConfirmation = /\b(shall i (?:go ahead and )?send|ready to send|send this gift for you|confirm.*send|shall i (?:proceed|place)|confirm payment|authorize)\b/i.test(lastAssistantTurn.content);
    }

    if (/\b(bella vita|perfume|watch|shoes|titan|noise|headphone|bag|jacket)\b/i.test(historyText)) {
      historyHasProduct = true;
    }
  }

  // Extract recipient email from current message, recent turns, or previous intent
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const currentEmailMatch = message.match(emailRegex);
  const resolvedEmail = currentEmailMatch
    ? currentEmailMatch[0]
    : (historyEmail || context.previousIntent?.recipient_email || null);

  // Extract selected product from message, history, or previous intent
  let resolvedProductTitle: string | null = null;
  const productPatterns = [
    /\b(bella vita(?: luxury)?(?: perfume)?(?: gift set)?)\b/i,
    /\b(wow (?:skin science )?conditioner|wow conditioner)\b/i,
    /\b(titan karishma|titan skinn|titan watch)\b/i,
    /\b(noise colorfit|noise watch)\b/i,
    /\b(beardo godfather|beardo)\b/i,
    /\b(cadbury celebrations|cadbury)\b/i,
  ];

  const fullConversationContext = message + ' ' + (recentTurns.map(t => t.content).join(' '));
  for (const pat of productPatterns) {
    const m = fullConversationContext.match(pat);
    if (m) {
      resolvedProductTitle = m[0];
      break;
    }
  }
  if (!resolvedProductTitle) {
    resolvedProductTitle = context.previousIntent?.selected_product_title || null;
  }

  // Extract gift greeting message if present
  let resolvedGiftMessage: string | null = null;
  const msgMatch = fullConversationContext.match(/(?:happy birthday[^.!\n]*|happy anniversary[^.!\n]*|best wishes[^.!\n]*|congratulations[^.!\n]*)/i);
  if (msgMatch) {
    resolvedGiftMessage = msgMatch[0].trim();
  }
  if (!resolvedGiftMessage && context.previousIntent?.gift_message) {
    resolvedGiftMessage = context.previousIntent.gift_message;
  }
  if (!resolvedGiftMessage && (norm.includes('birthday') || norm.includes('anniversary') || norm.includes('congratulations') || norm.includes('best wishes') || norm.includes('cheers'))) {
    resolvedGiftMessage = message.trim();
  }

  // Action Triggers
  const isPurchaseIntent = /\b(buy|purchase|order|checkout|pay)\b/i.test(norm);
  const isCartIntent = /\b(cart|bag|add to cart|remove from cart|clear cart)\b/i.test(norm);
  const isWalletIntent = /\b(wallet|balance|topup|top up|funds|deposit)\b/i.test(norm);
  const isFavoritesIntent = /\b(favorite|favorites|wishlist|bookmark|save item|saved)\b/i.test(norm);
  const isGiftingIntent = /\b(gift|surprise|gifting|present for|send to friend)\b/i.test(norm);
  const isReviewIntent = /\b(review|rate|rating|feedback|stars)\b/i.test(norm);
  const isCancelIntent = /\b(cancel|replace|return|refund)\b/i.test(norm);
  const isComparison = /\b(compare|versus|vs|better than|difference between)\b/i.test(norm);
  const isNumericQuery = /\b(how much|price|cost|how many|in stock|specifications|specs|battery|discount|rating)\b/i.test(norm);

  // Affirmative confirmations: e.g. "yes, you can send this as gift to her", "yes", "proceed", "go ahead"
  const isAffirmative = /\b(yes|yeah|yep|sure|ok|okay|confirm|proceed|go ahead|send it|do it|you can send|send this)\b/i.test(norm);
  const isConfirmingGiftWithHistory = isAffirmative && (
    Boolean(resolvedEmail) ||
    Boolean(resolvedProductTitle) ||
    lastAssistantAskedConfirmation ||
    context.previousIntent?.target_entity === 'gift'
  );

  // Exploratory gifting: user asks for suggestions/ideas/recommendations (e.g. "i want to gift something to my female friend, can you suggest some thisn")
  const isExploratoryGift = isGiftingIntent && (
    /\b(suggest|recommend|ideas?|what (?:should|can|to)|options?|options|help me (?:choose|find)|show me|looking for|something for|something to)\b/i.test(message) ||
    /\b(suggest|recommend|ideas?)\b/i.test(norm)
  );

  // Check if user is asking to execute an action while in 'chat' mode
  const isActionVerb = (isPurchaseIntent && !isExploratoryGift) || isCartIntent || (isWalletIntent && /\b(topup|pay|deposit)\b/i.test(norm)) || isCancelIntent || (isGiftingIntent && !isExploratoryGift);
  const actionRequiresAgentMode = mode === 'chat' && isActionVerb;

  // -------------------------------------------------------------
  // Smart Clarification & Cross-Questioning Detection
  // -------------------------------------------------------------
  let needsClarification = false;
  const clarificationReasons: string[] = [];
  let clarificationQuestion: string | undefined;
  let suggestedQuickReplies: string[] = [];

  // Case 1: Ultra-short or single vague category/product keyword
  const vagueKeywords = ['phone', 'mobile', 'shoes', 'shoe', 'cloth', 'clothes', 'watch', 'watches', 'laptop', 'gift', 'product', 'items', 'something'];
  const isSingleVagueKeyword = words.length <= 2 && words.some((w) => vagueKeywords.includes(w));

  if (isSingleVagueKeyword && !price.max && !price.min) {
    needsClarification = true;
    const kw = words.find((w) => vagueKeywords.includes(w)) || words[0];

    if (kw.includes('phone') || kw.includes('mobile')) {
      clarificationReasons.push('Missing budget ceiling and preferred feature/brand for smartphones');
      clarificationQuestion = `I can help you find the best smartphone! What budget range do you have in mind, or do you have a specific priority?`;
      suggestedQuickReplies = ['📱 Under ₹15,000', '⚡ ₹15,000 - ₹30,000', '👑 Flagship (₹30,000+)', '📸 Best Camera', '🔋 6000mAh Battery'];
    } else if (kw.includes('shoe')) {
      clarificationReasons.push('Missing shoe style and budget preference');
      clarificationQuestion = `I'd love to help you find great footwear! What style are you looking for?`;
      suggestedQuickReplies = ['👟 Casual Sneakers', '🏃 Running & Sports', '👞 Formal Shoes', '💰 Under ₹2,000', '⭐ Top Rated'];
    } else if (kw.includes('watch')) {
      clarificationReasons.push('Ambiguity between Bluetooth smartwatches and classic formal watches');
      clarificationQuestion = `Are you looking for a modern smartwatch with health tracking, or a classic analog watch?`;
      suggestedQuickReplies = ['⌚ Bluetooth Smartwatch', '🕰️ Classic Analog Watch', '💰 Under ₹2,500', '🏊 Waterproof Fitness'];
    } else if (kw.includes('gift')) {
      clarificationReasons.push('Missing gift recipient and occasion parameters');
      clarificationQuestion = `Surprise gifting is fun! Who are you looking to surprise and what is your desired price range?`;
      suggestedQuickReplies = ['🎁 For a Friend', '🎂 Birthday Gift', '💝 Under ₹1,500', '✨ Premium Surprise'];
    } else {
      clarificationReasons.push('Broad category with no filters');
      clarificationQuestion = `What specific type or price range are you interested in for ${kw}?`;
      suggestedQuickReplies = ['💰 Under ₹1,000', '💰 Under ₹3,000', '⭐ Top Rated', '🔥 Latest Arrivals'];
    }
  }

  // Case 2: Unrealistic price constraints (e.g. "Laptop under ₹5,000")
  let itemMatch: { price: number; name: string } | undefined;
  for (const w of words) {
    if (ITEM_MIN_PRICES[w]) {
      itemMatch = ITEM_MIN_PRICES[w];
      break;
    }
  }

  const minEntry = itemMatch?.price ?? (detectedCat ? CATEGORY_MIN_PRICES[detectedCat] : undefined);
  const minEntryName = itemMatch?.name ?? detectedCat;

  if (minEntryName && minEntry && price.max) {
    if (price.max < minEntry) {
      needsClarification = true;
      clarificationReasons.push(`Requested budget ₹${price.max.toLocaleString('en-IN')} is below the minimum entry price for ${minEntryName} (₹${minEntry.toLocaleString('en-IN')})`);
      clarificationQuestion = `Verified ${minEntryName} in our catalog start from ₹${minEntry.toLocaleString('en-IN')}. Would you like to view entry-tier models or explore related accessories in your budget?`;
      suggestedQuickReplies = [
        `🔍 Show entry models (~₹${minEntry.toLocaleString('en-IN')})`,
        `💡 Show accessories under ₹${price.max.toLocaleString('en-IN')}`,
        `💰 Adjust budget to ₹${Math.round(minEntry * 1.2).toLocaleString('en-IN')}`,
      ];
    }
  }

  // Case 3: Action Intent without subject (e.g. user says "buy it", "add to cart", "purchase" without specifying what)
  if (isPurchaseIntent && words.length <= 4 && !context.previousProductId && !historyHasProduct && !resolvedProductTitle && !norm.includes('cart') && !isAffirmative) {
    needsClarification = true;
    clarificationReasons.push('Purchase intent lacks target item identifier or previous context');
    clarificationQuestion = `Which product would you like to purchase? You can tell me the product name, or ask me to search our catalog first.`;
    suggestedQuickReplies = ['🔍 Search Catalog', '🛍️ View Active Bag', '💳 Check Wallet Balance'];
  }

  // Case 4: Ambiguous cancellation
  if (isCancelIntent && words.length <= 3) {
    needsClarification = true;
    clarificationReasons.push('Order cancellation lacks order ID reference');
    clarificationQuestion = `I can help cancel or replace an order with an instant 100% wallet refund. Which order would you like to cancel?`;
    suggestedQuickReplies = ['📦 Show Recent Orders', 'ℹ️ Explain Agent Return Policy', '💬 Speak to Support'];
  }

  // Case 5: Gifting with Ambiguous Recipient
  if (isGiftingIntent) {
    if (isExploratoryGift) {
      // User is asking for gift recommendations/ideas! DO NOT ask for recipient yet.
    } else if (isAffirmative || isConfirmingGiftWithHistory) {
      // User is confirming sending a gift! DO NOT ask for recipient!
    } else {
      const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(message);
      const vagueWords = ['him', 'her', 'them', 'friend', 'someone', 'bestie', 'colleague', 'cousin', 'brother', 'sister', 'mom', 'dad'];
      const hasVaguePronoun = words.some((w) => vagueWords.includes(w));
      
      const namedRecipient = message.match(/(?:to|for)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[A-Z][a-zA-Z]{2,})/);
      const hasClearRecipient = Boolean(hasEmail || (namedRecipient && !vagueWords.includes(namedRecipient[1].toLowerCase())));

      const recipientKnown = Boolean(resolvedEmail);

      if (!recipientKnown && (hasVaguePronoun || !hasClearRecipient)) {
        needsClarification = true;
        clarificationReasons.push('Gifting request lacks a specific recipient name or verified email address');
        clarificationQuestion = `Who would you like to send this surprise gift to? Please specify their name or email address:`;
        suggestedQuickReplies = ['🎁 Choose from Saved Friends', '✉️ Enter Friend\'s Email', '📦 Add to Cart First'];
      }
    }
  }

  // Determine intent type based on features
  let intentType: RouterIntentType = 'governed_query';

  if (needsClarification) {
    intentType = 'clarification';
  } else if (isConfirmingGiftWithHistory) {
    intentType = 'action_task';
  } else if (resolvedEmail && resolvedProductTitle && (isGiftingIntent || isAffirmative || Boolean(resolvedGiftMessage))) {
    // Both product and recipient are known! This is an executable gift action task!
    intentType = 'action_task';
  } else if (isExploratoryGift) {
    intentType = 'governed_query';
  } else if (isActionVerb && mode === 'agent') {
    intentType = 'action_task';
  } else if (isComparison) {
    intentType = 'blended';
  } else if (isNumericQuery || price.max || price.min || isWalletIntent) {
    intentType = 'governed_query';
  } else if (/\b(recommend|suggest|how to|why|style|outfit|opinion|help me choose)\b/i.test(norm)) {
    intentType = 'qualitative';
  } else {
    // Default-deny: route to governed query for safety
    intentType = 'governed_query';
  }

  // Target Entity Resolution
  let targetEntity: StructuredIntent['target_entity'] = 'product';
  if (isWalletIntent) targetEntity = 'wallet';
  else if (isCartIntent) targetEntity = 'cart';
  else if (isFavoritesIntent) targetEntity = 'favorites';
  else if (isCancelIntent) targetEntity = 'order';
  else if (isConfirmingGiftWithHistory || (resolvedEmail && resolvedProductTitle) || (isGiftingIntent && !isExploratoryGift)) targetEntity = 'gift';
  else if (isReviewIntent) targetEntity = 'review';
  else if (detectedCat && !words.some((w) => ['buy', 'order', 'specs'].includes(w))) targetEntity = 'category';

  // Keyword extraction: for exploratory gifts, boost helpful gift search terms
  let extractedKeywords = words.filter((w) => w.length > 3).slice(0, 5);
  if (isExploratoryGift && extractedKeywords.length === 0) {
    extractedKeywords = ['gift', 'luxury', 'perfume'];
  } else if (isExploratoryGift && !extractedKeywords.includes('gift')) {
    extractedKeywords.unshift('gift');
  }

  return {
    intent_type: intentType,
    mode,
    target_entity: targetEntity,
    category: detectedCat,
    price_range: price,
    keywords: extractedKeywords,
    raw_query: message,
    confidence: needsClarification ? 0.65 : 0.95,
    needs_clarification: needsClarification,
    clarification_reasons: clarificationReasons,
    clarification_question: clarificationQuestion,
    suggested_quick_replies: suggestedQuickReplies,
    action_requires_agent_mode: actionRequiresAgentMode,
    selected_product_title: resolvedProductTitle,
    recipient_email: resolvedEmail,
    gift_message: resolvedGiftMessage,
  };
}
