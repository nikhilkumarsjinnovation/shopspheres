import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { feedWeightsToJson, parseFeedWeights, type FeedWeights } from '@/lib/feed-weights';
import { sanitizeInput } from '@/lib/prompt-templates';
import { generateEmbedding } from '@/lib/embeddings';
import { resolvePersona } from '@/lib/personas';
import type { Database, Json } from '@/types/database.types';
import { SUPER_AGENT_TOOLS } from '@/services/agent-tools';
import { executeAgentTool, type AgentExecutionResult } from '@/services/agent-executor';
import { getWallet } from '@/services/wallet-service';
import { getFavorites } from '@/services/favorites-service';

export interface AiSuperAgentOutput {
  reply: string;
  recommendedProductIds: string[];
  recommendedProducts?: any[];
  extractedIntents: {
    category: string | null;
    keywords: string[];
    priceMax: number | null;
    sentiment?: string;
  };
  clientActions?: Array<{
    type: 'CART_SYNC' | 'FAVORITES_SYNC' | 'WALLET_SYNC' | 'CART_CLEAR';
    payload: any;
  }>;
  actionCards?: Array<{
    type: string;
    data: any;
  }>;
  toolExecutions?: Array<{
    toolName: string;
    args: any;
    output: any;
  }>;
}

export type AiChatOutput = AiSuperAgentOutput;

type CatalogItem = {
  id: string;
  title: string;
  priceINR: number;
  category: string;
  sub_category: string | null;
  tags: string[];
  stock: number;
  rating: number;
};

type Db = SupabaseClient<Database>;

