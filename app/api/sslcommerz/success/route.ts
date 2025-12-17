/* eslint-disable prefer-const */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    // Parse form-encoded data
    const formData = await req.formData();
    const tran_id = formData.get("tran_id")?.toString();
    const status = formData.get("status")?.toString();

    if (!tran_id || !status) {
      console.error("Missing tran_id or status in success callback", { tran_id, status });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
    }

    // Log full form data for debugging
    console.log("Form data:", Object.fromEntries(formData));

    // Map payment status to order status
    const orderStatus = ["VALID", "VALIDATED"].includes(status) ? "success" : "failed";

    // Verify order exists by transaction_id
    let { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, transaction_id, status, user_id")
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
        .select("id, transaction_id, status, user_id")
        .ilike("transaction_id", "TEMP_%")
        .single();

      if (tempOrder && !tempFetchError) {
        console.log("Found order with temporary transaction_id", { tempTransactionId: tempOrder.transaction_id });
        // Update the transaction_id to the actual one
        const { error: tempUpdateError } = await supabase
          .from("orders")
          .update({ transaction_id: tran_id, status: orderStatus })
          .eq("id", tempOrder.id);

        if (tempUpdateError) {
          console.error("Failed to update order with actual transaction_id", {
            orderId: tempOrder.id,
            tran_id,
            error: tempUpdateError.message,
            code: tempUpdateError.code,
          });
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
        }
        order = tempOrder;
      } else {
        console.error("No order found even with temporary ID", {
          tran_id,
          tempFetchError: tempFetchError?.message,
          tempFetchErrorCode: tempFetchError?.code,
        });
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
      }
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: orderStatus })
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to update order status", {
        orderId: order.id,
        tran_id,
        orderStatus,
        error: updateError.message,
        code: updateError.code,
      });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
    }

    console.log(`Order status updated to ${orderStatus} for transaction: ${tran_id}`);

    // Redirect based on payment status
    if (["VALID", "VALIDATED"].includes(status)) {
      console.log(`Payment successful for transaction: ${tran_id}`);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/success`, { status: 302 });
    } else {
      console.log(`Payment not valid for transaction: ${tran_id}, status: ${status}`);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
    }
  } catch (error) {
    console.error("Error in success handler:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/cancel`, { status: 302 });
  }
}