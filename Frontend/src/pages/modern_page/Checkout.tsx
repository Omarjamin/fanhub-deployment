import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  createOrder,
  fetchAddressBarangays,
  fetchAddressCities,
  fetchAddressProvinces,
  fetchAddressRegions,
  fetchCartItems,
  fetchCityZipCode,
} from "@/lib/ecommerceApi";
import { toast } from "@/hooks/use-toast";
import CheckoutHeader from "@/components/checkout/CheckoutHeader";
import ShippingDetailsForm from "@/components/checkout/ShippingDetailsForm";
import CheckoutItemsList, { CheckoutItem } from "@/components/checkout/CheckoutItemsList";
import CheckoutSummary from "@/components/checkout/CheckoutSummary";

type CheckoutState = {
  items?: CheckoutItem[];
};

type AddressOption = {
  code: string;
  name: string;
};

function formatPeso(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "Price unavailable";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(price);
}

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as CheckoutState;

  const [items, setItems] = useState<CheckoutItem[]>(Array.isArray(state.items) ? state.items : []);
  const [isLoadingCart, setIsLoadingCart] = useState(!Array.isArray(state.items));
  const [submitting, setSubmitting] = useState(false);
  const [streetAddress, setStreetAddress] = useState("");
  const [region, setRegion] = useState("");
  const [regionName, setRegionName] = useState("");
  const [province, setProvince] = useState("");
  const [cityMunicipality, setCityMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [regions, setRegions] = useState<AddressOption[]>([]);
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [cities, setCities] = useState<AddressOption[]>([]);
  const [barangays, setBarangays] = useState<AddressOption[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  useEffect(() => {
    if (Array.isArray(state.items)) return;
    fetchCartItems()
      .then((cart) => {
        setItems(
          cart.map((item) => ({
            itemId: item.itemId,
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            image: item.image,
            category: item.category,
            variant: item.variant,
            quantity: item.quantity,
            price: item.price,
            weight: Number(item.weight || 0),
          })),
        );
      })
      .catch(() => setItems([]))
      .finally(() => setIsLoadingCart(false));
  }, [state.items]);

  useEffect(() => {
    let active = true;
    setLoadingRegions(true);
    fetchAddressRegions()
      .then((rows) => {
        if (!active) return;
        setRegions(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!active) return;
        setRegions([]);
      })
      .finally(() => {
        if (active) setLoadingRegions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isNcrRegion = /ncr|national capital region/i.test(regionName);

  useEffect(() => {
    const selectedRegion = regions.find((entry) => entry.code === region);
    const selectedRegionName = String(selectedRegion?.name || "").trim();
    setRegionName(selectedRegionName);

    setProvince("");
    setCityMunicipality("");
    setBarangay("");
    setZipCode("");
    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (!selectedRegionName) return;

    if (/ncr|national capital region/i.test(selectedRegionName)) {
      let active = true;
      setLoadingCities(true);
      fetchAddressCities(selectedRegionName, null)
        .then((rows) => {
          if (!active) return;
          setCities(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (!active) return;
          setCities([]);
        })
        .finally(() => {
          if (active) setLoadingCities(false);
        });
      return () => {
        active = false;
      };
    }

    let active = true;
    setLoadingProvinces(true);
    fetchAddressProvinces(selectedRegionName)
      .then((rows) => {
        if (!active) return;
        setProvinces(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!active) return;
        setProvinces([]);
      })
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });
    return () => {
      active = false;
    };
  }, [region, regions]);

  useEffect(() => {
    if (!regionName || isNcrRegion || !province) {
      if (!isNcrRegion) setCities((prev) => (province ? prev : []));
      return;
    }
    setCityMunicipality("");
    setBarangay("");
    setZipCode("");
    setBarangays([]);

    let active = true;
    setLoadingCities(true);
    fetchAddressCities(regionName, province)
      .then((rows) => {
        if (!active) return;
        setCities(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!active) return;
        setCities([]);
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [province, regionName, isNcrRegion]);

  useEffect(() => {
    if (!regionName || !cityMunicipality) {
      setBarangay("");
      setBarangays([]);
      return;
    }

    setBarangay("");
    let active = true;
    setLoadingBarangays(true);
    Promise.all([
      fetchAddressBarangays(regionName, province, cityMunicipality).catch(() => []),
      fetchCityZipCode(cityMunicipality).catch(() => ""),
    ])
      .then(([barangayRows, detectedZip]) => {
        if (!active) return;
        setBarangays(Array.isArray(barangayRows) ? barangayRows : []);
        if (String(detectedZip || "").trim()) setZipCode(String(detectedZip));
      })
      .finally(() => {
        if (active) setLoadingBarangays(false);
      });

    return () => {
      active = false;
    };
  }, [cityMunicipality, province, regionName]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  );
  const shippingFee = 0;
  const total = subtotal + shippingFee;
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  );
  const totalWeight = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.weight || 0) * Number(item.quantity || 0),
        0,
      ),
    [items],
  );

  const isPreviewMode =
    typeof window !== "undefined" &&
    String(sessionStorage.getItem("frontend2_auth_mode") || "").trim().toLowerCase() !== "backend";

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length) {
      toast({
        title: "No items",
        description: "Your checkout is empty.",
        variant: "destructive",
      });
      return;
    }

    if (
      !region.trim() ||
      (!isNcrRegion && !province.trim()) ||
      !cityMunicipality.trim() ||
      !barangay.trim() ||
      !zipCode.trim() ||
      !streetAddress.trim()
    ) {
      toast({
        title: "Missing details",
        description: "Please complete shipping details.",
        variant: "destructive",
      });
      return;
    }
    if (!paymentMethod) {
      toast({
        title: "Select payment method",
        description: "Please choose a payment method.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        items: items.map((item) => ({
          product_id: Number(item.productId),
          variant_id: Number(item.variantId),
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
        subtotal,
        shipping_fee: shippingFee,
        total,
        payment_method: paymentMethod,
        status: "pending",
        shipping_address: {
          region,
          region_name: regionName,
          province,
          city_municipality: cityMunicipality,
          barangay,
          zip_code: zipCode,
          street_address: streetAddress,
        },
      });

      navigate("/order-confirmation", {
        state: {
          orderId: Number(order?.data?.order_id || order?.order_id || Date.now()),
          itemName: items.length === 1 ? items[0].name : `${items.length} items`,
          quantity: totalQuantity,
          unitPrice: totalQuantity > 0 ? subtotal / totalQuantity : subtotal,
          totalPrice: total,
          remainingStock: 0,
          items,
          subtotal,
          shippingFee,
          paymentMethod,
          shippingAddress: {
            region: regionName || region,
            province,
            cityMunicipality,
            barangay,
            zipCode,
            streetAddress,
          },
        },
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Checkout failed")
          : "Checkout failed";

      if (isPreviewMode) {
        toast({
          title: "Preview checkout",
          description: "Order simulated for UI preview mode.",
        });
        navigate("/order-confirmation", {
          state: {
            orderId: Date.now(),
            itemName: items.length === 1 ? items[0].name : `${items.length} items`,
            quantity: totalQuantity,
            unitPrice: totalQuantity > 0 ? subtotal / totalQuantity : subtotal,
            totalPrice: total,
            remainingStock: 0,
            items,
            subtotal,
            shippingFee,
            paymentMethod,
            shippingAddress: {
              region: regionName || region,
              province,
              cityMunicipality,
              barangay,
              zipCode,
              streetAddress,
            },
          },
        });
        return;
      }

      toast({
        title: "Checkout failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-16 px-4 py-16">
        <div className="container mx-auto">
          <CheckoutHeader onBack={() => navigate(-1)} />

          {isLoadingCart ? <p className="text-muted-foreground font-body">Loading checkout...</p> : null}

          {!isLoadingCart && !items.length ? (
            <div className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center">
              <p className="text-muted-foreground font-body">No items to checkout.</p>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="inline-block mt-4 rounded-full bg-primary px-5 py-2.5 text-primary-foreground text-sm font-body font-semibold"
              >
                Go to Shop
              </button>
            </div>
          ) : null}

          {!isLoadingCart && items.length > 0 ? (
            <form onSubmit={placeOrder} className="grid lg:grid-cols-[1fr_360px] gap-6">
              <section className="space-y-5">
                <ShippingDetailsForm
                  streetAddress={streetAddress}
                  region={region}
                  province={province}
                  cityMunicipality={cityMunicipality}
                  barangay={barangay}
                  zipCode={zipCode}
                  regions={regions}
                  provinces={provinces}
                  cities={cities}
                  barangays={barangays}
                  loadingRegions={loadingRegions}
                  loadingProvinces={loadingProvinces}
                  loadingCities={loadingCities}
                  loadingBarangays={loadingBarangays}
                  isNcrRegion={isNcrRegion}
                  onStreetAddressChange={setStreetAddress}
                  onRegionChange={setRegion}
                  onProvinceChange={setProvince}
                  onCityMunicipalityChange={setCityMunicipality}
                  onBarangayChange={setBarangay}
                  onZipCodeChange={setZipCode}
                />
                <CheckoutItemsList items={items} formatPeso={formatPeso} />
              </section>
              <CheckoutSummary
                totalQuantity={totalQuantity}
                totalWeight={totalWeight}
                subtotal={subtotal}
                shippingFee={shippingFee}
                total={total}
                submitting={submitting}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                formatPeso={formatPeso}
              />
            </form>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