export async function mutateFeed(
  supabase: Db,
  userId: string,
  current: FeedWeights,
  intents: AiChatOutput['extractedIntents'],
): Promise<boolean> {
  let changed = false;
  if (intents.category) {
    current.category_weights[intents.category] = (current.category_weights[intents.category] || 0) + 2;
    changed = true;
  }
  if (intents.keywords.length > 0) {
    current.recent_chat_intents = Array.from(
      new Set([...intents.keywords, ...current.recent_chat_intents]),
    ).slice(0, 15);
    changed = true;
  }
  current.last_updated = Date.now();

  const { error } = await supabase
    .from('ai_user_profiles')
    .update({
      feed_weights: feedWeightsToJson(current),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
  return changed;
}

export function getRecommendations<T extends { id: string }>(products: T[], ids: string[]): T[] {
  const wanted = new Set(ids);
  return products.filter((product) => wanted.has(product.id)).slice(0, 4);
}

export async function summarizeConversation(input: {
  turns: Array<{ role: string; content: string }>;
  userId: string;
  sessionId: string;
  supabase: Db;
  apiKey?: string;
}): Promise<string> {
  const transcript = input.turns
    .map((turn) => `${turn.role}: ${turn.content.trim()}`)
    .filter((line) => line.length > 2)
    .slice(-20)
    .join('\n');
  if (!transcript) {
    return '';
  }

  let summary = transcript.slice(0, 500);
  if (input.apiKey) {
    const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${input.apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Condense this shopping chat into key facts and preferences:\n${transcript}`,
            }],
          }],
        }),
      });
      if (response.ok) {
        const payload: any = await response.json();
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          summary = text.slice(0, 1000);
        }
      }
    } catch {
      // Ignore
    }
  }

  let embedding: string | null = null;
  try {
    const vector = await generateEmbedding(summary);
    embedding = `[${vector.join(',')}]`;
  } catch {
    embedding = null;
  }

  await input.supabase.from('ai_agent_memory').insert({
    user_id: input.userId,
    session_id: input.sessionId,
    content: summary,
    embedding,
    metadata: { type: 'fact', source: 'chat' },
  });

  await input.supabase.from('ai_agent_sessions').insert({
    user_id: input.userId,
    persona: 'everyday',
    status: 'active',
    context_summary: summary,
  });

  return summary;
}

/**
 * Autonomous Customer Super Agent chat function.
 * Executes a multi-turn ReAct loop using gemini-flash-lite-latest tool calling.
 */
export async function chat(input: {
  message: string;
  persona: string;
  catalog: CatalogItem[];
  accessibilityNote?: string;
  apiKey?: string;
  memories?: string;
  userId?: string | null;
  history?: Array<{ role: string; content: string }>;
}): Promise<AiSuperAgentOutput> {
  const safeMessage = sanitizeInput(input.message);
  const personaConfig = resolvePersona(input.persona);

  if (!input.apiKey) {
    return generateResilientFallback(safeMessage, input.catalog, input.userId, input.history);
  }

  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${input.apiKey}`;

  const systemInstructions = [
    `You are the ShopSphere Autonomous Customer Super Agent (${personaConfig.label} mode).`,
    personaConfig.systemPrompt,
    `CAPABILITIES & DIRECTIVES:`,
    `- You are NOT just a conversational bot; you are a real working agent empowered to take actions on behalf of the customer.`,
    `- ALWAYS call tools when the user requests searching products, adding to cart, favoriting/wishlisting, gifting to friends, reviewing past purchases, checking or topping up in-app wallet, purchasing items, or modifying orders.`,
    `- When searching: call search_catalog.`,
    `- When searching for products like a watch, shoes, bag, or accessories without an explicitly requested narrow department, search with query keywords (e.g. query: 'watch') rather than forcing a restrictive category, because items like watches can exist in both Electronics (smartwatches) and Fashion & Apparel (classic watches).`,
    `- When the customer corrects you or refers to previous messages in the conversation (e.g. 'i asked you about watches'), pay strict attention to conversational context from previous messages, apologize for any error, and immediately show the requested products.`,
    `- When managing cart: call manage_cart (actions: add, remove, update, clear, view).`,
    `- When managing favorites/wishlist: call manage_favorites (actions: add, remove, list).`,
    `- When gifting: call get_friends_list or send_as_gift.`,
    `- When reviewing purchases: call get_reviewable_products or submit_product_review.`,
    `- When checking wallet: call get_wallet_status.`,
    `- When topping up wallet: call topup_wallet.`,
    `- When the customer wants to purchase or checkout with their wallet: ALWAYS call prepare_wallet_checkout first. This verifies balance, reserves stock, creates an order marked with placed_by: 'agent', and displays an interactive Payment Authorization Card with the exact total and remaining balance for the user to confirm.`,
    `- When the customer confirms or authorizes payment (e.g. 'yes', 'confirm', 'pay now', 'authorize'): call confirm_wallet_payment.`,
    `- When the customer wants to cancel or replace an order: call cancel_or_replace_order. Inform them that because their order was placed by the AI Agent, they benefit from a relaxed cancellation policy allowing cancellation through the packed stage with an instant 100% wallet refund.`,
    `FORMATTING & STYLE GUIDELINES:`,
    `- Format your responses cleanly using GitHub-flavored Markdown: bold product names, bullet lists for options/features, and clear INR currency formatting (e.g. ₹1,499).`,
    `- When a user specifies category and budget (e.g. "smartphone under 50000"), NEVER recommend items outside that category or above their budget!`,
    `- NEVER show completely unrelated items. If no products match, tell the user honestly and suggest adjusting filters.`,
    `- Keep replies crisp, actionable, and free of unnecessary fluff.`,
    input.accessibilityNote ? `ACCESSIBILITY: ${input.accessibilityNote}` : '',
    input.memories ? `CUSTOMER PROFILE & MEMORIES:\n${input.memories}` : '',
  ].filter(Boolean).join('\n\n');

  // Build conversational turns from input.history to preserve multi-turn memory
  const contents: any[] = [];

  if (Array.isArray(input.history) && input.history.length > 0) {
    const recent = input.history.slice(-10);
    let lastRole: string | null = null;

    for (const turn of recent) {
      const role = turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user';
      const text = turn.content?.trim();
      if (!text) continue;

      if (role === lastRole && contents.length > 0) {
        contents[contents.length - 1].parts[0].text += `\n${text}`;
      } else {
        contents.push({
          role,
          parts: [{ text }],
        });
        lastRole = role;
      }
    }
  }

  // Ensure current user message is appended
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts[0].text += `\n${safeMessage}`;
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: safeMessage }],
    });
  }

  const accumulatedClientActions: any[] = [];
  const accumulatedActionCards: any[] = [];
  const accumulatedToolExecutions: any[] = [];
  let recommendedProductIds: string[] = [];
  let finalReply = '';

  try {
    let turnCount = 0;
    const maxTurns = 4;

    while (turnCount < maxTurns) {
      turnCount++;

      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstructions }],
          },
          contents,
          tools: SUPER_AGENT_TOOLS,
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      // Resilient fallback if the model doesn't support system_instruction top-level
      if (!res.ok && res.status === 400 && contents.length > 0) {
        const clonedContents = JSON.parse(JSON.stringify(contents));
        clonedContents[0].parts[0].text = `${systemInstructions}\n\n${clonedContents[0].parts[0].text}`;
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: clonedContents,
            tools: SUPER_AGENT_TOOLS,
            generationConfig: {
              temperature: 0.2,
            },
          }),
        });
      }

      if (!res.ok && model !== 'gemini-flash-latest') {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${input.apiKey}`;
        const retryRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstructions }],
            },
            contents,
            tools: SUPER_AGENT_TOOLS,
            generationConfig: {
              temperature: 0.2,
            },
          }),
        });
        if (retryRes.ok) {
          res = retryRes;
        }
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Super Agent] Gemini turn ${turnCount} failed (${res.status}): ${errorText}`);
        break;
      }

      const data: any = await res.json();
      const candidateContent = data.candidates?.[0]?.content;
      const parts = candidateContent?.parts || [];

      // Check for function calls
      const functionCallPart = parts.find((p: any) => p.functionCall);

      if (functionCallPart && functionCallPart.functionCall) {
        const call = functionCallPart.functionCall;
        const toolName = call.name;
        const toolArgs = call.args || {};

        // Execute the tool
        const execResult: AgentExecutionResult = await executeAgentTool(toolName, toolArgs, input.userId || null);

        accumulatedToolExecutions.push({
          toolName,
          args: toolArgs,
          output: execResult.output,
        });

        if (execResult.clientActions) {
          accumulatedClientActions.push(...execResult.clientActions);
        }
        if (execResult.actionCard) {
          accumulatedActionCards.push(execResult.actionCard);
          if (execResult.actionCard.type === 'PRODUCT_CAROUSEL' && Array.isArray(execResult.actionCard.data?.products)) {
            recommendedProductIds.push(...execResult.actionCard.data.products.map((p: any) => p.id));
          }
        }

        // Add model turn and user functionResponse turn to contents
        contents.push({
          role: 'model',
          parts,
        });

        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: execResult.output,
              },
            },
          ],
        });

        // Continue loop to let Gemini generate user-facing commentary or execute next tool
        continue;
      }

      // No function call: Extract final text response
      const textPart = parts.find((p: any) => typeof p.text === 'string');
      if (textPart) {
        finalReply = textPart.text;
      }
      break;
    }

    if (!finalReply) {
      if (accumulatedActionCards.length > 0) {
        const cardTypes = accumulatedActionCards.map((c) => c.type);
        if (cardTypes.includes('WALLET_PAY_AUTH')) {
          finalReply = `I have verified your wallet balance and prepared your order. Please click **Authorize & Confirm Order** below to finalize:`;
        } else if (cardTypes.includes('ORDER_CONFIRMED')) {
          finalReply = `🎉 **Order Confirmed!** Your payment was processed via your in-app wallet under the relaxed AI Agent policy.`;
        } else if (cardTypes.includes('WALLET_TOPUP_PROMPT')) {
          finalReply = `Your wallet balance is low for this purchase. Top up your balance below with 1-tap:`;
        } else if (cardTypes.includes('PRODUCT_CAROUSEL')) {
          finalReply = `Here are the matching products from our catalog:`;
        } else {
          finalReply = `I've handled that for you! Here are the details:`;
        }
      } else {
        return generateResilientFallback(safeMessage, input.catalog, input.userId, input.history);
      }
    }

    return {
      reply: finalReply,
      recommendedProductIds: Array.from(new Set(recommendedProductIds)),
      extractedIntents: extractIntentsFromQuery(safeMessage),
      clientActions: accumulatedClientActions,
      actionCards: accumulatedActionCards,
      toolExecutions: accumulatedToolExecutions,
    };
  } catch (error) {
    console.error('[Super Agent] Execution error:', error);
    return generateResilientFallback(safeMessage, input.catalog, input.userId, input.history);
  }
}

