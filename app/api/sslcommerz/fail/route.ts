/* eslint-disable prefer-const */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    // Parse form-encoded data
    const formData = await req.formData();
    const tran_id = formData.get("tran_id")?.toString();

    // Log form data for debugging
    console.log("Payment failed:", Object.fromEntries(formData));

    if (!tran_id) {
      console.error("Missing tran_id in fail callback", { tran_id });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
    }

    // Verify order exists by transaction_id
    let { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, transaction_id, status, user_id, product_id")
      .eq("transaction_id", tran_id)
      .single();

    // Fallback: Search for temporary transaction ID
    if (!order || fetchError) {
      console.warn("Order not found with transaction_id, checking for temporary ID", {
        tran_id,
        fetchError: fetchError?.message,
        fetchErrorCode: fetchError?.code,
      });
      const { data: tempOrder, error: tempFetchError } = await supabase
        .from("orders")
        .select("id, transaction_id, status, user_id, product_id")
        .ilike("transaction_id", "TEMP_%")
        .eq("status", "pending")
        .single();

      if (tempOrder && !tempFetchError) {
        console.log("Found order with temporary transaction_id", {
          tempTransactionId: tempOrder.transaction_id,
          orderId: tempOrder.id,
        });
        // Update the transaction_id and status to failed
        const { error: tempUpdateError } = await supabase
          .from("orders")
          .update({ transaction_id: tran_id, status: "failed" })
          .eq("id", tempOrder.id)
          .eq("status", "pending");

        if (tempUpdateError) {
          console.error("Failed to update order with actual transaction_id", {
            orderId: tempOrder.id,
            tran_id,
            error: tempUpdateError.message,
            code: tempUpdateError.code,
          });
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
        }
        console.log("Updated order with transaction_id and status to failed", {
          orderId: tempOrder.id,
          tran_id,
        });
        order = tempOrder;
      } else {
        console.error("No order found even with temporary ID", {
          tran_id,
          tempFetchError: tempFetchError?.message,
          tempFetchErrorCode: tempFetchError?.code,
        });
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
      }
    } else {
      // Check if order status is already final (idempotency)
      if (["success", "failed"].includes(order.status)) {
        console.log("Order already processed", { orderId: order.id, tran_id, currentStatus: order.status });
        return NextResponse.redirect(
          order.status === "success"
            ? `${process.env.NEXT_PUBLIC_DOMAIN}/success`
            : `${process.env.NEXT_PUBLIC_DOMAIN}/cancel`,
          { status: 302 }
        );
      }

      // Update order status to failed
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("id", order.id)
        .eq("transaction_id", tran_id);

      if (updateError) {
        console.error("Failed to update order status", {
          orderId: order.id,
          tran_id,
          error: updateError.message,
          code: updateError.code,
          user_id: order.user_id,
          product_id: order.product_id,
        });
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
      }

      console.log("Order status updated to failed for transaction:", { orderId: order.id, tran_id });
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
  } catch (error) {
    console.error("Error in fail handler:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
  }
}