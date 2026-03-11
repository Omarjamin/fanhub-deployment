import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShopSection from "@/components/shop/ShopSection";

const Shop = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-16">
        <ShopSection />
      </main>
      <Footer />
    </div>
  );
};

export default Shop;
