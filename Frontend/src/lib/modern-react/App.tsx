import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "../../pages/modern_page/Index";
import Shop from "../../pages/modern_page/Shop";
import Cart from "../../pages/modern_page/Cart";
import Checkout from "../../pages/modern_page/Checkout";
import OrderHistory from "../../pages/modern_page/OrderHistory";
import OrderConfirmation from "../../pages/modern_page/OrderConfirmation";
import BuyNowConfirm from "../../pages/modern_page/BuyNowConfirm";
import NotFound from "../../pages/modern_page/NotFound";

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
