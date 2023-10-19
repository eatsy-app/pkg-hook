import gql from 'graphql-tag'

export const GET_ALL_CITIES = gql`
    query getAllCities($dId: ID!) {
        cities(dId: $dId) {
            ctId
            dId
            cName
            cState
        }
    }
`
