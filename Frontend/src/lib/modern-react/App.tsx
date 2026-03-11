import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "../../pages/modern_page/Index.tsx";
import Shop from "../../pages/modern_page/Shop.tsx";
import Cart from "../../pages/modern_page/Cart.tsx";
import Checkout from "../../pages/modern_page/Checkout.tsx";
import OrderHistory from "../../pages/modern_page/OrderHistory.tsx";
import OrderConfirmation from "../../pages/modern_page/OrderConfirmation.tsx";
import BuyNowConfirm from "../../pages/modern_page/BuyNowConfirm.tsx";
import NotFound from "../../pages/modern_page/NotFound.tsx";

type ModernAppProps = {
  basename: string;
};

export default function ModernApp({ basename }: ModernAppProps) {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/shop/product/:productId" element={<BuyNowConfirm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
