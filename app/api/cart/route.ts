import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch user's cart items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('cart')
      .select(`
        *,
        product:products (
          id,
          name,
          price,
          discount_price,
          cover_image,
          stock,
          options
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cart:', error);
      return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Cart GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, product_id, quantity = 1, selected_option } = body;

    if (!user_id || !product_id) {
      return NextResponse.json({ error: 'User ID and Product ID are required' }, { status: 400 });
    }

    // Check if product exists and has enough stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, discount_price, cover_image, stock, options')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.stock < quantity) {
      return NextResponse.json({ error: 'Not enough stock available' }, { status: 400 });
    }

    // Check if item already exists in cart
    const { data: existingItem, error: existingError } = await supabase
      .from('cart')
      .select('*')
      .eq('user_id', user_id)
      .eq('product_id', product_id)
      .eq('selected_option', selected_option || null)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing cart item:', existingError);
      return NextResponse.json({ error: 'Failed to check cart' }, { status: 500 });
    }

    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = existingItem.quantity + quantity;
      
      if (product.stock < newQuantity) {
        return NextResponse.json({ error: 'Not enough stock available' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('cart')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id)
        .select(`
          *,
          product:products (
            id,
            name,
            price,
            discount_price,
            cover_image,
            stock,
            options
          )
        `)
        .single();

      if (error) {
        console.error('Error updating cart item:', error);
        return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
      }

      return NextResponse.json({ data, message: 'Cart item updated successfully' });
    } else {
      // Add new item to cart
      const { data, error } = await supabase
        .from('cart')
        .insert({
          user_id,
          product_id,
          quantity,
          selected_option: selected_option || null,
        })
        .select(`
          *,
          product:products (
            id,
            name,
            price,
            discount_price,
            cover_image,
            stock,
            options
          )
        `)
        .single();

      if (error) {
        console.error('Error adding to cart:', error);
        return NextResponse.json({ error: 'Failed to add item to cart' }, { status: 500 });
      }

      return NextResponse.json({ data, message: 'Item added to cart successfully' });
    }
  } catch (error) {
    console.error('Cart POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cart_item_id, quantity } = body;

    if (!cart_item_id || quantity === undefined) {
      return NextResponse.json({ error: 'Cart item ID and quantity are required' }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    // Get cart item with product info to check stock
    const { data: cartItem, error: cartError } = await supabase
      .from('cart')
      .select(`
        *,
        product:products (
          id,
          name,
          price,
          discount_price,
          cover_image,
          stock,
          options
        )
      `)
      .eq('id', cart_item_id)
      .single();

    if (cartError || !cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    if (cartItem.product.stock < quantity) {
      return NextResponse.json({ error: 'Not enough stock available' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('cart')
      .update({ quantity })
      .eq('id', cart_item_id)
      .select(`
        *,
        product:products (
          id,
          name,
          price,
          discount_price,
          cover_image,
          stock,
          options
        )
      `)
      .single();

    if (error) {
      console.error('Error updating cart item:', error);
      return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Cart item updated successfully' });
  } catch (error) {
    console.error('Cart PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get('cart_item_id');

    if (!cartItemId) {
      return NextResponse.json({ error: 'Cart item ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', cartItemId);

    if (error) {
      console.error('Error removing cart item:', error);
      return NextResponse.json({ error: 'Failed to remove cart item' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Cart item removed successfully' });
  } catch (error) {
    console.error('Cart DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}