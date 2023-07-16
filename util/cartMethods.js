async function getCartDetails(cart) {
	let onDeliveryItems = [];
	let wepayItems = [];
	let restItems = [];
	let onDeliveryItemsPrice = 0;
	let wepayItemsPrice = 0;
	let restItemsPrice = 0;
	cart.items.forEach((item) => {
		const sellerPaymentMethods = item.product.seller.paymentMethod;
		if (sellerPaymentMethods.length === 1 && sellerPaymentMethods.includes('on delivery')) {
			onDeliveryItems.push({ item, seller: item.product.seller._id });
			onDeliveryItemsPrice += item.price;
		} else if (sellerPaymentMethods.length === 1 && sellerPaymentMethods.includes('wepay')) {
			wepayItems.push({ item, seller: item.product.seller._id });
			wepayItemsPrice += item.price;
		} else {
			restItems.push({ item, seller: item.product.seller._id });
			restItemsPrice += item.price;
		}
	});

	let totalPrice = cart.items.reduce((accumulator, item) => {
		return accumulator + item.price;
	}, 0);
	return {
		onDeliveryItems,
		onDeliveryItemsPrice,
		wepayItems,
		wepayItemsPrice,
		restItems,
		restItemsPrice,
		totalPrice
	};
}
module.exports = { getCartDetails };
