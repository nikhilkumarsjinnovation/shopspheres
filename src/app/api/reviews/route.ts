import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { csrfMiddleware } from '@/lib/csrf';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfMiddleware(request);
    if (csrfError) {
      return csrfError;
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required to post a review.' }, { status: 401 });
    }

    const body = await request.json();
    const { product_id, rating, title, comment } = body;

    if (!product_id || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Valid product_id and rating (1-5) are required.' },
        { status: 400 }
      );
    }

    if (!comment || comment.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please write a review of at least 5 characters.' },
        { status: 400 }
      );
    }

    const adminDb = createAdminClient();

    // Check if user has purchased this product to grant verified_purchase badge
    const { data: orderItem } = await adminDb
      .from('order_items')
      .select('id, orders!inner(customer_id, status)')
      .eq('product_id', product_id)
      .eq('orders.customer_id', user.id)
      .limit(1)
      .maybeSingle();

    const isVerified = Boolean(orderItem);

    // Upsert or Insert review
    const { data: review, error: reviewError } = await adminDb
      .from('product_reviews')
      .insert({
        product_id,
        customer_id: user.id,
        rating: Math.round(rating),
        title: title?.trim() || 'Customer Review',
        body: comment.trim(),
        is_verified_purchase: isVerified,
      })
      .select('*')
      .single();

    if (reviewError) {
      // Check if duplicate review error (unique user_id + product_id constraint)
      if (reviewError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already reviewed this product. You can update your existing review.' },
          { status: 409 }
        );
      }
      throw reviewError;
    }

    // Recalculate average_rating and review_count on products table
    const { data: allReviews } = await adminDb
      .from('product_reviews')
      .select('rating')
      .eq('product_id', product_id);

    if (allReviews && allReviews.length > 0) {
      const count = allReviews.length;
      const sum = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
      const avg = Number((sum / count).toFixed(2));

      await adminDb
        .from('products')
        .update({
          average_rating: avg,
          review_count: count,
        })
        .eq('id', product_id);
    }

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (err: unknown) {
    console.error('[Product Review API] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to submit review.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const csrfError = csrfMiddleware(request);
    if (csrfError) {
      return csrfError;
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const { review_id } = body;

    if (!review_id) {
      return NextResponse.json({ error: 'review_id is required.' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Check if user already voted helpful
    const { data: existingVote } = await adminDb
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', review_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json(
        { message: 'You have already voted this review as helpful.' },
        { status: 200 }
      );
    }

    // Record helpful vote
    await adminDb.from('review_helpful_votes').insert({
      review_id,
      user_id: user.id,
    });

    // Increment helpful_votes counter
    const { data: currentReview } = await adminDb
      .from('product_reviews')
      .select('helpful_votes')
      .eq('id', review_id)
      .single();

    const newVotes = (currentReview?.helpful_votes || 0) + 1;

    await adminDb
      .from('product_reviews')
      .update({ helpful_votes: newVotes })
      .eq('id', review_id);

    return NextResponse.json({
      success: true,
      helpful_votes: newVotes,
    });
  } catch (err: unknown) {
    console.error('[Review Helpful Vote] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to record helpful vote.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
