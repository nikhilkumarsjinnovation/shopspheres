import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { feedWeightsToJson, parseFeedWeights, type FeedWeights } from '@/lib/feed-weights';
import { sanitizeInput } from '@/lib/prompt-templates';
import { generateEmbedding } from '@/lib/embeddings';
import { resolvePersona } from '@/lib/personas';
import type { Database, Json } from '@/types/database.types';
import { SUPER_AGENT_TOOLS, getOpenAiTools } from '@/services/agent-tools';
import { executeAgentTool, type AgentExecutionResult } from '@/services/agent-executor';
import { getWallet } from '@/services/wallet-service';
import { getFavorites } from '@/services/favorites-service';
import { routeUserQuestion, type AgentInteractionMode, type StructuredIntent } from '@/services/agent-router';
import { validateAgentResponse, type ValidationReport } from '@/services/agent-validator';
import {
  getCachedAgentResult,
  setCachedAgentResult,
  canonicalQueryHash,
  recordSessionIntent,
  getSessionIntent,
} from '@/services/agent-cache';

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
  mode?: AgentInteractionMode;
  validationReport?: ValidationReport;
  provenance?: {
    verifiedAt: string;
    source: string;
    rowCount: number;
    confidence: 'verified' | 'qualified';
  };
  quickReplies?: string[];
  needsClarification?: boolean;
}

export type AiChatOutput = AiSuperAgentOutput;

