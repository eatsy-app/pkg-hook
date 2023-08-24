import { useQuery, useMutation } from '@apollo/client'
import { GET_ONE_SCHEDULE_STORE, GET_SCHEDULE_STORE, CREATE_STORE_CALENDAR } from './queries'
export { GET_ONE_SCHEDULE_STORE, GET_SCHEDULE_STORE, CREATE_STORE_CALENDAR } from './queries'

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

export const useCreateSchedules = () => {
  const [setStoreSchedule, { loading, error }] = useMutation(CREATE_STORE_CALENDAR, {
    onError: (e) => {
      console.error(e)
    }
  })



  return [setStoreSchedule, { loading, error }]
}