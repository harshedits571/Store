import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, serverTimestamp as clientServerTimestamp } from 'firebase/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// GET reviews for a product or user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const userId = searchParams.get('userId');

    // Attempt using Firebase Admin first
    if (adminDb) {
      let queryRef: any = adminDb.collection('reviews');
      if (productId) {
        queryRef = queryRef.where('productId', '==', productId);
      } else if (userId) {
        queryRef = queryRef.where('userId', '==', userId);
      }
      
      const snap = await queryRef.get();
      const reviews = snap.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString(),
        };
      });

      // Sort in memory to avoid missing index errors
      reviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({ success: true, reviews });
    }

    // Fallback to client SDK
    const reviewsRef = collection(db, 'reviews');
    let q = query(reviewsRef);
    if (productId) {
      q = query(reviewsRef, where('productId', '==', productId));
    } else if (userId) {
      q = query(reviewsRef, where('userId', '==', userId));
    }

    const snap = await getDocs(q);
    const reviews = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
      };
    });

    reviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ success: true, reviews });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST new review or update existing review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, productName, userId, userName, userPhoto, userEmail, rating, comment } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ success: false, error: 'Valid rating between 1 and 5 is required' }, { status: 400 });
    }

    const safeUserId = userId || userEmail || `anon_${Date.now()}`;
    const safeUserName = userName || userEmail?.split('@')[0] || 'Verified Customer';
    const safeUserPhoto = userPhoto || '';
    const safeComment = typeof comment === 'string' ? comment.trim() : '';

    // 1. Try Firebase Admin
    if (adminDb) {
      const reviewsCol = adminDb.collection('reviews');
      
      // Check if user already reviewed this product
      let existingReviewId: string | null = null;
      if (safeUserId) {
        const existingSnap = await reviewsCol
          .where('productId', '==', productId)
          .where('userId', '==', safeUserId)
          .limit(1)
          .get();
        
        if (!existingSnap.empty) {
          existingReviewId = existingSnap.docs[0].id;
        }
      }

      if (existingReviewId) {
        // Update existing review
        await reviewsCol.doc(existingReviewId).update({
          rating: numericRating,
          comment: safeComment,
          userName: safeUserName,
          userPhoto: safeUserPhoto,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, reviewId: existingReviewId, updated: true });
      } else {
        // Create new review
        const docRef = await reviewsCol.add({
          productId,
          productName: productName || '',
          userId: safeUserId,
          userName: safeUserName,
          userPhoto: safeUserPhoto,
          userEmail: userEmail || '',
          rating: numericRating,
          comment: safeComment,
          createdAt: FieldValue.serverTimestamp(),
          verifiedPurchase: true,
        });

        return NextResponse.json({ success: true, reviewId: docRef.id, created: true });
      }
    }

    // 2. Fallback to client SDK
    const clientRef = collection(db, 'reviews');
    const docRef = await addDoc(clientRef, {
      productId,
      productName: productName || '',
      userId: safeUserId,
      userName: safeUserName,
      userPhoto: safeUserPhoto,
      userEmail: userEmail || '',
      rating: numericRating,
      comment: safeComment,
      createdAt: clientServerTimestamp(),
      verifiedPurchase: true,
    });

    return NextResponse.json({ success: true, reviewId: docRef.id, created: true });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit review' }, { status: 500 });
  }
}

// PUT update review
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewId, rating, comment } = body;

    if (!reviewId) {
      return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ success: false, error: 'Valid rating between 1 and 5 is required' }, { status: 400 });
    }

    if (adminDb) {
      await adminDb.collection('reviews').doc(reviewId).update({
        rating: numericRating,
        comment: (comment || '').trim(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true });
    }

    await updateDoc(doc(db, 'reviews', reviewId), {
      rating: numericRating,
      comment: (comment || '').trim(),
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating review:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE review
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 });
    }

    if (adminDb) {
      await adminDb.collection('reviews').doc(reviewId).delete();
      return NextResponse.json({ success: true });
    }

    await deleteDoc(doc(db, 'reviews', reviewId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