function extractIntentsFromQuery(message: string) {
  const lower = message.toLowerCase();
  let category: string | null = null;
  if (lower.includes('phone') || lower.includes('electronic') || lower.includes('laptop') || lower.includes('audio') || lower.includes('earbuds')) {
    category = 'Electronics';
  } else if (lower.includes('fashion') || lower.includes('kurta') || lower.includes('saree') || lower.includes('shirt') || lower.includes('dress')) {
    category = 'Fashion';
  } else if (lower.includes('home') || lower.includes('kitchen') || lower.includes('cooker') || lower.includes('bedsheet')) {
    category = 'Home & Kitchen';
  } else if (lower.includes('tea') || lower.includes('spice') || lower.includes('snack') || lower.includes('sweet') || lower.includes('food')) {
    category = 'Gourmet Food';
  } else if (lower.includes('skincare') || lower.includes('beauty') || lower.includes('wellness') || lower.includes('ayurveda')) {
    category = 'Beauty & Wellness';
  }

  const keywords = lower.split(/\s+/).filter((w) => w.length > 3).slice(0, 4);

  return {
    category,
    keywords,
    priceMax: null,
  };
}

const FALLBACK_STOP_WORDS = new Set([
  'product', 'products', 'item', 'items', 'show', 'me', 'under', 'cheap', 'best',
  'good', 'from', 'category', 'in', 'the', 'for', 'buy', 'need', 'want', 'please',
  'any', 'find', 'get', 'give', 'below', 'less', 'than', 'price', 'budget', 'with', 'and',
  'about', 'asked', 'you', 'some', 'randome', 'random', 'stuff', 'can', 'this', 'that',
  'decent', 'a', 'an', 'to', 'of', 'i', 'my', 'would', 'like', 'there', 'is', 'are', 'purchase',
  'gave', 'what', 'not', 'wrong', 'hey', 'hello', 'hi', 'agent', 'bot', 'do', 'was', 'were',
  'actually', 'earlier', 'previous', 'previously', 'tell', 'did', 'recommend', 'suggest'
]);

