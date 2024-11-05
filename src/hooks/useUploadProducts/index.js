import { useState } from 'react'
import * as XLSX from 'xlsx'
import { RandomCode } from '../../utils'

const STEPS = {
  UPLOAD_FILE: 0,
  UPLOAD_PRODUCTS: 1
}

export const useUploadProducts = ({
  sendNotification = () => { return null }
} = {}) => {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [active, setActive] = useState(STEPS.UPLOAD_FILE)
  const [overActive, setOverActive] = useState(STEPS.UPLOAD_FILE)

  const handleOverActive = (index) => {
    setOverActive(index)
  }

  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)
        resolve(json)
      }
      reader.onerror = (error) => reject(error)
      reader.readAsArrayBuffer(file)
    })
  }

  const onChangeFiles = async (files) => {
    setIsLoading(true) // Activa el loader al inicio
    try {
      const filePromises = Array.from(files).map(file => readExcelFile(file))
      const newData = await Promise.all(filePromises)

      const newProducts = newData.flat().map((product) => {
        const PRECIO_AL_PUBLICO = isNaN(product.PRECIO_AL_PUBLICO) ? 0.00 : product.PRECIO_AL_PUBLICO
        const VALOR_DE_COMPRA = isNaN(product.VALOR_DE_COMPRA) ? 0.00 : product.VALOR_DE_COMPRA
        const code = RandomCode(9)
        return {
          ...product,
          CANTIDAD: isNaN(product.CANTIDAD) ? 1 : product.CANTIDAD,
          ORIGINAL_CANTIDAD: isNaN(product.CANTIDAD) ? 1 : product.CANTIDAD,
          free: false,
          pCode: code,
          editing: false,
          PRECIO_AL_PUBLICO,
          VALOR_DE_COMPRA
        }
      })

      // Validar el número total de productos antes de actualizar el estado
      setData(prevData => {
        const currentLength = prevData.length
        const totalProducts = currentLength + newProducts.length

        if (totalProducts > 100) {
          sendNotification({
            description: 'Cannot add more products. You have reached the 100-product limit.',
            title: 'Error',
            backgroundColor: 'error'
          })

          // Calcular la cantidad de productos que se pueden agregar sin exceder el límite
          const remainingSlots = 100 - currentLength
          const productsToAdd = newProducts.slice(0, remainingSlots)
          return [...prevData, ...productsToAdd]
        } else {
          // Agregar todos los nuevos productos si no se excede el límite
          return [...prevData, ...newProducts]
        }
      })
    } catch (error) {
      sendNotification({
        description: 'Un errro a ocurrido mientras se cargaba el archivo de productos.',
        title: 'Error',
        backgroundColor: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetActive = (index) => {
    if (typeof index !== 'number' || index < 0 || index >= Object.keys(STEPS).length) {
      sendNotification({
        description: 'Invalid step index',
        title: 'Error',
        backgroundColor: 'error'
      })
      return
    }
    if (active === STEPS.UPLOAD_FILE && Boolean(!data.length)) return setActive(0)
    if (active === STEPS.UPLOAD_FILE && Boolean(data.length)) return setActive(STEPS.UPLOAD_PRODUCTS)
  }

  const updateProductQuantity = (index, quantityChange) => {
    // Validar el índice
    if (index < 0 || index >= data.length) {
      console.warn('Invalid product index:', index)
      return
    }

    const newData = [...data]
    const newQuantity = newData[index].CANTIDAD + quantityChange

    // Actualizar la cantidad solo si es mayor o igual a 0
    if (newQuantity < 0) {
      console.warn('Quantity cannot be negative, no update performed.')
      return // No permitir cantidades negativas
    }

    // Actualizar la cantidad
    newData[index].CANTIDAD = newQuantity
    newData[index].ORIGINAL_CANTIDAD = newQuantity
    // Eliminar el producto si la nueva cantidad es 0
    if (newData[index].CANTIDAD === 0) {
      newData.splice(index, 1)

      // Verificar si no quedan más productos
      if (newData.length === 0) {
        setActive(STEPS.UPLOAD_FILE) // Restablecer el estado activo a 0 si no hay productos
      }
    }

    setData(newData)
  }
  /**
 * Toggle the 'free' status of a specific product in the data array.
 * Performs validation to ensure the product index is valid.
 *
 * @param {number} productIndex - The index of the product to update.
 */
  const handleCheckFree = (productIndex) => {
    setData((prevData) => {
    // Validar que el índice es un número válido
      if (typeof productIndex !== 'number' || productIndex < 0 || productIndex >= prevData.length) {
        console.warn('Invalid product index:', productIndex)
        return prevData // Retorna el estado anterior si el índice es inválido
      }

      // Validar que el producto existe y que tiene la propiedad 'free'
      const product = prevData[productIndex]
      if (!product || typeof product.free === 'undefined') {
        console.warn('Product or "free" property not found for index:', productIndex)
        return prevData // Retorna el estado anterior si no se encuentra el producto
      }

      // Evitar cambios innecesarios si el estado de 'free' no cambia
      const updatedFreeStatus = !product.free
      if (product.free === updatedFreeStatus) {
        console.info('Product "free" status is already:', updatedFreeStatus)
        return prevData // No actualiza si el estado es el mismo
      }

      // Crear una nueva copia de los datos actualizando solo el producto específico
      return prevData.map((product, index) =>
        index === productIndex
          ? {
              ...product,
              free: updatedFreeStatus,
              PRECIO_AL_PUBLICO: updatedFreeStatus ? 0 : product.oldPrice,
              oldPrice: product.PRECIO_AL_PUBLICO
            }
          : product
      )
    })
  }
  const handleCleanAllProducts = () => {
    setData([])
    setActive(STEPS.UPLOAD_FILE)
  }
  /**
 * Toggle the 'editing' status of a specific product in the data array.
 * Validates the product index and only updates if necessary.
 *
 * @param {number} productIndex - The index of the product to update.
 */
  const handleToggleEditingStatus = (productIndex) => {
    setData((prevData) => {
    // Validar que el índice es un número válido
      if (typeof productIndex !== 'number' || productIndex < 0 || productIndex >= prevData.length) {
        console.warn('Invalid product index:', productIndex)
        return prevData // Retorna el estado anterior si el índice es inválido
      }

      // Validar que el producto existe y tiene la propiedad 'editing'
      const product = prevData[productIndex]
      if (!product || typeof product.editing === 'undefined') {
        console.warn('Product or "editing" property not found for index:', productIndex)
        return prevData // Retorna el estado anterior si no se encuentra el producto
      }

      // Evitar cambios innecesarios si el estado de 'editing' no cambia
      const updatedEditingStatus = !product.editing
      if (product.editing === updatedEditingStatus) {
        console.info('Product "editing" status is already:', updatedEditingStatus)
        return prevData // No actualiza si el estado es el mismo
      }

      // Crear una nueva copia de los datos actualizando solo el producto específico
      return prevData.map((product, index) => {
        console.log(index === productIndex)
        return index === productIndex
          ? {
              ...product,
              editing: updatedEditingStatus
            }
          : product
      }
      )
    })
  }

  /**
   * Confirm and update the quantity of a product in the data array.
   * Only updates when the button is clicked.
   *
   * @param {number} productIndex - The index of the product to update.
   */
  const handleSuccessUpdateQuantity = (productIndex) => {
    setData((prevData) => {
      // Validar que `CANTIDAD` sea un número entero
      const product = prevData[productIndex]
      if (!Number.isInteger(product?.CANTIDAD)) {
        sendNotification({
          description: 'Quantity must be an integer value.',
          title: 'Error',
          backgroundColor: 'error'
        })
        return prevData // Retorna el estado anterior si `CANTIDAD` no es entero
      }

      // Crear una copia actualizada de prevData donde se actualiza `CANTIDAD` si es necesario
      const updatedData = prevData.map((product, index) =>
        index === productIndex
          ? { ...product, editing: false, ORIGINAL_CANTIDAD: product.CANTIDAD } // Actualización o cambio de estado
          : product
      )

      // Filtrar productos con CANTIDAD mayor a 0
      const filteredData = updatedData.filter(product => product.CANTIDAD > 0)

      // Cambiar el estado a `STEPS.UPLOAD_FILE` si no quedan productos
      if (filteredData.length === 0) {
        setActive(STEPS.UPLOAD_FILE)
      }

      return filteredData
    })

    sendNotification({
      description: `Quantity updated successfully for product index ${productIndex}`,
      title: 'Success',
      backgroundColor: 'success'
    })
  }

  const handleChangeQuantity = (event, productIndex) => {
    const { value } = event.target
    setData((prevData) => {
      if (typeof productIndex !== 'number' || productIndex < 0 || productIndex >= prevData.length) {
        console.warn('Invalid product index:', productIndex)
        return prevData // Retorna el estado anterior si el índice es inválido
      }

      // Obtener la cantidad temporal para el producto
      const newQuantity = value
      if (isNaN(newQuantity) || newQuantity < 0) {
        console.warn('Quantity must be a valid non-negative number.')
        return prevData // Retorna sin cambios si la cantidad no es válida
      }

      // Actualiza el array `data` con la nueva cantidad
      return prevData.map((product, index) =>
        index === productIndex
          ? { ...product, CANTIDAD: newQuantity }
          : product
      )
    })
  }
  /**
 * Restore the 'CANTIDAD' value to 'ORIGINAL_CANTIDAD' for a specific product.
 * Validates the product index and only updates if necessary.
 *
 * @param {number} productIndex - The index of the product to restore quantity for.
 */
  const handleCancelUpdateQuantity = (productIndex) => {
    setData((prevData) => {
    // Validar que el índice es un número válido
      if (typeof productIndex !== 'number' || productIndex < 0 || productIndex >= prevData.length) {
        console.warn('Invalid product index:', productIndex)
        return prevData // Retorna el estado anterior si el índice es inválido
      }

      // Validar que el producto existe y tiene las propiedades 'CANTIDAD' y 'ORIGINAL_CANTIDAD'
      const product = prevData[productIndex]
      if (!product || typeof product.ORIGINAL_CANTIDAD === 'undefined') {
        console.warn('Product or "ORIGINAL_CANTIDAD" property not found for index:', productIndex)
        return prevData // Retorna el estado anterior si no se encuentra el producto o propiedad
      }

      // Crear una nueva copia de los datos actualizando solo el producto específico
      return prevData.map((product, index) =>
        index === productIndex
          ? { ...product, CANTIDAD: product.ORIGINAL_CANTIDAD, editing: false }
          : product
      )
    })
  }
  /**
 * Filters products with a quantity of 0 or less from the data array.
 * Sends a notification if any products are found with invalid quantities.
 */
  const filterInvalidQuantityProducts = () => {
    setData((prevData) => {
    // Filtrar productos con `CANTIDAD` mayor a 0
      const validProducts = prevData.filter(product => product.CANTIDAD > 0)

      // Notificar si hubo productos con cantidad no válida
      if (validProducts.length < prevData.length) {
        sendNotification({
          description: 'Some products had a quantity of 0 or less and were removed.',
          title: 'Invalid Products Removed',
          backgroundColor: 'warning'
        })
      }

      return validProducts
    })
  }

  /**
 * Compares uploaded products against response data to determine which were successfully uploaded.
 * @param {Array} data - Original array of products with their details.
 * @param {Array} response - Array of response objects from the `updateProducts` function.
 * @returns {Object} Object containing arrays of successfully and unsuccessfully uploaded products.
 */
  const getUploadResults = (data, response) => {
    const uploadedCodes = new Set(
      response
        .filter((product) => product.success)
        .map((product) => product.data.pCode)
    )

    const successfullyUploaded = data.filter((product) =>
      uploadedCodes.has(product.pCode)
    )

    const failedUploads = data.filter(
      (product) => !uploadedCodes.has(product.pCode)
    )

    return {
      successfullyUploaded,
      failedUploads
    }
  }
  return {
    active,
    STEPS,
    isLoading,
    data,
    overActive,
    handleOverActive,
    handleCheckFree,
    getUploadResults,
    onChangeFiles,
    handleChangeQuantity,
    handleCancelUpdateQuantity,
    handleToggleEditingStatus,
    filterInvalidQuantityProducts,
    handleSuccessUpdateQuantity,
    updateProductQuantity,
    handleCleanAllProducts,
    setActive: handleSetActive
  }
}
