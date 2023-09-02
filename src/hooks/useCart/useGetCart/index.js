import { GET_ALL_SHOPPING_CARD } from '../queries'
import {
  useQuery
} from '@apollo/client'

export const useGetCart = ({
  setAlertBox = () => { },
  setCountItemProduct = () => { }
} = {}) => {
  const {
    data,
    loading,
    error,
    called
  } = useQuery(GET_ALL_SHOPPING_CARD, {
    onCompleted: data => {
      if (Array.isArray(data?.getAllShoppingCard) && data?.getAllShoppingCard?.length) {
        setCountItemProduct(data?.getAllShoppingCard?.length)
      }
    },
    fetchPolicy: 'cache-and-network',
    onError: () => {
      setAlertBox({ message: 'No pudimos cargar el carrito...' })
    }
  })
  const cart = data?.getAllShoppingCard || []
  return [cart, {
    data,
    called,
    loading,
    error
  }]
}
