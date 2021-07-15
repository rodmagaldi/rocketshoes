import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productResponse = await api.get<Product>(`/products/${productId}`);
      const product = productResponse.data;

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const stock = stockResponse.data;

      let newCart = [...cart];

      const productExistsInCart = newCart.find((it) => it.id === productId);
      const currentAmount = productExistsInCart
        ? productExistsInCart.amount
        : 0;

      if (stock.amount <= currentAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!productExistsInCart) {
        newCart.push({ ...product, amount: 1 });
      } else if (productExistsInCart) {
        productExistsInCart.amount = currentAmount + 1;
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (err) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((it) => it.id === productId);
      if (!product) {
        throw new Error();
      }

      const newCart = cart.filter((it) => it.id !== productId);

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const stock = stockResponse.data;

      if (stock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = [...cart];
      const productExistsInCart = newCart.find((it) => it.id === productId);

      if (productExistsInCart) {
        productExistsInCart.amount = amount;
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