function fallbackStemWord(word: string): string {
  const w = word.toLowerCase().trim();
  if (w.endsWith('watches')) return w.slice(0, -2);
  if (w.endsWith('smartwatches')) return w.slice(0, -2);
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

function extractSubject(message: string, history: Array<{ role: string; content: string }> = []): string {
  const patternMatch = message.match(/(?:asked\s+(?:you\s+)?about|looking\s+for|wanted|said|search\s+for)\s+([a-z0-9\s]+?)(?:[,.]|$|\s+you|\s+but)/i);
  if (patternMatch && patternMatch[1].trim()) {
    const raw = patternMatch[1].trim().toLowerCase().split(/\s+/).filter((w) => !FALLBACK_STOP_WORDS.has(w));
    if (raw.length > 0) return Array.from(new Set(raw.map(fallbackStemWord))).join(' ');
  }

  const rawWords = message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !FALLBACK_STOP_WORDS.has(w));
  if (rawWords.length > 0) {
    return Array.from(new Set(rawWords.map(fallbackStemWord))).join(' ');
  }

  if (history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const prev = history[i];
      if (prev.role === 'user') {
        const prevWords = prev.content.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !FALLBACK_STOP_WORDS.has(w));
        if (prevWords.length > 0) {
          return Array.from(new Set(prevWords.map(fallbackStemWord))).join(' ');
        }
      }
    }
  }
  return '';
}