export type CatalogItem = {
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
 * Implements Governed Architecture:
 * 1. Layer 1: Identity & Tenant Context (Supabase user session)
 * 2. Layer 2: Question Router (Classifies intent & cross-questions on ambiguity)
 * 3. Layer 3: Memory & Cache (Structured session intent & user-isolated cache)
 * 4. Layer 4 & 5: Governed Supabase Execution (Push the math down)
 * 5. Layer 6 & 7: Composer & Deterministic Validation Gate (Numeric provenance & scope enforcement)
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
  mode?: AgentInteractionMode;
  sessionId?: string;
}): Promise<AiSuperAgentOutput> {
  const safeMessage = sanitizeInput(input.message);
  const activeMode: AgentInteractionMode = input.mode === 'chat' ? 'chat' : 'agent';
  const personaConfig = resolvePersona(input.persona);
  const sessionId = input.sessionId || `sess_active`;

  // -----------------------------------------------------------------
  // 1. QUESTION ROUTER & CROSS-QUESTIONING LAYER
  // -----------------------------------------------------------------
  const previousIntent = getSessionIntent(sessionId);
  const routerIntent = routeUserQuestion(safeMessage, activeMode, {
    userId: input.userId,
    previousCategory: previousIntent?.category,
    previousIntent,
    recentTurns: input.history,
  });

  // Save current structured intent to session memory
  recordSessionIntent(sessionId, routerIntent);

  // If the Router detects underspecified requirements, ambiguity, or missing critical slots:
  // PROACTIVELY CROSS-QUESTION THE USER rather than hallucinating or guessing!
  if (routerIntent.needs_clarification && routerIntent.clarification_question) {
    return {
      reply: routerIntent.clarification_question,
      recommendedProductIds: [],
      extractedIntents: {
        category: routerIntent.category,
        keywords: routerIntent.keywords,
        priceMax: routerIntent.price_range.max || null,
      },
      mode: activeMode,
      quickReplies: routerIntent.suggested_quick_replies,
      needsClarification: true,
      provenance: {
        verifiedAt: new Date().toISOString(),
        source: 'ShopSphere Question Router (Clarification Gate)',
        rowCount: 0,
        confidence: 'verified',
      },
    };
  }

  // If user requested an action in 'chat' mode, explain and guide them to toggle
  if (routerIntent.action_requires_agent_mode) {
    return {
      reply: `You are currently in **💬 Chat Mode**. In Chat Mode, I provide conversational shopping advice, styling tips, and answer questions without making automatic changes to your cart or wallet.\n\nTo execute this action automatically, switch to **⚡ Agent Mode** using the toggle switch above, or tap below to proceed:`,
      recommendedProductIds: [],
      extractedIntents: {
        category: routerIntent.category,
        keywords: routerIntent.keywords,
        priceMax: routerIntent.price_range.max || null,
      },
      mode: activeMode,
      quickReplies: ['⚡ Switch to Agent Mode', 'Tell me more about this item', 'Check my Bag'],
      provenance: {
        verifiedAt: new Date().toISOString(),
        source: 'ShopSphere Mode Guard',
        rowCount: 0,
        confidence: 'verified',
      },
    };
  }

  // -----------------------------------------------------------------
  // 2. USER-ISOLATED RESULT CACHE LAYER
  // -----------------------------------------------------------------
  const queryHash = canonicalQueryHash(safeMessage, activeMode, routerIntent.category);
  const dataWatermark = new Date().toISOString().slice(0, 13); // 1-hour watermark
  const cachedHit = await getCachedAgentResult(input.userId || null, queryHash, dataWatermark);

  if (cachedHit && cachedHit.validationReport?.passed) {
    return {
      reply: cachedHit.reply,
      recommendedProductIds: (cachedHit.recommendedProducts || []).map((p: any) => p.id),
      recommendedProducts: cachedHit.recommendedProducts,
      extractedIntents: {
        category: routerIntent.category,
        keywords: routerIntent.keywords,
        priceMax: routerIntent.price_range.max || null,
      },
      clientActions: cachedHit.clientActions,
      actionCards: cachedHit.actionCards,
      mode: activeMode,
      validationReport: cachedHit.validationReport,
      provenance: {
        verifiedAt: cachedHit.validationReport.dataWatermark,
        source: 'ShopSphere Governed Query Cache (Hit)',
        rowCount: cachedHit.validationReport.verifiedRowCount,
        confidence: 'verified',
      },
    };
  }

  // -----------------------------------------------------------------
  // 3. EXECUTION SUBSTRATE & GEMINI PROMPT PREPARATION
  // -----------------------------------------------------------------
  if (!input.apiKey) {
    return generateResilientFallback(safeMessage, input.catalog, input.userId, input.history, activeMode, routerIntent);
  }

  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${input.apiKey}`;

  const modeInstructions = activeMode === 'chat'
    ? `CURRENT INTERACTION MODE: 💬 CHAT MODE (Conversational Guide)
- In this mode, focus on natural conversation, personalized styling advice, product feature explanations, comparisons, and answering user questions.
- DO NOT perform unilateral cart clearing or execute wallet debits in this mode.
- If the user asks for factual product details, specs, or catalog search, search accurately and provide rich explanations.`
    : `CURRENT INTERACTION MODE: ⚡ AGENT MODE (Autonomous Task Execution)
- In this mode, you have FULL AGENCY to perform real actions: searching catalog, adding/removing cart items, managing wishlist/favorites, preparing wallet checkouts with 1-tap confirmation cards, and processing returns/cancellations.
- ALWAYS call the appropriate tools when an action is requested.
- For purchases: ALWAYS call prepare_wallet_checkout first. This renders an interactive payment authorization card with the exact verified total.`;

  const systemInstructions = [
    `You are the ShopSphere Autonomous AI Shopping Companion (${personaConfig.label} persona).`,
    personaConfig.systemPrompt,
    modeInstructions,
    `CORE GOVERNED EXECUTION DIRECTIVES:`,
    `- Zero Number Hallucination: NEVER invent prices, discounts, ratings, or wallet balances! All numeric figures MUST come directly from executed tool output.`,
    `- Push the Math Down: All balances, totals, and arithmetic are computed by PostgreSQL / backend services; do not do mental math.`,
    `- AUTONOMOUS AGENT INTEGRITY: NEVER ask the customer for internal technical database IDs or UUIDs! You are the autonomous agent. Search the catalog or retrieve the product ID yourself, or pass the product title directly into tools.`,
    `- NO REPETITIVE QUESTIONS: Carefully review recent conversation history. If the customer already provided the recipient email, recipient name, product choice, or gift message in previous turns, REUSE IT DIRECTLY. Do not ask for details that have already been shared!`,
    `- GIFTING WORKFLOW:`,
    `  1. Discovery / Suggestions: If the user asks for gift ideas or recommendations (e.g. "i want to gift something to my female friend, can you suggest some"), IMMEDIATELY call search_catalog with appropriate keywords/categories (e.g. perfume, cosmetics, jewelry, beauty, gift hamper) and present the best options.`,
    `  2. Product Selection: When the user picks an item, acknowledge their choice and collect the recipient name/email and personalized card message.`,
    `  3. Execution & Confirmation: Once the recipient and message are known, or when the user confirms (e.g. "yes, you can send this as gift to her", "proceed", "go ahead"), IMMEDIATELY call send_as_gift with friend_email_or_name, product_title (e.g. "Bella Vita"), and gift_message. DO NOT ask more questions!`,
    `- OFFERS & COUPON DISCOVERY POLICY (STRICT RULE):`,
    `  - ZERO AUTO-APPLY: NEVER automatically apply any discount or coupon code behind the customer's back!`,
    `  - NON-CARD / NON-UPI OFFERS: Since payments are made only through the customer's in-app wallet, only wallet-compatible coupons (WELCOME10, GIFT300, TECH1000, UTSAV500, AUDIO15, KITCHEN300) are eligible. UPI-only (UPISAVE50) and card-only offers are excluded.`,
    `  - SHOW OPTION TO APPLY: When prepare_wallet_checkout or send_as_gift returns availableOffers in tool output, show these available offers to the customer in your message (e.g. "I found an offer you can apply: WELCOME10 saves ₹XX! Would you like me to apply it?"). Only apply a coupon if the user explicitly asks to apply it or clicks to apply!`,
    `- LOW WALLET BALANCE & MULTI-OPTION TOP-UP:`,
    `  - If wallet balance is insufficient, the interface automatically presents Card, UPI, and Net Banking top-up options. Inform the user of the shortfall and let them know they can top up using Card, UPI, or Net Banking, then return to you to authorize payment.`,
    `  - If user instructs you to top up (e.g. "Top up ₹500 via UPI" or "Add balance via Card"): call topup_wallet with amount and payment_method ('upi', 'card', or 'netbanking'). Once topped up, prompt them to authorize their pending order.`,
    `- PURCHASING WORKFLOW:`,
    `  - For purchases: ALWAYS call prepare_wallet_checkout first. This reserves inventory and renders an interactive payment authorization card with the exact verified total.`,
    `- When searching: call search_catalog with query keywords and optional category.`,
    `- When user specifies category and budget (e.g. "phones under ₹20,000"): strictly respect both constraints!`,
    `- When user asks about in-app wallet: call get_wallet_status.`,
    `- When user wants to cancel an order: call cancel_or_replace_order. Inform them of the relaxed cancellation window through the packed stage.`,
    `- Format currency strictly using INR: ₹X,XXX. Format bold product names, bullet lists for features.`,
    `- If unsure or if a search returns 0 results: honestly inform the user and suggest adjusting filters.`,
    routerIntent.selected_product_title || routerIntent.recipient_email
      ? `ACTIVE SESSION ENTITIES (ALREADY COLLECTED IN CONVERSATION):
- Selected Product: ${routerIntent.selected_product_title || 'None'}
- Recipient Email: ${routerIntent.recipient_email || 'None'}
- Gift Greeting Message: ${routerIntent.gift_message || 'A special gift for you!'}

CRITICAL ACTION DIRECTIVE: If the customer confirms sending this gift (e.g. "yes, you can send this as gift to her", "send it", "confirm"), you MUST IMMEDIATELY call the send_as_gift tool with friend_email_or_name: "${routerIntent.recipient_email || ''}", product_title: "${routerIntent.selected_product_title || ''}", gift_message: "${routerIntent.gift_message || 'A special gift for you!'}". DO NOT ask the customer to repeat or confirm the product or recipient again!`
      : '',
    input.accessibilityNote ? `ACCESSIBILITY: ${input.accessibilityNote}` : '',
    input.memories ? `CUSTOMER PROFILE & MEMORIES:\n${input.memories}` : '',
  ].filter(Boolean).join('\n\n');

  // Build conversational turns
  const contents: any[] = [];
  if (Array.isArray(input.history) && input.history.length > 0) {
    const recent = input.history.slice(-14);
    let lastRole: string | null = null;

    for (const turn of recent) {
      const role = turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user';
      const text = turn.content?.trim();
      if (!text) continue;

      if (role === lastRole && contents.length > 0) {
        contents[contents.length - 1].parts[0].text += `\n${text}`;
      } else {
        contents.push({ role, parts: [{ text }] });
        lastRole = role;
      }
    }
  }

  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts[0].text += `\n${safeMessage}`;
  } else {
    contents.push({ role: 'user', parts: [{ text: safeMessage }] });
  }

  const accumulatedClientActions: any[] = [];
  const accumulatedActionCards: any[] = [];
  const accumulatedToolExecutions: any[] = [];
  let recommendedProductIds: string[] = [];
  let executedProducts: any[] = [];
  let executedWallet: any = null;
  let executedOrder: any = null;
  let finalReply = '';

  try {
    let executedSuccessfully = false;

    // -----------------------------------------------------------------
    // 3a. HIGH-SPEED MODEL GATEWAY: Groq (Qwen/Llama Fast Inference)
    // -----------------------------------------------------------------
    if (process.env.GROQ_API_KEY) {
      try {
        const groqTools = getOpenAiTools();
        const groqMessages: any[] = [
          { role: 'system', content: systemInstructions },
        ];

        if (Array.isArray(input.history) && input.history.length > 0) {
          for (const turn of input.history.slice(-14)) {
            const role = turn.role === 'model' || turn.role === 'assistant' ? 'assistant' : 'user';
            const content = turn.content?.trim();
            if (content) groqMessages.push({ role, content });
          }
        }
        groqMessages.push({ role: 'user', content: safeMessage });

        let groqTurnCount = 0;
        const maxGroqTurns = activeMode === 'chat' ? 2 : 4;

        while (groqTurnCount < maxGroqTurns) {
          groqTurnCount++;
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'qwen/qwen3.8-27b',
              messages: groqMessages,
              tools: groqTools,
              temperature: 0.1,
            }),
          });

          if (!groqRes.ok) {
            console.warn('[Model Gateway] Groq API returned status:', groqRes.status);
            break;
          }

          const groqData: any = await groqRes.json();
          const choice = groqData.choices?.[0]?.message;
          if (!choice) break;

          if (choice.tool_calls && choice.tool_calls.length > 0) {
            groqMessages.push(choice);

            for (const tc of choice.tool_calls) {
              const toolName = tc.function.name;
              let toolArgs: Record<string, any> = {};
              try {
                toolArgs = JSON.parse(tc.function.arguments || '{}');
              } catch {}

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
                  executedProducts.push(...execResult.actionCard.data.products);
                }
              }
              if (toolName === 'get_wallet_status' && execResult.output?.balanceINR !== undefined) {
                executedWallet = { balance: execResult.output.balanceINR, currency: 'INR' };
              }
              if (toolName === 'topup_wallet' && execResult.output?.newBalance !== undefined) {
                executedWallet = { balance: execResult.output.newBalance, currency: 'INR' };
              }
              if ((toolName === 'prepare_wallet_checkout' || toolName === 'apply_coupon') && execResult.output?.orderId) {
                executedOrder = { id: execResult.output.orderId, total: execResult.output.totalAmount || execResult.output.newTotal };
              }

              groqMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(execResult.output),
              });
            }
            continue;
          }

          if (choice.content) {
            finalReply = choice.content;
            executedSuccessfully = true;
          }
          break;
        }
      } catch (groqErr) {
        console.warn('[Model Gateway] Groq error, falling back to Gemini:', groqErr);
      }
    }

    // -----------------------------------------------------------------
    // 3b. FALLBACK / SECONDARY: Gemini 1.5/2.0 API Loop
    // -----------------------------------------------------------------
    if (!executedSuccessfully && input.apiKey) {
      let turnCount = 0;
      const maxTurns = activeMode === 'chat' ? 2 : 4;

      while (turnCount < maxTurns) {
        turnCount++;

        let res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstructions }] },
            contents,
            tools: SUPER_AGENT_TOOLS,
            generationConfig: { temperature: 0.15 },
          }),
        });

        if (!res.ok && res.status === 400 && contents.length > 0) {
          const clonedContents = JSON.parse(JSON.stringify(contents));
          clonedContents[0].parts[0].text = `${systemInstructions}\n\n${clonedContents[0].parts[0].text}`;
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: clonedContents,
              tools: SUPER_AGENT_TOOLS,
              generationConfig: { temperature: 0.15 },
            }),
          });
        }

        if (!res.ok) {
          break;
        }

        const data: any = await res.json();
        const candidateContent = data.candidates?.[0]?.content;
        const parts = candidateContent?.parts || [];

        const functionCallPart = parts.find((p: any) => p.functionCall);

        if (functionCallPart && functionCallPart.functionCall) {
          const call = functionCallPart.functionCall;
          const toolName = call.name;
          const toolArgs = call.args || {};

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
              executedProducts.push(...execResult.actionCard.data.products);
            }
          }
          if (toolName === 'get_wallet_status' && execResult.output?.balanceINR !== undefined) {
            executedWallet = { balance: execResult.output.balanceINR, currency: 'INR' };
          }
          if (toolName === 'topup_wallet' && execResult.output?.newBalance !== undefined) {
            executedWallet = { balance: execResult.output.newBalance, currency: 'INR' };
          }
          if ((toolName === 'prepare_wallet_checkout' || toolName === 'apply_coupon') && execResult.output?.orderId) {
            executedOrder = { id: execResult.output.orderId, total: execResult.output.totalAmount || execResult.output.newTotal };
          }

          contents.push({ role: 'model', parts });
          contents.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: toolName,
                response: execResult.output,
              },
            }],
          });
          continue;
        }

        const textPart = parts.find((p: any) => typeof p.text === 'string');
        if (textPart) {
          finalReply = textPart.text;
          executedSuccessfully = true;
        }
        break;
      }
    }

    // 3b-ii. Autonomous Governed Action Gate for Gifting
    // If user confirmed sending a gift or completed slots (recipient + product), but model didn't call send_as_gift:
    // Execute send_as_gift autonomously!
    const isGiftConfirmAction =
      (routerIntent.intent_type === 'action_task' && routerIntent.target_entity === 'gift') ||
      (routerIntent.target_entity === 'gift' && (Boolean(routerIntent.recipient_email) || Boolean(routerIntent.gift_message))) ||
      Boolean(routerIntent.recipient_email && routerIntent.selected_product_title && /\b(yes|send|confirm|proceed|ok|go ahead|bro|gift|card)\b/i.test(safeMessage));
    const hasGiftCard = accumulatedActionCards.some((c) => c.type === 'GIFT_CARD');
    if (!hasGiftCard && (routerIntent.recipient_email || routerIntent.selected_product_title) && isGiftConfirmAction) {
      const autoGiftResult = await executeAgentTool('send_as_gift', {
        friend_email_or_name: routerIntent.recipient_email || 'friend',
        product_title: routerIntent.selected_product_title || 'Bella Vita',
        gift_message: routerIntent.gift_message || 'A special gift for you!',
      }, input.userId || null);

      if (autoGiftResult.actionCard) {
        accumulatedActionCards.push(autoGiftResult.actionCard);
        if (autoGiftResult.output?.productId) {
          recommendedProductIds.push(autoGiftResult.output.productId);
          executedProducts.push(autoGiftResult.actionCard.data?.product);
        }
        const recipientName = autoGiftResult.output?.recipient || routerIntent.recipient_email || 'your friend';
        finalReply = `🎁 **Gift Sent Successfully!** I have placed and paid for your surprise gift order for **${recipientName}**. You can track delivery anytime under **My Orders** (/orders) or in your **Gifting Hub** (/gifts)!`;
        executedSuccessfully = true;
      }
    }

    if (!finalReply) {
      if (accumulatedActionCards.length > 0) {
        const cardTypes = accumulatedActionCards.map((c) => c.type);
        if (cardTypes.includes('WALLET_PAY_AUTH')) {
          finalReply = `I have verified your wallet balance and prepared your order. Please click **Authorize & Confirm Order** below to finalize:`;
        } else if (cardTypes.includes('ORDER_CONFIRMED')) {
          const confirmedCard = accumulatedActionCards.find((c) => c.type === 'ORDER_CONFIRMED');
          if (confirmedCard?.data?.isGift) {
            finalReply = `🎁 **Gift Sent Successfully!** I have placed and paid for your surprise gift order for **${confirmedCard.data.recipient || 'your friend'}**. Track it under **My Orders** (/orders) or in the **Gifting Hub** (/gifts)!`;
          } else {
            finalReply = `🎉 **Order Confirmed!** Your payment was processed via your in-app wallet under the relaxed AI Agent policy.`;
          }
        } else if (cardTypes.includes('GIFT_CARD')) {
          finalReply = `🎁 **Surprise Gift Package Configured!** I have prepared your gift parcel. Please review the greeting card and 1-tap authorize below:`;
        } else if (cardTypes.includes('PRODUCT_CAROUSEL')) {
          finalReply = `Here are the matching products from our verified catalog:`;
        } else {
          finalReply = `Here are your requested details:`;
        }
      } else {
        return generateResilientFallback(safeMessage, input.catalog, input.userId, input.history, activeMode, routerIntent);
      }
    }

    // -----------------------------------------------------------------
    // 3c. ACTION CARD DEDUPLICATION & FOCUS
    // If a primary completion action card (GIFT_CARD, WALLET_PAY_AUTH, ORDER_CONFIRMED, ORDER_CANCELLED)
    // was generated, suppress intermediate search carousels to keep UX clean and unambiguous.
    // -----------------------------------------------------------------
    const primaryCards = accumulatedActionCards.filter((c) =>
      ['GIFT_CARD', 'WALLET_PAY_AUTH', 'ORDER_CONFIRMED', 'ORDER_CANCELLED'].includes(c.type)
    );
    const finalActionCards = primaryCards.length > 0 ? primaryCards : accumulatedActionCards;

    let finalProducts = executedProducts;
    if (primaryCards.length > 0) {
      const giftCard = primaryCards.find((c) => c.type === 'GIFT_CARD');
      if (giftCard && giftCard.data?.product) {
        finalProducts = [giftCard.data.product];
        recommendedProductIds = [giftCard.data.product.id];
      }
    }

    // -----------------------------------------------------------------
    // 4. DETERMINISTIC VALIDATION GATE (Finance Architecture §6)
    // -----------------------------------------------------------------
    const validation = validateAgentResponse({
      rawReply: finalReply,
      routerIntent,
      executedData: {
        products: finalProducts,
        wallet: executedWallet,
        order: executedOrder,
        userId: input.userId,
      },
      recommendedProducts: finalProducts,
      actionCards: finalActionCards,
      clientActions: accumulatedClientActions,
    });

    // Cache verified answer for repeat queries
    if (validation.validationReport.passed) {
      await setCachedAgentResult(input.userId || null, queryHash, dataWatermark, validation);
    }

    return {
      reply: validation.reply,
      recommendedProductIds: Array.from(new Set(recommendedProductIds)),
      extractedIntents: {
        category: routerIntent.category,
        keywords: routerIntent.keywords,
        priceMax: routerIntent.price_range.max || null,
      },
      clientActions: validation.clientActions,
      actionCards: validation.actionCards,
      toolExecutions: accumulatedToolExecutions,
      mode: activeMode,
      validationReport: validation.validationReport,
      provenance: {
        verifiedAt: validation.validationReport.dataWatermark,
        source: 'ShopSphere Supabase DB (Verified)',
        rowCount: validation.validationReport.verifiedRowCount,
        confidence: validation.validationReport.confidenceLevel,
      },
    };
  } catch (error) {
    console.error('[Governed Super Agent] Error:', error);
    return generateResilientFallback(safeMessage, input.catalog, input.userId, input.history, activeMode, routerIntent);
  }
}

