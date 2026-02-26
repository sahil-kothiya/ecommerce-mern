const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const calculateCartTotals = (cartItems = []) => {
  const subTotal = round(
    cartItems.reduce((sum, item) => sum + round(item.amount), 0),
  );
  const shippingCost = subTotal >= 100 ? 0 : 10;
  const couponDiscount = 0;
  const totalAmount = round(subTotal + shippingCost - couponDiscount);

  return {
    subTotal,
    shippingCost,
    couponDiscount,
    totalAmount,
    amountInCents: Math.round(totalAmount * 100),
  };
};

export { round };
