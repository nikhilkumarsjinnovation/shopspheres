'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  X,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  Gift,
  Star,
  XCircle,
  Heart,
  ShoppingBag,
  ArrowRight,
  MessageSquare,
  Zap,
  CreditCard,
  Building2,
  QrCode,
  Tag,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import PersonaSelector from '@/components/ai/PersonaSelector';
import VoiceInterface from '@/components/ai/VoiceInterface';
import VisualSearch from '@/components/ai/VisualSearch';
import type { PersonaConfig } from '@/lib/personas';
import { useAgentBackground } from '@/context/AgentBackgroundContext';
import FormattedMessage from '@/components/ui/FormattedMessage';

export interface RecommendedProduct {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number | null;
  image_urls: string[];
  category: string;
  average_rating: number;
  stock: number;
}

export interface ActionCard {
  type:
    | 'PRODUCT_CAROUSEL'
    | 'WALLET_CARD'
    | 'WALLET_PAY_AUTH'
    | 'WALLET_TOPUP_PROMPT'
    | 'WALLET_TOPUP_SUCCESS'
    | 'GIFT_CARD'
    | 'ORDER_CONFIRMED'
    | 'REVIEWABLE_LIST'
    | 'ORDER_CANCELLED';
  data: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendedProducts?: RecommendedProduct[];
  actionCards?: ActionCard[];
  toolExecutions?: Array<{ toolName: string; args: any; result: any }>;
}

interface PersonalAiAssistantProps {
  onFeedUpdated?: () => void;
}

