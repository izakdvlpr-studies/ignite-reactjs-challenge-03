import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      const productInCart = cart.find(product => product.id === productId);

      if (productInCart) {
        if (productInCart.amount < stock.amount) {
          const newCart = cart.map(product =>
            product.id === productId
              ? {
                  ...product,
                  amount: product.amount + 1,
                }
              : product,
          );

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

          setCart(newCart);
        } else {
          throw new Error('Quantidade solicitada fora de estoque');
        }
      } else {
        if (stock.amount < 1) {
          throw new Error('Quantidade solicitada fora de estoque');
        } else {
          const { data: product } = await api.get<Product>(
            `products/${productId}`,
          );

          const productAdded = {
            ...product,
            amount: 1,
          };

          const newCart = [...cart, productAdded];

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

          setCart(newCart);
        }
      }
    } catch (err) {
      toast.error(
        err.message.includes('fora de estoque')
          ? err.message
          : 'Erro na adição do produto',
      );
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);

      if (!productInCart) {
        throw new Error('Erro na remoção do produto');
      }

      const newCart = cart.filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const productInCart = cart.find(product => product.id === productId);

      if (!productInCart) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (amount <= stock.amount) {
        const newCart = cart.map(product =>
          product.id === productId
            ? {
                ...product,
                amount,
              }
            : product,
        );

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        setCart(newCart);
      } else {
        throw new Error('Quantidade solicitada fora de estoque');
      }
    } catch (err) {
      toast.error(
        err.message.includes('fora de estoque')
          ? err.message
          : 'Erro na alteração de quantidade do produto',
      );
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
