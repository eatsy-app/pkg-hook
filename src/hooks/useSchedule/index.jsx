import { useQuery } from '@apollo/client'
import { GET_ONE_SCHEDULE_STORE, GET_SCHEDULE_STORE } from '../useProductsFood/queriesStore'

export const useSchedule = ({ day = null }) => {
  const {
    data,
    loading,
    error
  } = useQuery(GET_ONE_SCHEDULE_STORE, { variables: { schDay: day } })

  return [data?.getOneStoreSchedules, { loading, error }]
}

export const useSchedules = ({ schDay = 1 }) => {
  const {
    data,
    loading,
    error
  } = useQuery(GET_SCHEDULE_STORE, { variables: { schDay: schDay } })


  return [data?.getStoreSchedules, { loading, error }]
}