function ActionCardRenderer({
  card,
  onAction,
  onCloseDrawer,
  loading,
}: {
  card: ActionCard;
  onAction: (text: string) => void;
  onCloseDrawer: () => void;
  loading: boolean;
}) {
  if (card.type === 'WALLET_PAY_AUTH') {
    const { orderId, total, subtotal, discount, product, quantity, walletBalance, remainingBalance, appliedOffer, availableOffers } = card.data;
    return (
      <div className="agent-action-card wallet-pay-auth-card">
        <div className="card-header">
          <div className="badge-agent-auth">
            <ShieldCheck size={15} />
            <span>One-Tap Wallet Authorization</span>
          </div>
          <span className="order-tag">#SS-{String(orderId).slice(0, 6).toUpperCase()}</span>
        </div>

        <div className="card-item-row">
          <div className="card-item-info">
            <h4>{product?.title || 'Selected Product'}</h4>
            <p>
              Qty: {quantity || 1} × {formatINR(product?.price || 0)}
            </p>
          </div>
          <div className="card-item-total">{formatINR(total)}</div>
        </div>

        {/* Applied Coupon Info if active */}
        {appliedOffer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.55rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
              <Tag size={13} />
              <span>Coupon {appliedOffer.code} Applied</span>
            </div>
            <strong style={{ fontWeight: 800 }}>-{formatINR(appliedOffer.discountAmount || discount || 0)}</strong>
          </div>
        )}

        {/* Available Wallet-Compatible Offers to select (Strict Rule: Zero auto-apply) */}
        {!appliedOffer && availableOffers && availableOffers.length > 0 && (
          <div style={{ margin: '0.2rem 0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--fg-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Tag size={12} style={{ color: 'var(--accent-electric)' }} />
              <span>Available Offers (Tap to apply):</span>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {availableOffers.map((offer: any) => (
                <button
                  key={offer.code}
                  type="button"
                  disabled={loading}
                  onClick={() => onAction(`Apply coupon ${offer.code} to order ${orderId}`)}
                  className="btn-agent-chip-action"
                  style={{
                    background: 'rgba(79, 70, 229, 0.08)',
                    border: '1px dashed var(--accent-electric)',
                    color: 'var(--accent-electric)',
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.5rem',
                    fontWeight: 700,
                  }}
                  title={offer.description}
                >
                  🏷️ {offer.code} (-{formatINR(offer.discountAmount)})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="wallet-balance-row">
          <span>
            Wallet Balance: <strong>{formatINR(walletBalance)}</strong>
          </span>
          <span>
            Balance After Debit: <strong>{formatINR(remainingBalance)}</strong>
          </span>
        </div>

        <div className="policy-note">
          🤖 <strong>Agent Purchase Guarantee:</strong> Protected by relaxed cancellation policy (cancellable through packed status with instant 100% wallet refund).
        </div>

        <button
          type="button"
          className="btn-agent-pay"
          disabled={loading}
          onClick={() => onAction(`Confirm payment for order ${orderId}`)}
        >
          <CheckCircle2 size={16} />
          <span>Authorize {formatINR(total)} & Confirm Order</span>
        </button>
      </div>
    );
  }

  if (card.type === 'WALLET_TOPUP_PROMPT') {
    const { currentBalance, requiredTotal, shortfall, availableOffers, appliedOffer, product } = card.data;
    return (
      <div className="agent-action-card" style={{ border: '1.5px solid rgba(245, 158, 11, 0.4)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)' }}>
            <Wallet size={16} />
            <span>Top-Up Required</span>
          </div>
          <span className="order-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', fontWeight: 700 }}>
            Shortfall: {formatINR(shortfall)}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)', lineHeight: 1.4 }}>
          Current Wallet Balance: <strong>{formatINR(currentBalance)}</strong>. Required: <strong>{formatINR(requiredTotal)}</strong>.
        </div>

        {/* Optional offer chips to reduce total before topping up */}
        {!appliedOffer && availableOffers && availableOffers.length > 0 && (
          <div style={{ padding: '0.35rem 0.45rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)', margin: '0.15rem 0' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
              💡 Or apply a wallet offer to lower shortfall:
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {availableOffers.map((offer: any) => (
                <button
                  key={offer.code}
                  type="button"
                  disabled={loading}
                  onClick={() => onAction(product ? `Buy ${product.title} with coupon ${offer.code}` : `Apply coupon ${offer.code}`)}
                  className="btn-agent-chip-action"
                  style={{
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-electric)',
                    fontSize: '0.7rem',
                    padding: '0.18rem 0.45rem',
                    fontWeight: 600,
                  }}
                >
                  🏷️ {offer.code} (-{formatINR(offer.discountAmount)})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Option Top-Up Methods */}
        <div style={{ marginTop: '0.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--fg-primary)', marginBottom: '0.35rem' }}>
            Choose Payment Method to Top Up:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn-agent-chip-action"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.5rem 0.6rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                gap: '0.2rem',
                cursor: 'pointer',
              }}
              disabled={loading}
              onClick={() => onAction(`Top up my wallet with ₹${shortfall} via UPI`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-electric)', fontWeight: 700, fontSize: '0.78rem' }}>
                <QrCode size={14} />
                <span>UPI</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--fg-muted)' }}>GPay · PhonePe</span>
              <strong style={{ fontSize: '0.75rem', color: 'var(--fg-primary)' }}>+₹{Number(shortfall).toLocaleString('en-IN')}</strong>
            </button>

            <button
              type="button"
              className="btn-agent-chip-action"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.5rem 0.6rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                gap: '0.2rem',
                cursor: 'pointer',
              }}
              disabled={loading}
              onClick={() => onAction(`Top up my wallet with ₹${shortfall} via Card`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-electric)', fontWeight: 700, fontSize: '0.78rem' }}>
                <CreditCard size={14} />
                <span>Card</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--fg-muted)' }}>Visa · RuPay</span>
              <strong style={{ fontSize: '0.75rem', color: 'var(--fg-primary)' }}>+₹{Number(shortfall).toLocaleString('en-IN')}</strong>
            </button>

            <button
              type="button"
              className="btn-agent-chip-action"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.5rem 0.6rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                gap: '0.2rem',
                cursor: 'pointer',
              }}
              disabled={loading}
              onClick={() => onAction(`Top up my wallet with ₹${shortfall} via Net Banking`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-electric)', fontWeight: 700, fontSize: '0.78rem' }}>
                <Building2 size={14} />
                <span>Net Banking</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--fg-muted)' }}>HDFC · SBI · ICICI</span>
              <strong style={{ fontSize: '0.75rem', color: 'var(--fg-primary)' }}>+₹{Number(shortfall).toLocaleString('en-IN')}</strong>
            </button>
          </div>
        </div>

        <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.25rem' }}>
          💡 Once top-up is completed, return here to authorize your order.
        </div>
      </div>
    );
  }

  if (card.type === 'WALLET_TOPUP_SUCCESS') {
    const { creditedAmount, paymentMethod, newBalance, pendingOrderId, pendingOrderTotal } = card.data;
    return (
      <div className="agent-action-card" style={{ border: '1.5px solid rgba(16, 185, 129, 0.4)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
            <CheckCircle2 size={16} />
            <strong style={{ fontSize: '0.85rem' }}>Top-Up Successful</strong>
          </div>
          <span className="order-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontWeight: 700 }}>
            +{formatINR(creditedAmount)}
          </span>
        </div>
        <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>
          Credited <strong>{formatINR(creditedAmount)}</strong> via <strong>{paymentMethod}</strong>. New Balance: <strong>{formatINR(newBalance)}</strong>.
        </p>

        {pendingOrderId ? (
          <div style={{ padding: '0.45rem', background: 'rgba(79, 70, 229, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79, 70, 229, 0.2)', marginTop: '0.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginBottom: '0.35rem' }}>
              Your balance now satisfies Order #SS-{String(pendingOrderId).slice(0, 6).toUpperCase()}.
            </div>
            <button
              type="button"
              className="btn-agent-pay"
              disabled={loading}
              onClick={() => onAction(`Confirm payment for order ${pendingOrderId}`)}
            >
              <CheckCircle2 size={15} />
              <span>Return & Authorize Payment ({formatINR(pendingOrderTotal || creditedAmount)})</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-agent-chip-action"
            style={{ background: 'var(--accent-primary)', color: '#fff', alignSelf: 'flex-start', marginTop: '0.25rem' }}
            disabled={loading}
            onClick={() => onAction('Show my recommendations')}
          >
            <span>Continue Shopping</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    );
  }

  if (card.type === 'WALLET_CARD') {
    const { balance, message } = card.data;
    return (
      <div className="agent-action-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-electric)' }}>
            <Wallet size={16} />
            <span>ShopSphere In-App Wallet</span>
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--fg-primary)' }}>
            {formatINR(balance)}
          </span>
        </div>
        {message && <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{message}</div>}
        <div className="topup-quick-chips">
          <span className="chip-label">Quick Top Up:</span>
          {[500, 1000, 2000, 5000].map((amt) => (
            <button
              key={amt}
              type="button"
              className="chip-btn"
              disabled={loading}
              onClick={() => onAction(`Top up my wallet with ₹${amt}`)}
            >
              +₹{amt.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (card.type === 'ORDER_CONFIRMED') {
    const { orderId, total, remainingBalance, isGift, recipient } = card.data;
    return (
      <div className="agent-action-card order-confirmed-card">
        <div className="confirmed-badge">
          <CheckCircle2 size={16} />
          <span>{isGift ? '🎁 Surprise Gift Placed & Confirmed!' : 'Order Confirmed & Placed!'}</span>
        </div>
        {isGift && (
          <div style={{ padding: '0.4rem 0.6rem', background: 'var(--accent-glow)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--accent-electric)', marginBottom: '0.4rem', fontWeight: 600 }}>
            🎁 Surprise gift sent to: <strong>{recipient}</strong>
          </div>
        )}
        <div className="order-details-mini">
          <p>
            Order ID: <strong>#SS-{String(orderId).slice(0, 8).toUpperCase()}</strong>
          </p>
          <p>
            Amount Paid: <strong>{formatINR(total)}</strong> via In-App Wallet
          </p>
          {typeof remainingBalance === 'number' && (
            <p style={{ color: 'var(--fg-muted)' }}>Remaining Wallet Balance: {formatINR(remainingBalance)}</p>
          )}
        </div>
        <div className="agent-policy-pill">
          🤖 <strong>Agent Purchase:</strong> Protected by relaxed cancellation policy. You can cancel with instant 100% wallet refund through packed status.
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/orders" onClick={onCloseDrawer} className="btn-view-order" style={{ flex: 1, textAlign: 'center' }}>
            View in My Orders →
          </Link>
          {isGift && (
            <Link href="/gifts" onClick={onCloseDrawer} className="btn-view-order" style={{ flex: 1, textAlign: 'center', background: 'var(--accent-glow)', color: 'var(--accent-electric)' }}>
              Open Gifting Hub →
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (card.type === 'ORDER_CANCELLED') {
    const { orderId, refundedAmount, newBalance } = card.data;
    return (
      <div className="agent-action-card">
        <div className="card-header" style={{ color: 'var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <XCircle size={16} />
            <span>Order Cancelled</span>
          </div>
          <span className="order-tag">#SS-{String(orderId).slice(0, 6).toUpperCase()}</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)', lineHeight: 1.4 }}>
          100% refund of <strong>{formatINR(refundedAmount)}</strong> has been credited back to your in-app wallet immediately.
          {typeof newBalance === 'number' && (
            <div style={{ marginTop: '0.25rem', color: 'var(--success)', fontWeight: 600 }}>
              Updated Wallet Balance: {formatINR(newBalance)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (card.type === 'GIFT_CARD') {
    const { recipient, product, giftMessage, revealDate, orderId, total, appliedOffer, availableOffers } = card.data;
    return (
      <div className="agent-action-card gift-preview-card">
        <div className="gift-header">
          <Gift size={16} />
          <span>Surprise Gift Package Configured</span>
        </div>
        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div>
            To: <strong>{recipient}</strong>
          </div>
          {product && (
            <div>
              Product: <strong>{product.title}</strong> ({formatINR(product.price)})
            </div>
          )}
          <div className="gift-message-bubble">&ldquo;{giftMessage}&rdquo;</div>
          {revealDate && <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>Reveal: {revealDate}</span>}

          {/* Applied Coupon Info */}
          {appliedOffer && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
                <Tag size={12} />
                <span>Coupon {appliedOffer.code} Applied</span>
              </div>
              <strong style={{ fontWeight: 800 }}>-{formatINR(appliedOffer.discountAmount)}</strong>
            </div>
          )}

          {/* Available Offers */}
          {!appliedOffer && availableOffers && availableOffers.length > 0 && (
            <div style={{ margin: '0.15rem 0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--fg-secondary)', marginBottom: '0.2rem' }}>
                🏷️ Available Gifting Offers:
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {availableOffers.map((offer: any) => (
                  <button
                    key={offer.code}
                    type="button"
                    disabled={loading}
                    onClick={() => onAction(`Apply coupon ${offer.code}${orderId ? ` to order ${orderId}` : ''}`)}
                    className="btn-agent-chip-action"
                    style={{
                      background: 'rgba(79, 70, 229, 0.08)',
                      border: '1px dashed var(--accent-electric)',
                      color: 'var(--accent-electric)',
                      fontSize: '0.68rem',
                      padding: '0.15rem 0.4rem',
                      fontWeight: 700,
                    }}
                  >
                    🏷️ {offer.code} (-{formatINR(offer.discountAmount)})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {orderId ? (
          <button
            type="button"
            className="btn-agent-pay"
            style={{ marginTop: '0.5rem' }}
            disabled={loading}
            onClick={() => onAction(`Confirm payment for order ${orderId}`)}
          >
            <CheckCircle2 size={16} />
            <span>Authorize {formatINR(total || product?.price || 0)} & Dispatch Gift Now</span>
          </button>
        ) : product ? (
          <button
            type="button"
            className="btn-agent-chip-action"
            disabled={loading}
            onClick={() => onAction(`Buy ${product.title} with wallet as gift for ${recipient}`)}
          >
            <Gift size={14} />
            <span>Proceed to Buy Gift with Wallet</span>
          </button>
        ) : null}
      </div>
    );
  }

  if (card.type === 'PRODUCT_CAROUSEL') {
    const products = card.data?.products || [];
    if (products.length === 0) return null;
    return (
      <div className="agent-action-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-electric)' }}>
            <Sparkles size={14} />
            <span>Catalog Items ({products.length})</span>
          </div>
        </div>
        <div className="carousel-items-list">
          {products.slice(0, 4).map((prod: any) => (
            <div key={prod.id} className="carousel-product-item">
              <div className="prod-thumbnail">
                {prod.image_urls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={prod.image_urls[0]} alt="" />
                )}
              </div>
              <div className="prod-meta">
                <Link href={`/product/${prod.id}`} onClick={onCloseDrawer} className="prod-title">
                  {prod.title}
                </Link>
                <div className="prod-price-row">
                  <span className="price">{formatINR(prod.price)}</span>
                  {prod.average_rating ? (
                    <span className="rating">★ {Number(prod.average_rating).toFixed(1)}</span>
                  ) : null}
                </div>
                <div className="prod-quick-actions">
                  <button
                    type="button"
                    className="quick-btn"
                    disabled={loading}
                    onClick={() => onAction(`Add ${prod.title} to my cart`)}
                    title="Add to Cart"
                  >
                    + Cart
                  </button>
                  <button
                    type="button"
                    className="quick-btn accent"
                    disabled={loading}
                    onClick={() => onAction(`Buy ${prod.title} with wallet`)}
                    title="Buy with Wallet"
                  >
                    ⚡ Buy
                  </button>
                  <button
                    type="button"
                    className="quick-btn fav"
                    disabled={loading}
                    onClick={() => onAction(`Add ${prod.title} to my favorites`)}
                    title="Favorite"
                  >
                    ❤️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card.type === 'REVIEWABLE_LIST') {
    const products = card.data?.products || [];
    return (
      <div className="agent-action-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)' }}>
            <Star size={15} />
            <span>Review Your Purchases</span>
          </div>
        </div>
        {products.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
            No verified purchases eligible for review yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {products.slice(0, 3).map((prod: any) => (
              <div
                key={prod.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.6rem',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                  {prod.title}
                </span>
                <button
                  type="button"
                  className="quick-btn accent"
                  disabled={loading}
                  onClick={() => onAction(`Submit a 5-star review for ${prod.title}: Excellent product and fast delivery!`)}
                >
                  ★ 5★ Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}



export default function PersonalAiAssistant({ onFeedUpdated }: PersonalAiAssistantProps) {
  const {
    messages,
    isWorking,
    submitBackgroundTask,
    mode,
    setMode,
  } = useAgentBackground();

  const [isOpen, setIsOpen] = useState(false);
  const [persona, setPersona] = useState<PersonaConfig['id']>('everyday');
  const [inputMessage, setInputMessage] = useState('');
  const [feedNotification, setFeedNotification] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleOpenAi = () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 150);
    };

    const handleFeedUpdate = () => {
      setFeedNotification('Your explore feed was personalized to match this conversation.');
      onFeedUpdated?.();
      setTimeout(() => setFeedNotification(null), 5000);
    };

    window.addEventListener('shopsphere:open-ai', handleOpenAi);
    window.addEventListener('shopsphere:feed-updated', handleFeedUpdate);
    return () => {
      window.removeEventListener('shopsphere:open-ai', handleOpenAi);
      window.removeEventListener('shopsphere:feed-updated', handleFeedUpdate);
    };
  }, [onFeedUpdated]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isWorking) return;
    setInputMessage('');
    await submitBackgroundTask(text, persona, mode);
  };

  return (
    <>
      <button
        id="personal-ai-trigger"
        type="button"
        className="ai-floating-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Personal AI Shopping Guide"
      >
        <Sparkles size={16} />
        <span>{isOpen ? 'Close AI Guide' : 'Super Agent AI'}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="ai-drawer-backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Customer Super Agent AI Shopping Companion"
            className="ai-assistant-drawer"
          >
          {/* Header */}
          <div className="ai-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Bot size={18} style={{ color: 'var(--accent-electric)' }} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--fg-primary)' }}>
                  Customer Super Agent
                </span>
                <span className="section-badge" style={{ fontSize: '0.62rem', padding: '0.1rem 0.45rem' }}>
                  {mode === 'agent' ? 'Autonomous Mode' : 'Chat Guide Mode'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                {mode === 'agent'
                  ? 'Catalog search · Cart & Gifting · Wallet 1-tap checkout · Reviewing'
                  : 'Product consultations · Styling advice · Recommendations & Specs'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Link
                href="/agent"
                onClick={() => setIsOpen(false)}
                className="btn-card-toggle"
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: 'var(--accent-electric)',
                  background: 'var(--accent-glow)',
                  borderColor: 'rgba(79, 70, 229, 0.3)',
                }}
                title="Open Dedicated Full Agent Workspace"
              >
                <span>Tasks Desk</span>
                <ArrowRight size={11} />
              </Link>
              <button
                type="button"
                className="btn-card-toggle"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => setIsOpen(false)}
                aria-label="Close guide"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <PersonaSelector value={persona} onChange={setPersona} />

          {/* Mode Switcher Toggle Pill */}
          <div className="ai-mode-toggle-bar">
            <button
              type="button"
              className={`ai-mode-btn ${mode === 'chat' ? 'active' : ''}`}
              onClick={() => setMode('chat')}
              title="Chat Mode: Conversational guide, styling advice, and questions without auto-mutations"
            >
              <MessageSquare size={13} />
              <span>💬 Chat Mode</span>
            </button>
            <button
              type="button"
              className={`ai-mode-btn ${mode === 'agent' ? 'active agent-active' : ''}`}
              onClick={() => setMode('agent')}
              title="Agent Mode: Autonomous tasks, bag mutations, 1-tap checkout & relaxed cancellation"
            >
              <Zap size={13} />
              <span>⚡ Agent Mode</span>
            </button>
          </div>

          {feedNotification && (
            <div
              style={{
                margin: '0.5rem 1rem 0',
                padding: '0.5rem 0.75rem',
                background: 'var(--accent-glow)',
                border: '1px solid rgba(79, 70, 229, 0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: 'var(--accent-electric)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{feedNotification}</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.8rem' }}
                onClick={() => setFeedNotification(null)}
              >
                ✕
              </button>
            </div>
          )}

          <div className="ai-messages-pane">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === 'assistant' ? 'ai-bubble-assistant' : 'ai-bubble-user'}
              >
                <div className="ai-bubble-formatted">
                  <FormattedMessage content={m.content} isUser={m.role === 'user'} />
                </div>

                {/* Mode Indicator & Provenance Badge */}
                {m.role === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                    <span className={`ai-mode-indicator-chip ${m.mode || mode}`}>
                      {m.mode === 'chat' ? '💬 Chat' : '⚡ Agent'}
                    </span>
                    {m.provenance && (
                      <div className="ai-provenance-badge">
                        <ShieldCheck size={11} />
                        <span>{m.provenance.source} · {m.provenance.rowCount} verified items</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Quick Reply Suggestion Chips */}
                {m.role === 'assistant' && m.quickReplies && m.quickReplies.length > 0 && (
                  <div className="ai-quick-replies-container">
                    <span className="quick-replies-label">Suggested replies:</span>
                    <div className="quick-replies-pills">
                      {m.quickReplies.map((qr, qidx) => (
                        <button
                          key={qidx}
                          type="button"
                          className="ai-quick-reply-pill"
                          disabled={isWorking}
                          onClick={() => {
                            if (qr.includes('Switch to Agent Mode')) {
                              setMode('agent');
                            }
                            void handleSendMessage(qr);
                          }}
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render Agent Action Cards (Wallet Pay, Gifting, Order Confirmations, Carousel) */}
                {m.actionCards &&
                  m.actionCards.map((card, idx) => (
                    <ActionCardRenderer
                      key={`${m.id}_card_${idx}`}
                      card={card}
                      onAction={(text) => void handleSendMessage(text)}
                      onCloseDrawer={() => setIsOpen(false)}
                      loading={isWorking}
                    />
                  ))}

                {/* Legacy Recommended Products fallback */}
                {(!m.actionCards || m.actionCards.length === 0) &&
                  m.recommendedProducts &&
                  m.recommendedProducts.length > 0 && (
                    <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: 'var(--accent-electric)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Recommended for you
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {m.recommendedProducts.map((prod) => (
                          <Link
                            key={prod.id}
                            href={`/product/${prod.id}`}
                            onClick={() => setIsOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.65rem',
                              padding: '0.45rem',
                              background: 'var(--bg-canvas)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-md)',
                              textDecoration: 'none',
                            }}
                          >
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-subtle)',
                                overflow: 'hidden',
                                flexShrink: 0,
                              }}
                            >
                              {prod.image_urls?.[0] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={prod.image_urls[0]}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: 'var(--fg-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {prod.title}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--fg-primary)' }}>
                                  {formatINR(prod.price)}
                                </span>
                                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                                  ★ {Number(prod.average_rating || 5).toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}

            {isWorking && (
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--fg-muted)',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem',
                }}
              >
                <Sparkles size={14} className="pulse-badge" /> Super Agent executing actions in background…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="ai-prompt-chips-row">
            {[
              '💰 Check my wallet',
              '🛍️ View my cart',
              '❤️ Show my favorites',
              '🎁 Send gift to friend',
              '⭐ Review past purchases',
              'Wireless earbuds under ₹2,000',
              'Smartphones under ₹15,000',
            ].map((pill) => (
              <button
                key={pill}
                type="button"
                className="ai-prompt-chip"
                disabled={isWorking}
                onClick={() => handleSendMessage(pill)}
              >
                {pill}
              </button>
            ))}
          </div>

          {false && <VisualSearch />}
          {false && (
            <VoiceInterface onTranscript={(text) => { void handleSendMessage(text); }} />
          )}

          <form
            className="ai-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="ai-input-field"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                mode === 'chat'
                  ? 'Ask for shopping advice, style ideas, or product questions...'
                  : 'Ask agent to buy, add to bag, gift friend, or check wallet...'
              }
              disabled={isWorking}
            />
            <button
              type="submit"
              className="btn-card-add"
              style={{ padding: '0 1rem', height: '2.6rem', fontSize: '0.825rem' }}
              disabled={isWorking || !inputMessage.trim()}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
        </>
      )}
    </>
  );
}
