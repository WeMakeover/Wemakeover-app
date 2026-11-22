import { useDispatch, useSelector } from 'react-redux';
import {
  addToCart,
  removeFromCart,
  updateQuantity,
  increaseQuantity,
  decreaseQuantity,
  clearCart,
  toggleCart,
  setCartOpen,
  selectCartItems,
  selectCartSummary,
  selectCartTotal,
  selectCartSubtotal,
  selectCartTaxAmount,
  selectCartItemsCount,
  selectCartServicesCount,
  selectIsCartOpen,
  selectCartLastUpdated,
  selectItemQuantity,
  selectIsItemInCart
} from '../features/cart/cartSlice';
import {
  addItemToDBCart,
  clearCartFromDB,
  getCart,
  removeItemFromDBCart,
  updateItemQuantityInDB,
} from '../features/cart/cartThunks';
import { transformCartItem } from '../features/cart/cartApi';
import { getCartItemId, normalizeCartServiceId } from '../features/cart/cartItemId';
import { beginCartSync, endCartSync } from '../features/cart/cartSync';

const resolveCartItemId = (itemIdOrServiceData) => {
  if (typeof itemIdOrServiceData === 'string') {
    return normalizeCartServiceId(itemIdOrServiceData);
  }
  return getCartItemId(itemIdOrServiceData);
};

const findCartLine = (items, cartItemId) =>
  items.find(
    (item) =>
      item.id === cartItemId ||
      normalizeCartServiceId(item.id) === cartItemId
  );

export const useCart = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  
  // Selectors
  const items = useSelector(selectCartItems);
  const summary = useSelector(selectCartSummary);
  const total = useSelector(selectCartTotal);
  const subtotal = useSelector(selectCartSubtotal);
  const taxAmount = useSelector(selectCartTaxAmount);
  const totalItems = useSelector(selectCartItemsCount);
  const totalServices = useSelector(selectCartServicesCount);
  const isCartOpen = useSelector(selectIsCartOpen);
  const lastUpdated = useSelector(selectCartLastUpdated);


  // Actions
  const addItemToCart = async (serviceData) => {
    dispatch(addToCart(serviceData));

    if (!isAuthenticated) {
      return;
    }

    beginCartSync();
    try {
      const payload = transformCartItem(serviceData, 1);
      await dispatch(addItemToDBCart(payload)).unwrap();
    } catch (error) {
      console.error("❌ Failed to sync added item to backend:", error);
      dispatch(removeFromCart(getCartItemId(serviceData)));
      dispatch(getCart());
    } finally {
      endCartSync();
    }
  };

  const removeItemFromCart = async (itemId) => {
    const cartItemId = resolveCartItemId(itemId);
    dispatch(removeFromCart(cartItemId));

    if (!isAuthenticated) {
      return;
    }

    beginCartSync();
    try {
      await dispatch(removeItemFromDBCart(cartItemId)).unwrap();
    } catch (error) {
      console.error("❌ Failed to remove item from backend cart:", error);
      dispatch(getCart());
    } finally {
      endCartSync();
    }
  };

  const updateItemQuantity = async (itemId, quantity) => {
    const cartItemId = resolveCartItemId(itemId);

    const clampedQuantity = Math.max(0, quantity);
    dispatch(updateQuantity({ itemId: cartItemId, quantity: clampedQuantity }));

    if (!isAuthenticated) {
      return;
    }

    beginCartSync();
    try {
      if (clampedQuantity === 0) {
        await dispatch(removeItemFromDBCart(cartItemId)).unwrap();
      } else {
        await dispatch(updateItemQuantityInDB({ serviceId: cartItemId, quantity: clampedQuantity })).unwrap();
      }
    } catch (error) {
      console.error("❌ Failed to update item quantity in backend cart:", error);
      dispatch(getCart());
    } finally {
      endCartSync();
    }
  };

  const incrementQuantity = async (itemId) => {
    const cartItemId = resolveCartItemId(itemId);
    const currentItem = findCartLine(items, cartItemId);
    const nextQuantity = (currentItem?.quantity ?? 0) + 1;

    dispatch(increaseQuantity(cartItemId));

    if (!isAuthenticated) {
      return;
    }

    beginCartSync();
    try {
      await dispatch(updateItemQuantityInDB({ serviceId: cartItemId, quantity: nextQuantity })).unwrap();
    } catch (error) {
      console.error("❌ Failed to increment item quantity in backend cart:", error);
      dispatch(decreaseQuantity(cartItemId));
      dispatch(getCart());
    } finally {
      endCartSync();
    }
  };

  const decrementQuantity = async (itemId) => {
    const cartItemId = resolveCartItemId(itemId);
    const currentItem = findCartLine(items, cartItemId);
    const nextQuantity = Math.max(0, (currentItem?.quantity ?? 0) - 1);

    dispatch(decreaseQuantity(cartItemId));

    if (!isAuthenticated) {
      return;
    }

    beginCartSync();
    try {
      if (nextQuantity === 0) {
        await dispatch(removeItemFromDBCart(cartItemId)).unwrap();
      } else {
        await dispatch(updateItemQuantityInDB({ serviceId: cartItemId, quantity: nextQuantity })).unwrap();
      }
    } catch (error) {
      console.error("❌ Failed to decrement item quantity in backend cart:", error);
      dispatch(increaseQuantity(cartItemId));
      dispatch(getCart());
    } finally {
      endCartSync();
    }
  };

  const clearAllCart = async () => {
    dispatch(clearCart());

    if (!isAuthenticated) {
      return;
    }

    beginCartSync();
    try {
      await dispatch(clearCartFromDB()).unwrap();
    } catch (error) {
      console.error("❌ Failed to clear backend cart:", error);
      dispatch(getCart());
    } finally {
      endCartSync();
    }
  };

  const toggleCartModal = () => {
    dispatch(toggleCart());
  };

  const setCartModalOpen = (isOpen) => {
    dispatch(setCartOpen(isOpen));
  };

  // Helper functions
  const getItemQuantity = (serviceData) => {
    return useSelector(selectItemQuantity(serviceData));
  };

  const isItemInCart = (serviceData) => {
    return useSelector(selectIsItemInCart(serviceData));
  };

  const getCartItemById = (itemId) => {
    const cartItemId = resolveCartItemId(itemId);
    return findCartLine(items, cartItemId);
  };

  const getCartSummary = () => {
    return {
      summary,
      totalItems,
      totalServices,
      totalPrice: total,
      subtotal,
      taxAmount,
      itemsCount: items.length,
      isEmpty: items.length === 0,
      lastUpdated
    };
  };

  return {
    // State
    items,
    summary,
    total,
    subtotal,
    taxAmount,
    totalItems,
    totalServices,
    isCartOpen,
    lastUpdated,
    
    // Actions
    addItemToCart,
    removeItemFromCart,
    updateItemQuantity,
    incrementQuantity,
    decrementQuantity,
    clearAllCart,
    toggleCartModal,
    setCartModalOpen,
    
    // Helper functions
    getItemQuantity,
    isItemInCart,
    getCartItemById,
    getCartSummary
  };
};