async function generateResilientFallback(
  message: string,
  catalog: CatalogItem[],
  userId?: string | null,
  history?: Array<{ role: string; content: string }>
): Promise<AiSuperAgentOutput> {
  const lower = message.toLowerCase();

  // If user asked about wallet
  if (lower.includes('wallet') || lower.includes('balance') || lower.includes('money')) {
    let balance = 5000;
    if (userId) {
      try {
        const w = await getWallet(userId);
        balance = w.balance;
      } catch {
        // Default
      }
    }
    return {
      reply: `Your ShopSphere In-App Wallet balance is **₹${balance.toLocaleString('en-IN')}**. You can use your wallet balance for 1-tap automated purchases with relaxed cancellation policies!`,
      recommendedProductIds: [],
      extractedIntents: { category: null, keywords: ['wallet', 'balance'], priceMax: null },
      actionCards: [
        {
          type: 'WALLET_CARD',
          data: {
            balance,
            currency: 'INR',
            message: `Current In-App Balance: ₹${balance.toLocaleString('en-IN')}`,
          },
        },
      ],
    };
  }

  // If user asked for favorites/wishlist
  if (lower.includes('favorite') || lower.includes('wishlist') || lower.includes('saved')) {
    let favProducts: any[] = [];
    if (userId) {
      try {
        const favs = await getFavorites(userId);
        favProducts = favs.map((f: any) => f.product);
      } catch {
        // Fallback
      }
    }
    return {
      reply: favProducts.length > 0
        ? `Here are the items saved to your personal wishlist:`
        : `Your wishlist is currently empty. Tap the heart icon on any product card or tell me to "add this to my favorites" to save it here!`,
      recommendedProductIds: favProducts.map((p) => p.id),
      extractedIntents: { category: null, keywords: ['favorites', 'wishlist'], priceMax: null },
      actionCards: favProducts.length > 0 ? [{ type: 'PRODUCT_CAROUSEL', data: { products: favProducts } }] : undefined,
    };
  }

  const isCorrection =
    lower.includes('asked') ||
    lower.includes('random') ||
    lower.includes('wrong') ||
    lower.includes('not what') ||
    lower.includes('gave me');

  const subject = extractSubject(message, history);

  if (subject) {
    const searchRes = await executeAgentTool('search_catalog', { query: subject }, userId || null);
    const products = searchRes.output?.products || [];

    if (products.length > 0) {
      const intro = isCorrection
        ? `I sincerely apologize for the confusion earlier! Here are the actual **${subject}** options available in our store:`
        : `Namaste! Here are verified products matching **${subject}** in our catalog:`;

      return {
        reply: intro,
        recommendedProductIds: products.map((p: any) => p.id),
        extractedIntents: { category: null, keywords: [subject], priceMax: null },
        actionCards: searchRes.actionCard ? [searchRes.actionCard] : undefined,
        toolExecutions: [
          {
            toolName: 'search_catalog',
            args: { query: subject },
            output: searchRes.output,
          },
        ],
      };
    }
  }

  return {
    reply: `Namaste! I am your ShopSphere Super Agent. How can I assist you with your shopping today? Tell me what product you'd like to find, your budget in ₹, or ask me to check your wallet balance or orders!`,
    recommendedProductIds: [],
    extractedIntents: extractIntentsFromQuery(message),
  };
}

export function intentsToJson(intents: AiChatOutput['extractedIntents']): Json {
  return {
    category: intents.category,
    keywords: intents.keywords,
    priceMax: intents.priceMax,
    ...(intents.sentiment ? { sentiment: intents.sentiment } : {}),
  };
}

export { parseFeedWeights };
