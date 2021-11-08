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
    const [cart, updateCartState] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  function setCart(cartArray : Product[]){
    updateCartState(cartArray);
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartArray));
  }

  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart];
      const productExist = updateCart.find((prod) => prod.id === productId);

      const stock = (await api.get<Stock>(`/stock/${productId}`)).data;
      const stockAmount = stock.amount;

      const currentAmount = productExist ? productExist.amount : 0;
      const amount = currentAmount + 1;

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExist) {
        productExist.amount = amount;
      }else{
        const product = (await api.get<Product>(`/products/${productId}`)).data;

        const newProduct = {
          ...product,
          amount: 1
        };

        updateCart.push(newProduct);
      }

      setCart(updateCart);
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let updateCart = [...cart];

      const productExist = updateCart.find((prod) => prod.id === productId);

      if(productExist){
        updateCart = updateCart.filter((prod) => prod.id !== productId);
        setCart(updateCart);
      }else{
        throw new Error("Produto não está no carrinho.");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
    
      if(amount <= 0){
        return;
      }

      const updateCart = [...cart];
      const productExist = updateCart.find((prod) => prod.id === productId);

      if(productExist){
        const stock = (await api.get<Stock>(`/stock/${productId}`)).data;
        const stockAmount = stock.amount;
  
        if(amount > stockAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        productExist.amount = amount;
        setCart(updateCart);
      }else{
        throw new Error("Produto não está no carrinho.");
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