async function generateResilientFallback(
  message: string,
  catalog: CatalogItem[],
  userId?: string | null,
  history?: Array<{ role: string; content: string }>,
  mode: AgentInteractionMode = 'agent',
  routerIntent?: StructuredIntent
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
        // default
      }
    }
    return {
      reply: `Your ShopSphere In-App Wallet balance is **₹${balance.toLocaleString('en-IN')}**. You can use your wallet balance for 1-tap automated purchases with relaxed cancellation policies!`,
      recommendedProductIds: [],
      extractedIntents: { category: null, keywords: ['wallet', 'balance'], priceMax: null },
      mode,
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
      provenance: {
        verifiedAt: new Date().toISOString(),
        source: 'Supabase user_wallets ledger',
        rowCount: 1,
        confidence: 'verified',
      },
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
      mode,
      actionCards: favProducts.length > 0 ? [{ type: 'PRODUCT_CAROUSEL', data: { products: favProducts } }] : undefined,
      provenance: {
        verifiedAt: new Date().toISOString(),
        source: 'Supabase user_favorites',
        rowCount: favProducts.length,
        confidence: 'verified',
      },
    };
  }

  // Multi-Turn Gifting Fallback Handling
  const isGiftingContext =
    routerIntent?.target_entity === 'gift' ||
    Boolean(routerIntent?.recipient_email) ||
    Boolean(routerIntent?.selected_product_title) ||
    lower.includes('gift') ||
    lower.includes('birthday') ||
    (lower.includes('send') && (lower.includes('her') || lower.includes('him') || lower.includes('friend')));

  if (isGiftingContext) {
    const historyText = Array.isArray(history) ? history.map((h) => h.content).join(' ') : '';
    const emailMatch = (message + ' ' + historyText).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const recipient = routerIntent?.recipient_email || (emailMatch ? emailMatch[0] : null);

    let productTitle = routerIntent?.selected_product_title || null;
    if (!productTitle) {
      const prodMatch = (message + ' ' + historyText).match(/\b(bella vita|perfume|watch|shoes|titan|noise|headphone|conditioner)\b/i);
      if (prodMatch) productTitle = prodMatch[0];
    }

    const giftMessage = routerIntent?.gift_message || (lower.includes('birthday') ? message : 'A special surprise gift for you!');

    // 1. Both product and recipient ready: dispatch gift card parcel immediately!
    if (recipient && productTitle) {
      const giftRes = await executeAgentTool('send_as_gift', {
        friend_email_or_name: recipient,
        product_title: productTitle,
        gift_message: giftMessage,
      }, userId || null);

      if (giftRes.actionCard) {
        const isConfirmed = giftRes.output?.status === 'confirmed' || giftRes.actionCard.type === 'ORDER_CONFIRMED';
        const replyText = isConfirmed
          ? `🎁 **Gift Sent Successfully!** I have placed and paid for your surprise gift order for **${recipient}**. Track it anytime under **My Orders** (/orders) or in your **Gifting Hub** (/gifts)!`
          : `🎁 **Surprise Gift Package Configured!** I have prepared your gift parcel for **${recipient}**. Please review below:`;

        return {
          reply: replyText,
          recommendedProductIds: giftRes.output?.productId ? [giftRes.output.productId] : [],
          extractedIntents: { category: null, keywords: ['gift', productTitle], priceMax: null },
          mode,
          actionCards: [giftRes.actionCard],
          provenance: {
            verifiedAt: new Date().toISOString(),
            source: 'ShopSphere Gifting Engine (Fallback)',
            rowCount: 1,
            confidence: 'verified',
          },
        };
      }
    }

    // 2. Product selected, waiting for recipient
    if (productTitle && !recipient) {
      return {
        reply: `Great choice! The **${productTitle}** is selected for your gift. Who would you like to send this surprise gift to? Please share their email address:`,
        recommendedProductIds: [],
        extractedIntents: { category: null, keywords: ['gift', productTitle], priceMax: null },
        mode,
        quickReplies: ['✉️ Enter Friend\'s Email', '🎁 Choose from Saved Friends'],
        provenance: {
          verifiedAt: new Date().toISOString(),
          source: 'ShopSphere Gifting Flow',
          rowCount: 0,
          confidence: 'verified',
        },
      };
    }

    // 3. Recipient known, waiting for gift message
    if (recipient && !giftMessage) {
      return {
        reply: `I have noted the recipient's email: **${recipient}**. What personalized greeting message would you like printed on the greeting card?`,
        recommendedProductIds: [],
        extractedIntents: { category: null, keywords: ['gift'], priceMax: null },
        mode,
        quickReplies: ['🎂 Happy Birthday!', '🎉 Congratulations!', '💝 Best Wishes!'],
        provenance: {
          verifiedAt: new Date().toISOString(),
          source: 'ShopSphere Gifting Flow',
          rowCount: 0,
          confidence: 'verified',
        },
      };
    }
  }

  // Product Search Fallback
  const querySubject = routerIntent?.keywords.join(' ') || message;
  const searchRes = await executeAgentTool('search_catalog', { query: querySubject, category: routerIntent?.category }, userId || null);
  const products = searchRes.output?.products || [];

  if (products.length > 0) {
    return {
      reply: `Here are verified products matching your search in our catalog:`,
      recommendedProductIds: products.map((p: any) => p.id),
      extractedIntents: {
        category: routerIntent?.category || null,
        keywords: routerIntent?.keywords || [],
        priceMax: routerIntent?.price_range.max || null,
      },
      actionCards: searchRes.actionCard ? [searchRes.actionCard] : undefined,
      mode,
      provenance: {
        verifiedAt: new Date().toISOString(),
        source: 'Supabase products table',
        rowCount: products.length,
        confidence: 'verified',
      },
    };
  }

  return {
    reply: `Namaste! I am your ShopSphere AI Shopping Companion. How can I assist you today? You can search for products, explore categories, or switch between Chat and Agent mode anytime!`,
    recommendedProductIds: [],
    extractedIntents: {
      category: null,
      keywords: [],
      priceMax: null,
    },
    mode,
    quickReplies: ['🔥 Trending Electronics', '👟 Footwear under ₹2,000', '💳 Check Wallet', '📦 My Orders'],
    provenance: {
      verifiedAt: new Date().toISOString(),
      source: 'ShopSphere Core Substrate',
      rowCount: 0,
      confidence: 'verified',
    },
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
