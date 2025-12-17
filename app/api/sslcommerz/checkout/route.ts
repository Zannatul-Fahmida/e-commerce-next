/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import axios from "axios";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const {
      product_id,
      product_name,
      amount,
      currency,
      customer_name,
      customer_email,
      customer_phone,
      order_id, // Ensure order_id is included from the client
    } = await req.json();

    // Validate required fields
    if (!product_id || !product_name || !amount || !customer_name || !customer_email || !customer_phone || !order_id) {
      console.error("Missing required fields", {
        product_id,
        product_name,
        amount,
        customer_name,
        customer_email,
        customer_phone,
        order_id,
      });
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SSL_STORE_ID || !process.env.SSL_STORE_PASSWD || !process.env.SSL_SANDBOX_URL) {
      console.error("Missing SSLCommerz environment variables", {
        store_id: !!process.env.NEXT_PUBLIC_SSL_STORE_ID,
        store_passwd: !!process.env.SSL_STORE_PASSWD,
        sandbox_url: !!process.env.SSL_SANDBOX_URL,
      });
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    }

    const transactionId = randomUUID();
    const payload = {
      store_id: process.env.NEXT_PUBLIC_SSL_STORE_ID,
      store_passwd: process.env.SSL_STORE_PASSWD,
      total_amount: amount,
      currency: currency || "BDT",
      tran_id: transactionId,
      success_url: `${process.env.NEXT_PUBLIC_DOMAIN}/api/sslcommerz/success`,
      fail_url: `${process.env.NEXT_PUBLIC_DOMAIN}/api/sslcommerz/fail`,
      cancel_url: `${process.env.NEXT_PUBLIC_DOMAIN}/api/sslcommerz/cancel`,
      ipn_url: `${process.env.NEXT_PUBLIC_DOMAIN}/api/sslcommerz/ipn`,
      product_name,
      product_category: "General",
      product_profile: "general",
      cus_name: customer_name,
      cus_email: customer_email,
      cus_phone: customer_phone,
      cus_add1: "N/A",
      cus_city: "N/A",
      cus_country: "Bangladesh",
      ship_name: customer_name,
      ship_add1: "N/A",
      ship_city: "N/A",
      ship_country: "Bangladesh",
      shipping_method: "NO",
      multi_card_name: "mastercard,visacard,amexcard",
      value_a: product_id, // Pass product_id to IPN
      value_b: order_id, // Pass order_id to IPN for easier tracking
    };

    const response = await axios.post(
      `${process.env.SSL_SANDBOX_URL}/gwprocess/v4/api.php`,
      new URLSearchParams(payload as any).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("SSLCommerz API response:", {
      status: response.data.status,
      GatewayPageURL: response.data.GatewayPageURL,
      transactionId,
      fullResponse: response.data,
    });

    if (response.data.status === "SUCCESS" && response.data.GatewayPageURL) {
      return NextResponse.json(
        { GatewayPageURL: response.data.GatewayPageURL, transaction_id: transactionId },
        { status: 200 }
      );
    } else {
      console.error("SSLCommerz API failed", {
        status: response.data.status,
        error: response.data.error || "Unknown error",
        fullResponse: response.data,
      });
      return NextResponse.json(
        { message: "Failed to create payment session", error: response.data.error || "Unknown error" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("SSLCommerz error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}