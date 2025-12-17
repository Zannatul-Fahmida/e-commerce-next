/* eslint-disable prefer-const */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    // Parse form-encoded data
    const formData = await req.formData();
    const tran_id = formData.get("tran_id")?.toString();
    const status = formData.get("status")?.toString();
    const amount = parseFloat(formData.get("amount")?.toString() || "0");
    const currency = formData.get("currency")?.toString();
    const product_id = formData.get("value_a")?.toString(); // Assuming product_id is sent as value_a
    const order_id = formData.get("value_b")?.toString(); // Assuming order_id is sent as value_b

    // Log form data for debugging
    console.log("IPN received:", Object.fromEntries(formData));

    // Validate required fields
    if (!tran_id || !status || !currency || !product_id) {
      console.error("Missing required fields in IPN:", { tran_id, status, currency, product_id, order_id });
      return NextResponse.json({ message: "Invalid IPN data" }, { status: 400 });
    }

    // Map payment status to order status
    const orderStatus = ["VALID", "VALIDATED"].includes(status) ? "success" : "failed";

    // Verify order exists by transaction_id or order_id
    let { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, transaction_id, status, user_id, product_id, amount, currency")
      .eq("transaction_id", tran_id)
      .single();

    // Fallback: Search by order_id or temporary transaction ID
    if (!order || fetchError) {
      console.warn("Order not found with transaction_id, checking for order_id or temporary ID", {
        tran_id,
        order_id,
        fetchError: fetchError?.message,
        fetchErrorCode: fetchError?.code,
      });

      // Try by order_id if provided
      if (order_id) {
        const { data: orderById, error: orderIdError } = await supabase
          .from("orders")
          .select("id, transaction_id, status, user_id, product_id, amount, currency")
          .eq("id", order_id)
          .eq("status", "pending")
          .single();

        if (orderById && !orderIdError) {
          order = orderById;
        }
      }

      // If still not found, try temporary transaction ID
      if (!order) {
        const { data: tempOrder, error: tempFetchError } = await supabase
          .from("orders")
          .select("id, transaction_id, status, user_id, product_id, amount, currency")
          .ilike("transaction_id", "TEMP_%")
          .eq("product_id", product_id)
          .eq("amount", amount)
          .eq("currency", currency)
          .eq("status", "pending")
          .single();

        if (tempOrder && !tempFetchError) {
          console.log("Found order with temporary transaction_id", {
            tempTransactionId: tempOrder.transaction_id,
            orderId: tempOrder.id,
          });
          order = tempOrder;
        } else {
          console.error("No order found even with order_id or temporary ID", {
            tran_id,
            order_id,
            product_id,
            amount,
            currency,
            tempFetchError: tempFetchError?.message,
            tempFetchErrorCode: tempFetchError?.code,
          });
          return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }
      }
    }

    // Check if order status is already final (idempotency)
    if (["success", "failed"].includes(order.status)) {
      console.log("Order already processed", {
        orderId: order.id,
        tran_id,
        currentStatus: order.status,
        product_id,
      });
      return NextResponse.json(
        { message: `Order already processed with status: ${order.status}` },
        { status: 200 }
      );
    }

    // Update order with transaction_id (if temporary) and status
    const updateData: { transaction_id?: string; status: string } = { status: orderStatus };
    if (order.transaction_id.startsWith("TEMP_")) {
      updateData.transaction_id = tran_id;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("Failed to update order status", {
        orderId: order.id,
        tran_id,
        orderStatus,
        product_id,
        user_id: order.user_id,
        error: updateError.message,
        code: updateError.code,
      });
      return NextResponse.json({ message: "Failed to update order" }, { status: 500 });
    }

    console.log(`IPN: Order status updated to ${orderStatus} for transaction:`, {
      orderId: order.id,
      tran_id,
      product_id,
      user_id: order.user_id,
    });

    return NextResponse.json({ message: "Payment processed" }, { status: 200 });
  } catch (error) {
    console.error("Error in IPN handler:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}